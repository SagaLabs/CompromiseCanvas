"use client"

import { useEffect } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock3,
  LocateFixed,
  Route,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type {
  PresentationPlaybackCoverage,
  PresentationPlaybackEvent,
  PresentationPlaybackIssue,
} from "@/lib/presentation-playback"

interface PresentationPlaybackControlsProps {
  events: PresentationPlaybackEvent[]
  coverage: PresentationPlaybackCoverage
  issues: PresentationPlaybackIssue[]
  currentIndex: number
  inspectedEdgeId: string | null
  onCurrentIndexChange: (index: number) => void
  onFocusCurrentStep: () => void
  onInspectIssue: (edgeId: string) => void
  onClose: () => void
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)
}

export default function PresentationPlaybackControls({
  events,
  coverage,
  issues,
  currentIndex,
  inspectedEdgeId,
  onCurrentIndexChange,
  onFocusCurrentStep,
  onInspectIssue,
  onClose,
}: PresentationPlaybackControlsProps) {
  const hasEvents = events.length > 0
  const safeCurrentIndex = hasEvents
    ? Math.min(Math.max(currentIndex, 0), events.length - 1)
    : 0
  const currentEvent = events[safeCurrentIndex]
  const incompleteRouteCount =
    coverage.missingTimestampRoutes + coverage.invalidTimestampRoutes
  const complete =
    coverage.totalRoutes > 0 &&
    incompleteRouteCount === 0 &&
    coverage.timestampedRoutes === coverage.totalRoutes

  useEffect(() => {
    if (!hasEvents) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="slider"]',
        )
      ) {
        return
      }

      event.preventDefault()
      const direction = event.key === "ArrowLeft" ? -1 : 1
      const nextIndex = Math.min(
        Math.max(safeCurrentIndex + direction, 0),
        events.length - 1,
      )
      if (nextIndex !== safeCurrentIndex) {
        onCurrentIndexChange(nextIndex)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    events.length,
    hasEvents,
    onCurrentIndexChange,
    safeCurrentIndex,
  ])

  return (
    <section
      data-presentation-playback-controls
      role="region"
      aria-label="Attack playback timeline"
      className="pointer-events-auto absolute bottom-5 left-1/2 w-[min(960px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-gray-700/90 bg-gray-950/90 px-5 py-4 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/30 bg-pink-500/10 px-2.5 py-1 text-xs font-medium text-pink-200">
              <Route className="h-3.5 w-3.5" aria-hidden="true" />
              Attack playback
            </span>
            {hasEvents && (
              <span className="text-xs text-gray-400">
                Step {safeCurrentIndex + 1} of {events.length}
              </span>
            )}
          </div>

          {currentEvent ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-gray-100">
                  {currentEvent.actionType}
                </span>
                <span className="text-gray-500" aria-hidden="true">•</span>
                <span className="text-gray-300">
                  {currentEvent.sourceId === currentEvent.targetId
                    ? `${currentEvent.sourceLabel} self-connection`
                    : `${currentEvent.sourceLabel} → ${currentEvent.targetLabel}`}
                </span>
              </div>
              <time
                dateTime={currentEvent.timestamp}
                className="mt-1 flex items-center gap-1.5 text-xs text-gray-400"
              >
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {formatTimestamp(currentEvent.timestamp)}
              </time>
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-300">
              Add a valid timestamp to the routes before using attack playback.
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous attack step"
            disabled={!hasEvents || safeCurrentIndex === 0}
            onClick={() => onCurrentIndexChange(safeCurrentIndex - 1)}
            className="h-8 w-8 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next attack step"
            disabled={!hasEvents || safeCurrentIndex === events.length - 1}
            onClick={() => onCurrentIndexChange(safeCurrentIndex + 1)}
            className="h-8 w-8 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Focus current attack step"
            title="Focus current attack step"
            disabled={!currentEvent}
            onClick={onFocusCurrentStep}
            className="ml-1 h-8 w-8 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close attack playback"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {hasEvents && (
        <>
          <div className="relative mt-4 px-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-1/2 z-10 -translate-y-1/2"
            >
              {events.map((event, index) => {
                const left =
                  events.length === 1
                    ? 50
                    : (index / (events.length - 1)) * 100

                return (
                  <span
                    key={event.edgeId}
                    data-presentation-playback-marker={
                      index === safeCurrentIndex
                        ? "current"
                        : index < safeCurrentIndex
                          ? "reached"
                          : "future"
                    }
                    className={`absolute top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                      index < safeCurrentIndex
                        ? "h-2 w-2 border-blue-300 bg-blue-400"
                        : index === safeCurrentIndex
                          ? "h-3 w-3 border-white bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                          : "h-2 w-2 border-gray-500 bg-gray-700"
                    }`}
                    style={{ left: `${left}%` }}
                  />
                )
              })}
            </div>
            {events.length > 1 ? (
              <Slider
                aria-label="Attack timeline position"
                value={[safeCurrentIndex]}
                min={0}
                max={events.length - 1}
                step={1}
                onValueChange={([nextIndex]) => onCurrentIndexChange(nextIndex)}
                className="relative z-20"
              />
            ) : (
              <div
                data-presentation-single-step-track
                className="h-5"
                aria-label="One timestamped attack step"
              >
                <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-700" />
              </div>
            )}
          </div>

          <div className="mt-2 flex justify-between gap-4 text-[11px] text-gray-500">
            <time dateTime={events[0].timestamp}>
              {formatTimestamp(events[0].timestamp)}
            </time>
            {events.length > 1 && (
              <time dateTime={events[events.length - 1].timestamp}>
                {formatTimestamp(events[events.length - 1].timestamp)}
              </time>
            )}
          </div>
        </>
      )}

      <div
        className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
          complete
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/80"
            : "border-amber-400/30 bg-amber-500/10 text-amber-100"
        }`}
      >
        {!complete && (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div role="status">
            {complete
              ? `All ${coverage.totalRoutes} routes have valid timestamps.`
              : `Playback includes ${coverage.timestampedRoutes} of ${coverage.totalRoutes} routes. Add a valid timestamp to every route for a complete sequence.${
                  coverage.invalidTimestampRoutes > 0
                    ? ` ${coverage.invalidTimestampRoutes} ${
                        coverage.invalidTimestampRoutes === 1
                          ? "timestamp is"
                          : "timestamps are"
                      } invalid.`
                    : ""
                }`}
          </div>

          {issues.length > 0 && (
            <div className="mt-2">
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-200/70">
                Affected routes · select to highlight
              </div>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {issues.map((issue) => {
                  const selected = inspectedEdgeId === issue.edgeId
                  const routeLabel =
                    issue.sourceId === issue.targetId
                      ? `${issue.sourceLabel} self-connection`
                      : `${issue.sourceLabel} → ${issue.targetLabel}`

                  return (
                    <button
                      key={issue.edgeId}
                      type="button"
                      data-presentation-timestamp-issue={issue.edgeId}
                      aria-pressed={selected}
                      aria-label={`Highlight ${routeLabel}: ${
                        issue.reason === "missing"
                          ? "missing timestamp"
                          : "invalid timestamp"
                      }`}
                      onClick={() => onInspectIssue(issue.edgeId)}
                      className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition ${
                        selected
                          ? "border-amber-300 bg-amber-400/20 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                          : "border-amber-400/20 bg-gray-950/40 text-amber-100/80 hover:border-amber-300/60 hover:bg-amber-400/10"
                      }`}
                    >
                      <span className="block max-w-56 truncate font-medium">
                        {routeLabel}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-amber-200/60">
                        {issue.actionType} ·{" "}
                        {issue.reason === "missing"
                          ? "Missing timestamp"
                          : "Invalid timestamp"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
