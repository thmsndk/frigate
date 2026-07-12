import {
  ClassificationItemData,
  ClassificationSimilarityInfo,
  DatasetImageAnalysis,
} from "@/types/classification";
import { isInLibraryAction } from "@/utils/classificationCurationUtil";

export type StackDisplayEntry =
  | { kind: "single"; item: ClassificationItemData }
  | { kind: "stack"; stackId: string; items: ClassificationItemData[] };

export function getRecentDuplicateStackId(
  item: ClassificationItemData,
): string | undefined {
  const stackId = item.similarity?.duplicateGroup;
  const stackSize = item.similarity?.duplicateGroupSize ?? 1;
  if (!stackId || stackSize <= 1) {
    return undefined;
  }
  return stackId;
}

export function buildRecentStackDisplayEntries(
  items: ClassificationItemData[],
): StackDisplayEntry[] {
  const buckets = new Map<string, ClassificationItemData[]>();

  items.forEach((item) => {
    const stackId = getRecentDuplicateStackId(item);
    if (!stackId) {
      return;
    }
    const bucket = buckets.get(stackId) ?? [];
    bucket.push(item);
    buckets.set(stackId, bucket);
  });

  const entries: StackDisplayEntry[] = [];
  const emittedStacks = new Set<string>();

  items.forEach((item) => {
    const stackId = getRecentDuplicateStackId(item);
    if (stackId) {
      if (!emittedStacks.has(stackId)) {
        emittedStacks.add(stackId);
        entries.push({
          kind: "stack",
          stackId,
          items: buckets.get(stackId) ?? [item],
        });
      }
      return;
    }

    entries.push({ kind: "single", item });
  });

  return entries;
}

export function summarizeStackLabelCounts(
  items: ClassificationItemData[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const label = item.name?.trim() || "unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label),
    );
}

export function formatStackLabelSummary(
  counts: { label: string; count: number }[],
): string {
  return counts
    .map(({ label, count }) => `${label.replaceAll("_", " ")} ${count}`)
    .join(" · ");
}

export function pickRecentStackRepresentative(
  items: ClassificationItemData[],
): ClassificationItemData {
  const mislabels = items.filter((item) =>
    item.similarity?.suggestedAction?.startsWith("relabel_to_"),
  );
  if (mislabels.length > 0) {
    return mislabels[0];
  }

  // Prefer a visually representative frame — middle of burst, not lowest conf.
  const sortedByTime = [...items].sort(
    (left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0),
  );
  return sortedByTime[Math.floor(sortedByTime.length / 2)] ?? sortedByTime[0];
}

/** Inside a burst stack overlay, plain Repeat badges add noise — keep signal badges only. */
export function shouldShowCurationBadgeInStackOverlay(
  similarity?: ClassificationSimilarityInfo,
): boolean {
  if (!similarity?.suggestedAction) {
    return false;
  }

  if (similarity.suggestedAction.startsWith("relabel_to_")) {
    return true;
  }

  if (isInLibraryAction(similarity.suggestedAction)) {
    return true;
  }

  if (similarity.trainingPick) {
    return true;
  }

  if (
    similarity.suggestedAction === "add_new_scenario" ||
    similarity.suggestedAction === "candidate"
  ) {
    return true;
  }

  return false;
}

export function getDatasetDuplicateStackId(
  analysis?: DatasetImageAnalysis,
): string | undefined {
  if (!analysis?.duplicate_stack_id) {
    return undefined;
  }
  return analysis.duplicate_stack_id;
}

export function buildDatasetStackDisplayEntries(
  items: ClassificationItemData[],
  analysisByFilename: Map<string, DatasetImageAnalysis>,
): StackDisplayEntry[] {
  const buckets = new Map<string, ClassificationItemData[]>();

  items.forEach((item) => {
    const analysis = analysisByFilename.get(item.filename);
    const stackId = getDatasetDuplicateStackId(analysis);
    if (!stackId) {
      return;
    }
    const bucket = buckets.get(stackId) ?? [];
    bucket.push(item);
    buckets.set(stackId, bucket);
  });

  const entries: StackDisplayEntry[] = [];
  const emittedStacks = new Set<string>();

  items.forEach((item) => {
    const analysis = analysisByFilename.get(item.filename);
    const stackId = getDatasetDuplicateStackId(analysis);
    if (stackId) {
      if (!emittedStacks.has(stackId)) {
        emittedStacks.add(stackId);
        entries.push({
          kind: "stack",
          stackId,
          items: buckets.get(stackId) ?? [item],
        });
      }
      return;
    }

    entries.push({ kind: "single", item });
  });

  return entries;
}

export function pickDatasetStackRepresentative(
  items: ClassificationItemData[],
  analysisByFilename: Map<string, DatasetImageAnalysis>,
): ClassificationItemData {
  const withoutMislabel = items.filter(
    (item) => !analysisByFilename.get(item.filename)?.mislabel_hint,
  );
  const pool = withoutMislabel.length > 0 ? withoutMislabel : items;

  return [...pool].sort((left, right) => {
    const leftScore = left.score ?? left.metadata?.confidenceAtAdd ?? 0;
    const rightScore = right.score ?? right.metadata?.confidenceAtAdd ?? 0;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return left.filename.localeCompare(right.filename);
  })[0];
}

export function groupHasDatasetMislabel(
  items: ClassificationItemData[],
  analysisByFilename: Map<string, DatasetImageAnalysis>,
): boolean {
  return items.some(
    (item) => analysisByFilename.get(item.filename)?.mislabel_hint,
  );
}

export function getDatasetMislabelAnalysis(
  items: ClassificationItemData[],
  analysisByFilename: Map<string, DatasetImageAnalysis>,
): DatasetImageAnalysis | undefined {
  return items
    .map((item) => analysisByFilename.get(item.filename))
    .find((analysis) => analysis?.mislabel_hint);
}

export type ClassBalanceEntry = {
  name: string;
  count: number;
};

export type ClassBalanceSummary = {
  entries: ClassBalanceEntry[];
  hasEmptyClass: boolean;
  isImbalanced: boolean;
  maxCount: number;
  minNonZeroCount: number;
};

export function summarizeClassBalance(
  categories: Record<string, string[]>,
): ClassBalanceSummary | null {
  const entries = Object.entries(categories)
    .filter(([name]) => name !== "none")
    .map(([name, images]) => ({ name, count: images.length }))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    return null;
  }

  const counts = entries.map((entry) => entry.count);
  const maxCount = Math.max(...counts);
  const nonZeroCounts = counts.filter((count) => count > 0);
  const minNonZeroCount =
    nonZeroCounts.length > 0 ? Math.min(...nonZeroCounts) : 0;

  return {
    entries,
    hasEmptyClass: counts.some((count) => count === 0),
    isImbalanced:
      minNonZeroCount > 0 && maxCount / minNonZeroCount > 3,
    maxCount,
    minNonZeroCount,
  };
}

export const CLASSIFICATION_GRID_CLASS =
  "grid w-full auto-rows-min grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 3xl:grid-cols-12";

/** Stack modal: keep each tile near main-grid card size even when the dialog is wider. */
export const CLASSIFICATION_OVERLAY_GRID_CLASS =
  "grid w-full auto-rows-min gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]";
