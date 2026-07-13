import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import TextEntryDialog from "./dialog/TextEntryDialog";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

type ReclassifySelectionDialogProps = {
  className?: string;
  classes: string[];
  currentCategory: string;
  onReclassify: (newCategory: string) => void;
  children: ReactNode;
};

export default function ReclassifySelectionDialog({
  className,
  classes,
  currentCategory,
  onReclassify,
  children,
}: ReclassifySelectionDialogProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const targetClasses = useMemo(
    () => classes.filter((category) => category !== currentCategory),
    [classes, currentCategory],
  );

  const isChildButton = useMemo(
    () => React.isValidElement(children) && children.type === Button,
    [children],
  );

  const [newClass, setNewClass] = useState(false);

  const onSelectCategory = useCallback(
    (category: string) => {
      onReclassify(category);
    },
    [onReclassify],
  );

  const Selector = isDesktop ? DropdownMenu : Drawer;
  const SelectorTrigger = isDesktop ? DropdownMenuTrigger : DrawerTrigger;
  const SelectorContent = isDesktop ? DropdownMenuContent : DrawerContent;
  const SelectorItem = isDesktop
    ? DropdownMenuItem
    : (props: React.HTMLAttributes<HTMLDivElement>) => (
        <DrawerClose asChild>
          <div {...props} className={cn(props.className, "my-2")} />
        </DrawerClose>
      );

  return (
    <div className={className ?? "flex"}>
      <TextEntryDialog
        open={newClass}
        setOpen={setNewClass}
        title={t("createCategory.new")}
        onSave={(newCategory) => onSelectCategory(newCategory)}
      />

      <Tooltip>
        <Selector>
          <SelectorTrigger asChild>
            <TooltipTrigger asChild={isChildButton}>{children}</TooltipTrigger>
          </SelectorTrigger>
          <SelectorContent
            className={cn("", isMobile && "mx-1 gap-2 rounded-t-2xl px-4")}
          >
            {isMobile && (
              <DrawerHeader className="sr-only">
                <DrawerTitle>Details</DrawerTitle>
                <DrawerDescription>Details</DrawerDescription>
              </DrawerHeader>
            )}
            <DropdownMenuLabel>{t("reclassifyImageAs")}</DropdownMenuLabel>
            <div
              className={cn(
                "flex max-h-[40dvh] flex-col overflow-y-auto",
                isMobile && "gap-2 pb-4",
              )}
            >
              {targetClasses
                .sort((a, b) => {
                  if (a === "none") return 1;
                  if (b === "none") return -1;
                  return a.localeCompare(b);
                })
                .map((category) => (
                  <SelectorItem
                    key={category}
                    className="flex cursor-pointer gap-2 smart-capitalize"
                    onClick={() => onSelectCategory(category)}
                  >
                    {category === "none"
                      ? t("details.none")
                      : category.replaceAll("_", " ")}
                  </SelectorItem>
                ))}
              <Separator />
              <SelectorItem
                className="flex cursor-pointer gap-2 smart-capitalize"
                onClick={() => setNewClass(true)}
              >
                {t("createCategory.new")}
              </SelectorItem>
            </div>
          </SelectorContent>
        </Selector>
        <TooltipContent>{t("reclassifyImage")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
