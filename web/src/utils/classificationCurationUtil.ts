import { cn } from "@/lib/utils";
import {
  ClassificationImageMetadata,
  ClassificationItemMetadata,
  ClassificationItemData,
  ClassificationSimilarityInfo,
  RecentSortMode,
  SimilarityPreset,
  TrainFilter,
  TrainSuggestion,
} from "@/types/classification";
import {
  LuArrowLeftRight,
  LuLayers,
  LuSparkles,
  LuTrendingDown,
  LuScanEye,
} from "react-icons/lu";
import { HiSquare2Stack } from "react-icons/hi2";
import { IconType } from "react-icons/lib";

export type TrainingPickSignalKind =
  | "hard_positive_in_burst"
  | "most_diverse_in_burst";

export type CurationBadgeKind =
  | "duplicate_recent"
  | "duplicate_library"
  | TrainingPickSignalKind
  | "training_pick"
  | "candidate"
  | "new_scene"
  | "mislabel";

export type CurationBadgeStackItem = {
  kind: CurationBadgeKind;
  relabelTarget?: string;
  className: string;
  Icon: IconType;
  faded?: boolean;
};

export const CURATION_BADGE_FADE_CLASS = "opacity-55 saturate-[0.85]";

const TRAINING_PICK_SIGNAL_CLASS =
  "border-amber-200 bg-amber-400 text-black shadow-[0_0_0_1px_rgba(0,0,0,0.35)]";

