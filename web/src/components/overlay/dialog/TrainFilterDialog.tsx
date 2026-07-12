import { FaFilter } from "react-icons/fa";

import { useEffect, useMemo, useState } from "react";
import { PlatformAwareSheet } from "./PlatformAwareDialog";
import { Button } from "@/components/ui/button";
import { isDesktop, isMobile } from "react-device-detect";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DualThumbSlider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { TrainFilter, SimilarityPreset } from "@/types/classification";
import {
  CURATION_FILTER_PRESETS,
  getCurationBadgePresentationForPreset,
} from "@/utils/classificationCurationUtil";

type TrainFilterDialogProps = {
  filter?: TrainFilter;
  filterValues: {
    classes: string[];
  };
  onUpdateFilter: (filter: TrainFilter) => void;
};
export default function TrainFilterDialog({
  filter,
  filterValues,
  onUpdateFilter,
}: TrainFilterDialogProps) {
  // data
  const { t } = useTranslation(["components/filter"]);
  const [currentFilter, setCurrentFilter] = useState(filter ?? {});

  useEffect(() => {
    if (filter) {
      setCurrentFilter(filter);
    }
  }, [filter]);

  // state

  const [open, setOpen] = useState(false);

  const moreFiltersSelected = useMemo(
    () =>
      currentFilter &&
      (currentFilter.classes ||
        (currentFilter.min_score ?? 0) > 0.5 ||
        (currentFilter.max_score ?? 1) < 1 ||
        currentFilter.similarity_preset != undefined ||
        currentFilter.min_similarity != undefined ||
        currentFilter.max_similarity != undefined ||
        (currentFilter.similar_to_class != undefined &&
          currentFilter.similar_to_class.length > 0)),
    [currentFilter],
  );

  const trigger = (
    <Button
      className="flex items-center gap-2"
      aria-label={t("more")}
      variant={moreFiltersSelected ? "select" : "default"}
    >
      <FaFilter
        className={cn(
          moreFiltersSelected ? "text-white" : "text-secondary-foreground",
        )}
      />
      {isDesktop && t("filter")}
    </Button>
  );
  const content = (
    <div className="space-y-3">
      <ClassFilterContent
        allClasses={filterValues.classes}
        classes={currentFilter.classes}
        updateClasses={(newClasses) =>
          setCurrentFilter({ ...currentFilter, classes: newClasses })
        }
      />
      <ScoreFilterContent
        minScore={currentFilter.min_score}
        maxScore={currentFilter.max_score}
        setScoreRange={(min, max) =>
          setCurrentFilter({ ...currentFilter, min_score: min, max_score: max })
        }
      />
      <SimilarityFilterContent
        allClasses={filterValues.classes}
        preset={currentFilter.similarity_preset}
        minSimilarity={currentFilter.min_similarity}
        maxSimilarity={currentFilter.max_similarity}
        similarToClass={currentFilter.similar_to_class}
        updateFilter={(updates) =>
          setCurrentFilter({ ...currentFilter, ...updates })
        }
      />
      {isDesktop && <DropdownMenuSeparator />}
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          aria-label={t("button.apply", { ns: "common" })}
          onClick={() => {
            if (currentFilter != filter) {
              onUpdateFilter(currentFilter);
            }

            setOpen(false);
          }}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          aria-label={t("reset.label")}
          onClick={() => {
            const resetFilter: TrainFilter = {};
            setCurrentFilter(resetFilter);
            onUpdateFilter(resetFilter);
          }}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </div>
  );

  return (
    <PlatformAwareSheet
      trigger={trigger}
      title={t("filter")}
      content={content}
      contentClassName={cn(
        "w-auto lg:min-w-[275px] scrollbar-container h-full overflow-auto px-4",
        isMobile && "pb-20",
      )}
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentFilter(filter ?? {});
        }

        setOpen(open);
      }}
    />
  );
}

