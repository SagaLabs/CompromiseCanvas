"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactFlowInstance, Viewport } from "@xyflow/react"

import type { CustomEdge, CustomNode } from "@/lib/types"
import {
  buildPresentationPlaybackTimeline,
  getPresentationPlaybackFrame,
  type PresentationPlaybackTimeline,
} from "@/lib/presentation-playback"
import {
  buildExpandedPresentationLayout,
  type ExpandedPresentationLayout,
  type PresentationLayoutSize,
} from "@/lib/presentation-layout"

const EMPTY_PLAYBACK_TIMELINE: PresentationPlaybackTimeline = {
  events: [],
  coverage: {
    totalRoutes: 0,
    timestampedRoutes: 0,
    missingTimestampRoutes: 0,
    invalidTimestampRoutes: 0,
  },
  issues: [],
}

const PRESENTATION_FIT_PADDING = 0.08
const PRESENTATION_PLAYBACK_FIT_PADDING = {
  top: "8%",
  right: "8%",
  bottom: "300px",
  left: "8%",
} as const
const PRESENTATION_PLAYBACK_FOCUS_PADDING = {
  top: "22%",
  right: "22%",
  bottom: "300px",
  left: "22%",
} as const
const PRESENTATION_PLAYBACK_FOCUS_ZOOM_INCREASE = 0.25
const PRESENTATION_PLAYBACK_FOCUS_MAX_ZOOM = 1.1

interface EnterPresentationOptions {
  reactFlowInstance: ReactFlowInstance<CustomNode, CustomEdge> | null
  nodes: CustomNode[]
  edges: CustomEdge[]
  flushAutosave: () => void
  onBeforeEnter?: () => void
}

