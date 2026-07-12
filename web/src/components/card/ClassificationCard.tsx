import { baseUrl } from "@/api/baseUrl";
import useContextMenu from "@/hooks/use-contextmenu";
import { cn } from "@/lib/utils";
import {
  ClassificationItemData,
  ClassificationThreshold,
  ClassifiedEvent,
} from "@/types/classification";
import { forwardRef, useMemo, useRef, useState } from "react";
import { isDesktop, isIOS, isMobile, isMobileOnly } from "react-device-detect";
import { useTranslation } from "react-i18next";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LuSearch, LuInfo } from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { useNavigate } from "react-router-dom";
import { HiSquare2Stack } from "react-icons/hi2";
import { ImageShadowOverlay } from "../overlay/ImageShadowOverlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
  MobilePageTrigger,
} from "../mobile/MobilePage";
import ClassificationCurationBadge from "./ClassificationCurationBadge";
import {
  DiversityScoreBadge,
  DiversityScoreConfig,
} from "@/components/classification/SimilarityScoreBadge";
import {
  formatStackLabelSummary,
  summarizeStackLabelCounts,
  CLASSIFICATION_OVERLAY_GRID_CLASS,
} from "@/utils/classificationStackUtil";

type ClassificationCardProps = {
  className?: string;
  imgClassName?: string;
  data: ClassificationItemData;
  threshold?: ClassificationThreshold;
  selected: boolean;
  clickable: boolean;
  i18nLibrary: string;
  showArea?: boolean;
  count?: number;
  stackLabelCounts?: { label: string; count: number }[];
  duplicateGroupOutline?: string;
  showInteractionHint?: boolean;
  focusMode?: boolean;
  topOverlay?: React.ReactNode;
  diversityScore?: DiversityScoreConfig;
  showCurationBadge?: boolean;
  showScore?: boolean;
  showFooter?: boolean;
  imageLoading?: "lazy" | "eager";
  onImageLoad?: () => void;
  onClick: (data: ClassificationItemData, meta: boolean) => void;
  children?: React.ReactNode;
};
export const ClassificationCard = forwardRef<
  HTMLDivElement,
  ClassificationCardProps
