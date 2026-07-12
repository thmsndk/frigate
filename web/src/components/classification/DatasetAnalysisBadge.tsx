import { DatasetImageAnalysis } from "@/types/classification";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { LuTriangleAlert } from "react-icons/lu";

type DatasetAnalysisBadgeProps = {
  categoryName: string;
  analysis?: DatasetImageAnalysis;
  className?: string;
};

export default function DatasetAnalysisBadge({
  categoryName,
  analysis,
  className,
}: DatasetAnalysisBadgeProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  if (!analysis?.mislabel_hint || !analysis.best_inter_match_class) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] flex-col gap-0.5",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex w-fit max-w-full cursor-help items-center gap-1 rounded-md border border-orange-400/40 bg-amber-600/90 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm backdrop-blur-sm">
            <LuTriangleAlert className="size-3 shrink-0" />
            <span className="truncate">
              {t("datasetAnalysis.badge.mislabel", {
                className: analysis.best_inter_match_class,
              })}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
            {t("datasetAnalysis.tooltip.mislabel", {
              category: categoryName,
              otherClass: analysis.best_inter_match_class,
              interSimilarity: Math.round(analysis.max_inter_similarity * 100),
              intraSimilarity: Math.round(analysis.max_intra_similarity * 100),
            })}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </div>
  );
}
