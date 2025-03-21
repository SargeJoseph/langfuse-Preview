import { type NestedObservation } from "@/src/utils/types";
import { cn } from "@/src/utils/tailwind";
import {
  type APIScore,
  type Trace,
  type $Enums,
  ObservationLevel,
} from "@langfuse/shared";
import { GroupedScoreBadges } from "@/src/components/grouped-score-badge";
import { Fragment, useMemo, useRef, useEffect } from "react";
import { type ObservationReturnType } from "@/src/server/api/routers/traces";
import { LevelColors } from "@/src/components/level-colors";
import { formatIntervalSeconds } from "@/src/utils/dates";
import {
  InfoIcon,
  MinusCircle,
  MinusIcon,
  PlusCircleIcon,
  PlusIcon,
} from "lucide-react";
import { Toggle } from "@/src/components/ui/toggle";
import { Button } from "@/src/components/ui/button";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import {
  calculateDisplayTotalCost,
  nestObservations,
  treeItemColors,
} from "@/src/components/trace/lib/helpers";
import { CommentCountIcon } from "@/src/features/comments/CommentCountIcon";
import { usdFormatter } from "@/src/utils/numbers";
import Decimal from "decimal.js";

export const ObservationTree = ({
  showExpandControls = true,
  ...props
}: {
  observations: ObservationReturnType[];
  collapsedObservations: string[];
  toggleCollapsedObservation: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  trace: Omit<Trace, "input" | "output"> & {
    latency?: number;
    input: string | undefined;
    output: string | undefined;
  };
  scores: APIScore[];
  currentObservationId: string | undefined;
  setCurrentObservationId: (id: string | undefined) => void;
  showMetrics: boolean;
  showScores: boolean;
  colorCodeMetrics: boolean;
  observationCommentCounts?: Map<string, number>;
  traceCommentCounts?: Map<string, number>;
  className?: string;
  showExpandControls?: boolean;
  minLevel?: ObservationLevel;
  setMinLevel?: React.Dispatch<React.SetStateAction<ObservationLevel>>;
}) => {
  const { nestedObservations, hiddenObservationsCount } = useMemo(
    () => nestObservations(props.observations, props.minLevel),
    [props.observations, props.minLevel],
  );
  const totalCost = useMemo(() => {
    return calculateDisplayTotalCost({
      allObservations: props.observations,
    });
  }, [props.observations]);

  return (
    <div className={props.className}>
      <ObservationTreeTraceNode
        expandAll={props.expandAll}
        collapseAll={props.collapseAll}
        trace={props.trace}
        scores={props.scores}
        comments={props.traceCommentCounts}
        currentObservationId={props.currentObservationId}
        setCurrentObservationId={props.setCurrentObservationId}
        showMetrics={props.showMetrics}
        showScores={props.showScores}
        totalCost={totalCost}
        showExpandControls={showExpandControls}
      />
      <ObservationTreeNode
        observations={nestedObservations}
        collapsedObservations={props.collapsedObservations}
        toggleCollapsedObservation={props.toggleCollapsedObservation}
        scores={props.scores}
        comments={props.observationCommentCounts}
        indentationLevel={1}
        currentObservationId={props.currentObservationId}
        setCurrentObservationId={props.setCurrentObservationId}
        showMetrics={props.showMetrics}
        showScores={props.showScores}
        colorCodeMetrics={props.colorCodeMetrics}
        parentTotalCost={totalCost}
        parentTotalDuration={
          props.trace.latency ? props.trace.latency * 1000 : undefined
        }
      />
      {props.minLevel && hiddenObservationsCount > 0 ? (
        <span className="flex items-center gap-1 p-2 py-4">
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
          <span className="flex flex-row gap-1 text-sm text-muted-foreground">
            <p>
              {hiddenObservationsCount} observations below {props.minLevel}{" "}
              level are hidden.
            </p>
            <p
              className="cursor-pointer underline"
              onClick={() => props.setMinLevel?.(ObservationLevel.DEBUG)}
            >
              Show all
            </p>
          </span>
        </span>
      ) : null}
    </div>
  );
};