>(function ClassificationCard(
  {
    className,
    imgClassName,
    data,
    threshold,
    selected,
    clickable,
    i18nLibrary,
    showArea = true,
    count,
    stackLabelCounts,
    duplicateGroupOutline,
    showInteractionHint = false,
    focusMode = false,
    topOverlay,
    diversityScore,
    showCurationBadge = true,
    showScore = true,
    showFooter = true,
    imageLoading = "lazy",
    onImageLoad,
    onClick,
    children,
  },
  ref,
) {
  const { t } = useTranslation([i18nLibrary]);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [data.filepath]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    onImageLoad?.();
  };

  const scoreStatus = useMemo(() => {
    if (!data.score || !threshold) {
      return "unknown";
    }

    if (data.score >= threshold.recognition) {
      return "match";
    } else if (data.score >= threshold.unknown) {
      return "potential";
    } else {
      return "unknown";
    }
  }, [data, threshold]);

  // interaction

  const imgRef = useRef<HTMLImageElement | null>(null);

  useContextMenu(imgRef, () => {
    onClick(data, true);
  });

  const imageArea = useMemo(() => {
    if (!showArea || imgRef.current == null || !imageLoaded) {
      return undefined;
    }

    return imgRef.current.naturalWidth * imgRef.current.naturalHeight;
  }, [showArea, imageLoaded]);

  const showDiversityScore = diversityScore != undefined && diversityScore.score > 0;
  const diversityBelowPixelBadge =
    showDiversityScore && imageArea != undefined && !count;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex size-full flex-col overflow-hidden rounded-lg outline outline-[3px]",
        className,
        selected
          ? "shadow-selected outline-selected"
          : duplicateGroupOutline ?? "outline-transparent duration-500",
        clickable && !selected && "cursor-pointer",
      )}
      onClick={(e) => {
        if (!clickable) {
          return;
        }

        const isMeta = e.metaKey || e.ctrlKey;
        if (isMeta) {
          e.stopPropagation();
        }
        onClick(data, isMeta);
      }}
      onContextMenu={(e) => {
        if (!clickable) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        onClick(data, true);
      }}
    >
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-secondary/40" />
      )}
      {showInteractionHint ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              ref={imgRef}
              className={cn(
                "absolute bottom-0 left-0 right-0 top-0 size-full cursor-pointer",
                imgClassName,
                isMobile && "w-full",
              )}
              style={
                isIOS
                  ? {
                      WebkitUserSelect: "none",
                      WebkitTouchCallout: "none",
                    }
                  : undefined
              }
              draggable={false}
              loading={imageLoading}
              onLoad={handleImageLoad}
              src={`${baseUrl}${data.filepath}`}
              alt=""
            />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="text-sm">
              {isDesktop
                ? t("curation.interactionHint")
                : t("curation.interactionHintMobile")}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      ) : (
        <img
          ref={imgRef}
          className={cn(
            "absolute bottom-0 left-0 right-0 top-0 size-full",
            imgClassName,
            isMobile && "w-full",
          )}
          style={
            isIOS
              ? {
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }
              : undefined
          }
          draggable={false}
          loading={imageLoading}
          onLoad={handleImageLoad}
          src={`${baseUrl}${data.filepath}`}
        />
      )}
      <ImageShadowOverlay upperClassName="z-0" lowerClassName="h-[30%] z-0" />
      {showCurationBadge && data.similarity?.suggestedAction && (
        <ClassificationCurationBadge
          predictedLabel={data.name}
          confidence={data.score}
          similarity={data.similarity}
          focusMode={focusMode}
        />
      )}
      {topOverlay}
      {showDiversityScore && (
        <DiversityScoreBadge
          {...diversityScore}
          positionClassName={
            diversityBelowPixelBadge
              ? "absolute right-1 top-8"
              : "absolute right-1 top-1"
          }
        />
      )}
      {count && (
        <div
          className={cn(
            "absolute right-1 z-10 flex flex-row items-center gap-0.5 text-[11px] text-gray-200",
            showDiversityScore ? "top-8" : "top-2",
          )}
        >
          <div>{count}</div>
          <HiSquare2Stack />
        </div>
      )}
      {stackLabelCounts && stackLabelCounts.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-2 pt-5">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium leading-tight text-white">
            {stackLabelCounts.map(({ label, count: labelCount }) => (
              <span key={label} className="smart-capitalize">
                {label.toLowerCase() === "none"
                  ? t("details.none")
                  : label.toLowerCase() === "unknown"
                    ? t("details.unknown")
                    : label.replaceAll("_", " ")}{" "}
                {labelCount}
              </span>
            ))}
          </div>
        </div>
      )}
      {!count && imageArea != undefined && (
        <div className="absolute right-1 top-1 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
          {t("information.pixels", { ns: "common", area: imageArea })}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-black/60 to-transparent" />
      {showFooter && (
      <div className="absolute bottom-0 flex w-full select-none flex-row items-center justify-between gap-2 p-2">
        <div
          className={cn(
            "flex flex-col items-start text-white",
            data.score != undefined ? "text-xs" : "text-sm",
          )}
        >
          <div className="break-all smart-capitalize">
            {data.name.toLowerCase() == "unknown"
              ? t("details.unknown")
              : data.name.toLowerCase() == "none"
                ? t("details.none")
                : data.name}
          </div>
          {showScore && data.score != undefined && (
            <div
              className={cn(
                "",
                scoreStatus == "match" && "text-success",
                scoreStatus == "potential" && "text-orange-400",
                scoreStatus == "unknown" && "text-danger",
              )}
            >
              {Math.round(data.score * 100)}%
            </div>
          )}
          {data.metadata?.confidenceAtAdd != undefined && (
            <div className="text-[10px] leading-tight text-white/80">
              {data.metadata.relabeled
                ? t("metadata.relabeled", {
                    from: data.metadata.predictedLabelAtAdd,
                    fromScore: Math.round(
                      (data.metadata.confidenceAtAdd ?? 0) * 100,
                    ),
                    to: data.metadata.assignedLabel,
                  })
                : t("metadata.addedConfidence", {
                    score: Math.round(data.metadata.confidenceAtAdd * 100),
                  })}
            </div>
          )}
          {data.metadata?.addedAt && data.score == undefined && (
            <div className="text-[10px] leading-tight text-white/80">
              <TimeAgo
                time={new Date(data.metadata.addedAt).getTime()}
                dense
              />
            </div>
          )}
        </div>
        <div
          className="relative z-20 flex flex-row items-start justify-end gap-5 md:gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
      )}
    </div>
  );
});

