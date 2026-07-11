import { cn } from "@/lib/utils";
import { ClassificationSimilarityInfo } from "@/types/classification";
import {
  buildCurationTooltipValues,
  getCurationBadgePresentation,
  getCurationTooltipKey,
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

  const presentation = useMemo(
    () => getCurationBadgePresentation(similarity?.suggestedAction),
    [similarity?.suggestedAction],
  );

  const tooltipValues = useMemo(
    () => buildCurationTooltipValues(similarity, predictedLabel, confidence),
    [similarity, predictedLabel, confidence],
  );

  const showSubtitle = shouldShowSimilaritySubtitle(
    similarity,
    presentation?.kind,
    predictedLabel,
  );
  const subtitleKey = getSimilaritySubtitleKey(presentation?.kind);

  if (!presentation) {
    return null;
  }

  const Icon = presentation.Icon;
  const tooltipKey =
    getCurationTooltipKey(similarity, similarity?.suggestedAction) ??
    presentation.kind;

  return (
    <>
      <div className={cn("absolute left-1 top-1 z-10 max-w-[calc(100%-0.5rem)]", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight shadow-sm backdrop-blur-sm",
                presentation.className,
              )}
            >
              <Icon className="size-3 shrink-0" />
              <span className="truncate">
                {t(`curation.badge.${presentation.kind}`, {
                  className: presentation.relabelTarget,
                })}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
              {t(`curation.tooltip.${tooltipKey}`, tooltipValues)}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
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