const ObservationTreeTraceNode = (props: {
  trace: Omit<Trace, "input" | "output"> & {
    input: string | undefined;
    output: string | undefined;
    latency?: number;
  };
  expandAll: () => void;
  collapseAll: () => void;
  scores: APIScore[];
  comments: Map<string, number> | undefined;
  currentObservationId: string | undefined;
  setCurrentObservationId: (id: string | undefined) => void;
  showMetrics?: boolean;
  showScores?: boolean;
  totalCost?: Decimal;
  showExpandControls?: boolean;
}) => {
  return (
    <div
      className={cn(
        "group mb-0.5 flex cursor-pointer flex-col gap-1 rounded-sm p-1",
        props.currentObservationId === undefined ||
          props.currentObservationId === ""
          ? "bg-muted"
          : "hover:bg-primary-foreground",
      )}
      onClick={() => props.setCurrentObservationId(undefined)}
    >
      <div className="flex gap-2">
        <span className={cn("rounded-sm bg-input px-1 py-0.5 text-xs")}>
          TRACE
        </span>
        <span className="break-all text-sm">{props.trace.name}</span>
        {props.comments ? (
          <CommentCountIcon count={props.comments.get(props.trace.id)} />
        ) : null}
        {props.showExpandControls && (
          <div className="flex flex-1 justify-end">
            <Button
              onClick={(ev) => (ev.stopPropagation(), props.expandAll())}
              size="xs"
              variant="ghost"
              title="Expand all"
            >
              <PlusCircleIcon className="h-4 w-4" />
            </Button>
            <Button
              onClick={(ev) => (ev.stopPropagation(), props.collapseAll())}
              size="xs"
              variant="ghost"
              title="Collapse all"
            >
              <MinusCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {props.showMetrics && (
        <div className="flex gap-2">
          {props.trace.latency ? (
            <span className="text-xs text-muted-foreground">
              {formatIntervalSeconds(props.trace.latency)}
            </span>
          ) : null}
          {props.totalCost ? (
            <span className="text-xs text-muted-foreground">
              {usdFormatter(props.totalCost.toNumber())}
            </span>
          ) : null}
        </div>
      )}
      {props.showScores &&
      props.scores.find((s) => s.observationId === null) ? (
        <div className="flex flex-wrap gap-1">
          <GroupedScoreBadges
            scores={props.scores.filter((s) => s.observationId === null)}
          />
        </div>
      ) : null}
    </div>
  );
};

const ObservationTreeNode = (props: {
  observations: NestedObservation[];
  collapsedObservations: string[];
  toggleCollapsedObservation: (id: string) => void;
  scores: APIScore[];
  comments?: Map<string, number> | undefined;
  indentationLevel: number;
  currentObservationId: string | undefined;
  setCurrentObservationId: (id: string | undefined) => void;
  showMetrics?: boolean;
  showScores?: boolean;
  colorCodeMetrics?: boolean;
  parentTotalCost?: Decimal;
  parentTotalDuration?: number;
}) => {
  return (
    <>
      {props.observations
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .map((observation) => {
          const collapsed = props.collapsedObservations.includes(
            observation.id,
          );

          return (
            <Fragment key={observation.id}>
              <ObservationTreeNodeCard
                observation={observation}
                collapsed={collapsed}
                toggleCollapsedObservation={props.toggleCollapsedObservation}
                scores={props.scores}
                comments={props.comments}
                indentationLevel={props.indentationLevel}
                currentObservationId={props.currentObservationId}
                setCurrentObservationId={props.setCurrentObservationId}
                showMetrics={props.showMetrics}
                showScores={props.showScores}
                colorCodeMetrics={props.colorCodeMetrics}
                parentTotalCost={props.parentTotalCost}
                parentTotalDuration={props.parentTotalDuration}
              />
              {!collapsed && (
                <ObservationTreeNode
                  observations={observation.children}
                  collapsedObservations={props.collapsedObservations}
                  toggleCollapsedObservation={props.toggleCollapsedObservation}
                  scores={props.scores}
                  comments={props.comments}
                  indentationLevel={props.indentationLevel + 1}
                  currentObservationId={props.currentObservationId}
                  setCurrentObservationId={props.setCurrentObservationId}
                  showMetrics={props.showMetrics}
                  showScores={props.showScores}
                  colorCodeMetrics={props.colorCodeMetrics}
                  parentTotalCost={props.parentTotalCost}
                  parentTotalDuration={props.parentTotalDuration}
                />
              )}
            </Fragment>
          );
        })}
    </>
  );
};

const ObservationTreeNodeCard = ({
  observation,
  collapsed,
  toggleCollapsedObservation,
  indentationLevel,
  currentObservationId,
  setCurrentObservationId,
  comments,
  showMetrics,
  showScores,
  scores,
  colorCodeMetrics,
  parentTotalCost,
  parentTotalDuration,
}: {
  observation: NestedObservation;
  collapsed: boolean;
  toggleCollapsedObservation: (id: string) => void;
  scores: APIScore[];
  comments?: Map<string, number> | undefined;
  indentationLevel: number;
  currentObservationId: string | undefined;
  setCurrentObservationId: (id: string | undefined) => void;
  showMetrics?: boolean;
  showScores?: boolean;
  colorCodeMetrics?: boolean;
  parentTotalCost?: Decimal;
  parentTotalDuration?: number;
}) => {
  const capture = usePostHogClientCapture();
  const unnestedObservations = unnestObservations(observation);
  const totalCost = calculateDisplayTotalCost({
    allObservations: unnestedObservations,
  });
  const duration = observation.endTime
    ? observation.endTime.getTime() - observation.startTime.getTime()
    : undefined;

  // On initial render, scroll node into view if it's the current observation
  const currentObservationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      currentObservationId &&
      currentObservationRef.current &&
      currentObservationId === observation.id
    ) {
      currentObservationRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    // Should only trigger a single time on initial render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentObservationId, currentObservationRef.current]);

  return (
    <div className="flex">
      {Array.from({ length: indentationLevel }, (_, i) => (
        <div className="mx-2 border-r" key={i} />
      ))}
      <div
        className={cn(
          "group my-0.5 flex flex-1 cursor-pointer flex-col gap-1 rounded-sm p-1",
          currentObservationId === observation.id
            ? "bg-muted"
            : "hover:bg-primary-foreground",
        )}
        ref={currentObservationRef}
        onClick={() => setCurrentObservationId(observation.id)}
      >
        <div className="flex gap-2">
          <ColorCodedObservationType observationType={observation.type} />
          <div className="grid flex-1 grid-cols-[auto,1fr] gap-2">
            <span className="break-all text-sm">{observation.name}</span>
            {comments ? (
              <CommentCountIcon
                count={comments.get(observation.id)}
                className={treeItemColors.get(observation.type)}
              />
            ) : null}
          </div>
          {observation.children.length === 0 ? null : (
            <Toggle
              onClick={(ev) => (
                ev.stopPropagation(),
                toggleCollapsedObservation(observation.id),
                capture(
                  collapsed
                    ? "trace_detail:observation_tree_expand"
                    : "trace_detail:observation_tree_collapse",
                  { type: "single" },
                )
              )}
              variant="default"
              pressed={collapsed}
              size="xs"
              className="-m-1 h-6 w-6"
              title={collapsed ? "Expand children" : "Collapse children"}
            >
              {collapsed ? (
                <PlusIcon className="h-4 w-4" />
              ) : (
                <MinusIcon className="h-4 w-4" />
              )}
            </Toggle>
          )}
        </div>
        {showMetrics &&
          (observation.promptTokens ||
            observation.completionTokens ||
            observation.totalTokens ||
            duration ||
            totalCost) && (
            <div className="flex gap-2">
              {duration ? (
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    parentTotalDuration &&
                      colorCodeMetrics &&
                      heatMapTextColor({
                        max: parentTotalDuration,
                        value: duration,
                      }),
                  )}
                >
                  {formatIntervalSeconds(duration / 1000)}
                </span>
              ) : null}
              {observation.promptTokens ||
              observation.completionTokens ||
              observation.totalTokens ? (
                <span className="text-xs text-muted-foreground">
                  {observation.promptTokens} → {observation.completionTokens} (∑{" "}
                  {observation.totalTokens})
                </span>
              ) : null}
              {totalCost ? (
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    parentTotalCost &&
                      colorCodeMetrics &&
                      heatMapTextColor({
                        max: parentTotalCost,
                        value: totalCost,
                      }),
                  )}
                >
                  {usdFormatter(totalCost.toNumber())}
                </span>
              ) : null}
            </div>
          )}
        {observation.level !== "DEFAULT" ? (
          <div className="flex">
            <span
              className={cn(
                "rounded-sm p-0.5 text-xs",
                LevelColors[observation.level].bg,
                LevelColors[observation.level].text,
              )}
            >
              {observation.level}
            </span>
          </div>
        ) : null}
        {showScores &&
        scores.find((s) => s.observationId === observation.id) ? (
          <div className="flex flex-wrap gap-1">
            <GroupedScoreBadges
              scores={scores.filter((s) => s.observationId === observation.id)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ColorCodedObservationType = (props: {
  observationType: $Enums.ObservationType;
}) => {
  return (
    <span
      className={cn(
        "self-start rounded-sm px-1 py-0.5 text-xs",
        treeItemColors.get(props.observationType),
      )}
    >
      {props.observationType}
    </span>
  );
};

const unnestObservations = (nestedObservation: NestedObservation) => {
  const unnestedObservations = [];
  const { children, ...observation } = nestedObservation;
  unnestedObservations.push(observation);
  children.forEach((child) => {
    unnestedObservations.push(...unnestObservations(child));
  });
  return unnestedObservations;
};

const heatMapTextColor = (p: {
  min?: Decimal | number;
  max: Decimal | number;
  value: Decimal | number;
}) => {
  const { min, max, value } = p;
  const minDecimal = min ? new Decimal(min) : new Decimal(0);
  const maxDecimal = new Decimal(max);
  const valueDecimal = new Decimal(value);

  const cutOffs: [number, string][] = [
    [0.75, "text-dark-red"], // 75%
    [0.5, "text-dark-yellow"], // 50%
  ];
  const standardizedValueOnStartEndScale = valueDecimal
    .sub(minDecimal)
    .div(maxDecimal.sub(minDecimal));
  const ratio = standardizedValueOnStartEndScale.toNumber();

  // pick based on ratio if threshold is exceeded
  for (const [threshold, color] of cutOffs) {
    if (ratio >= threshold) {
      return color;
    }
  }
  return "";
};
