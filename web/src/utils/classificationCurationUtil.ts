import { cn } from "@/lib/utils";
import {
  ClassificationImageMetadata,
  ClassificationItemMetadata,
  ClassificationItemData,
  ClassificationSimilarityInfo,
  SimilarityPreset,
  TrainFilter,
  TrainSuggestion,
} from "@/types/classification";
import {
  LuArrowLeftRight,
  LuEye,
  LuLayers,
  LuPlus,
  LuSparkles,
} from "react-icons/lu";
import { HiSquare2Stack } from "react-icons/hi2";
import { IconType } from "react-icons/lib";

export type CurationBadgeKind =
  | "duplicate_recent"
  | "duplicate_library"
  | "add"
  | "review"
  | "new_scene"
  | "mislabel";

export type CurationBadgePresentation = {
  kind: CurationBadgeKind;
  relabelTarget?: string;
  className: string;
  Icon: IconType;
};

export function getCurationBadgeKind(
  suggestedAction?: string,
): CurationBadgeKind | undefined {
  if (!suggestedAction) {
    return undefined;
  }

  if (suggestedAction === "skip_duplicate_recent") {
    return "duplicate_recent";
  }
  if (
    suggestedAction === "skip_duplicate_library" ||
    suggestedAction === "skip_duplicate"
  ) {
    return "duplicate_library";
  }
  if (suggestedAction === "add_new_scenario") {
    return "new_scene";
  }
  if (suggestedAction === "add") {
    return "add";
  }
  if (suggestedAction === "review") {
    return "review";
  }
  if (suggestedAction.startsWith("relabel_to_")) {
    return "mislabel";
  }

  return undefined;
}

export function getRelabelTarget(suggestedAction?: string): string | undefined {
  if (!suggestedAction?.startsWith("relabel_to_")) {
    return undefined;
  }

  return suggestedAction.replace("relabel_to_", "");
}

export function getCurationBadgePresentation(
  suggestedAction?: string,
): CurationBadgePresentation | undefined {
  const kind = getCurationBadgeKind(suggestedAction);
  if (!kind) {
    return undefined;
  }

  switch (kind) {
    case "duplicate_recent":
      return {
        kind,
        className: "border-cyan-400/40 bg-cyan-950/90 text-cyan-100",
        Icon: HiSquare2Stack,
      };
    case "duplicate_library":
      return {
        kind,
        className: "border-white/20 bg-black/70 text-gray-200",
        Icon: LuLayers,
      };
    case "add":
      return {
        kind,
        className: "border-success/30 bg-success/90 text-white",
        Icon: LuPlus,
      };
    case "review":
      return {
        kind,
        className: "border-orange-400/40 bg-orange-500/90 text-white",
        Icon: LuEye,
      };
    case "new_scene":
      return {
        kind,
        className: "border-sky-400/40 bg-sky-600/90 text-white",
        Icon: LuSparkles,
      };
    case "mislabel":
      return {
        kind,
        relabelTarget: getRelabelTarget(suggestedAction),
        className: "border-orange-400/40 bg-amber-600/90 text-white",
        Icon: LuArrowLeftRight,
      };
  }
}

export const CURATION_CONFIDENCE_THRESHOLD = 85;
export const CURATION_DUPLICATE_THRESHOLD = 90;

export const RECENT_DUPLICATE_GROUP_OUTLINES = [
  "outline-cyan-400/90",
  "outline-violet-400/90",
  "outline-emerald-400/90",
  "outline-amber-400/90",
  "outline-sky-400/90",
  "outline-fuchsia-400/90",
];

export function buildRecentDuplicateGroupOutlineMap(
  items: ClassificationItemData[],
): Map<string, string> {
  const groupIds = new Set<string>();

  items.forEach((item) => {
    const group = item.similarity?.duplicateGroup;
    const groupSize = item.similarity?.duplicateGroupSize ?? 1;
    if (
      group &&
      groupSize > 1 &&
      item.similarity?.suggestedAction !== "skip_duplicate_library"
    ) {
      groupIds.add(group);
    }
  });

  const sorted = [...groupIds].sort();
  const map = new Map<string, string>();
  sorted.forEach((groupId, index) => {
    map.set(
      groupId,
      cn(
        "outline-dashed",
        RECENT_DUPLICATE_GROUP_OUTLINES[
          index % RECENT_DUPLICATE_GROUP_OUTLINES.length
        ],
      ),
    );
  });

  return map;
}