export function getTrainingPickSignalBadges(
  reasons?: string[],
): CurationBadgeStackItem[] {
  if (!reasons?.length) {
    return [];
  }

  const badges: CurationBadgeStackItem[] = [];

  if (reasons.includes("hard_positive_in_burst")) {
    badges.push({
      kind: "hard_positive_in_burst",
      className: TRAINING_PICK_SIGNAL_CLASS,
      Icon: LuTrendingDown,
    });
  }

  if (reasons.includes("most_diverse_in_burst")) {
    badges.push({
      kind: "most_diverse_in_burst",
      className: "border-violet-200 bg-violet-300 text-black shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",
      Icon: LuScanEye,
    });
  }

  return badges;
}

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
  if (suggestedAction === "training_pick") {
    return "training_pick";
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
  if (
    suggestedAction === "candidate" ||
    suggestedAction === "add" ||
    suggestedAction === "review"
  ) {
    return "candidate";
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
    case "training_pick":
      return {
        kind,
        className: TRAINING_PICK_SIGNAL_CLASS,
        Icon: LuTrendingDown,
      };
    case "hard_positive_in_burst":
      return {
        kind,
        className: TRAINING_PICK_SIGNAL_CLASS,
        Icon: LuTrendingDown,
      };
    case "most_diverse_in_burst":
      return {
        kind,
        className: "border-violet-200 bg-violet-300 text-black shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",
        Icon: LuScanEye,
      };
    case "candidate":
      return {
        kind,
        className: "border-sky-400/40 bg-sky-700/90 text-white",
        Icon: LuSparkles,
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

export const CURATION_DUPLICATE_THRESHOLD = 90;

export function isInLibraryAction(suggestedAction?: string): boolean {
  return (
    suggestedAction === "skip_duplicate_library" ||
    suggestedAction === "skip_duplicate"
  );
}

export function isInRecentBurst(
  similarity?: ClassificationSimilarityInfo,
): boolean {
  return (similarity?.duplicateGroupSize ?? 1) > 1;
}

export function shouldShowRepeatBadge(
  similarity?: ClassificationSimilarityInfo,
): boolean {
  if (!isInRecentBurst(similarity)) {
    return false;
  }

  return similarity?.suggestedAction !== "skip_duplicate_recent";
}

export function getPrimaryCurationBadgeKind(
  similarity?: ClassificationSimilarityInfo,
): CurationBadgeKind | undefined {
  return getCurationBadgeKind(similarity?.suggestedAction);
}

export const DEFAULT_RECENT_SORT_MODE: RecentSortMode = "newest";

/**
 * Per-tile urgency for focus sort (lower = higher in grid).
 * Both signals beat either alone; Lower conf before Most different (uncertainty
 * before diversity — revisit if homelab usage suggests otherwise).
 */
export function getFocusTilePriority(
  similarity?: ClassificationSimilarityInfo,
): number {
  const action = similarity?.suggestedAction;
  if (action?.startsWith("relabel_to_")) {
    return 0;
  }

  const reasons = similarity?.trainingPickReasons ?? [];
  const hasHard = reasons.includes("hard_positive_in_burst");
  const hasDiverse = reasons.includes("most_diverse_in_burst");

  if (hasHard && hasDiverse) {
    return 1;
  }
  if (hasHard) {
    return 2;
  }
  if (hasDiverse) {
    return 3;
  }
  if (isInLibraryAction(action)) {
    return 5;
  }
  if (isInRecentBurst(similarity)) {
    return 4;
  }
  if (
    action === "candidate" ||
    action === "add" ||
    action === "review" ||
    action === "add_new_scenario"
  ) {
    return 6;
  }

  return 7;
}

function getFocusUngroupedTier(
  similarity?: ClassificationSimilarityInfo,
): number {
  const action = similarity?.suggestedAction;
  if (
    action === "candidate" ||
    action === "add" ||
    action === "review" ||
    action === "add_new_scenario"
  ) {
    return 0;
  }
  if (isInLibraryAction(action)) {
    return 2;
  }

  return 1;
}

function getFocusSortKey(item: ClassificationItemData): [number, number, number, string] {
  const timestamp = item.timestamp ?? 0;
  const similarity = item.similarity;
  const inBurst = isInRecentBurst(similarity);
  const isMislabel = similarity?.suggestedAction?.startsWith("relabel_to_") ?? false;

  if (!inBurst && isMislabel) {
    return [0, 0, -timestamp, ""];
  }

  if (inBurst || isMislabel) {
    return [
      1,
      getFocusTilePriority(similarity),
      -timestamp,
      similarity?.duplicateGroup ?? item.filename,
    ];
  }

  return [2, getFocusUngroupedTier(similarity), -timestamp, ""];
}

export function compareRecentItemsForFocusSort(
  a: ClassificationItemData,
  b: ClassificationItemData,
): number {
  const keyA = getFocusSortKey(a);
  const keyB = getFocusSortKey(b);

  for (let index = 0; index < keyA.length; index++) {
    if (keyA[index] < keyB[index]) {
      return -1;
    }
    if (keyA[index] > keyB[index]) {
      return 1;
    }
  }

  return 0;
}

export function sortRecentItems(
  items: ClassificationItemData[],
  mode: RecentSortMode = DEFAULT_RECENT_SORT_MODE,
): ClassificationItemData[] {
  if (mode === "newest") {
    return [...items].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }

  return [...items].sort(compareRecentItemsForFocusSort);
}

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

  if (kind === "candidate") {
    return (similarity.maxSameClassSimilarity ?? 0) < 0.7;
  }

  if (kind === "mislabel") {
    return true;
  }

  if (kind === "training_pick") {
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
  if (kind === "mislabel" || kind === "training_pick") {
    return "closerTo";
  }
  if (kind === "candidate") {
    return "matchesLibrary";
  }
  return undefined;
}

/** Presets shown in the Filter dialog — same categories as tile badges. */
export const CURATION_FILTER_PRESETS: SimilarityPreset[] = [
  "duplicate_recent",
  "duplicate_library",
  "hard_positive_in_burst",
  "most_diverse_in_burst",
  "candidate",
  "mislabel",
  "new_scenario",
];

export function suggestedActionForPreset(preset: SimilarityPreset): string {
  switch (preset) {
    case "duplicate_recent":
      return "skip_duplicate_recent";
    case "duplicate_library":
      return "skip_duplicate_library";
    case "hard_positive_in_burst":
      return "hard_positive_in_burst";
    case "most_diverse_in_burst":
      return "most_diverse_in_burst";
    case "candidate":
      return "candidate";
    case "new_scenario":
      return "add_new_scenario";
    case "mislabel":
      return "relabel_to_other";
  }
}

export function getCurationBadgePresentationForPreset(
  preset: SimilarityPreset,
): CurationBadgePresentation | undefined {
  if (
    preset === "hard_positive_in_burst" ||
    preset === "most_diverse_in_burst"
  ) {
    const signalBadge = getTrainingPickSignalBadges([preset])[0];
    return signalBadge;
  }

  return getCurationBadgePresentation(suggestedActionForPreset(preset));
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
        if (
          suggestion.suggestedAction !== "skip_duplicate_recent" &&
          !(
            isInRecentBurst(suggestion) &&
            suggestion.suggestedAction?.startsWith("relabel_to_")
          ) &&
          !(
            isInRecentBurst(suggestion) &&
            isInLibraryAction(suggestion.suggestedAction)
          )
        ) {
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
      case "hard_positive_in_burst":
        if (
          !suggestion.trainingPickReasons?.includes("hard_positive_in_burst")
        ) {
          return false;
        }
        break;
      case "most_diverse_in_burst":
        if (
          !suggestion.trainingPickReasons?.includes("most_diverse_in_burst")
        ) {
          return false;
        }
        break;
      case "candidate":
        if (
          suggestion.suggestedAction !== "candidate" &&
          suggestion.suggestedAction !== "add" &&
          suggestion.suggestedAction !== "review"
        ) {
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
  suggestedAction?: string,
  trainingPick?: boolean,
  trainingPickReasons?: string[],
): string | undefined {
  if (trainingPick && trainingPickReasons?.length) {
    const hasHard = trainingPickReasons.includes("hard_positive_in_burst");
    const hasDiverse = trainingPickReasons.includes("most_diverse_in_burst");
    if (hasHard && hasDiverse) {
      return "training_pick_both_signals";
    }
    if (hasHard) {
      return "hard_positive_in_burst";
    }
    if (hasDiverse) {
      return "most_diverse_in_burst";
    }
  }

  const presentation = getCurationBadgePresentation(suggestedAction);
  if (!presentation) {
    return undefined;
  }

  return presentation.kind;
}

export function buildCurationBadgeStack(
  similarity?: ClassificationSimilarityInfo,
): CurationBadgeStackItem[] {
  const items: CurationBadgeStackItem[] = [];
  const suggestedAction = similarity?.suggestedAction;
  const inLibrary = isInLibraryAction(suggestedAction);
  const isMislabel = suggestedAction?.startsWith("relabel_to_") ?? false;
  const primaryPresentation = getCurationBadgePresentation(suggestedAction);

  if (isMislabel && primaryPresentation) {
    items.push({ ...primaryPresentation, faded: false });
  }

  if (similarity?.trainingPick) {
    const signalBadges = getTrainingPickSignalBadges(
      similarity.trainingPickReasons,
    );
    if (signalBadges.length > 0) {
      signalBadges.forEach((badge) => {
        items.push({ ...badge, faded: inLibrary });
      });
    } else {
      const fallback = getCurationBadgePresentation("training_pick");
      if (fallback) {
        items.push({ ...fallback, faded: inLibrary });
      }
    }
  }

  if (!isMislabel && primaryPresentation) {
    items.push({ ...primaryPresentation, faded: false });
  }

  if (shouldShowRepeatBadge(similarity)) {
    const repeatBadge = getCurationBadgePresentation("skip_duplicate_recent");
    if (repeatBadge) {
      items.push({ ...repeatBadge, faded: inLibrary });
    }
  }

  return items;
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
    duplicateThreshold: CURATION_DUPLICATE_THRESHOLD,
    similarity: maxSim,
    recentSimilarity: recentSim,
    librarySimilarity: librarySim,
    matchSimilarity,
    comparisonTarget,
    relabelClass: matchClass,
    groupSize: similarity?.duplicateGroupSize ?? 1,
    repeatCount: Math.max((similarity?.duplicateGroupSize ?? 1) - 1, 0),
    lowestConfidence: Math.round((similarity?.burstConfidenceMin ?? 0) * 100),
    highestConfidence: Math.round((similarity?.burstConfidenceMax ?? 0) * 100),
    confidenceSpread: Math.round((similarity?.burstConfidenceSpread ?? 0) * 100),
    confidenceRank: similarity?.burstConfidenceRank ?? "—",
    diversityRank: similarity?.burstDiversityRank ?? "—",
    avgBurstSimilarity: Math.round(
      (similarity?.burstAvgIntraSimilarity ?? 0) * 100,
    ),
    hardPositivePoolSize: similarity?.burstHardPositivePoolSize ?? 0,
    diversityPoolSize: similarity?.burstDiversityPoolSize ?? 0,
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
    trainingPick: suggestion.training_pick,
    trainingPickReason: suggestion.training_pick_reason,
    trainingPickReasons:
      suggestion.training_pick_reasons ??
      (suggestion.training_pick_reason
        ? suggestion.training_pick_reason.split(",").filter(Boolean)
        : undefined),
    burstConfidenceMin: suggestion.burst_confidence_min,
    burstConfidenceMax: suggestion.burst_confidence_max,
    burstConfidenceSpread: suggestion.burst_confidence_spread,
    burstConfidenceRank: suggestion.burst_confidence_rank,
    burstDiversityRank: suggestion.burst_diversity_rank,
    burstAvgIntraSimilarity: suggestion.burst_avg_intra_similarity,
    burstHardPositivePoolSize: suggestion.burst_hard_positive_pool_size,
    burstDiversityPoolSize: suggestion.burst_diversity_pool_size,
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
