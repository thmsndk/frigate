import { cn } from "@/lib/utils";
import { ClassificationSimilarityInfo } from "@/types/classification";
import {
  buildCurationBadgeStack,
  buildCurationTooltipValues,
  CURATION_BADGE_FADE_CLASS,
  getPrimaryCurationBadgeKind,
  getSimilaritySubtitleKey,
  shouldShowSimilaritySubtitle,
} from "@/utils/classificationCurationUtil";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type ClassificationCurationBadgeProps = {
  predictedLabel?: string;
  confidence?: number;
  similarity?: ClassificationSimilarityInfo;
  className?: string;
};

export default function ClassificationCurationBadge({
  predictedLabel,
  confidence,
  similarity,
  className,
}: ClassificationCurationBadgeProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const badgeStack = useMemo(
    () => buildCurationBadgeStack(similarity),
    [similarity],
  );

  const baseKind = getPrimaryCurationBadgeKind(similarity);

  const tooltipValues = useMemo(
    () => buildCurationTooltipValues(similarity, predictedLabel, confidence),
    [similarity, predictedLabel, confidence],
  );

  const showSubtitle = shouldShowSimilaritySubtitle(
    similarity,
    baseKind,
    predictedLabel,
  );
  const subtitleKey = getSimilaritySubtitleKey(baseKind);

  if (badgeStack.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] flex-col gap-0.5",
          className,
        )}
      >
        {badgeStack.map((badge) => {
          const Icon = badge.Icon;
          const tooltipKey = `curation.tooltip.${badge.kind}`;

          return (
            <Tooltip key={badge.kind}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex w-fit max-w-full cursor-help items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight shadow-sm backdrop-blur-sm",
                    badge.className,
                    badge.faded && CURATION_BADGE_FADE_CLASS,
                  )}
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">
                    {t(`curation.badge.${badge.kind}`, {
                      className: badge.relabelTarget,
                      defaultValue: badge.kind,
                    })}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
                  {t(tooltipKey, {
                    ...tooltipValues,
                    defaultValue: t(`curation.badge.${badge.kind}`, {
                      className: badge.relabelTarget,
                      defaultValue: badge.kind,
                    }),
                  })}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          );
        })}
      </div>
      {showSubtitle && subtitleKey && similarity?.bestMatchClass && (
        <div className="pointer-events-none absolute bottom-12 left-2 right-2 z-10 text-[10px] leading-tight text-white/85 drop-shadow-sm">
          {t(`curation.similarity.${subtitleKey}`, {
            similarity: Math.round((similarity.maxSimilarity ?? 0) * 100),
            className: similarity.bestMatchClass,
          })}
        </div>
      )}
    </>
  );
}
