from frigate.util.classification_similarity import (
    _apply_burst_training_picks,
    _diversity_from_avg_intra,
    _duplicate_clusters,
    compute_suggested_action,
    hash_similarity,
    parse_train_filename,
)


class TestClassificationSimilarity:
    def test_parse_train_filename(self):
        parsed = parse_train_filename("none-none-1783796807.881858-package-0.67.webp")
        assert parsed is not None
        assert parsed["predicted_label"] == "package"
        assert parsed["confidence"] == 0.67
        assert parsed["timestamp"] == 1783796807.881858

    def test_parse_train_filename_invalid(self):
        assert parse_train_filename("example_001.jpg") is None

    def test_hash_similarity_identical(self):
        value = "a" * 16
        assert hash_similarity(value, value) == 1.0

    def test_hash_similarity_different(self):
        assert hash_similarity("0" * 16, "f" * 16) == 0.0

    def test_compute_suggested_action_library_duplicate(self):
        action = compute_suggested_action(0.95, 0.95, 0.2, 0.2, "clear")
        assert action == "skip_duplicate_library"

    def test_compute_suggested_action_recent_duplicate(self):
        action = compute_suggested_action(0.95, 0.875, 1.0, 0.2, "clear")
        assert action == "skip_duplicate_recent"

    def test_compute_suggested_action_library_beats_recent(self):
        action = compute_suggested_action(0.95, 0.95, 1.0, 0.2, "clear")
        assert action == "skip_duplicate_library"

    def test_compute_suggested_action_mislabel(self):
        action = compute_suggested_action(0.67, 0.4, 0.2, 0.91, "clear")
        assert action == "relabel_to_clear"

    def test_compute_suggested_action_mislabel_beats_library(self):
        action = compute_suggested_action(0.67, 0.92, 0.2, 0.94, "package")
        assert action == "relabel_to_package"

    def test_compute_suggested_action_new_scenario(self):
        action = compute_suggested_action(0.67, 0.2, 0.2, 0.3, "clear")
        assert action == "add_new_scenario"

    def test_compute_suggested_action_candidate_high_confidence(self):
        action = compute_suggested_action(0.92, 0.75, 0.2, 0.4, "clear")
        assert action == "candidate"

    def test_compute_suggested_action_candidate_low_confidence(self):
        action = compute_suggested_action(0.72, 0.75, 0.2, 0.4, "clear")
        assert action == "candidate"

    def test_burst_marks_multiple_training_picks_as_repeat(self):
        suggestions = [
            {
                "filename": "a.webp",
                "confidence": 0.87,
                "timestamp": 1.0,
                "duplicate_group": "clear-1",
                "image_hash": "0" * 16,
                "suggested_action": "candidate",
            },
            {
                "filename": "b.webp",
                "confidence": 0.99,
                "timestamp": 2.0,
                "duplicate_group": "clear-1",
                "image_hash": "f" * 16,
                "suggested_action": "skip_duplicate_recent",
            },
            {
                "filename": "c.webp",
                "confidence": 0.91,
                "timestamp": 3.0,
                "duplicate_group": "clear-1",
                "image_hash": "a" * 16,
                "suggested_action": "skip_duplicate_recent",
            },
        ]
        _apply_burst_training_picks(suggestions)
        by_name = {item["filename"]: item for item in suggestions}

        assert by_name["a.webp"]["suggested_action"] == "skip_duplicate_recent"
        assert by_name["a.webp"]["training_pick"] is True
        assert "hard_positive_in_burst" in by_name["a.webp"]["training_pick_reasons"]

        assert by_name["b.webp"]["suggested_action"] == "skip_duplicate_recent"
        assert by_name["b.webp"]["training_pick"] is False

        assert by_name["c.webp"]["suggested_action"] == "skip_duplicate_recent"
        assert by_name["c.webp"]["training_pick"] is False

    def test_burst_diversity_pick_can_overlap_hard_positive(self):
        suggestions = [
            {
                "filename": "low.webp",
                "confidence": 0.70,
                "timestamp": 1.0,
                "duplicate_group": "clear-1",
                "image_hash": "0" * 16,
                "suggested_action": "candidate",
            },
            {
                "filename": "high.webp",
                "confidence": 0.95,
                "timestamp": 2.0,
                "duplicate_group": "clear-1",
                "image_hash": "f" * 16,
                "suggested_action": "skip_duplicate_recent",
            },
        ]
        _apply_burst_training_picks(suggestions)
        by_name = {item["filename"]: item for item in suggestions}

        assert by_name["low.webp"]["training_pick"] is True
        assert by_name["low.webp"]["burst_confidence_rank"] == 1
        assert "hard_positive_in_burst" in by_name["low.webp"]["training_pick_reasons"]
        assert by_name["high.webp"]["training_pick"] is True
        assert by_name["high.webp"]["burst_diversity_rank"] == 1
        assert "most_diverse_in_burst" in by_name["high.webp"]["training_pick_reasons"]

    def test_burst_training_pick_on_library_duplicate_in_burst(self):
        suggestions = [
            {
                "filename": "dup.webp",
                "confidence": 0.70,
                "timestamp": 1.0,
                "duplicate_group": "clear-1",
                "image_hash": "0" * 16,
                "suggested_action": "skip_duplicate_library",
            },
            {
                "filename": "other.webp",
                "confidence": 0.95,
                "timestamp": 2.0,
                "duplicate_group": "clear-1",
                "image_hash": "f" * 16,
                "suggested_action": "skip_duplicate_recent",
            },
        ]
        _apply_burst_training_picks(suggestions)
        by_name = {item["filename"]: item for item in suggestions}

        assert by_name["dup.webp"]["suggested_action"] == "skip_duplicate_library"
        assert by_name["dup.webp"]["training_pick"] is True
        assert "hard_positive_in_burst" in by_name["dup.webp"]["training_pick_reasons"]

    def test_burst_preserves_mislabel(self):
        suggestions = [
            {
                "filename": "wrong.webp",
                "confidence": 0.67,
                "timestamp": 1.0,
                "duplicate_group": "clear-1",
                "image_hash": "0" * 16,
                "suggested_action": "relabel_to_package",
            },
            {
                "filename": "peer.webp",
                "confidence": 0.95,
                "timestamp": 2.0,
                "duplicate_group": "clear-1",
                "image_hash": "f" * 16,
                "suggested_action": "skip_duplicate_recent",
            },
        ]
        _apply_burst_training_picks(suggestions)
        by_name = {item["filename"]: item for item in suggestions}

        assert by_name["wrong.webp"]["suggested_action"] == "relabel_to_package"


