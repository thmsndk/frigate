import { DatasetImageAnalysis, ClassificationItemData } from "@/types/classification";
import { cn } from "@/lib/utils";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

export const DATASET_DUPLICATE_THRESHOLD_PCT = 90;

export const DIVERSITY_SCORE_BADGE_BASE_CLASS =
  "z-20 cursor-help rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold leading-tight shadow-sm backdrop-blur-sm";

/** Default placement for grid tiles without a pixel-area badge. */
export const DIVERSITY_SCORE_BADGE_POSITION_CLASS = "absolute right-1 top-1";

/** Lower score = more variety (greener); higher = near-duplicate (amber). */
export function getDiversityScoreHue(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return 145 - (clamped / 100) * 107;
}

export function getDiversityScoreColorStyle(score: number): {
  color: string;
  borderColor: string;
} {
  const hue = getDiversityScoreHue(score);
  return {
    color: `hsl(${hue} 82% 72%)`,
    borderColor: `hsl(${hue} 65% 45% / 0.55)`,
  };
}

export type DiversityScoreConfig = {
  score: number;
  tooltipKey: string;
  tooltipValues: Record<string, string | number>;
};

type DiversityScoreBadgeProps = DiversityScoreConfig & {
  className?: string;
  positionClassName?: string;
};

export function DiversityScoreBadge({
  score,
  tooltipKey,
  tooltipValues,
  className,
  positionClassName = DIVERSITY_SCORE_BADGE_POSITION_CLASS,
}: DiversityScoreBadgeProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const colorStyle = getDiversityScoreColorStyle(score);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            DIVERSITY_SCORE_BADGE_BASE_CLASS,
            positionClassName,
            "border",
            className,
          )}
          style={colorStyle}
        >
          {t("datasetAnalysis.intraSimilarityShort", { score })}
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
          {t(tooltipKey, tooltipValues)}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

export function buildDatasetDiversityScoreConfig(
  categoryName: string,
  analysis: DatasetImageAnalysis | undefined,
  t: TFunction,
): DiversityScoreConfig | undefined {
  if (!analysis || analysis.max_intra_similarity <= 0) {
    return undefined;
  }

  const score = Math.round(analysis.max_intra_similarity * 100);
  const stackSize = analysis.duplicate_stack_size ?? 1;
  const stackNote =
    stackSize > 1
      ? t("datasetAnalysis.tooltip.intraSimilarityStackNote", { stackSize })
      : "";

  return {
    score,
    tooltipKey: "datasetAnalysis.tooltip.intraSimilarity",
    tooltipValues: {
      score,
      category: categoryName,
      matchCount: analysis.intra_duplicate_count,
      duplicateThreshold: DATASET_DUPLICATE_THRESHOLD_PCT,
      stackNote,
    },
  };
}

export function buildFrameBurstDiversityScoreConfig(
  data: ClassificationItemData,
  groupSize: number,
): DiversityScoreConfig | undefined {
  if (groupSize <= 1) {
    return undefined;
  }

  const avgSimilarity = data.similarity?.burstAvgIntraSimilarity;
  if (avgSimilarity == undefined || avgSimilarity <= 0) {
    return undefined;
  }

  const score = Math.round(avgSimilarity * 100);
  const peerCount = groupSize - 1;

  return {
    score,
    tooltipKey: "similarity.tooltip.recentBurst",
    tooltipValues: {
      score,
      label: data.name,
      peerCount,
      frameCount: peerCount + 1,
    },
  };
}

/** Non-stacked Recent tile — closest match in library or earlier Recent (any frame). */
export function buildRecentSingleDiversityScoreConfig(
  data: ClassificationItemData,
): DiversityScoreConfig | undefined {
  const recent = data.similarity?.maxSameClassRecentSimilarity ?? 0;
  const library = data.similarity?.maxSameClassDatasetSimilarity ?? 0;
  const closest = Math.max(recent, library);

  if (closest <= 0) {
    return undefined;
  }

  const score = Math.round(closest * 100);
  const source =
    library >= recent && library > 0
      ? "library"
      : recent > 0
        ? "recent"
        : "none";

  return {
    score,
    tooltipKey: "similarity.tooltip.recentSingle",
    tooltipValues: {
      score,
      label: data.name,
      recentPct: Math.round(recent * 100),
      libraryPct: Math.round(library * 100),
      source,
    },
  };
}

type DatasetSimilarityScoreBadgeProps = {
  categoryName: string;
  analysis?: DatasetImageAnalysis;
  className?: string;
};

export function DatasetSimilarityScoreBadge({
  categoryName,
  analysis,
  className,
}: DatasetSimilarityScoreBadgeProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const config = buildDatasetDiversityScoreConfig(categoryName, analysis, t);

  if (!config) {
    return null;
  }

  return <DiversityScoreBadge {...config} className={className} />;
}