type GroupedClassificationCardProps = {
  group: ClassificationItemData[];
  classifiedEvent?: ClassifiedEvent;
  threshold?: ClassificationThreshold;
  selectedItems: string[];
  i18nLibrary: string;
  objectType?: string;
  noClassificationLabel?: string;
  representative?: ClassificationItemData;
  collapsedTopOverlay?: React.ReactNode;
  collapsedShowCuration?: boolean;
  collapsedShowScore?: boolean;
  collapsedShowFooter?: boolean;
  overlayDiversityScore?: (
    data: ClassificationItemData,
  ) => DiversityScoreConfig | undefined;
  stackTitle?: string;
  stackDescription?: string;
  overlayFocusMode?: boolean;
  overlayGridClassName?: string;
  shouldShowOverlayBadge?: (data: ClassificationItemData) => boolean;
  renderOverlayBadge?: (data: ClassificationItemData) => React.ReactNode;
  onClick: (data: ClassificationItemData | undefined) => void;
  children?: (data: ClassificationItemData) => React.ReactNode;
};

type GroupedStackOverlayTileProps = {
  data: ClassificationItemData;
  threshold?: ClassificationThreshold;
  i18nLibrary: string;
  overlayFocusMode?: boolean;
  showBadge: boolean;
  renderOverlayBadge?: (data: ClassificationItemData) => React.ReactNode;
  diversityScore?: DiversityScoreConfig;
  children?: React.ReactNode;
};

