"""Perceptual hash similarity and curation metadata for classification models."""

import datetime
import json
import logging
import os
from typing import Any

import cv2

from frigate.const import CLIPS_DIR

logger = logging.getLogger(__name__)

META_SUFFIX = ".meta.json"
SIMILARITY_INDEX_FILE = ".similarity_index.json"
SIMILARITY_INDEX_VERSION = 1
DHASH_BITS = 64

DUPLICATE_THRESHOLD = 0.90
MISLABEL_THRESHOLD = 0.85
NEW_SCENARIO_THRESHOLD = 0.70


def meta_path_for_image(image_path: str) -> str:
    return f"{image_path}{META_SUFFIX}"


def parse_train_filename(filename: str) -> dict[str, Any] | None:
    """Parse state-classification train filenames like none-none-{ts}-{label}-{score}.webp."""
    base = filename
    for ext in (".webp", ".png", ".jpg", ".jpeg"):
        if base.lower().endswith(ext):
            base = base[: -len(ext)]
            break

    parts = base.split("-")
    if len(parts) < 5:
        return None

    try:
        score = float(parts[-1])
        predicted_label = parts[-2]
        timestamp = float(parts[-3])
    except ValueError:
        return None

    if not predicted_label:
        return None

    return {
        "predicted_label": predicted_label,
        "confidence": score,
        "timestamp": timestamp,
        "event_id": "-".join(parts[:-3]),
    }


def read_image_metadata(image_path: str) -> dict[str, Any] | None:
    path = meta_path_for_image(image_path)
    if not os.path.isfile(path):
        return None

    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read image metadata at {path}: {e}")
        return None


def write_image_metadata(image_path: str, metadata: dict[str, Any]) -> None:
    path = meta_path_for_image(image_path)
    try:
        with open(path, "w") as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write image metadata at {path}: {e}")


def delete_image_metadata(image_path: str) -> None:
    path = meta_path_for_image(image_path)
    if os.path.isfile(path):
        os.unlink(path)