export function getLibraryDuplicateOutline(): string {
  return "outline-dotted outline-gray-400/80";
}

export function getTileDecorationOutline(
  similarity: ClassificationSimilarityInfo | undefined,
  recentGroupOutlines: Map<string, string>,
): string | undefined {
  if (similarity?.suggestedAction === "skip_duplicate_library") {
    return getLibraryDuplicateOutline();
  }

  if (
    shouldShowRecentDuplicateGroupBorder(similarity) &&
    similarity?.duplicateGroup
  ) {
    return recentGroupOutlines.get(similarity.duplicateGroup);
  }

  return undefined;
}

export function shouldShowRecentDuplicateGroupBorder(
  similarity: ClassificationSimilarityInfo | undefined,
): boolean {
  const groupSize = similarity?.duplicateGroupSize ?? 1;
  return (
    groupSize > 1 &&
    similarity?.suggestedAction !== "skip_duplicate_library" &&
    similarity?.duplicateGroup != undefined
  );
}

export function shouldShowSimilaritySubtitle(
  similarity: ClassificationSimilarityInfo | undefined,
  kind: CurationBadgeKind | undefined,
  predictedLabel?: string,
): boolean {
  if (
    !similarity ||
    !kind ||
    kind === "duplicate_recent" ||
    kind === "duplicate_library" ||
    kind === "new_scene"
  ) {
    return false;
  }

  if (kind === "add") {
    return (similarity.maxSameClassSimilarity ?? 0) < 0.7;
  }

  if (kind === "mislabel") {
    return true;
  }

  if (kind === "review") {
    const other = similarity.maxOtherClassSimilarity ?? 0;
    const same = similarity.maxSameClassSimilarity ?? 0;
    return (
      other >= 0.7 &&
      other > same &&
      similarity.bestMatchClass !== predictedLabel
    );
  }

  return false;
}

export function getSimilaritySubtitleKey(
  kind: CurationBadgeKind | undefined,
): "closerTo" | "matchesLibrary" | undefined {
  if (kind === "mislabel" || kind === "review") {
    return "closerTo";
  }
  if (kind === "add") {
    return "matchesLibrary";
  }
  return undefined;
}

/** Presets shown in the Filter dialog — same categories as tile badges. */
export const CURATION_FILTER_PRESETS: SimilarityPreset[] = [
  "duplicate_recent",
  "duplicate_library",
  "mislabel",
  "add",
  "review",
  "new_scenario",
];

export function suggestedActionForPreset(preset: SimilarityPreset): string {
  switch (preset) {
    case "duplicate_recent":
      return "skip_duplicate_recent";
    case "duplicate_library":
      return "skip_duplicate_library";
    case "add":
      return "add";
    case "review":
      return "review";
    case "new_scenario":
      return "add_new_scenario";
    case "mislabel":
      return "relabel_to_other";
  }
}

export function matchesSimilarityFilter(
  suggestion: ClassificationSimilarityInfo | undefined,
  filter: TrainFilter | undefined,
): boolean {
  if (!filter) {
    return true;
  }

  const hasSimilarityFilter =
    filter.similarity_preset != undefined ||
    filter.min_similarity != undefined ||
    filter.max_similarity != undefined ||
    (filter.similar_to_class != undefined && filter.similar_to_class.length > 0);

  if (!hasSimilarityFilter) {
    return true;
  }

  if (!suggestion) {
    return false;
  }

  if (filter.similar_to_class) {
    if (suggestion.bestMatchClass !== filter.similar_to_class) {
      return false;
    }
  }

  if (filter.similarity_preset) {
    switch (filter.similarity_preset) {
      case "duplicate_recent":
        if (suggestion.suggestedAction !== "skip_duplicate_recent") {
          return false;
        }
        break;
      case "duplicate_library":
        if (
          suggestion.suggestedAction !== "skip_duplicate_library" &&
          suggestion.suggestedAction !== "skip_duplicate"
        ) {
          return false;
        }
        break;
      case "add":
        if (suggestion.suggestedAction !== "add") {
          return false;
        }
        break;
      case "mislabel":
        if (!suggestion.suggestedAction?.startsWith("relabel_to_")) {
          return false;
        }
        break;
      case "new_scenario":
        if (suggestion.suggestedAction !== "add_new_scenario") {
          return false;
        }
        break;
      case "review":
        if (suggestion.suggestedAction !== "review") {
          return false;
        }
        break;
    }
  }

  if (
    filter.min_similarity != undefined &&
    (suggestion.maxSimilarity ?? 0) < filter.min_similarity
  ) {
    return false;
  }

  if (
    filter.max_similarity != undefined &&
    (suggestion.maxSimilarity ?? 0) > filter.max_similarity
  ) {
    return false;
  }

  return true;
}

