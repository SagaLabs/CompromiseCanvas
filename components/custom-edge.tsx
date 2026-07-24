import type React from "react"
import { memo, useState, useRef, useCallback, useEffect } from "react"
import { type Edge, type EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useStore } from "@xyflow/react"
import type { EdgeData, EdgeActionType } from "@/lib/types"
import {
  MoveRight,
  Upload,
  Search,
  PenToolIcon as Tool,
  User,
  Clock,
  Terminal,
  FileText,
  Wifi,
  Code,
  Shield,
  Key,
  Eye,
  EyeOff,
  Database,
  Zap,
  Target,
  Hammer,
  Truck,
  Bug,
  Lock,
  Users,
  Building,
  Package,
  Activity,
  ExternalLink,
} from "lucide-react" // Import necessary icons
import { cn } from "@/lib/utils" // Assuming cn utility is available
import EdgeToolbar from "./edge-toolbar"
import {
  getMitreTechniqueLabel,
  getMitreTechniqueUrl,
  normalizeMitreTechniqueReferences,
} from "@/lib/mitre-attack"
import {
  getCompactEdgeActionTypeLabel,
  getEdgeActionTypes,
} from "@/lib/edge-action-types"
import { useCanvasActions } from "./canvas-actions-context"

interface CustomEdgeProps extends EdgeProps<Edge<EdgeData>> {
  animationsEnabled?: boolean
  selected?: boolean
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
  data,
  markerEnd,
  animationsEnabled = true,
  selected = false,
  onDeleteEdge,
  onSetEdgeActionTypes,
  onSetEdgeActionTypesExpanded,
  onSelectEdge,
  onSetEdgeLabelOffset,
  onToggleEdgeUnlocked,
}: CustomEdgeProps) {
  const { multiSelectionActive } = useCanvasActions()
  const unlocked = !!data?.unlocked
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
      if (!unlocked) return
      e.stopPropagation()
      const ox = data?.labelOffsetX ?? 0
      const oy = data?.labelOffsetY ?? 0
      dragStart.current = { px: e.clientX, py: e.clientY, ox, oy, dragging: false }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [unlocked, data?.labelOffsetX, data?.labelOffsetY],
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
      if (unlocked) {
        onLabelPointerDown(e)
        return
      }

      // Edge labels are rendered in a portal outside the edge wrapper.
      // Prevent a label press from selecting the asset underneath it.
      e.stopPropagation()
    },
    [unlocked, onLabelPointerDown],
  )
  const onEdgeLabelClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!unlocked) onSelectEdge?.(id, e.shiftKey)
    },
    [id, unlocked, onSelectEdge],
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
  const actionTypesExpanded = data?.actionTypesExpanded ?? false
  const compactActionTypes =
    actionTypes.length > 4
      ? actionTypes.slice(0, 3)
      : actionTypes.slice(0, 4)
  const showsTransientActionReveal =
    showsActionBundle &&
    !actionTypesExpanded &&
    (hovered || selected || menuOpen || pinned)
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
    actionTypesExpanded,
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
    (actionType) =>
      getEdgeStyle(actionType).strokeWidth + (selected ? 2 : 0),
  )
  const actionLaneCenters = actionStrokeWidths.reduce<number[]>(
    (centers, strokeWidth, index) => {
      if (index === 0) return [0]
      const previousCenter = centers[index - 1]
      const previousStrokeWidth = actionStrokeWidths[index - 1]
      return [
        ...centers,
        previousCenter +
          previousStrokeWidth / 2 +
          strokeWidth / 2,
      ]
    },
    [],
  )
  const actionLaneCenter =
    actionLaneCenters.length > 1
      ? (actionLaneCenters[0] +
          actionLaneCenters[actionLaneCenters.length - 1]) /
        2
      : 0
  const selfLoopActionGeometries = actionTypes.map((_, index) => {
    const visualOffset =
      (actionLaneCenters[index] ?? 0) - actionLaneCenter
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

  // Determine edge styling based on action type
  function getEdgeStyle(actionType?: string) {
    switch (actionType) {
      case "Initial Access":
        return {
          stroke: "#ef4444", // Red
          strokeWidth: 3,
          strokeDasharray: "8 4",
        }
      case "Lateral Movement":
        return {
          stroke: "#f59e0b", // Orange
          strokeWidth: 2,
          strokeDasharray: "5 5",
        }
      case "Privilege Escalation":
        return {
          stroke: "#dc2626", // Dark red
          strokeWidth: 3,
          strokeDasharray: "12 6",
        }
      case "Persistence":
        return {
          stroke: "#7c3aed", // Purple
          strokeWidth: 2,
          strokeDasharray: "3 3",
        }
      case "Defense Evasion":
        return {
          stroke: "#059669", // Green
          strokeWidth: 2,
          strokeDasharray: "6 3",
        }
      case "Credential Access":
        return {
          stroke: "#d97706", // Amber
          strokeWidth: 2,
          strokeDasharray: "4 4",
        }
      case "Discovery":
        return {
          stroke: "#0891b2", // Cyan
          strokeWidth: 2,
          strokeDasharray: "5 5",
        }
      case "Collection":
        return {
          stroke: "#0d9488", // Teal
          strokeWidth: 2,
          strokeDasharray: "7 3",
        }
      case "Exfiltration":
        return {
          stroke: "#be185d", // Pink
          strokeWidth: 3,
          strokeDasharray: "10 5",
        }
      case "Command & Control":
        return {
          stroke: "#7c2d12", // Brown
          strokeWidth: 2,
          strokeDasharray: "6 6",
        }
      case "Impact":
        return {
          stroke: "#991b1b", // Dark red
          strokeWidth: 4,
          strokeDasharray: "15 8",
        }
      case "Reconnaissance":
        return {
          stroke: "#1e40af", // Blue
          strokeWidth: 2,
          strokeDasharray: "4 8",
        }
      case "Weaponization":
        return {
          stroke: "#92400e", // Dark orange
          strokeWidth: 2,
          strokeDasharray: "8 4",
        }
      case "Delivery":
        return {
          stroke: "#a16207", // Yellow
          strokeWidth: 2,
          strokeDasharray: "6 3",
        }
      case "Exploitation":
        return {
          stroke: "#b91c1c", // Red
          strokeWidth: 3,
          strokeDasharray: "9 4",
        }
      case "Installation":
        return {
          stroke: "#6b21a8", // Purple
          strokeWidth: 2,
          strokeDasharray: "5 5",
        }
      case "Data Theft":
        return {
          stroke: "#be123c", // Rose
          strokeWidth: 3,
          strokeDasharray: "8 4",
        }
      case "Data Manipulation":
        return {
          stroke: "#c026d3", // Fuchsia
          strokeWidth: 2,
          strokeDasharray: "4 6",
        }
      case "Service Abuse":
        return {
          stroke: "#15803d", // Green
          strokeWidth: 2,
          strokeDasharray: "3 7",
        }
      case "Network Scanning":
        return {
          stroke: "#0c4a6e", // Sky blue
          strokeWidth: 2,
          strokeDasharray: "5 5",
        }
      case "Vulnerability Exploitation":
        return {
          stroke: "#f97316", // Orange
          strokeWidth: 3,
          strokeDasharray: "7 3",
        }
      case "Social Engineering":
        return {
          stroke: "#0369a1", // Light blue
          strokeWidth: 2,
          strokeDasharray: "6 4",
        }
      case "Physical Access":
        return {
          stroke: "#854d0e", // Amber
          strokeWidth: 3,
          strokeDasharray: "10 5",
        }
      case "Supply Chain Attack":
        return {
          stroke: "#7c2d12", // Brown
          strokeWidth: 2,
          strokeDasharray: "8 6",
        }
      default:
        return {
          stroke: "#8B5CF6", // Default purple
          strokeWidth: 2,
          strokeDasharray: "5 5",
        }
    }
  }

  const flowAnimation = animationsEnabled ? "edge-flow 2.5s linear infinite" : ""
  const pulseAnimation = selected && !multiSelectionActive ? "edge-pulse 1.5s ease-in-out infinite" : ""
  const animationValue = [flowAnimation, pulseAnimation].filter(Boolean).join(", ")

  const getRenderedEdgeStyle = (actionType?: EdgeActionType) => {
    const baseStyle = getEdgeStyle(actionType)
    return selected
      ? {
          ...baseStyle,
          strokeWidth: baseStyle.strokeWidth + 2,
          filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))",
          strokeDasharray: baseStyle.strokeDasharray || "6 6",
          strokeDashoffset: 0,
          animation: animationValue || undefined,
        }
      : {
          ...baseStyle,
          strokeDasharray: baseStyle.strokeDasharray || "6 6",
          strokeDashoffset: 0,
          animation: animationValue || undefined,
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

  // Determine icon for Action Type
  const getActionTypeIcon = (actionType?: string) => {
    switch (actionType) {
      case "Initial Access":
        return Target
      case "Lateral Movement":
        return MoveRight
      case "Privilege Escalation":
        return Shield
      case "Persistence":
        return Lock
      case "Defense Evasion":
        return Eye
      case "Credential Access":
        return Key
      case "Discovery":
        return Search
      case "Collection":
        return Database
      case "Exfiltration":
        return Upload
      case "Command & Control":
        return Terminal
      case "Impact":
        return Zap
      case "Reconnaissance":
        return Search
      case "Weaponization":
        return Hammer
      case "Delivery":
        return Truck
      case "Exploitation":
        return Bug
      case "Installation":
        return Package
      case "Data Theft":
        return Upload
      case "Data Manipulation":
        return FileText
      case "Service Abuse":
        return Activity
      case "Network Scanning":
        return Search
      case "Vulnerability Exploitation":
        return Bug
      case "Social Engineering":
        return Users
      case "Physical Access":
        return Building
      case "Supply Chain Attack":
        return Package
      default:
        return Activity
    }
  }

  // Check if this edge should have animations based on global setting
  const shouldAnimate = animationsEnabled && actionTypes.length > 0
  const hasVisibleEdgeDetails = Boolean(
    (data?.label &&
      !actionTypes.includes(data.label as EdgeActionType) &&
      data?.displaySettings?.showLabel) ||
      (data?.toolUsed && data?.displaySettings?.showTool) ||
      (data?.userUsed && data?.displaySettings?.showUser) ||
      (data?.timestamp && data?.displaySettings?.showTimestamp) ||
      (mitreTechniques.length > 0 &&
        data?.displaySettings?.showMitreId) ||
      (data?.description && data?.displaySettings?.showDescription) ||
      (actionTypes.includes("Command & Control") &&
        data?.c2Channel &&
        data?.displaySettings?.showC2Channel) ||
      (actionTypes.includes("Command & Control") &&
        data?.c2Framework &&
        data?.displaySettings?.showC2Framework),
  )
  const actionTypeRows = actionTypes.map((actionType) => {
    const ActionTypeIcon = getActionTypeIcon(actionType)
    const actionTypeStyle = getEdgeStyle(actionType)

    return (
      <div
        key={actionType}
        data-edge-action-type={actionType}
        data-edge-action-row={actionType}
        className="flex items-center gap-2 px-1 py-1"
        style={{ color: actionTypeStyle.stroke }}
      >
        <span
          aria-hidden="true"
          className="h-5 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: actionTypeStyle.stroke }}
        />
        <ActionTypeIcon className="h-3.5 w-3.5 shrink-0" />
        <span
          data-edge-action-row-text={actionType}
          className="min-w-0 flex-1 whitespace-normal break-words font-medium leading-4"
        >
          {actionType}
        </span>
      </div>
    )
  })

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
        className={unlocked ? "nopan" : undefined}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        style={{ cursor: drag ? "grabbing" : unlocked ? "grab" : "pointer" }}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbar}
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onClick={unlocked ? (event) => event.stopPropagation() : undefined}
      />

      {/* Quick-action toolbar shown at the edge midpoint on hover or when selected */}
      <EdgeToolbar
        id={id}
        x={toolbarX}
        y={toolbarY}
        alignX={toolbarAlignX}
        alignY={toolbarAlignY}
        isVisible={!multiSelectionActive && (hovered || selected || menuOpen || pinned)}
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
              opacity={index === 0 ? "0.8" : "0.65"}
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
            <circle r="4" fill={edgeStyle.stroke} opacity="0.8">
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path={edgePath}
                calcMode="spline"
                keySplines="0.4 0 0.6 1"
              />
            </circle>
            <circle r="3" fill={edgeStyle.stroke} opacity="0.6">
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
      {data?.displaySettings?.showLabel !== false && (
        <EdgeLabelRenderer>
          <div
            ref={labelCardRef}
            data-self-connection-action-bundle-card={
              showsActionBundle ? "true" : undefined
            }
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
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
                ? "w-[220px] max-w-[220px] rounded-lg p-2.5"
                : "min-w-[220px] max-w-[300px] rounded-lg p-3",
              selected && "ip-selection-highlight border-blue-400",
              unlocked && (drag ? "cursor-grabbing select-none" : "cursor-grab"),
            )}
          >
            {/* Main Label / Action Types */}
            <div
              className={cn(
                "mb-1",
                !showsActionBundle && "space-y-1",
              )}
            >
              {showsActionBundle ? (
                <>
                  <div
                    data-edge-action-summary="true"
                    aria-label={`${actionTypes.length} actions: ${actionTypes.join(", ")}`}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 font-semibold text-gray-100">
                        Actions on this asset
                      </div>

                      <button
                        type="button"
                        data-edge-action-visibility-toggle="true"
                        aria-label={
                          actionTypesExpanded
                            ? "Return to compact action summary"
                            : "Keep action types visible"
                        }
                        aria-pressed={actionTypesExpanded}
                        title={
                          actionTypesExpanded
                            ? "Return to compact view"
                            : "Keep action types visible"
                        }
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                          actionTypesExpanded
                            ? "border-blue-400/70 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                            : "border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-700 hover:text-gray-200",
                        )}
                        onPointerDown={(event) =>
                          event.stopPropagation()
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          onSetEdgeActionTypesExpanded?.(
                            id,
                            !actionTypesExpanded,
                          )
                        }}
                      >
                        {actionTypesExpanded ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {actionTypesExpanded ? (
                      <div
                        data-edge-action-reveal="true"
                        className="border-t border-gray-700 pt-2"
                      >
                        <div className="space-y-1">
                          {actionTypeRows}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                          {compactActionTypes.map((actionType) => {
                            const ActionTypeIcon =
                              getActionTypeIcon(actionType)
                            const actionTypeStyle =
                              getEdgeStyle(actionType)

                            return (
                              <div
                                key={actionType}
                                data-edge-action-summary-icon={actionType}
                                title={actionType}
                                className="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900/70 px-1.5 py-1"
                                style={{
                                  color: actionTypeStyle.stroke,
                                  borderLeftColor:
                                    actionTypeStyle.stroke,
                                  borderLeftWidth: 2,
                                }}
                              >
                                <ActionTypeIcon className="h-3 w-3 shrink-0" />
                                <span
                                  data-edge-action-summary-label={actionType}
                                  className="min-w-0 truncate text-[10px] font-medium"
                                >
                                  {getCompactEdgeActionTypeLabel(
                                    actionType,
                                  )}
                                </span>
                              </div>
                            )
                          })}
                          {actionTypes.length > 4 && (
                            <div
                              data-edge-action-summary-overflow="true"
                              className="flex min-w-0 items-center justify-center rounded-md border border-gray-700 bg-gray-900/70 px-1.5 py-1 text-[10px] font-semibold text-gray-300"
                            >
                              +{actionTypes.length - 3} more
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {!actionTypesExpanded && (
                    <div
                      data-edge-action-color-strip="true"
                      aria-hidden="true"
                      className="mt-2 flex h-1 overflow-hidden rounded-full bg-gray-900"
                    >
                      {actionTypes.map((actionType) => (
                        <span
                          key={actionType}
                          className="min-w-0 flex-1"
                          style={{
                            backgroundColor:
                              getEdgeStyle(actionType).stroke,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {showsTransientActionReveal && (
                    <div
                      data-edge-action-reveal="true"
                      className={cn(
                        "absolute left-1/2 w-[220px] -translate-x-1/2 border border-gray-700 bg-gray-800/95 p-2.5 shadow-xl backdrop-blur-sm",
                        "bottom-[calc(100%+10px)] rounded-lg",
                        selected && "border-blue-400",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between border-b border-gray-700 pb-2">
                        <span className="font-semibold text-gray-200">
                          Action types
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {actionTypes.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {actionTypeRows}
                      </div>
                    </div>
                  )}
                </>
              ) : actionTypes.length > 0 ? (
                actionTypes.map((actionType) => {
                  const ActionTypeIcon = getActionTypeIcon(actionType)
                  const actionTypeStyle = getEdgeStyle(actionType)
                  return (
                    <div
                      key={actionType}
                      data-edge-action-type={actionType}
                      className="flex items-center justify-center gap-2 text-sm font-semibold"
                      style={{ color: actionTypeStyle.stroke }}
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

            <div
              className={cn(
                "space-y-1 text-gray-400",
                showsActionBundle &&
                  hasVisibleEdgeDetails &&
                  "mt-2 border-t border-gray-700 pt-2",
              )}
            >
              {/* Custom Label (if different from action type) */}
              {data?.label &&
                !actionTypes.includes(data.label as EdgeActionType) &&
                data?.displaySettings?.showLabel && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Label: {data.label}</span>
                </div>
              )}

              {/* Tool Used */}
              {data?.toolUsed && data?.displaySettings?.showTool && (
                <div className="flex items-center gap-1">
                  <Tool className="h-3 w-3" />
                  <span>Tool: {data.toolUsed}</span>
                </div>
              )}

              {/* User Used */}
              {data?.userUsed && data?.displaySettings?.showUser && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>User: {data.userUsed}</span>
                </div>
              )}

              {/* Timestamp */}
              {data?.timestamp && data?.displaySettings?.showTimestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Time: {data.timestamp}</span>
                </div>
              )}

              {/* MITRE ATT&CK ID */}
              {mitreTechniques.length > 0 && data?.displaySettings?.showMitreId && (
                <div className="min-w-0 space-y-0.5">
                  {mitreTechniques.map((technique) => {
                    const url = getMitreTechniqueUrl(technique.id)
                    const label = getMitreTechniqueLabel(technique.id, technique.name)

                    return (
                      <div key={technique.id} className="flex items-start gap-1.5">
                        <span className="min-w-0 break-words">{label}</span>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${label} on MITRE ATT&CK`}
                            title="Open on MITRE ATT&CK"
                            className="mt-0.5 shrink-0 text-blue-400 hover:text-blue-300"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
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
              {data?.description && data?.displaySettings?.showDescription && (
                <div className="flex items-start gap-1">
                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="break-words whitespace-pre-wrap overflow-hidden max-w-full">Desc: {data.description}</span>
                </div>
              )}

              {/* C2 Channel (for Command & Control edges) */}
              {actionTypes.includes("Command & Control") && data?.c2Channel && data?.displaySettings?.showC2Channel && (
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  <span>Channel: {data.c2Channel}</span>
                </div>
              )}

              {/* C2 Framework (for Command & Control edges) */}
              {actionTypes.includes("Command & Control") && data?.c2Framework && data?.displaySettings?.showC2Framework && (
                <div className="flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  <span>Framework: {data.c2Framework}</span>
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

export default CustomEdge
