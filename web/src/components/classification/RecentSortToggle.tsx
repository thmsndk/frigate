import FilterSwitch from "@/components/filter/FilterSwitch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RecentSortMode } from "@/types/classification";
import { DEFAULT_RECENT_SORT_MODE } from "@/utils/classificationCurationUtil";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { isDesktop } from "react-device-detect";
import { useTranslation } from "react-i18next";

type RecentSortToggleProps = {
  sortMode: RecentSortMode;
  onSortModeChange: (sortMode: RecentSortMode) => void;
};

export default function RecentSortToggle({
  sortMode,
  onSortModeChange,
}: RecentSortToggleProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const isFocus = sortMode === "focus";

  if (!isDesktop) {
    return (
      <FilterSwitch
        label={t("sort.focus")}
        isChecked={isFocus}
        onCheckedChange={(checked) =>
          onSortModeChange(checked ? "focus" : DEFAULT_RECENT_SORT_MODE)
        }
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex min-w-[108px] items-center">
          <FilterSwitch
            label={t("sort.focus")}
            isChecked={isFocus}
            onCheckedChange={(checked) =>
              onSortModeChange(checked ? "focus" : DEFAULT_RECENT_SORT_MODE)
            }
          />
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className="max-w-xs text-sm leading-snug">
          {t("sort.focusTooltip")}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
