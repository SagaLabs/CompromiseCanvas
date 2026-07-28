"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eye, EyeOff, LogOut, Route } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  PresentationPlaybackCoverage,
  PresentationPlaybackEvent,
  PresentationPlaybackIssue,
} from "@/lib/presentation-playback"
import PresentationPlaybackControls from "./presentation-playback-controls"

interface PresentationControlsProps {
  showAllDetails: boolean
  playbackActive: boolean
  playbackEvents: PresentationPlaybackEvent[]
  playbackCoverage: PresentationPlaybackCoverage
  playbackIssues: PresentationPlaybackIssue[]
  playbackIndex: number
  inspectedPlaybackEdgeId: string | null
  onToggleAllDetails: () => void
  onTogglePlayback: () => void
  onPlaybackIndexChange: (index: number) => void
  onFocusCurrentPlaybackStep: () => void
  onInspectPlaybackIssue: (edgeId: string) => void
  onExit: () => void
}

const CONTROLS_HIDE_DELAY_MS = 2500

export default function PresentationControls({
  showAllDetails,
  playbackActive,
  playbackEvents,
  playbackCoverage,
  playbackIssues,
  playbackIndex,
  inspectedPlaybackEdgeId,
  onToggleAllDetails,
  onTogglePlayback,
  onPlaybackIndexChange,
  onFocusCurrentPlaybackStep,
  onInspectPlaybackIssue,
  onExit,
}: PresentationControlsProps) {
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlsRef = useRef<HTMLDivElement | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()

    hideTimer.current = setTimeout(() => {
      if (controlsRef.current?.contains(document.activeElement)) {
        hideTimer.current = null
        return
      }

      setControlsVisible(false)
      hideTimer.current = null
    }, CONTROLS_HIDE_DELAY_MS)
  }, [clearHideTimer])

  useEffect(() => {
    const revealControls = () => {
      setControlsVisible(true)
      scheduleHide()
    }

    window.addEventListener("pointermove", revealControls, { passive: true })
    window.addEventListener("keydown", revealControls)
    scheduleHide()

    return () => {
      window.removeEventListener("pointermove", revealControls)
      window.removeEventListener("keydown", revealControls)
      clearHideTimer()
    }
  }, [clearHideTimer, scheduleHide])

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        data-presentation-branding
        draggable={false}
        width={160}
        height={90}
        className="absolute left-4 top-4 h-auto w-40 select-none opacity-25"
      />

      <div
        ref={controlsRef}
        data-presentation-controls
        data-controls-visible={controlsVisible ? "true" : "false"}
        className={cn(
          "pointer-events-auto absolute right-4 top-4 flex items-center gap-2 transition-opacity duration-200",
          controlsVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!controlsVisible}
        onFocusCapture={() => {
          clearHideTimer()
          setControlsVisible(true)
        }}
        onBlurCapture={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) {
            return
          }

          scheduleHide()
        }}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onTogglePlayback}
          disabled={playbackCoverage.totalRoutes === 0}
          tabIndex={controlsVisible ? 0 : -1}
          aria-pressed={playbackActive}
          title={
            playbackCoverage.totalRoutes === 0
              ? "Add routes before using attack playback"
              : undefined
          }
          className={cn(
            "border bg-gray-900/90 text-gray-100 shadow-lg backdrop-blur hover:bg-gray-800",
            playbackActive
              ? "border-pink-400/60 text-pink-100"
              : "border-gray-600",
          )}
        >
          <Route className="mr-2 h-4 w-4" aria-hidden="true" />
          Attack playback
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onToggleAllDetails}
          tabIndex={controlsVisible ? 0 : -1}
          aria-pressed={showAllDetails}
          className="border border-gray-600 bg-gray-900/90 text-gray-100 shadow-lg backdrop-blur hover:bg-gray-800"
        >
          {showAllDetails ? (
            <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {showAllDetails ? "Hide all details" : "Show all details"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onExit}
          tabIndex={controlsVisible ? 0 : -1}
          className="border border-red-400/40 bg-gray-900/90 text-red-200 shadow-lg backdrop-blur hover:bg-red-950"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Exit presentation
        </Button>
      </div>

      {playbackActive && (
        <PresentationPlaybackControls
          events={playbackEvents}
          coverage={playbackCoverage}
          issues={playbackIssues}
          currentIndex={playbackIndex}
          inspectedEdgeId={inspectedPlaybackEdgeId}
          onCurrentIndexChange={onPlaybackIndexChange}
          onFocusCurrentStep={onFocusCurrentPlaybackStep}
          onInspectIssue={onInspectPlaybackIssue}
          onClose={onTogglePlayback}
        />
      )}
    </div>
  )
}