type ClassFilterContentProps = {
  allClasses?: string[];
  classes?: string[];
  updateClasses: (classes: string[] | undefined) => void;
};
export function ClassFilterContent({
  allClasses,
  classes,
  updateClasses,
}: ClassFilterContentProps) {
  const { t } = useTranslation(["components/filter"]);
  return (
    <>
      <div className="overflow-x-hidden">
        <DropdownMenuSeparator className="mb-3" />
        <div className="text-lg">{t("classes.label")}</div>
        {allClasses && (
          <>
            <div className="mb-5 mt-2.5 flex items-center justify-between">
              <Label
                className="mx-2 cursor-pointer text-primary"
                htmlFor="allClasses"
              >
                {t("classes.all.title")}
              </Label>
              <Switch
                className="ml-1"
                id="allClasses"
                checked={classes == undefined}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    updateClasses(undefined);
                  }
                }}
              />
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {allClasses.map((item) => (
                <FilterSwitch
                  key={item}
                  label={
                    item === "none"
                      ? t("details.none", { ns: "views/classificationModel" })
                      : item.replaceAll("_", " ")
                  }
                  isChecked={classes?.includes(item) ?? false}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const updatedClasses = classes ? [...classes] : [];

                      updatedClasses.push(item);
                      updateClasses(updatedClasses);
                    } else {
                      const updatedClasses = classes ? [...classes] : [];

                      // can not deselect the last item
                      if (updatedClasses.length > 1) {
                        updatedClasses.splice(updatedClasses.indexOf(item), 1);
                        updateClasses(updatedClasses);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

type ScoreFilterContentProps = {
  minScore: number | undefined;
  maxScore: number | undefined;
  setScoreRange: (min: number | undefined, max: number | undefined) => void;
};
export function ScoreFilterContent({
  minScore,
  maxScore,
  setScoreRange,
}: ScoreFilterContentProps) {
  const { t } = useTranslation(["components/filter"]);
  return (
    <div className="overflow-x-hidden">
      <DropdownMenuSeparator className="mb-3" />
      <div className="mb-3 text-lg">{t("score")}</div>
      <div className="flex items-center gap-1">
        <Input
          className="w-14 text-center"
          inputMode="numeric"
          value={Math.round((minScore ?? 0.5) * 100)}
          onChange={(e) => {
            const value = e.target.value;

            if (value) {
              setScoreRange(parseInt(value) / 100.0, maxScore ?? 1.0);
            }
          }}
        />
        <DualThumbSlider
          className="mx-2 w-full"
          min={0.5}
          max={1.0}
          step={0.01}
          value={[minScore ?? 0.5, maxScore ?? 1.0]}
          onValueChange={([min, max]) => setScoreRange(min, max)}
        />
        <Input
          className="w-14 text-center"
          inputMode="numeric"
          value={Math.round((maxScore ?? 1.0) * 100)}
          onChange={(e) => {
            const value = e.target.value;

            if (value) {
              setScoreRange(minScore ?? 0.5, parseInt(value) / 100.0);
            }
          }}
        />
      </div>
    </div>
  );
}

type SimilarityFilterContentProps = {
  allClasses?: string[];
  preset?: SimilarityPreset;
  minSimilarity?: number;
  maxSimilarity?: number;
  similarToClass?: string;
  updateFilter: (updates: Partial<TrainFilter>) => void;
};
export function SimilarityFilterContent({
  allClasses,
  preset,
  minSimilarity,
  maxSimilarity,
  similarToClass,
  updateFilter,
}: SimilarityFilterContentProps) {
  const { t } = useTranslation(["components/filter", "views/classificationModel"]);

  const showAdvanced =
    similarToClass != undefined ||
    (minSimilarity ?? 0) > 0 ||
    (maxSimilarity ?? 1) < 1;

  return (
    <div className="overflow-x-hidden">
      <DropdownMenuSeparator className="mb-3" />
      <div className="mb-1 text-lg">{t("similarity.label")}</div>
      <p className="mb-3 text-xs leading-snug text-muted-foreground">
        {t("similarity.hint")}
      </p>
      <div className="mt-2.5 flex flex-col gap-3">
        {CURATION_FILTER_PRESETS.map((item) => {
          const presentation = getCurationBadgePresentationForPreset(item);
          if (!presentation) {
            return null;
          }

          const Icon = presentation.Icon;
          const badgeLabel = t(`curation.badge.${presentation.kind}`, {
            ns: "views/classificationModel",
            className: "",
          });

          return (
            <div
              key={item}
              className="flex items-start justify-between gap-2 rounded-md border border-secondary/60 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={`similarity-preset-${item}`}
                  className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium",
                      presentation.className,
                    )}
                  >
                    <Icon className="size-3 shrink-0" />
                    {badgeLabel}
                  </span>
                </Label>
                <p className="mt-1 pl-0.5 text-xs leading-snug text-muted-foreground">
                  {t(`similarity.presets.${item}.desc`)}
                </p>
              </div>
              <Switch
                id={`similarity-preset-${item}`}
                className="mt-1 shrink-0"
                checked={preset === item}
                onCheckedChange={(isChecked) => {
                  updateFilter({
                    similarity_preset: isChecked ? item : undefined,
                  });
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium text-primary">
          {t("similarity.advanced")}
        </div>
        {allClasses && allClasses.length > 0 && (
          <div className="mb-4">
            <Label className="mb-1 block text-xs text-muted-foreground">
              {t("similarity.similarToClass")}
            </Label>
            <select
              className="w-full rounded-md border border-secondary bg-background px-2 py-1 text-sm"
              value={similarToClass ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                updateFilter({
                  similar_to_class: value.length > 0 ? value : undefined,
                });
              }}
            >
              <option value="">{t("similarity.anyClass")}</option>
              {allClasses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <Label className="mb-2 block text-xs text-muted-foreground">
            {t("similarity.range")}
          </Label>
          <div className="flex items-center gap-1">
            <Input
              className="w-14 text-center"
              inputMode="numeric"
              value={Math.round((minSimilarity ?? 0) * 100)}
              onChange={(e) => {
                const value = e.target.value;

                if (value) {
                  updateFilter({ min_similarity: parseInt(value) / 100.0 });
                }
              }}
            />
            <DualThumbSlider
              className="mx-2 w-full"
              min={0}
              max={1.0}
              step={0.01}
              value={[minSimilarity ?? 0, maxSimilarity ?? 1.0]}
              onValueChange={([min, max]) =>
                updateFilter({ min_similarity: min, max_similarity: max })
              }
            />
            <Input
              className="w-14 text-center"
              inputMode="numeric"
              value={Math.round((maxSimilarity ?? 1.0) * 100)}
              onChange={(e) => {
                const value = e.target.value;

                if (value) {
                  updateFilter({ max_similarity: parseInt(value) / 100.0 });
                }
              }}
            />
          </div>
          {showAdvanced && preset == undefined && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("similarity.rangeHint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
