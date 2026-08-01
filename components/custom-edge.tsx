import type React from "react"
import { memo, useState, useRef, useCallback, useEffect, useMemo } from "react"
import { type Edge, type EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useStore } from "@xyflow/react"
import type { EdgeData, EdgeActionType } from "@/lib/types"
import {
  PenToolIcon as Tool,
  User,
  Clock,
  ClockAlert,
  FileText,
  Wifi,
  Code,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import EdgeToolbar from "./edge-toolbar"
import {
  getMitreTechniqueLabel,
  getMitreTechniqueUrl,
  normalizeMitreTechniqueReferences,
} from "@/lib/mitre-attack"
import { getEdgeActionTypes } from "@/lib/edge-action-types"
import { useCanvasActions } from "./canvas-actions-context"
import { getEdgeActionVisual } from "./edge-action-visuals"
import { SelfConnectionActionCard } from "./self-connection-action-card"
import {
  formatCompactLocalTimestamp,
  getCenteredParallelLaneCenters,
} from "@/lib/self-connection-runtime"
import { useCanvasPresentation } from "./canvas-presentation-context"
import { presentationEdgeDisplaySettings } from "@/lib/presentation-details"

interface CustomEdgeProps extends EdgeProps<Edge<EdgeData>> {
  animationsEnabled?: boolean
  selected?: boolean
  actionTypesExpanded?: boolean
  onDeleteEdge?: (id: string) => void
  onSetEdgeActionTypes?: (id: string, actionTypes: EdgeActionType[]) => void
  onSetEdgeActionTypesExpanded?: (id: string, expanded: boolean) => void
  onSelectEdge?: (id: string, additive?: boolean) => void
  onSetEdgeLabelOffset?: (id: string, x: number, y: number) => void
  onToggleEdgeUnlocked?: (id: string) => void
}

const EDGE_ROUTE_DRAG_THRESHOLD_PX = 4
const EDGE_TOOLBAR_CARD_GAP_PX = 20
const EDGE_TOOLBAR_ESTIMATED_WIDTH_PX = 104
const EDGE_TOOLBAR_ESTIMATED_HEIGHT_PX = 38
const SELF_LOOP_LABEL_CLEARANCE_PX = 80
const SELF_LOOP_CARD_ASSET_GAP_PX = 16
const SELF_LOOP_INITIAL_LABEL_CARD_HEIGHT_PX = 100

interface SelfLoopGeometry {
  path: string
  labelX: number
  labelY: number
}

function getSelfLoopGeometry({
  sourceX,
  sourceY,
  targetX,
  targetY,
  nodeHeight = 0,
  offsetX = 0,
  offsetY = 0,
  laneOffset = 0,
  labelClearance = SELF_LOOP_LABEL_CLEARANCE_PX,
}: {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  nodeHeight?: number
  offsetX?: number
  offsetY?: number
  laneOffset?: number
  labelClearance?: number
}): SelfLoopGeometry {
  const nodeWidth = Math.abs(sourceX - targetX)
  const sideOffset =
    Math.max(90, nodeWidth * 0.35) + laneOffset * 0.75
  const nodeClearanceHeight =
    ((nodeHeight / 2 + labelClearance) * 4) / 3
  const controlHeight =
    Math.max(220, nodeWidth, nodeClearanceHeight) + laneOffset

  // At the midpoint of a cubic curve, the two control points contribute 3/4
  // of its position. Scaling the drag offset by 4/3 keeps the label on the line.
  const controlShiftX = (offsetX * 4) / 3
  const controlShiftY = (offsetY * 4) / 3

  return {
    path: [
      `M ${sourceX},${sourceY}`,
      `C ${sourceX + sideOffset + controlShiftX},${sourceY - controlHeight + controlShiftY}`,
      `${targetX - sideOffset + controlShiftX},${targetY - controlHeight + controlShiftY}`,
      `${targetX},${targetY}`,
    ].join(" "),
    labelX: (sourceX + targetX) / 2 + offsetX,
    labelY: (sourceY + targetY) / 2 - controlHeight * 0.75 + offsetY,
  }
}

const CustomEdge = memo(function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data: edgeData,
  markerEnd,
  animationsEnabled = true,
  selected = false,
  actionTypesExpanded = false,
  onDeleteEdge,
  onSetEdgeActionTypes,
  onSetEdgeActionTypesExpanded,
  onSelectEdge,
  onSetEdgeLabelOffset,
  onToggleEdgeUnlocked,
}: CustomEdgeProps) {
  const { multiSelectionActive } = useCanvasActions()
  const {
    presentationMode,
    showAllDetails,
    expandedEdgeIds,
    playbackActive,
    currentPlaybackEdgeId,
    inspectedPlaybackEdgeId,
    reachedPlaybackEdgeIds,
    toggleEdgeDetails,
  } = useCanvasPresentation()
  const presentationDetailsExpanded =
    presentationMode && (showAllDetails || expandedEdgeIds.has(id))
  const playbackState = !playbackActive
    ? "inactive"
    : inspectedPlaybackEdgeId === id
      ? "missing"
      : currentPlaybackEdgeId === id
      ? "current"
      : reachedPlaybackEdgeIds.has(id)
        ? "reached"
        : "future"
  const playbackOpacity =
    playbackState === "future"
      ? 0.12
      : playbackState === "reached"
        ? 0.7
        : 1
  const data = useMemo(
    () => edgeData && presentationDetailsExpanded
      ? {
          ...edgeData,
          displaySettings: {
            ...edgeData.displaySettings,
            ...presentationEdgeDisplaySettings,
          },
        }
      : edgeData,
    [edgeData, presentationDetailsExpanded],
  )
  const effectiveActionTypesExpanded = presentationMode
    ? presentationDetailsExpanded
    : actionTypesExpanded
  const unlocked = !!data?.unlocked
  const visiblySelected = selected && !presentationMode
  // Track hover so the quick-action toolbar can appear without selecting the edge.
  const [hovered, setHovered] = useState(false)
  // Keep the toolbar mounted while the action-type menu is open (pointer leaves the edge).
  const [menuOpen, setMenuOpen] = useState(false)
  // Pin the toolbar once its menu has been engaged so it doesn't vanish when the
  // mouse is released after picking. Unlike a node (which stays selected on click),
  // an edge is never selected on hover, so we mimic that stickiness here.
  const [pinned, setPinned] = useState(false)
  const labelCardRef = useRef<HTMLDivElement | null>(null)
  const [labelCardHeight, setLabelCardHeight] = useState(
    SELF_LOOP_INITIAL_LABEL_CARD_HEIGHT_PX,
  )
  const [labelCardWidth, setLabelCardWidth] = useState(220)

  // Hover-intent: delay hiding so the pointer can travel from the edge to the
  // toolbar (which floats above the label with a gap) without it vanishing.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToolbar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setHovered(true)
  }, [])
  const hideToolbar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setHovered(false), 300)
  }, [])
  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open)
    if (open) {
      // Opening: pin the toolbar so it survives the pointer leaving the edge and
      // the mouse-release, matching the stickiness a selected node's toolbar has.
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setHovered(true)
      setPinned(true)
    } else {
      // Dismissed (picked an item or clicked outside): unpin and let hover-intent
      // fade it out.
      setPinned(false)
    }
  }, [])
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  // Current viewport zoom, so a screen-space drag maps to the right flow-space delta.
  const zoom = useStore((s) => s.transform[2])
  const viewportX = useStore((s) => s.transform[0])
  const flowWidth = useStore((s) => s.width)
  const sourceNodeHeight = useStore(
    (state) => state.nodeLookup.get(source)?.measured.height ?? 0,
  )

  // Manual routing drag (only when the edge is unlocked). `drag` holds the live
  // control-point offset; once released the committed offset lives on the edge
  // data (undo-safe). Dragging either the line or the label moves the same point.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const dragStart = useRef<{
    px: number
    py: number
    ox: number
    oy: number
    dragging: boolean
  } | null>(null)
  const offsetX = drag ? drag.x : data?.labelOffsetX ?? 0
  const offsetY = drag ? drag.y : data?.labelOffsetY ?? 0

  const onLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!unlocked || presentationMode) return
      e.stopPropagation()
      const ox = data?.labelOffsetX ?? 0
      const oy = data?.labelOffsetY ?? 0
      dragStart.current = { px: e.clientX, py: e.clientY, ox, oy, dragging: false }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [unlocked, presentationMode, data?.labelOffsetX, data?.labelOffsetY],
  )
  const onLabelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = dragStart.current
      if (!start) return
      const screenDx = e.clientX - start.px
      const screenDy = e.clientY - start.py
      if (!start.dragging && Math.hypot(screenDx, screenDy) < EDGE_ROUTE_DRAG_THRESHOLD_PX) return

      start.dragging = true
      const dx = screenDx / zoom
      const dy = screenDy / zoom
      setDrag({ x: start.ox + dx, y: start.oy + dy })
    },
    [zoom],
  )
  const onLabelPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = dragStart.current
      if (!start) return
      const didDrag = start.dragging
      const dx = (e.clientX - start.px) / zoom
      const dy = (e.clientY - start.py) / zoom
      const nx = start.ox + dx
      const ny = start.oy + dy
      dragStart.current = null
      setDrag(null)
      e.currentTarget.releasePointerCapture(e.pointerId)

      if (!didDrag) {
        onSelectEdge?.(id, e.shiftKey || e.ctrlKey)
        return
      }

      onSetEdgeLabelOffset?.(id, nx, ny)
    },
    [zoom, id, onSelectEdge, onSetEdgeLabelOffset],
  )
  const onEdgeLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (presentationMode) {
        e.stopPropagation()
        return
      }

      if (unlocked) {
        onLabelPointerDown(e)
        return
      }

      // Edge labels are rendered in a portal outside the edge wrapper.
      // Prevent a label press from selecting the asset underneath it.
      e.stopPropagation()
    },
    [presentationMode, unlocked, onLabelPointerDown],
  )
  const onEdgeLabelClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (presentationMode) {
        toggleEdgeDetails(id)
        return
      }

      if (!unlocked) onSelectEdge?.(id, e.shiftKey)
    },
    [id, presentationMode, toggleEdgeDetails, unlocked, onSelectEdge],
  )

  // Use React Flow's built-in smooth step path for the default (locked) routing.
  const [smoothPath, smoothLabelX, smoothLabelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 50, // Larger border radius to avoid obstacles
  })
  const mitreTechniques = normalizeMitreTechniqueReferences(
    data?.mitreAttackTechniques,
    data?.mitreAttackId,
    data?.mitreAttackName,
  )

  // When unlocked, bend the edge through a draggable control point offset from the
  // geometric midpoint. A quadratic curve whose control is midpoint + 2*offset
  // passes exactly through midpoint + offset at its center, so the label rides
  // the visible bend. Locked edges fall back to the auto-routed smoothstep path.
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  const isSelfConnection = source === target
  const actionTypes = isSelfConnection
    ? getEdgeActionTypes(data)
    : data?.actionType
      ? [data.actionType]
      : []
  const primaryActionType = actionTypes[0] ?? data?.actionType
  const showsActionBundle =
    isSelfConnection && actionTypes.length > 1
  const hasNonCommandAndControlAction = actionTypes.some(
    (actionType) => actionType !== "Command & Control",
  )
  const selfLoopLabelClearance = isSelfConnection
    ? Math.max(
        SELF_LOOP_LABEL_CLEARANCE_PX,
        labelCardHeight / 2 +
          SELF_LOOP_CARD_ASSET_GAP_PX / zoom,
      )
    : SELF_LOOP_LABEL_CLEARANCE_PX

  useEffect(() => {
    const measure = () => {
      const nextLabelCardHeight =
        labelCardRef.current?.offsetHeight ??
        SELF_LOOP_INITIAL_LABEL_CARD_HEIGHT_PX
      const nextLabelCardWidth =
        labelCardRef.current?.offsetWidth ?? 220

      setLabelCardHeight((current) =>
        current === nextLabelCardHeight
          ? current
          : nextLabelCardHeight,
      )
      setLabelCardWidth((current) =>
        current === nextLabelCardWidth
          ? current
          : nextLabelCardWidth,
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    if (labelCardRef.current) observer.observe(labelCardRef.current)

    return () => observer.disconnect()
  }, [
    actionTypes.length,
    effectiveActionTypesExpanded,
  ])

  const selfLoop = getSelfLoopGeometry({
    sourceX,
    sourceY,
    targetX,
    targetY,
    nodeHeight: sourceNodeHeight,
    offsetX: unlocked ? offsetX : 0,
    offsetY: unlocked ? offsetY : 0,
    labelClearance: selfLoopLabelClearance,
  })
  const actionStrokeWidths = actionTypes.map(
    (actionType) => getEdgeActionVisual(actionType).strokeWidth,
  )
  const actionLaneCenters =
    getCenteredParallelLaneCenters(actionStrokeWidths)
  const selfLoopActionGeometries = actionTypes.map((_, index) => {
    const visualOffset = actionLaneCenters[index] ?? 0
    return getSelfLoopGeometry({
      sourceX,
      sourceY,
      targetX,
      targetY,
      nodeHeight: sourceNodeHeight,
      offsetX: unlocked ? offsetX : 0,
      offsetY: unlocked ? offsetY : 0,
      laneOffset: visualOffset / 0.75,
      labelClearance: selfLoopLabelClearance,
    })
  })

  const edgePath = isSelfConnection
    ? selfLoop.path
    : unlocked
      ? `M ${sourceX},${sourceY} Q ${midX + 2 * offsetX},${midY + 2 * offsetY} ${targetX},${targetY}`
      : smoothPath
  const labelX = isSelfConnection ? selfLoop.labelX : unlocked ? midX + offsetX : smoothLabelX
  const labelY = isSelfConnection ? selfLoop.labelY : unlocked ? midY + offsetY : smoothLabelY
  const labelScreenX = labelX * zoom + viewportX
  const labelCardHalfScreenWidth =
    (labelCardWidth * zoom) / 2
  const toolbarSpaceNeeded =
    EDGE_TOOLBAR_ESTIMATED_WIDTH_PX + EDGE_TOOLBAR_CARD_GAP_PX
  const availableToolbarSpaceLeft =
    labelScreenX - labelCardHalfScreenWidth
  const availableToolbarSpaceRight =
    flowWidth - (labelScreenX + labelCardHalfScreenWidth)
  const placeToolbarOnRight =
    availableToolbarSpaceRight >= toolbarSpaceNeeded ||
    availableToolbarSpaceRight >= availableToolbarSpaceLeft
  const toolbarHorizontalOffset =
    labelCardWidth / 2 + EDGE_TOOLBAR_CARD_GAP_PX / zoom
  const toolbarX = showsActionBundle
    ? labelX +
      (placeToolbarOnRight
        ? toolbarHorizontalOffset
        : -toolbarHorizontalOffset)
    : labelX
  const toolbarY = showsActionBundle
    ? labelY +
      labelCardHeight / 2 -
      (EDGE_TOOLBAR_ESTIMATED_HEIGHT_PX / 2 + 8) / zoom
    : labelY -
      labelCardHeight / 2 -
      EDGE_TOOLBAR_CARD_GAP_PX / zoom
  const toolbarAlignX = showsActionBundle
    ? placeToolbarOnRight
      ? "left"
      : "right"
    : "center"
  const toolbarAlignY = showsActionBundle ? "center" : "bottom"

  const flowAnimation = animationsEnabled ? "edge-flow 2.5s linear infinite" : ""
  const pulseAnimation = visiblySelected && !multiSelectionActive ? "edge-pulse 1.5s ease-in-out infinite" : ""
  const animationValue = [flowAnimation, pulseAnimation].filter(Boolean).join(", ")

  const getRenderedEdgeStyle = (actionType?: EdgeActionType) => {
    const visual = getEdgeActionVisual(actionType)
    const baseStyle = {
      stroke: visual.stroke,
      strokeWidth: visual.strokeWidth,
      strokeDasharray: visual.strokeDasharray,
    }
    const selectedStyle = {
      ...baseStyle,
      strokeWidth:
        baseStyle.strokeWidth +
        (visiblySelected && !showsActionBundle ? 2 : 0),
      filter: visiblySelected
        ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))"
        : undefined,
      strokeDasharray: baseStyle.strokeDasharray || "6 6",
      strokeDashoffset: 0,
      animation: animationValue || undefined,
    }

    if (!playbackActive) return selectedStyle

    const playbackHighlighted =
      playbackState === "current" || playbackState === "missing"

    return {
      ...selectedStyle,
      strokeWidth:
        selectedStyle.strokeWidth + (playbackHighlighted ? 2 : 0),
      opacity: playbackOpacity,
      filter:
        playbackState === "current"
          ? "drop-shadow(0 0 9px rgba(236, 72, 153, 0.9))"
          : playbackState === "missing"
            ? "drop-shadow(0 0 9px rgba(251, 191, 36, 0.95))"
            : selectedStyle.filter,
      transition: "opacity 300ms ease, filter 300ms ease",
    }
  }

  const edgeStyle = getRenderedEdgeStyle(primaryActionType)
  const edgeLayers =
    isSelfConnection && actionTypes.length > 1
      ? actionTypes.map((actionType, index) => ({
          actionType,
          path:
            selfLoopActionGeometries[index]?.path ?? edgePath,
          style: getRenderedEdgeStyle(actionType),
        }))
      : [{
          actionType: primaryActionType,
          path: edgePath,
          style: edgeStyle,
        }]

  // Check if this edge should have animations based on global setting
  const shouldAnimate = animationsEnabled && actionTypes.length > 0
  const showsLabelDetail = Boolean(
    data?.label &&
      !actionTypes.includes(data.label as EdgeActionType) &&
      data?.displaySettings?.showLabel,
  )
  const showsToolDetail = Boolean(
    hasNonCommandAndControlAction &&
      data?.toolUsed &&
      data?.displaySettings?.showTool,
  )
  const showsUserDetail = Boolean(
    hasNonCommandAndControlAction &&
      data?.userUsed &&
      data?.displaySettings?.showUser,
  )
  const showsTimestampDetail = Boolean(
    data?.timestamp && data?.displaySettings?.showTimestamp,
  )
  const showsMitreDetail = Boolean(
    mitreTechniques.length > 0 &&
      data?.displaySettings?.showMitreId,
  )
  const showsDescriptionDetail = Boolean(
    data?.description && data?.displaySettings?.showDescription,
  )
  const showsC2ChannelDetail = Boolean(
    actionTypes.includes("Command & Control") &&
      data?.c2Channel &&
      data?.displaySettings?.showC2Channel,
  )
  const showsC2FrameworkDetail = Boolean(
    actionTypes.includes("Command & Control") &&
      data?.c2Framework &&
      data?.displaySettings?.showC2Framework,
  )
  const hasSupportingEdgeDetails =
    showsToolDetail ||
    showsUserDetail ||
    showsTimestampDetail ||
    showsMitreDetail ||
    showsDescriptionDetail ||
    showsC2ChannelDetail ||
    showsC2FrameworkDetail
  const hasVisibleEdgeDetails =
    showsLabelDetail || hasSupportingEdgeDetails
  const compactHiddenDetailCount = [
    showsToolDetail,
    showsUserDetail,
    showsMitreDetail,
    showsDescriptionDetail,
    showsC2ChannelDetail,
    showsC2FrameworkDetail,
  ].filter(Boolean).length
  const compactTitle = showsLabelDetail
    ? String(data?.label)
    : "Actions on this asset"
  const compactTimestamp =
    showsTimestampDetail && data?.timestamp
      ? formatCompactLocalTimestamp(data.timestamp)
      : null

  return (
    <>
      {edgeLayers.map((layer, index) => (
        <BaseEdge
          key={`${id}-${layer.actionType ?? index}`}
          id={index === 0 ? id : `${id}-action-${index}`}
          path={layer.path}
          style={{ ...style, ...layer.style }}
        />
      ))}

      {/* Invisible wide interaction path so hovering near the edge is detected.
          When unlocked, this path is also the drag handle for rerouting. */}
      <path
        className={unlocked && !presentationMode ? "nopan" : undefined}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        style={{
          cursor: presentationMode
            ? "pointer"
            : drag
              ? "grabbing"
              : unlocked
                ? "grab"
                : "pointer",
        }}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbar}
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onClick={
          presentationMode
            ? (event) => {
                event.stopPropagation()
                toggleEdgeDetails(id)
              }
            : unlocked
              ? (event) => event.stopPropagation()
              : undefined
        }
      />

      {/* Quick-action toolbar shown at the edge midpoint on hover or when selected */}
      <EdgeToolbar
        id={id}
        x={toolbarX}
        y={toolbarY}
        alignX={toolbarAlignX}
        alignY={toolbarAlignY}
        isVisible={
          !presentationMode &&
          !multiSelectionActive &&
          (hovered || selected || menuOpen || pinned)
        }
        currentActionTypes={actionTypes}
        allowsMultipleActionTypes={isSelfConnection}
        unlocked={unlocked}
        onSetActionTypes={(nextActionTypes) =>
          onSetEdgeActionTypes?.(id, nextActionTypes)
        }
        onToggleUnlocked={() => onToggleEdgeUnlocked?.(id)}
        onDelete={() => onDeleteEdge?.(id)}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbar}
        onMenuOpenChange={handleMenuOpenChange}
      />

      {/* Animated circles only for specific action types and when animations are enabled */}
      {shouldAnimate && (
        isSelfConnection && edgeLayers.length > 1 ? (
          edgeLayers.map((layer, index) => (
            <circle
              key={`${id}-marker-${layer.actionType ?? index}`}
              data-edge-action-marker={layer.actionType}
              r={index === 0 ? 4 : 3}
              fill={layer.style.stroke}
              opacity={
                (index === 0 ? 0.8 : 0.65) * playbackOpacity
              }
              style={{
                filter: layer.style.filter,
                transition: "opacity 300ms ease, filter 300ms ease",
              }}
            >
              <animateMotion
                dur={`${3 + index * 0.5}s`}
                repeatCount="indefinite"
                path={layer.path}
                calcMode="spline"
                keySplines="0.4 0 0.6 1"
                begin={`${index * -0.75}s`}
              />
            </circle>
          ))
        ) : (
          <>
            <circle
              r="4"
              fill={edgeStyle.stroke}
              opacity={0.8 * playbackOpacity}
              style={{
                filter: edgeStyle.filter,
                transition: "opacity 300ms ease, filter 300ms ease",
              }}
            >
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path={edgePath}
                calcMode="spline"
                keySplines="0.4 0 0.6 1"
              />
            </circle>
            <circle
              r="3"
              fill={edgeStyle.stroke}
              opacity={0.6 * playbackOpacity}
              style={{
                filter: edgeStyle.filter,
                transition: "opacity 300ms ease, filter 300ms ease",
              }}
            >
              <animateMotion
                dur="4s"
                repeatCount="indefinite"
                path={edgePath}
                calcMode="spline"
                keySplines="0.4 0 0.6 1"
                begin="-1s"
              />
            </circle>
          </>
        )
      )}
      {(presentationMode || data?.displaySettings?.showLabel !== false) && (
        <EdgeLabelRenderer>
          <div
            ref={labelCardRef}
            data-presentation-edge-id={presentationMode ? id : undefined}
            data-self-connection-action-bundle-card={
              showsActionBundle ? "true" : undefined
            }
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            data-presentation-expanded={presentationDetailsExpanded ? "true" : undefined}
            data-presentation-playback-state={
              playbackActive ? playbackState : undefined
            }
            role={presentationMode ? "button" : undefined}
            tabIndex={presentationMode ? 0 : undefined}
            aria-expanded={presentationMode ? presentationDetailsExpanded : undefined}
            aria-label={presentationMode ? `${data?.actionType || "Route"} details` : undefined}
            onKeyDown={presentationMode
              ? (event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key !== "Enter" && event.key !== " ") return
                  event.preventDefault()
                  event.stopPropagation()
                  toggleEdgeDetails(id)
                }
              : undefined}
            onPointerDown={onEdgeLabelPointerDown}
            onPointerMove={onLabelPointerMove}
            onPointerUp={onLabelPointerUp}
            onClick={onEdgeLabelClick}
            onMouseEnter={showToolbar}
            onMouseLeave={hideToolbar}
            className={cn(
              "nodrag nopan absolute pointer-events-auto border border-gray-700 bg-gray-800 shadow-lg",
              "text-xs text-white",
              showsActionBundle
                ? "w-[220px] max-w-[220px] rounded-lg p-2"
                : "min-w-[220px] max-w-[300px] rounded-lg p-3",
              playbackActive &&
                "transition-[opacity,filter,box-shadow,border-color] duration-300",
              playbackState === "future" && "brightness-[0.35] saturate-50",
              playbackState === "reached" && "brightness-75",
              playbackState === "current" &&
                "border-pink-400 ring-2 ring-pink-400/60 shadow-[0_0_24px_rgba(236,72,153,0.3)]",
              playbackState === "missing" &&
                "border-amber-300 opacity-100 ring-2 ring-amber-300/70 shadow-[0_0_24px_rgba(251,191,36,0.35)]",
              visiblySelected && "ip-selection-highlight border-blue-400",
              presentationMode
                ? "cursor-pointer"
                : unlocked && (drag ? "cursor-grabbing select-none" : "cursor-grab"),
            )}
          >
            {playbackState === "missing" && (
              <div
                title="This route is missing a valid timestamp"
                className="absolute -left-2.5 -top-2.5 rounded-full border border-amber-200 bg-amber-400 p-1 text-gray-950 shadow-lg"
              >
                <ClockAlert className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Missing or invalid timestamp</span>
              </div>
            )}

            {/* Main Label / Action Types */}
            <div
              className={cn(
                !showsActionBundle && "mb-1 space-y-1",
              )}
            >
              {showsActionBundle ? (
                <SelfConnectionActionCard
                  actionTypes={actionTypes}
                  expanded={effectiveActionTypesExpanded}
                  title={compactTitle}
                  showTitleTooltip={showsLabelDetail}
                  compactTimestamp={compactTimestamp}
                  hiddenDetailCount={compactHiddenDetailCount}
                  onExpandedChange={(expanded) => {
                    if (presentationMode) {
                      if (expanded !== presentationDetailsExpanded) {
                        toggleEdgeDetails(id)
                      }
                      return
                    }

                    onSetEdgeActionTypesExpanded?.(id, expanded)
                  }}
                />
              ) : actionTypes.length > 0 ? (
                actionTypes.map((actionType) => {
                  const visual = getEdgeActionVisual(actionType)
                  const ActionTypeIcon = visual.icon
                  return (
                    <div
                      key={actionType}
                      data-edge-action-type={actionType}
                      className="flex items-center justify-center gap-2 text-sm font-semibold"
                      style={{ color: visual.stroke }}
                    >
                      <ActionTypeIcon className="h-4 w-4" />
                      <span>{actionType}</span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-sm font-semibold" style={{ color: edgeStyle.stroke }}>
                  New Technique
                </div>
              )}
            </div>

            {(!showsActionBundle ||
              (effectiveActionTypesExpanded &&
                hasSupportingEdgeDetails)) && (
              <div
                data-edge-expanded-metadata={
                  showsActionBundle ? "true" : undefined
                }
                className={cn(
                  "space-y-1 text-gray-400",
                  showsActionBundle &&
                    hasVisibleEdgeDetails &&
                    "mt-2 border-t border-gray-700 pt-2",
                )}
              >
                {/* Custom Label (if different from action type) */}
                {data?.label &&
                  !showsActionBundle &&
                  !actionTypes.includes(data.label as EdgeActionType) &&
                  data?.displaySettings?.showLabel && (
                    <div
                      data-edge-expanded-label="true"
                      className="flex min-w-0 items-start gap-1"
                    >
                      <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="min-w-0 whitespace-normal break-words">
                        Label: {data.label}
                      </span>
                    </div>
                  )}

                {/* Tool Used */}
                {hasNonCommandAndControlAction &&
                  data?.toolUsed &&
                  data?.displaySettings?.showTool && (
                    <div className="flex items-center gap-1">
                      <Tool className="h-3 w-3" />
                      <span>Tool: {data.toolUsed}</span>
                    </div>
                  )}

                {/* User Used */}
                {hasNonCommandAndControlAction &&
                  data?.userUsed &&
                  data?.displaySettings?.showUser && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>User: {data.userUsed}</span>
                    </div>
                  )}

                {/* Timestamp */}
                {data?.timestamp &&
                  data?.displaySettings?.showTimestamp && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Time: {data.timestamp}</span>
                    </div>
                  )}

                {/* MITRE ATT&CK ID */}
                {mitreTechniques.length > 0 &&
                  data?.displaySettings?.showMitreId && (
                    <div className="min-w-0 space-y-0.5">
                      {mitreTechniques.map((technique) => {
                        const url = getMitreTechniqueUrl(technique.id)
                        const label = getMitreTechniqueLabel(
                          technique.id,
                          technique.name,
                        )

                        return (
                          <div
                            key={technique.id}
                            className="flex items-start gap-1.5"
                          >
                            <span className="min-w-0 break-words">
                              {label}
                            </span>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${label} on MITRE ATT&CK`}
                                title="Open on MITRE ATT&CK"
                                className="mt-0.5 shrink-0 text-blue-400 hover:text-blue-300"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                                onMouseDown={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                {/* Description */}
                {data?.description &&
                  data?.displaySettings?.showDescription && (
                    <div className="flex items-start gap-1">
                      <FileText className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="max-w-full overflow-hidden whitespace-pre-wrap break-words">
                        Desc: {data.description}
                      </span>
                    </div>
                  )}

                {/* C2 Channel (for Command & Control edges) */}
                {actionTypes.includes("Command & Control") &&
                  data?.c2Channel &&
                  data?.displaySettings?.showC2Channel && (
                    <div className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      <span>Channel: {data.c2Channel}</span>
                    </div>
                  )}

                {/* C2 Framework (for Command & Control edges) */}
                {actionTypes.includes("Command & Control") &&
                  data?.c2Framework &&
                  data?.displaySettings?.showC2Framework && (
                    <div className="flex items-center gap-1">
                      <Code className="h-3 w-3" />
                      <span>Framework: {data.c2Framework}</span>
                    </div>
                  )}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

export default CustomEdge