export function getCurationTooltipKey(
  similarity: ClassificationSimilarityInfo | undefined,
  suggestedAction?: string,
): string | undefined {
  const presentation = getCurationBadgePresentation(suggestedAction);
  if (!presentation) {
    return undefined;
  }

  if (
    presentation.kind === "review" &&
    (similarity?.duplicateGroupSize ?? 1) > 1
  ) {
    return "review_burst";
  }

  if (
    presentation.kind === "add" &&
    (similarity?.duplicateGroupSize ?? 1) > 1
  ) {
    return "add_burst";
  }

  return presentation.kind;
}

export function formatClassLabel(label?: string): string {
  if (!label) {
    return "";
  }

  return label.replaceAll("_", " ");
}

export function buildCurationTooltipValues(
  similarity: ClassificationSimilarityInfo | undefined,
  predictedLabel?: string,
  confidence?: number,
): Record<string, string | number> {
  const label = formatClassLabel(predictedLabel);
  const matchClass = formatClassLabel(similarity?.bestMatchClass) || label;
  const confidencePct = Math.round((confidence ?? 0) * 100);
  const recentSim = Math.round(
    (similarity?.maxSameClassRecentSimilarity ?? 0) * 100,
  );
  const librarySim = Math.round(
    (similarity?.maxSameClassDatasetSimilarity ?? 0) * 100,
  );
  const otherSim = Math.round((similarity?.maxOtherClassSimilarity ?? 0) * 100);
  const maxSim = Math.round((similarity?.maxSimilarity ?? 0) * 100);

  const recent = similarity?.maxSameClassRecentSimilarity ?? 0;
  const library = similarity?.maxSameClassDatasetSimilarity ?? 0;
  const other = similarity?.maxOtherClassSimilarity ?? 0;

  let comparisonTarget = "your training images";
  let matchSimilarity = maxSim;

  if (recent >= library && recent > 0) {
    comparisonTarget = `another ${label} image earlier in Recent`;
    matchSimilarity = recentSim;
  } else if (library >= other && library > 0) {
    comparisonTarget = `${matchClass} in your training library`;
    matchSimilarity = librarySim;
  } else if (other > 0) {
    comparisonTarget = `${matchClass} in your training library`;
    matchSimilarity = otherSim;
  }

  return {
    label,
    className: matchClass,
    predicted: label,
    confidence: confidencePct,
    confidenceThreshold: CURATION_CONFIDENCE_THRESHOLD,
    duplicateThreshold: CURATION_DUPLICATE_THRESHOLD,
    similarity: maxSim,
    recentSimilarity: recentSim,
    librarySimilarity: librarySim,
    matchSimilarity,
    comparisonTarget,
    relabelClass: matchClass,
    groupSize: similarity?.duplicateGroupSize ?? 1,
    repeatCount: Math.max((similarity?.duplicateGroupSize ?? 1) - 1, 0),
  };
}

export function suggestionToSimilarityInfo(
  suggestion: TrainSuggestion,
): ClassificationSimilarityInfo {
  return {
    maxSimilarity: suggestion.max_similarity,
    maxSameClassSimilarity: suggestion.max_same_class_similarity,
    maxSameClassRecentSimilarity: suggestion.max_same_class_recent_similarity,
    maxSameClassDatasetSimilarity: suggestion.max_same_class_dataset_similarity,
    maxOtherClassSimilarity: suggestion.max_other_class_similarity,
    bestMatchClass: suggestion.best_match_class,
    bestMatchFilename: suggestion.best_match_filename,
    suggestedAction: suggestion.suggested_action,
    duplicateGroup: suggestion.duplicate_group,
    duplicateGroupSize: suggestion.duplicate_group_size,
  };
}

export function metadataFromApi(
  metadata?: ClassificationImageMetadata,
): ClassificationItemMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    confidenceAtAdd: metadata.confidence_at_add,
    predictedLabelAtAdd: metadata.predicted_label_at_add,
    assignedLabel: metadata.assigned_label,
    addedAt: metadata.added_at,
    relabeled: metadata.relabeled,
  };
}