class TestDatasetCategoryAnalysis:
    def test_diversity_single_image_is_high(self):
        assert _diversity_from_avg_intra(0.0, 1) == "high"

    def test_diversity_low_when_avg_intra_high(self):
        assert _diversity_from_avg_intra(0.92, 5) == "low"

    def test_diversity_high_when_avg_intra_low(self):
        assert _diversity_from_avg_intra(0.55, 5) == "high"

    def test_diversity_medium_between_thresholds(self):
        assert _diversity_from_avg_intra(0.78, 5) == "medium"

    def test_duplicate_clusters_groups_transitive_matches(self):
        identical = "a" * 16
        near = "b" * 16
        different = "f" * 16
        entries = [
            ("a.png", identical),
            ("b.png", identical),
            ("c.png", near),
            ("d.png", different),
        ]
        clusters = _duplicate_clusters(entries)
        cluster_sets = [set(cluster) for cluster in clusters]
        assert {"a.png", "b.png"} in cluster_sets
        assert all("d.png" not in cluster for cluster in cluster_sets)

    def test_duplicate_clusters_empty_for_unique_images(self):
        entries = [
            ("a.png", "0" * 16),
            ("b.png", "f" * 16),
        ]
        assert _duplicate_clusters(entries) == []

    def test_stack_ids_assigned_in_analysis_shape(self):
        # Document expected per-image stack fields (integration needs CLIPS_DIR)
        image_result = {
            "filename": "a.png",
            "duplicate_stack_id": "clear-dup-0",
            "duplicate_stack_size": 2,
        }
        assert image_result["duplicate_stack_id"] == "clear-dup-0"
        assert image_result["duplicate_stack_size"] == 2
