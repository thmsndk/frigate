import { DatasetImageAnalysis } from "@/types/classification";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type DatasetIntraSimilarityIndicatorProps = {
  categoryName: string;
  analysis?: DatasetImageAnalysis;
  className?: string;
};

export default function DatasetIntraSimilarityIndicator({
  categoryName,
  analysis,
  className,
}: DatasetIntraSimilarityIndicatorProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  if (!analysis || analysis.max_intra_similarity <= 0) {
    return null;
  }

  const score = Math.round(analysis.max_intra_similarity * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute right-1 top-1 z-10 cursor-help rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm backdrop-blur-sm",
            className,
          )}
        >
          {t("datasetAnalysis.intraSimilarityShort", { score })}
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
          {t("datasetAnalysis.tooltip.intraSimilarity", {
            score,
            category: categoryName,
          })}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
