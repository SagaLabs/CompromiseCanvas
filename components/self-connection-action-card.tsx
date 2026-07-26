"use client"

import { Eye, EyeOff } from "lucide-react"
import type { EdgeActionType } from "@/lib/types"
import { getCompactEdgeActionTypeLabel } from "@/lib/edge-action-types"
import { cn } from "@/lib/utils"
import { getEdgeActionVisual } from "./edge-action-visuals"

interface SelfConnectionActionCardProps {
  actionTypes: EdgeActionType[]
  expanded: boolean
  title: string
  showTitleTooltip: boolean
  compactTimestamp: string | null
  hiddenDetailCount: number
  onExpandedChange: (expanded: boolean) => void
}

export function SelfConnectionActionCard({
  actionTypes,
  expanded,
  title,
  showTitleTooltip,
  compactTimestamp,
  hiddenDetailCount,
  onExpandedChange,
}: SelfConnectionActionCardProps) {
  const compactActionTypes =
    actionTypes.length > 4
      ? actionTypes.slice(0, 3)
      : actionTypes.slice(0, 4)
  const hasCompactMetadata =
    Boolean(compactTimestamp) || hiddenDetailCount > 0

  return (
    <>
      <div
        data-edge-action-summary="true"
        role="group"
        aria-label={`${actionTypes.length} actions: ${actionTypes.join(", ")}`}
        className="space-y-1.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div
            data-edge-compact-title="true"
            title={showTitleTooltip ? title : undefined}
            className={cn(
              "min-w-0 font-semibold text-gray-100",
              expanded
                ? "whitespace-normal break-words leading-4"
                : "truncate",
            )}
          >
            {title}
          </div>

          <button
            type="button"
            data-edge-action-visibility-toggle="true"
            aria-label={
              expanded
                ? "Return to compact self-connection"
                : "Show full self-connection details"
            }
            aria-pressed={expanded}
            title={
              expanded
                ? "Return to compact view"
                : "Show full details"
            }
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
              expanded
                ? "border-blue-400/70 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-700 hover:text-gray-200",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onExpandedChange(!expanded)
            }}
          >
            {expanded ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {expanded ? (
          <div
            data-edge-action-reveal="true"
            className="border-t border-gray-700 pt-2"
          >
            <div className="space-y-1">
              {actionTypes.map((actionType) => {
                const visual = getEdgeActionVisual(actionType)
                const ActionTypeIcon = visual.icon

                return (
                  <div
                    key={actionType}
                    data-edge-action-type={actionType}
                    data-edge-action-row={actionType}
                    className="flex items-center gap-2 px-1 py-1"
                    style={{ color: visual.stroke }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: visual.stroke }}
                    />
                    <ActionTypeIcon
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span
                      data-edge-action-row-text={actionType}
                      className="min-w-0 flex-1 whitespace-normal break-words font-medium leading-4"
                    >
                      {actionType}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div
            data-edge-action-summary-layout="balanced-grid"
            role="list"
            className="grid grid-cols-4 gap-1"
          >
            {compactActionTypes.map((actionType, index) => {
              const visual = getEdgeActionVisual(actionType)
              const ActionTypeIcon = visual.icon
              const centersTrailingAction =
                actionTypes.length === 3 && index === 2

              return (
                <div
                  key={actionType}
                  role="listitem"
                  aria-label={actionType}
                  data-edge-action-summary-icon={actionType}
                  title={actionType}
                  className={cn(
                    "col-span-2 flex min-w-0 items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900/70 px-1.5 py-1",
                    centersTrailingAction && "col-start-2",
                  )}
                  style={{
                    color: visual.stroke,
                    borderLeftColor: visual.stroke,
                    borderLeftWidth: 2,
                  }}
                >
                  <ActionTypeIcon
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0"
                  />
                  <span
                    data-edge-action-summary-label={actionType}
                    className="min-w-0 truncate text-[10px] font-medium"
                  >
                    {getCompactEdgeActionTypeLabel(actionType)}
                  </span>
                </div>
              )
            })}
            {actionTypes.length > 4 && (
              <div
                role="listitem"
                aria-label={`${actionTypes.length - 3} additional action types`}
                data-edge-action-summary-overflow="true"
                className="col-span-2 flex min-w-0 items-center justify-center rounded-md border border-gray-700 bg-gray-900/70 px-1.5 py-1 text-[10px] font-semibold text-gray-300"
              >
                +{actionTypes.length - 3} more
              </div>
            )}
          </div>
        )}
      </div>

      {!expanded && hasCompactMetadata && (
        <div
          data-edge-compact-metadata="true"
          className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-gray-700 pt-1.5 text-[10px] text-gray-400"
        >
          {compactTimestamp && (
            <span
              title={`Timestamp: ${compactTimestamp}`}
              className="max-w-[112px] min-w-0 truncate whitespace-nowrap"
            >
              {compactTimestamp}
            </span>
          )}

          {hiddenDetailCount > 0 && (
            <span
              data-edge-compact-hidden-details="true"
              className="whitespace-nowrap text-gray-400"
            >
              +{hiddenDetailCount}{" "}
              {hiddenDetailCount === 1 ? "detail" : "details"}
            </span>
          )}
        </div>
      )}
    </>
  )
}