def compute_dhash_hex(image_path: str) -> str | None:
    """Compute a 64-bit difference hash (dHash) as a hex string."""
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None

    resized = cv2.resize(img, (9, 8), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    bit_string = "".join("1" if bit else "0" for bit in diff.flatten())

    try:
        return f"{int(bit_string, 2):016x}"
    except ValueError:
        return None


def hash_similarity(hash_a: str, hash_b: str) -> float:
    """Return similarity in [0, 1] from two hex dHash strings."""
    if not hash_a or not hash_b:
        return 0.0

    try:
        xor = int(hash_a, 16) ^ int(hash_b, 16)
    except ValueError:
        return 0.0

    hamming = bin(xor).count("1")
    return max(0.0, 1.0 - (hamming / DHASH_BITS))


def _index_path(model_name: str) -> str:
    return os.path.join(CLIPS_DIR, model_name, SIMILARITY_INDEX_FILE)


def load_similarity_index(model_name: str) -> dict[str, Any]:
    path = _index_path(model_name)
    if not os.path.isfile(path):
        return {"version": SIMILARITY_INDEX_VERSION, "images": {}}

    try:
        with open(path) as f:
            data = json.load(f)
        if "images" not in data:
            return {"version": SIMILARITY_INDEX_VERSION, "images": {}}
        return data
    except Exception as e:
        logger.error(f"Failed to load similarity index for {model_name}: {e}")
        return {"version": SIMILARITY_INDEX_VERSION, "images": {}}


def save_similarity_index(model_name: str, index: dict[str, Any]) -> None:
    path = _index_path(model_name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    index["version"] = SIMILARITY_INDEX_VERSION

    try:
        with open(path, "w") as f:
            json.dump(index, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save similarity index for {model_name}: {e}")


def index_image(model_name: str, relative_path: str, image_path: str) -> str | None:
    """Hash an image and store it in the model similarity index."""
    image_hash = compute_dhash_hex(image_path)
    if not image_hash:
        return None

    index = load_similarity_index(model_name)
    index["images"][relative_path] = image_hash
    save_similarity_index(model_name, index)
    return image_hash


def remove_from_similarity_index(model_name: str, relative_path: str) -> None:
    index = load_similarity_index(model_name)
    if relative_path in index.get("images", {}):
        del index["images"][relative_path]
        save_similarity_index(model_name, index)


def rebuild_similarity_index(model_name: str) -> int:
    """Rebuild the similarity index from dataset and train images."""
    model_dir = os.path.join(CLIPS_DIR, model_name)
    images: dict[str, str] = {}

    for subdir, prefix in (("dataset", "dataset"), ("train", "train")):
        base = os.path.join(model_dir, subdir)
        if not os.path.isdir(base):
            continue

        if subdir == "dataset":
            for category in os.listdir(base):
                category_dir = os.path.join(base, category)
                if not os.path.isdir(category_dir):
                    continue
                for file in os.listdir(category_dir):
                    if not file.lower().endswith((".webp", ".png", ".jpg", ".jpeg")):
                        continue
                    full_path = os.path.join(category_dir, file)
                    rel = f"{prefix}/{category}/{file}"
                    image_hash = compute_dhash_hex(full_path)
                    if image_hash:
                        images[rel] = image_hash
        else:
            for file in os.listdir(base):
                if not file.lower().endswith((".webp", ".png", ".jpg", ".jpeg")):
                    continue
                full_path = os.path.join(base, file)
                rel = f"{prefix}/{file}"
                image_hash = compute_dhash_hex(full_path)
                if image_hash:
                    images[rel] = image_hash

    save_similarity_index(model_name, {"version": SIMILARITY_INDEX_VERSION, "images": images})
    return len(images)


def read_all_dataset_metadata(model_name: str) -> dict[str, dict[str, dict[str, Any]]]:
    """Return metadata keyed by category then filename."""
    result: dict[str, dict[str, dict[str, Any]]] = {}
    dataset_dir = os.path.join(CLIPS_DIR, model_name, "dataset")

    if not os.path.isdir(dataset_dir):
        return result

    for category in os.listdir(dataset_dir):
        category_dir = os.path.join(dataset_dir, category)
        if not os.path.isdir(category_dir):
            continue

        result[category] = {}
        for file in os.listdir(category_dir):
            if not file.lower().endswith((".webp", ".png", ".jpg", ".jpeg")):
                continue
            meta = read_image_metadata(os.path.join(category_dir, file))
            if meta:
                result[category][file] = meta

    return result


def _dataset_entries_by_class(
    model_name: str, index: dict[str, Any]
) -> dict[str, list[tuple[str, str, str]]]:
    """Map class name to list of (relative_path, filename, hash)."""
    grouped: dict[str, list[tuple[str, str, str]]] = {}
    images = index.get("images", {})

    for rel_path, image_hash in images.items():
        if not rel_path.startswith("dataset/"):
            continue
        parts = rel_path.split("/")
        if len(parts) != 3:
            continue
        _, category, filename = parts
        grouped.setdefault(category, []).append((rel_path, filename, image_hash))

    return grouped


def compute_suggested_action(
    confidence: float,
    max_same_dataset_similarity: float,
    max_same_recent_similarity: float,
    max_other_class_similarity: float,
    best_other_class: str | None,
) -> str:
    max_same_class_similarity = max(
        max_same_dataset_similarity, max_same_recent_similarity
    )
    if (
        max_other_class_similarity >= MISLABEL_THRESHOLD
        and max_other_class_similarity > max_same_class_similarity
        and best_other_class
    ):
        return f"relabel_to_{best_other_class}"
    if max_same_dataset_similarity >= DUPLICATE_THRESHOLD:
        return "skip_duplicate_library"
    if max_same_recent_similarity >= DUPLICATE_THRESHOLD:
        return "skip_duplicate_recent"
    if (
        max(max_same_class_similarity, max_other_class_similarity)
        < NEW_SCENARIO_THRESHOLD
    ):
        return "add_new_scenario"
    return "candidate"


def _best_match_for_hash(
    image_hash: str,
    entries: list[tuple[str, str, str]],
) -> tuple[float, str | None, str | None]:
    best_similarity = 0.0
    best_class: str | None = None
    best_filename: str | None = None

    for rel_path, filename, entry_hash in entries:
        similarity = hash_similarity(image_hash, entry_hash)
        if similarity > best_similarity:
            best_similarity = similarity
            parts = rel_path.split("/")
            best_class = parts[1] if len(parts) >= 2 else None
            best_filename = filename

    return best_similarity, best_class, best_filename


def _best_prior_train_match(
    image_hash: str,
    prior_entries: list[tuple[str, str, str, float]],
    cluster_roots: dict[str, float],
    duplicate_threshold: float = DUPLICATE_THRESHOLD,
) -> tuple[float, str | None, float]:
    """Best similarity to earlier train images and resulting cluster root timestamp."""
    best_similarity = 0.0
    best_filename: str | None = None
    cluster_root = float("inf")

    for prior_rel, prior_filename, prior_hash, prior_timestamp in prior_entries:
        similarity = hash_similarity(image_hash, prior_hash)
        if similarity > best_similarity:
            best_similarity = similarity
            best_filename = prior_filename
        if similarity >= duplicate_threshold:
            prior_root = cluster_roots.get(prior_rel, prior_timestamp)
            cluster_root = min(cluster_root, prior_root)

    if cluster_root == float("inf"):
        return best_similarity, best_filename, 0.0

    return best_similarity, best_filename, cluster_root


def compute_train_suggestions(model_name: str) -> list[dict[str, Any]]:
    """Compute similarity-based suggestions for all train images."""
    index = load_similarity_index(model_name)
    if not index.get("images"):
        rebuild_similarity_index(model_name)
        index = load_similarity_index(model_name)

    dataset_by_class = _dataset_entries_by_class(model_name, index)
    all_dataset_entries = [
        entry for entries in dataset_by_class.values() for entry in entries
    ]

    train_dir = os.path.join(CLIPS_DIR, model_name, "train")
    if not os.path.isdir(train_dir):
        return []

    train_files: list[dict[str, Any]] = []
    for file in os.listdir(train_dir):
        if not file.lower().endswith((".webp", ".png", ".jpg", ".jpeg")):
            continue

        parsed = parse_train_filename(file)
        if not parsed:
            continue

        rel_path = f"train/{file}"
        full_path = os.path.join(train_dir, file)
        image_hash = index.get("images", {}).get(rel_path)
        if not image_hash:
            image_hash = index_image(model_name, rel_path, full_path)
        if not image_hash:
            continue

        train_files.append(
            {
                "file": file,
                "rel_path": rel_path,
                "parsed": parsed,
                "hash": image_hash,
            }
        )

    train_files.sort(key=lambda item: item["parsed"]["timestamp"])

    prior_by_label: dict[str, list[tuple[str, str, str, float]]] = {}
    cluster_roots: dict[str, float] = {}
    suggestions: list[dict[str, Any]] = []

    for item in train_files:
        file = item["file"]
        rel_path = item["rel_path"]
        image_hash = item["hash"]
        parsed = item["parsed"]
        predicted_label = parsed["predicted_label"]
        confidence = parsed["confidence"]
        timestamp = parsed["timestamp"]

        same_class_entries = dataset_by_class.get(predicted_label, [])
        max_same_dataset, _, same_filename = _best_match_for_hash(
            image_hash, same_class_entries
        )

        prior_entries = prior_by_label.get(predicted_label, [])
        max_same_recent, match_train_filename, matched_cluster_root = (
            _best_prior_train_match(image_hash, prior_entries, cluster_roots)
        )
        cluster_root = (
            matched_cluster_root if matched_cluster_root > 0 else timestamp
        )

        max_same = max(max_same_dataset, max_same_recent)

        other_entries = [
            entry
            for cls, entries in dataset_by_class.items()
            if cls != predicted_label
            for entry in entries
        ]
        max_other, other_class, other_filename = _best_match_for_hash(
            image_hash, other_entries
        )

        max_overall = max(max_same, max_other)
        if max_other >= max_same:
            best_match_class = other_class
            best_match_filename = other_filename
        elif max_same_recent >= max_same_dataset:
            best_match_class = predicted_label
            best_match_filename = match_train_filename
        else:
            best_match_class = predicted_label if same_filename else None
            best_match_filename = same_filename

        suggested_action = compute_suggested_action(
            confidence,
            max_same_dataset,
            max_same_recent,
            max_other,
            other_class,
        )

        duplicate_group = f"{predicted_label}-{cluster_root}"
        cluster_roots[rel_path] = cluster_root
        prior_by_label.setdefault(predicted_label, []).append(
            (rel_path, file, image_hash, timestamp)
        )

        suggestions.append(
            {
                "filename": file,
                "predicted_label": predicted_label,
                "confidence": confidence,
                "timestamp": timestamp,
                "image_hash": image_hash,
                "max_similarity": round(max_overall, 4),
                "max_same_class_similarity": round(max_same, 4),
                "max_same_class_dataset_similarity": round(max_same_dataset, 4),
                "max_same_class_recent_similarity": round(max_same_recent, 4),
                "max_other_class_similarity": round(max_other, 4),
                "best_match_class": best_match_class,
                "best_match_filename": best_match_filename,
                "suggested_action": suggested_action,
                "duplicate_group": duplicate_group,
            }
        )

    group_sizes: dict[str, int] = {}
    for suggestion in suggestions:
        group = suggestion["duplicate_group"]
        group_sizes[group] = group_sizes.get(group, 0) + 1

    for suggestion in suggestions:
        suggestion["duplicate_group_size"] = group_sizes.get(
            suggestion["duplicate_group"], 1
        )

    _apply_burst_training_picks(suggestions)

    if not suggestions and not all_dataset_entries:
        return suggestions

    return suggestions


def _apply_burst_training_picks(suggestions: list[dict[str, Any]]) -> None:
    """Mark potential training candidates within each Recent burst.

    All burst members stay Repeat (skip_duplicate_recent). Training pick is an
    additional flag on frames worth a closer look — not a single mandated add.
    """
    by_group: dict[str, list[dict[str, Any]]] = {}
    for suggestion in suggestions:
        by_group.setdefault(suggestion["duplicate_group"], []).append(suggestion)

    hard_positive_fraction = 0.25
    diversity_fraction = 0.25
    min_confidence_spread = 0.01

    for members in by_group.values():
        if len(members) <= 1:
            continue

        confidences = [member["confidence"] for member in members]
        min_confidence = min(confidences)
        max_confidence = max(confidences)
        confidence_spread = max_confidence - min_confidence

        sorted_by_confidence = sorted(members, key=lambda item: item["confidence"])
        confidence_rank_by_filename = {
            member["filename"]: rank + 1
            for rank, member in enumerate(sorted_by_confidence)
        }

        hard_positive_filenames: set[str] = set()
        hard_positive_pool_size = 0
        if confidence_spread >= min_confidence_spread:
            hard_positive_pool_size = max(
                1, int(len(sorted_by_confidence) * hard_positive_fraction)
            )
            for member in sorted_by_confidence[:hard_positive_pool_size]:
                hard_positive_filenames.add(member["filename"])

        members_with_hash = [member for member in members if member.get("image_hash")]

        def average_intra_burst_similarity(member: dict[str, Any]) -> float:
            member_hash = member.get("image_hash")
            if not member_hash:
                return 1.0
            other_hashes = [
                other["image_hash"]
                for other in members_with_hash
                if other["filename"] != member["filename"] and other.get("image_hash")
            ]
            if not other_hashes:
                return 1.0
            return sum(
                hash_similarity(member_hash, other_hash) for other_hash in other_hashes
            ) / len(other_hashes)

        avg_similarity_by_filename = {
            member["filename"]: average_intra_burst_similarity(member)
            for member in members_with_hash
        }

        diversity_filenames: set[str] = set()
        diversity_pool_size = 0
        diversity_rank_by_filename: dict[str, int] = {}
        if len(members_with_hash) >= 2:
            sorted_by_diversity = sorted(
                members_with_hash,
                key=lambda item: avg_similarity_by_filename[item["filename"]],
            )
            diversity_rank_by_filename = {
                member["filename"]: rank + 1
                for rank, member in enumerate(sorted_by_diversity)
            }
            diversity_pool_size = max(1, int(len(sorted_by_diversity) * diversity_fraction))
            for member in sorted_by_diversity[:diversity_pool_size]:
                diversity_filenames.add(member["filename"])

        pick_filenames = hard_positive_filenames | diversity_filenames

        for suggestion in members:
            filename = suggestion["filename"]
            suggestion["training_pick"] = False
            suggestion["training_pick_reasons"] = []
            suggestion["burst_confidence_min"] = round(min_confidence, 4)
            suggestion["burst_confidence_max"] = round(max_confidence, 4)
            suggestion["burst_confidence_spread"] = round(confidence_spread, 4)
            suggestion["burst_confidence_rank"] = confidence_rank_by_filename.get(
                filename
            )
            suggestion["burst_diversity_rank"] = diversity_rank_by_filename.get(
                filename
            )
            if filename in avg_similarity_by_filename:
                suggestion["burst_avg_intra_similarity"] = round(
                    avg_similarity_by_filename[filename], 4
                )
            suggestion["burst_hard_positive_pool_size"] = hard_positive_pool_size
            suggestion["burst_diversity_pool_size"] = diversity_pool_size

            if (
                suggestion["suggested_action"] != "skip_duplicate_library"
                and not suggestion["suggested_action"].startswith("relabel_to_")
            ):
                suggestion["suggested_action"] = "skip_duplicate_recent"

            if filename not in pick_filenames:
                continue

            reasons: list[str] = []
            if filename in hard_positive_filenames:
                reasons.append("hard_positive_in_burst")
            if filename in diversity_filenames:
                reasons.append("most_diverse_in_burst")

            suggestion["training_pick"] = True
            suggestion["training_pick_reasons"] = reasons
            suggestion["training_pick_reason"] = ",".join(reasons)


def _diversity_from_avg_intra(avg_intra: float, image_count: int) -> str:
    """Map average intra-class similarity to a diversity label."""
    if image_count <= 1:
        return "high"
    if avg_intra >= 0.85:
        return "low"
    if avg_intra < NEW_SCENARIO_THRESHOLD:
        return "high"
    return "medium"


def _duplicate_clusters(
    entries: list[tuple[str, str]],
    duplicate_threshold: float = DUPLICATE_THRESHOLD,
) -> list[list[str]]:
    """Group filenames into connected duplicate clusters (>= threshold similarity)."""
    if len(entries) <= 1:
        return []

    filenames = [filename for filename, _ in entries]
    hash_by_filename = {filename: image_hash for filename, image_hash in entries}

    # Union-find for transitive duplicate groups
    parent = {filename: filename for filename in filenames}

    def find(name: str) -> str:
        while parent[name] != name:
            parent[name] = parent[parent[name]]
            name = parent[name]
        return name

    def union(a: str, b: str) -> None:
        root_a = find(a)
        root_b = find(b)
        if root_a != root_b:
            parent[root_b] = root_a

    for i, (left_name, left_hash) in enumerate(entries):
        for right_name, right_hash in entries[i + 1 :]:
            if hash_similarity(left_hash, right_hash) >= duplicate_threshold:
                union(left_name, right_name)

    clusters: dict[str, list[str]] = {}
    for filename in filenames:
        root = find(filename)
        clusters.setdefault(root, []).append(filename)

    return [sorted(cluster) for cluster in clusters.values() if len(cluster) > 1]


def compute_dataset_category_analysis(
    model_name: str, category: str
) -> dict[str, Any]:
    """Analyze intra/inter similarity for images in one dataset class."""
    index = load_similarity_index(model_name)
    if not index.get("images"):
        rebuild_similarity_index(model_name)
        index = load_similarity_index(model_name)

    dataset_by_class = _dataset_entries_by_class(model_name, index)
    category_entries = dataset_by_class.get(category, [])
    other_entries = [
        entry
        for cls, entries in dataset_by_class.items()
        if cls != category
        for entry in entries
    ]

    hash_entries = [
        (filename, image_hash)
        for _, filename, image_hash in category_entries
        if image_hash
    ]

    image_results: list[dict[str, Any]] = []
    max_intra_values: list[float] = []

    for rel_path, filename, image_hash in category_entries:
        if not image_hash:
            continue

        intra_matches = [
            (other_filename, hash_similarity(image_hash, other_hash))
            for other_rel, other_filename, other_hash in category_entries
            if other_filename != filename and other_hash
        ]

        max_intra = 0.0
        best_intra_filename: str | None = None
        intra_duplicate_count = 0

        for other_filename, similarity in intra_matches:
            if similarity > max_intra:
                max_intra = similarity
                best_intra_filename = other_filename
            if similarity >= DUPLICATE_THRESHOLD:
                intra_duplicate_count += 1

        max_intra_values.append(max_intra)

        max_inter, best_inter_class, best_inter_filename = _best_match_for_hash(
            image_hash, other_entries
        )

        mislabel_hint = (
            max_inter >= MISLABEL_THRESHOLD
            and max_inter > max_intra
            and best_inter_class is not None
        )

        image_results.append(
            {
                "filename": filename,
                "max_intra_similarity": round(max_intra, 4),
                "intra_duplicate_count": intra_duplicate_count,
                "best_intra_match_filename": best_intra_filename,
                "max_inter_similarity": round(max_inter, 4),
                "best_inter_match_class": best_inter_class,
                "best_inter_match_filename": best_inter_filename,
                "mislabel_hint": mislabel_hint,
            }
        )

    image_count = len(image_results)
    avg_intra = (
        sum(max_intra_values) / len(max_intra_values) if max_intra_values else 0.0
    )

    duplicate_clusters = _duplicate_clusters(hash_entries)
    duplicate_image_count = sum(len(cluster) for cluster in duplicate_clusters)
    suggested_remove_count = sum(len(cluster) - 1 for cluster in duplicate_clusters)

    stack_id_by_filename: dict[str, str] = {}
    stack_size_by_filename: dict[str, int] = {}
    for index, cluster in enumerate(duplicate_clusters):
        stack_id = f"{category}-dup-{index}"
        for filename in cluster:
            stack_id_by_filename[filename] = stack_id
            stack_size_by_filename[filename] = len(cluster)

    for result in image_results:
        filename = result["filename"]
        result["duplicate_stack_id"] = stack_id_by_filename.get(filename)
        result["duplicate_stack_size"] = stack_size_by_filename.get(filename, 1)

    return {
        "category": category,
        "image_count": image_count,
        "diversity": _diversity_from_avg_intra(avg_intra, image_count),
        "avg_intra_similarity": round(avg_intra, 4),
        "duplicate_image_count": duplicate_image_count,
        "suggested_remove_count": suggested_remove_count,
        "images": sorted(image_results, key=lambda item: item["filename"]),
    }


def build_categorize_metadata(
    training_file_name: str,
    assigned_label: str,
    image_hash: str | None,
) -> dict[str, Any]:
    parsed = parse_train_filename(training_file_name)
    predicted = parsed["predicted_label"] if parsed else None
    confidence = parsed["confidence"] if parsed else None

    metadata: dict[str, Any] = {
        "confidence_at_add": confidence,
        "predicted_label_at_add": predicted,
        "assigned_label": assigned_label,
        "source": "recent",
        "source_train_filename": training_file_name,
        "added_at": datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "relabeled": predicted is not None and predicted != assigned_label,
    }

    if image_hash:
        metadata["phash"] = image_hash

    return metadata
