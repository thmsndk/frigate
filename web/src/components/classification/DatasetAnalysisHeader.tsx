import { DatasetCategoryAnalysisResponse } from "@/types/classification";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LuTriangleAlert } from "react-icons/lu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type DatasetAnalysisHeaderProps = {
  categoryName: string;
  imageCount: number;
  analysis?: DatasetCategoryAnalysisResponse;
  className?: string;
};

export default function DatasetAnalysisHeader({
  categoryName,
  imageCount,
  analysis,
  className,
}: DatasetAnalysisHeaderProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const displayName =
    categoryName === "none"
      ? t("details.none")
      : categoryName.replaceAll("_", " ");

  const diversityLabel = analysis
    ? t(`datasetAnalysis.diversity.${analysis.diversity}`)
    : null;

  const diversityClassName =
    analysis?.diversity === "low"
      ? "text-amber-400"
      : analysis?.diversity === "medium"
        ? "text-sky-300"
        : "text-emerald-400";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pb-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="font-medium capitalize text-primary">
        {displayName}
      </span>
      <span>({imageCount})</span>
      {analysis && imageCount > 0 && (
        <>
          <span aria-hidden>·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1">
                {t("datasetAnalysis.diversityLabel")}:{" "}
                <span className={cn("font-medium", diversityClassName)}>
                  {diversityLabel}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
                {t(`datasetAnalysis.tooltip.diversity.${analysis.diversity}`, {
                  avg: Math.round(analysis.avg_intra_similarity * 100),
                  count: imageCount,
                })}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
          {analysis.suggested_remove_count > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-amber-400">
                <LuTriangleAlert className="size-3.5 shrink-0" />
                {t("datasetAnalysis.removeDuplicates", {
                  count: analysis.suggested_remove_count,
                })}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
