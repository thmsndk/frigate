import { summarizeClassBalance } from "@/utils/classificationStackUtil";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LuTriangleAlert } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type ClassBalanceStripProps = {
  categories: Record<string, string[]>;
  className?: string;
};

export default function ClassBalanceStrip({
  categories,
  className,
}: ClassBalanceStripProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const summary = useMemo(
    () => summarizeClassBalance(categories),
    [categories],
  );

  if (!summary) {
    return null;
  }

  const showWarning = summary.hasEmptyClass || summary.isImbalanced;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pb-2 text-sm text-muted-foreground",
        className,
      )}
    >
      {summary.entries.map((entry, index) => (
        <span key={entry.name} className="inline-flex items-center gap-1">
          {index > 0 && <span aria-hidden>·</span>}
          <span className="capitalize text-primary">{entry.name}</span>
          <span>({entry.count})</span>
        </span>
      ))}
      {showWarning && (
        <>
          <span aria-hidden>·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 text-amber-400">
                <LuTriangleAlert className="size-3.5 shrink-0" />
                {summary.hasEmptyClass && summary.isImbalanced
                  ? t("classBalance.warningBoth")
                  : summary.hasEmptyClass
                    ? t("classBalance.warningEmpty")
                    : t("classBalance.warningImbalance")}
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="max-w-xs whitespace-pre-line text-sm leading-snug">
                {summary.hasEmptyClass
                  ? t("classBalance.tooltipEmpty")
                  : ""}
                {summary.hasEmptyClass && summary.isImbalanced ? "\n\n" : ""}
                {summary.isImbalanced
                  ? t("classBalance.tooltipImbalance", {
                      max: summary.maxCount,
                      min: summary.minNonZeroCount,
                    })
                  : ""}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </>
      )}
    </div>
  );
}
