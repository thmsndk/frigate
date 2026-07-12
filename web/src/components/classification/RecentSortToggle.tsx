import FilterSwitch from "@/components/filter/FilterSwitch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RecentSortMode } from "@/types/classification";
import {
  DEFAULT_RECENT_SORT_MODE,
  RecentFocusStats,
} from "@/utils/classificationCurationUtil";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { isDesktop } from "react-device-detect";
import { useTranslation } from "react-i18next";

type RecentSortToggleProps = {
  sortMode: RecentSortMode;
  focusStats?: RecentFocusStats | null;
  onSortModeChange: (sortMode: RecentSortMode) => void;
};

export default function RecentSortToggle({
  sortMode,
  focusStats,
  onSortModeChange,
}: RecentSortToggleProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const isFocus = sortMode === "focus";
  const label =
    isFocus && focusStats
      ? t("sort.focusCount", {
          visible: focusStats.visible,
          total: focusStats.total,
        })
      : t("sort.focus");

  const switchControl = (
    <FilterSwitch
      label={label}
      isChecked={isFocus}
      onCheckedChange={(checked) =>
        onSortModeChange(checked ? "focus" : DEFAULT_RECENT_SORT_MODE)
      }
    />
  );

  if (!isDesktop) {
    return switchControl;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex min-w-[132px] items-center">{switchControl}</div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className="max-w-xs text-sm leading-snug">
          {t("sort.focusTooltip")}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