export function useCanvasPresentation() {
  const [presentationMode, setPresentationMode] = useState(false)
  const [autosavePaused, setAutosavePaused] = useState(false)
  const [showAllDetails, setShowAllDetails] = useState(false)
  const [playbackActive, setPlaybackActive] = useState(false)
  const [playbackTimeline, setPlaybackTimeline] =
    useState<PresentationPlaybackTimeline>(EMPTY_PLAYBACK_TIMELINE)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [inspectedPlaybackEdgeId, setInspectedPlaybackEdgeId] = useState<
    string | null
  >(null)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [expandedEdgeIds, setExpandedEdgeIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [expandedLayout, setExpandedLayout] =
    useState<ExpandedPresentationLayout | null>(null)

  const presentationModeRef = useRef(false)
  const playbackActiveRef = useRef(false)
  const autosavePausedRef = useRef(false)
  const reactFlowInstanceRef = useRef<
    ReactFlowInstance<CustomNode, CustomEdge> | null
  >(null)
  const editorViewportRef = useRef<Viewport | null>(null)
  const playbackViewportRef = useRef<Viewport | null>(null)
  const detailsViewportRef = useRef<Viewport | null>(null)
  const presentationNodesRef = useRef<CustomNode[]>([])
  const presentationEdgesRef = useRef<CustomEdge[]>([])
  const fitFrameRef = useRef<number | null>(null)
  const secondFitFrameRef = useRef<number | null>(null)
  const detailsMeasureFrameRef = useRef<number | null>(null)
  const secondDetailsMeasureFrameRef = useRef<number | null>(null)
  const detailsFitFrameRef = useRef<number | null>(null)
  const secondDetailsFitFrameRef = useRef<number | null>(null)
  const detailsRestoreFrameRef = useRef<number | null>(null)
  const secondDetailsRestoreFrameRef = useRef<number | null>(null)
  const playbackFitFrameRef = useRef<number | null>(null)
  const secondPlaybackFitFrameRef = useRef<number | null>(null)
  const playbackRestoreFrameRef = useRef<number | null>(null)
  const secondPlaybackRestoreFrameRef = useRef<number | null>(null)
  const restoreFrameRef = useRef<number | null>(null)
  const secondRestoreFrameRef = useRef<number | null>(null)
  const restoreGenerationRef = useRef(0)

  const cancelFitFrames = useCallback(() => {
    if (fitFrameRef.current !== null) {
      cancelAnimationFrame(fitFrameRef.current)
      fitFrameRef.current = null
    }
    if (secondFitFrameRef.current !== null) {
      cancelAnimationFrame(secondFitFrameRef.current)
      secondFitFrameRef.current = null
    }
  }, [])

  const cancelRestoreFrames = useCallback(() => {
    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current)
      restoreFrameRef.current = null
    }
    if (secondRestoreFrameRef.current !== null) {
      cancelAnimationFrame(secondRestoreFrameRef.current)
      secondRestoreFrameRef.current = null
    }
  }, [])

  const cancelDetailsLayoutFrames = useCallback(() => {
    if (detailsMeasureFrameRef.current !== null) {
      cancelAnimationFrame(detailsMeasureFrameRef.current)
      detailsMeasureFrameRef.current = null
    }
    if (secondDetailsMeasureFrameRef.current !== null) {
      cancelAnimationFrame(secondDetailsMeasureFrameRef.current)
      secondDetailsMeasureFrameRef.current = null
    }
    if (detailsFitFrameRef.current !== null) {
      cancelAnimationFrame(detailsFitFrameRef.current)
      detailsFitFrameRef.current = null
    }
    if (secondDetailsFitFrameRef.current !== null) {
      cancelAnimationFrame(secondDetailsFitFrameRef.current)
      secondDetailsFitFrameRef.current = null
    }
  }, [])

  const cancelDetailsRestoreFrames = useCallback(() => {
    if (detailsRestoreFrameRef.current !== null) {
      cancelAnimationFrame(detailsRestoreFrameRef.current)
      detailsRestoreFrameRef.current = null
    }
    if (secondDetailsRestoreFrameRef.current !== null) {
      cancelAnimationFrame(secondDetailsRestoreFrameRef.current)
      secondDetailsRestoreFrameRef.current = null
    }
  }, [])

  const cancelPlaybackFitFrames = useCallback(() => {
    if (playbackFitFrameRef.current !== null) {
      cancelAnimationFrame(playbackFitFrameRef.current)
      playbackFitFrameRef.current = null
    }
    if (secondPlaybackFitFrameRef.current !== null) {
      cancelAnimationFrame(secondPlaybackFitFrameRef.current)
      secondPlaybackFitFrameRef.current = null
    }
  }, [])

  const cancelPlaybackViewportFrames = useCallback(() => {
    cancelPlaybackFitFrames()
    if (playbackRestoreFrameRef.current !== null) {
      cancelAnimationFrame(playbackRestoreFrameRef.current)
      playbackRestoreFrameRef.current = null
    }
    if (secondPlaybackRestoreFrameRef.current !== null) {
      cancelAnimationFrame(secondPlaybackRestoreFrameRef.current)
      secondPlaybackRestoreFrameRef.current = null
    }
  }, [cancelPlaybackFitFrames])

  const pauseAutosave = useCallback((paused: boolean) => {
    autosavePausedRef.current = paused
    setAutosavePaused(paused)
  }, [])

  const resetTransientPresentationState = useCallback(() => {
    playbackActiveRef.current = false
    setShowAllDetails(false)
    setPlaybackActive(false)
    setPlaybackIndex(0)
    setInspectedPlaybackEdgeId(null)
    setExpandedNodeIds(new Set())
    setExpandedEdgeIds(new Set())
    setExpandedLayout(null)
    detailsViewportRef.current = null
  }, [])

  const enterPresentation = useCallback(
    ({
      reactFlowInstance,
      nodes,
      edges,
      flushAutosave,
      onBeforeEnter,
    }: EnterPresentationOptions) => {
      if (
        !reactFlowInstance ||
        (nodes.length === 0 && edges.length === 0) ||
        presentationModeRef.current ||
        autosavePausedRef.current
      ) {
        return
      }

      restoreGenerationRef.current += 1
      cancelRestoreFrames()
      cancelPlaybackViewportFrames()
      cancelDetailsLayoutFrames()
      cancelDetailsRestoreFrames()
      reactFlowInstanceRef.current = reactFlowInstance
      editorViewportRef.current = reactFlowInstance.getViewport()
      playbackViewportRef.current = null
      detailsViewportRef.current = null
      presentationNodesRef.current = nodes.map((node) => ({
        ...node,
        position: { ...node.position },
      }))
      presentationEdgesRef.current = edges

      // Persist any edit still waiting in the autosave debounce before the
      // presentation viewport replaces the editor viewport.
      flushAutosave()
      pauseAutosave(true)

      resetTransientPresentationState()
      setPlaybackTimeline(buildPresentationPlaybackTimeline(nodes, edges))
      onBeforeEnter?.()
      presentationModeRef.current = true
      setPresentationMode(true)
    },
    [
      cancelRestoreFrames,
      cancelPlaybackViewportFrames,
      cancelDetailsLayoutFrames,
      cancelDetailsRestoreFrames,
      pauseAutosave,
      resetTransientPresentationState,
    ],
  )

  const exitPresentation = useCallback(() => {
    if (!presentationModeRef.current) return

    presentationModeRef.current = false
    cancelFitFrames()
    cancelPlaybackViewportFrames()
    cancelDetailsLayoutFrames()
    cancelDetailsRestoreFrames()
    playbackViewportRef.current = null
    detailsViewportRef.current = null
    presentationNodesRef.current = []
    presentationEdgesRef.current = []
    setPresentationMode(false)
    resetTransientPresentationState()
    setPlaybackTimeline(EMPTY_PLAYBACK_TIMELINE)

    const previousViewport = editorViewportRef.current
    const reactFlowInstance = reactFlowInstanceRef.current
    const restoreGeneration = ++restoreGenerationRef.current

    const finishRestore = () => {
      if (
        restoreGenerationRef.current !== restoreGeneration ||
        presentationModeRef.current
      ) {
        return
      }

      editorViewportRef.current = null
      reactFlowInstanceRef.current = null
      pauseAutosave(false)
    }

    if (!previousViewport || !reactFlowInstance) {
      finishRestore()
      return
    }

    cancelRestoreFrames()
    restoreFrameRef.current = requestAnimationFrame(() => {
      restoreFrameRef.current = null
      secondRestoreFrameRef.current = requestAnimationFrame(() => {
        secondRestoreFrameRef.current = null

        try {
          void reactFlowInstance
            .setViewport(previousViewport, { duration: 250 })
            .then(finishRestore, finishRestore)
        } catch {
          finishRestore()
        }
      })
    })
  }, [
    cancelFitFrames,
    cancelPlaybackViewportFrames,
    cancelDetailsLayoutFrames,
    cancelDetailsRestoreFrames,
    cancelRestoreFrames,
    pauseAutosave,
    resetTransientPresentationState,
  ])

  useEffect(() => {
    if (!presentationMode) return

    const reactFlowInstance = reactFlowInstanceRef.current
    if (!reactFlowInstance) return

    fitFrameRef.current = requestAnimationFrame(() => {
      fitFrameRef.current = null
      secondFitFrameRef.current = requestAnimationFrame(() => {
        secondFitFrameRef.current = null
        void reactFlowInstance.fitView({
          padding: PRESENTATION_FIT_PADDING,
          duration: 300,
        })
      })
    })

    return cancelFitFrames
  }, [cancelFitFrames, presentationMode])

  useEffect(() => {
    if (!presentationMode || !showAllDetails) return

    const reactFlowInstance = reactFlowInstanceRef.current
    if (!reactFlowInstance) return

    cancelDetailsLayoutFrames()
    detailsMeasureFrameRef.current = requestAnimationFrame(() => {
      detailsMeasureFrameRef.current = null
      secondDetailsMeasureFrameRef.current = requestAnimationFrame(() => {
        secondDetailsMeasureFrameRef.current = null

        const zoom = reactFlowInstance.getViewport().zoom || 1
        const edgeLabelSizes: Record<string, PresentationLayoutSize> = {}
        document
          .querySelectorAll<HTMLElement>("[data-presentation-edge-id]")
          .forEach((element) => {
            const edgeId = element.dataset.presentationEdgeId
            if (!edgeId) return

            const bounds = element.getBoundingClientRect()
            edgeLabelSizes[edgeId] = {
              width: bounds.width / zoom,
              height: bounds.height / zoom,
            }
          })

        const baselinePositions = new Map(
          presentationNodesRef.current.map((node) => [
            node.id,
            node.position,
          ]),
        )
        const measuredNodes = (
          reactFlowInstance.getNodes() as CustomNode[]
        ).map((node) => ({
          ...node,
          position: {
            ...(baselinePositions.get(node.id) ?? node.position),
          },
        }))
        const layout = buildExpandedPresentationLayout({
          nodes: measuredNodes,
          edges: presentationEdgesRef.current,
          edgeLabelSizes,
        })
        setExpandedLayout(layout)

        // If every expanded card already has enough room, preserve the
        // presenter's camera as well as the authored node positions.
        if (!layout.hasChanges) return

        detailsFitFrameRef.current = requestAnimationFrame(() => {
          detailsFitFrameRef.current = null
          secondDetailsFitFrameRef.current = requestAnimationFrame(() => {
            secondDetailsFitFrameRef.current = null
            void reactFlowInstance.fitView({
              padding: playbackActiveRef.current
                ? PRESENTATION_PLAYBACK_FIT_PADDING
                : PRESENTATION_FIT_PADDING,
              duration: 300,
            })
          })
        })
      })
    })

    return cancelDetailsLayoutFrames
  }, [
    cancelDetailsLayoutFrames,
    presentationMode,
    showAllDetails,
  ])

  useEffect(() => {
    if (!presentationMode) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      exitPresentation()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [exitPresentation, presentationMode])

  useEffect(
    () => () => {
      restoreGenerationRef.current += 1
      cancelFitFrames()
      cancelPlaybackViewportFrames()
      cancelDetailsLayoutFrames()
      cancelDetailsRestoreFrames()
      cancelRestoreFrames()
    },
    [
      cancelFitFrames,
      cancelPlaybackViewportFrames,
      cancelDetailsLayoutFrames,
      cancelDetailsRestoreFrames,
      cancelRestoreFrames,
    ],
  )

  useEffect(() => {
    if (
      playbackTimeline.events.length > 0 &&
      playbackIndex >= playbackTimeline.events.length
    ) {
      setPlaybackIndex(playbackTimeline.events.length - 1)
    }
  }, [playbackIndex, playbackTimeline.events.length])

  useEffect(() => {
    if (
      inspectedPlaybackEdgeId &&
      !playbackTimeline.issues.some(
        (issue) => issue.edgeId === inspectedPlaybackEdgeId,
      )
    ) {
      setInspectedPlaybackEdgeId(null)
    }
  }, [inspectedPlaybackEdgeId, playbackTimeline.issues])

  const playbackFrame = useMemo(
    () => getPresentationPlaybackFrame(playbackTimeline.events, playbackIndex),
    [playbackIndex, playbackTimeline.events],
  )
  const inspectedPlaybackIssue = useMemo(
    () =>
      playbackTimeline.issues.find(
        (issue) => issue.edgeId === inspectedPlaybackEdgeId,
      ) ?? null,
    [inspectedPlaybackEdgeId, playbackTimeline.issues],
  )
  const inspectedPlaybackNodeIds = useMemo(
    () =>
      inspectedPlaybackIssue
        ? new Set([
            inspectedPlaybackIssue.sourceId,
            inspectedPlaybackIssue.targetId,
          ])
        : new Set<string>(),
    [inspectedPlaybackIssue],
  )

  const toggleNodeDetails = useCallback(
    (id: string) => {
      if (showAllDetails) return

      setExpandedNodeIds((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [showAllDetails],
  )

  const toggleEdgeDetails = useCallback(
    (id: string) => {
      if (showAllDetails) return

      setExpandedEdgeIds((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [showAllDetails],
  )

  const togglePlayback = useCallback(() => {
    const reactFlowInstance = reactFlowInstanceRef.current
    cancelPlaybackViewportFrames()

    if (playbackActive) {
      playbackActiveRef.current = false
      setPlaybackActive(false)
      setInspectedPlaybackEdgeId(null)

      const previousViewport = playbackViewportRef.current
      playbackViewportRef.current = null
      if (reactFlowInstance && previousViewport) {
        playbackRestoreFrameRef.current = requestAnimationFrame(() => {
          playbackRestoreFrameRef.current = null
          secondPlaybackRestoreFrameRef.current = requestAnimationFrame(() => {
            secondPlaybackRestoreFrameRef.current = null
            void reactFlowInstance.setViewport(previousViewport, {
              duration: 250,
            })
          })
        })
      }
      return
    }

    playbackViewportRef.current = reactFlowInstance?.getViewport() ?? null
    playbackActiveRef.current = true
    setPlaybackIndex(0)
    setInspectedPlaybackEdgeId(null)
    setPlaybackActive(true)
  }, [cancelPlaybackViewportFrames, playbackActive])

  const inspectPlaybackIssue = useCallback((edgeId: string) => {
    setInspectedPlaybackEdgeId((current) =>
      current === edgeId ? null : edgeId,
    )
  }, [])

  const focusCurrentPlaybackStep = useCallback(() => {
    const reactFlowInstance = reactFlowInstanceRef.current
    const currentEvent = playbackFrame.currentEvent
    if (!reactFlowInstance || !currentEvent) return

    cancelPlaybackFitFrames()
    const nodeIds = Array.from(
      new Set([currentEvent.sourceId, currentEvent.targetId]),
    )
    const referenceZoom =
      playbackViewportRef.current?.zoom ??
      reactFlowInstance.getViewport().zoom
    void reactFlowInstance.fitView({
      nodes: nodeIds.map((id) => ({ id })),
      padding: PRESENTATION_PLAYBACK_FOCUS_PADDING,
      maxZoom: Math.min(
        PRESENTATION_PLAYBACK_FOCUS_MAX_ZOOM,
        referenceZoom + PRESENTATION_PLAYBACK_FOCUS_ZOOM_INCREASE,
      ),
      duration: 450,
    })
  }, [
    cancelPlaybackFitFrames,
    playbackFrame.currentEvent,
  ])

  useEffect(() => {
    if (
      !presentationMode ||
      !playbackActive ||
      !playbackFrame.currentEvent
    ) {
      return
    }

    cancelPlaybackFitFrames()
    playbackFitFrameRef.current = requestAnimationFrame(() => {
      playbackFitFrameRef.current = null
      secondPlaybackFitFrameRef.current = requestAnimationFrame(() => {
        secondPlaybackFitFrameRef.current = null
        focusCurrentPlaybackStep()
      })
    })

    return cancelPlaybackFitFrames
  }, [
    cancelPlaybackFitFrames,
    focusCurrentPlaybackStep,
    playbackActive,
    playbackFrame.currentEvent,
    presentationMode,
  ])

  const toggleAllDetails = useCallback(() => {
    const reactFlowInstance = reactFlowInstanceRef.current
    cancelDetailsLayoutFrames()
    cancelDetailsRestoreFrames()

    if (!showAllDetails) {
      detailsViewportRef.current =
        reactFlowInstance?.getViewport() ?? null
      setShowAllDetails(true)
      return
    }

    setShowAllDetails(false)
    setExpandedLayout(null)

    const previousViewport = detailsViewportRef.current
    detailsViewportRef.current = null
    if (!reactFlowInstance || !previousViewport) return

    detailsRestoreFrameRef.current = requestAnimationFrame(() => {
      detailsRestoreFrameRef.current = null
      secondDetailsRestoreFrameRef.current = requestAnimationFrame(() => {
        secondDetailsRestoreFrameRef.current = null
        void reactFlowInstance.setViewport(previousViewport, {
          duration: 250,
        })
      })
    })
  }, [
    cancelDetailsLayoutFrames,
    cancelDetailsRestoreFrames,
    showAllDetails,
  ])

  return {
    presentationMode,
    autosavePaused,
    showAllDetails,
    playbackActive,
    playbackTimeline,
    playbackIndex,
    inspectedPlaybackEdgeId,
    expandedNodeIds,
    expandedEdgeIds,
    playbackFrame,
    inspectedPlaybackNodeIds,
    expandedLayout,
    enterPresentation,
    exitPresentation,
    toggleAllDetails,
    toggleNodeDetails,
    toggleEdgeDetails,
    togglePlayback,
    setPlaybackIndex,
    focusCurrentPlaybackStep,
    inspectPlaybackIssue,
  }
}