function GroupedStackOverlayTile({
  data,
  threshold,
  i18nLibrary,
  overlayFocusMode,
  showBadge,
  renderOverlayBadge,
  diversityScore,
  children,
}: GroupedStackOverlayTileProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative aspect-square w-full">
      {showBadge && imageLoaded && renderOverlayBadge?.(data)}
      <ClassificationCard
        data={data}
        threshold={threshold}
        selected={false}
        clickable={false}
        i18nLibrary={i18nLibrary}
        focusMode={overlayFocusMode}
        showCurationBadge={renderOverlayBadge === undefined}
        diversityScore={diversityScore}
        imageLoading="eager"
        onImageLoad={() => setImageLoaded(true)}
        onClick={() => {}}
      >
        {children}
      </ClassificationCard>
    </div>
  );
}
export function GroupedClassificationCard({
  group,
  classifiedEvent,
  threshold,
  selectedItems,
  i18nLibrary,
  noClassificationLabel = "details.none",
  representative,
  collapsedTopOverlay,
  collapsedShowCuration = true,
  collapsedShowScore = true,
  collapsedShowFooter = true,
  overlayDiversityScore,
  stackTitle,
  stackDescription,
  overlayFocusMode = false,
  overlayGridClassName = CLASSIFICATION_OVERLAY_GRID_CLASS,
  shouldShowOverlayBadge,
  renderOverlayBadge,
  onClick,
  children,
}: GroupedClassificationCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["views/explore", i18nLibrary]);
  const [detailOpen, setDetailOpen] = useState(false);

  // data

  const bestItem = useMemo<ClassificationItemData | undefined>(() => {
    if (representative) {
      return representative;
    }

    let best: undefined | ClassificationItemData = undefined;

    group.forEach((item) => {
      if (item?.name != undefined && item.name != "none") {
        if (
          best?.score == undefined ||
          (item.score && best.score < item.score)
        ) {
          best = item;
        }
      }
    });

    if (!best) {
      best = group.at(-1)!;
    }

    const bestTyped: ClassificationItemData = best;
    return {
      ...bestTyped,
      name:
        classifiedEvent?.label && classifiedEvent.label !== "none"
          ? classifiedEvent.label
          : classifiedEvent
            ? t(noClassificationLabel)
            : bestTyped.name,
      score: classifiedEvent?.score,
    };
  }, [group, classifiedEvent, noClassificationLabel, t, representative]);

  const bestScoreStatus = useMemo(() => {
    if (!bestItem?.score || !threshold) {
      return "unknown";
    }

    if (bestItem.score >= threshold.recognition) {
      return "match";
    } else if (bestItem.score >= threshold.unknown) {
      return "potential";
    } else {
      return "unknown";
    }
  }, [bestItem, threshold]);

  const time = useMemo(() => {
    const item = group[0];

    if (!item?.timestamp) {
      return undefined;
    }

    return item.timestamp * 1000;
  }, [group]);

  if (!bestItem) {
    return null;
  }

  const collapsedCardData = useMemo(() => {
    if (collapsedShowCuration) {
      return bestItem;
    }
    return { ...bestItem, similarity: undefined };
  }, [bestItem, collapsedShowCuration]);

  const stackLabelCounts = useMemo(
    () => summarizeStackLabelCounts(group),
    [group],
  );

  const modalTitle =
    stackTitle ??
    (stackLabelCounts.length > 0
      ? formatStackLabelSummary(stackLabelCounts)
      : undefined) ??
    (classifiedEvent?.label && classifiedEvent.label !== "none"
      ? classifiedEvent.label
      : t(noClassificationLabel, { ns: i18nLibrary }));

  const Overlay = isDesktop ? Dialog : MobilePage;
  const Trigger = isDesktop ? DialogTrigger : MobilePageTrigger;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const ContentTitle = isDesktop ? DialogTitle : MobilePageTitle;
  const ContentDescription = isDesktop
    ? DialogDescription
    : MobilePageDescription;

  return (
    <>
      <ClassificationCard
        data={collapsedCardData}
        threshold={threshold}
        selected={group.some((item) => selectedItems.includes(item.filename))}
        clickable={true}
        i18nLibrary={i18nLibrary}
        count={group.length}
        stackLabelCounts={stackLabelCounts}
        topOverlay={collapsedTopOverlay}
        showCurationBadge={collapsedShowCuration}
        showScore={collapsedShowScore}
        showFooter={collapsedShowFooter}
        onClick={(_, meta) => {
          if (meta || selectedItems.length > 0) {
            onClick(undefined);
          } else {
            setDetailOpen(true);
          }
        }}
      />
      <Overlay
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOpen(false);
          }
        }}
      >
        <Trigger asChild></Trigger>
        <Content
          className={cn(
            "flex max-h-[85dvh] flex-col overflow-hidden p-0",
            isDesktop && "min-w-[80%] w-[95vw] max-w-[95vw]",
            isMobile && "h-[85dvh]",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <>
            <Header
              className={cn(
                "mx-2 shrink-0 flex flex-row items-center gap-4 border-b border-secondary/40 pb-3 pt-4",
                isMobileOnly && "top-0 mx-4",
              )}
            >
              <div
                className={cn(
                  "",
                  isMobile && "flex flex-col items-center justify-center",
                )}
              >
                <ContentTitle className="flex items-center gap-2 font-normal capitalize">
                  {modalTitle}
                  {classifiedEvent?.label &&
                    classifiedEvent.label !== "none" &&
                    classifiedEvent.score !== undefined && (
                      <div className="flex items-center gap-1">
                        <div
                          className={cn(
                            "",
                            bestScoreStatus == "match" && "text-success",
                            bestScoreStatus == "potential" && "text-orange-400",
                            bestScoreStatus == "unknown" && "text-danger",
                          )}
                        >{`${Math.round((classifiedEvent.score || 0) * 100)}%`}</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="focus:outline-none"
                              aria-label={t("details.scoreInfo", {
                                ns: i18nLibrary,
                              })}
                            >
                              <LuInfo className="size-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 text-sm">
                            {t("details.scoreInfo", { ns: i18nLibrary })}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                </ContentTitle>
                <ContentDescription className={cn("", isMobile && "px-2")}>
                  {stackDescription}
                  {!stackDescription && time && (
                    <TimeAgo
                      className="text-sm text-secondary-foreground"
                      time={time}
                      dense
                    />
                  )}
                </ContentDescription>
              </div>
              {classifiedEvent && (
                <div
                  className={cn(
                    "flex",
                    isDesktop && "flex-row justify-between",
                    isMobile && "absolute right-4 top-8",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="cursor-pointer"
                        tabIndex={-1}
                        onClick={() => {
                          navigate(`/explore?event_id=${classifiedEvent.id}`);
                        }}
                      >
                        <LuSearch className="size-4 text-secondary-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent>
                        {t("details.item.button.viewInExplore", {
                          ns: "views/explore",
                        })}
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </div>
              )}
            </Header>
            {detailOpen && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div
                  className={cn(
                    overlayGridClassName,
                    isDesktop && "p-2",
                    isMobile && "px-4 pb-4",
                  )}
                >
                  {group.map((data: ClassificationItemData) => {
                    const showBadge = Boolean(
                      renderOverlayBadge &&
                        (shouldShowOverlayBadge?.(data) ?? true),
                    );
                    return (
                      <GroupedStackOverlayTile
                        key={data.filename}
                        data={data}
                        threshold={threshold}
                        i18nLibrary={i18nLibrary}
                        overlayFocusMode={overlayFocusMode}
                        showBadge={showBadge}
                        renderOverlayBadge={renderOverlayBadge}
                        diversityScore={overlayDiversityScore?.(data)}
                      >
                        {children?.(data)}
                      </GroupedStackOverlayTile>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        </Content>
      </Overlay>
    </>
  );
}
