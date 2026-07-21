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
  Hash,
  FileText,
  Wifi,
  Code,
  Shield,
  Key,
  Eye,
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
  Activity
} from "lucide-react" // Import necessary icons
import { cn } from "@/lib/utils" // Assuming cn utility is available
import EdgeToolbar from "./edge-toolbar"
import { getMitreTechniqueLabel, getMitreTechniqueUrl } from "@/lib/mitre-attack"

interface CustomEdgeProps extends EdgeProps<Edge<EdgeData>> {
  animationsEnabled?: boolean
  selected?: boolean
  onDeleteEdge?: (id: string) => void
  onSetEdgeActionType?: (id: string, actionType: EdgeActionType) => void
  onSetEdgeLabelOffset?: (id: string, x: number, y: number) => void
  onToggleEdgeUnlocked?: (id: string) => void
}

const CustomEdge = memo(function CustomEdge({
  id,
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
  onSetEdgeActionType,
  onSetEdgeLabelOffset,
  onToggleEdgeUnlocked,
}: CustomEdgeProps) {
  const unlocked = !!data?.unlocked
  // Track hover so the quick-action toolbar can appear without selecting the edge.
  const [hovered, setHovered] = useState(false)
  // Keep the toolbar mounted while the action-type menu is open (pointer leaves the edge).
  const [menuOpen, setMenuOpen] = useState(false)
  // Pin the toolbar once its menu has been engaged so it doesn't vanish when the
  // mouse is released after picking. Unlike a node (which stays selected on click),
  // an edge is never selected on hover, so we mimic that stickiness here.
  const [pinned, setPinned] = useState(false)

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

  // Manual routing drag (only when the edge is unlocked). `drag` holds the live
  // control-point offset; once released the committed offset lives on the edge
  // data (undo-safe). Dragging either the line or the label moves the same point.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const offsetX = drag ? drag.x : data?.labelOffsetX ?? 0
  const offsetY = drag ? drag.y : data?.labelOffsetY ?? 0

  const onLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!unlocked) return
      e.stopPropagation()
      const ox = data?.labelOffsetX ?? 0
      const oy = data?.labelOffsetY ?? 0
      dragStart.current = { px: e.clientX, py: e.clientY, ox, oy }
      setDrag({ x: ox, y: oy })
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [unlocked, data?.labelOffsetX, data?.labelOffsetY],
  )
  const onLabelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return
      const dx = (e.clientX - dragStart.current.px) / zoom
      const dy = (e.clientY - dragStart.current.py) / zoom
      setDrag({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
    },
    [zoom],
  )
  const onLabelPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return
      const dx = (e.clientX - dragStart.current.px) / zoom
      const dy = (e.clientY - dragStart.current.py) / zoom
      const nx = dragStart.current.ox + dx
      const ny = dragStart.current.oy + dy
      dragStart.current = null
      setDrag(null)
      e.currentTarget.releasePointerCapture(e.pointerId)
      onSetEdgeLabelOffset?.(id, nx, ny)
    },
    [zoom, id, onSetEdgeLabelOffset],
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

  // When unlocked, bend the edge through a draggable control point offset from the
  // geometric midpoint. A quadratic curve whose control is midpoint + 2*offset
  // passes exactly through midpoint + offset at its center, so the label rides
  // the visible bend. Locked edges fall back to the auto-routed smoothstep path.
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  const edgePath = unlocked
    ? `M ${sourceX},${sourceY} Q ${midX + 2 * offsetX},${midY + 2 * offsetY} ${targetX},${targetY}`
    : smoothPath
  const labelX = unlocked ? midX + offsetX : smoothLabelX
  const labelY = unlocked ? midY + offsetY : smoothLabelY

  // Determine edge styling based on action type
  const getEdgeStyle = (actionType?: string) => {
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
          stroke: "#dc2626", // Red
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

  const baseEdgeStyle = getEdgeStyle(data?.actionType)

  const flowAnimation = animationsEnabled ? "edge-flow 2.5s linear infinite" : ""
  const pulseAnimation = selected ? "edge-pulse 1.5s ease-in-out infinite" : ""
  const animationValue = [flowAnimation, pulseAnimation].filter(Boolean).join(", ")

  // Apply selection styling if edge is selected
  const edgeStyle = selected
    ? {
        ...baseEdgeStyle,
        strokeWidth: baseEdgeStyle.strokeWidth + 2, // Make selected edge thicker
        filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))",
        strokeDasharray: baseEdgeStyle.strokeDasharray || "6 6",
        strokeDashoffset: 0,
        animation: animationValue || undefined,
      }
    : {
        ...baseEdgeStyle,
        strokeDasharray: baseEdgeStyle.strokeDasharray || "6 6",
        strokeDashoffset: 0,
        animation: animationValue || undefined,
      }

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

  const ActionTypeIcon = getActionTypeIcon(data?.actionType)

  // Check if this edge should have animations based on global setting
  const shouldAnimate = animationsEnabled && data?.actionType

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, ...edgeStyle }}
      />

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
      />

      {/* Quick-action toolbar shown at the edge midpoint on hover or when selected */}
      <EdgeToolbar
        id={id}
        labelX={labelX}
        labelY={labelY}
        isVisible={hovered || selected || menuOpen || pinned}
        currentActionType={data?.actionType}
        unlocked={unlocked}
        onSetActionType={(actionType) => onSetEdgeActionType?.(id, actionType)}
        onToggleUnlocked={() => onToggleEdgeUnlocked?.(id)}
        onDelete={() => onDeleteEdge?.(id)}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbar}
        onMenuOpenChange={handleMenuOpenChange}
      />

      {/* Animated circles only for specific action types and when animations are enabled */}
      {shouldAnimate && (
        <>
          {/* Animated circle moving along the edge path */}
          <circle r="4" fill={edgeStyle.stroke} opacity="0.8">
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path={edgePath}
              calcMode="spline"
              keySplines="0.4 0 0.6 1"
            />
          </circle>

          {/* Second animated circle with different timing */}
          <circle r="3" fill={edgeStyle.stroke} opacity="0.6">
            <animateMotion
              dur="4s"
              repeatCount="indefinite"
              path={edgePath}
              calcMode="spline"
              keySplines="0.4 0 0.6 1"
              begin="1s"
            />
          </circle>
        </>
      )}
      {data?.displaySettings?.showLabel !== false && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            onPointerDown={onLabelPointerDown}
            onPointerMove={onLabelPointerMove}
            onPointerUp={onLabelPointerUp}
            onMouseEnter={showToolbar}
            onMouseLeave={hideToolbar}
            className={cn(
              "nodrag nopan absolute pointer-events-auto rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-lg",
              "min-w-[220px] max-w-[300px] text-xs text-white", // Increased min-width for better readability
              unlocked && (drag ? "cursor-grabbing select-none" : "cursor-grab"),
            )}
          >
            {/* Main Label / Action Type */}
            <div className="mb-1 flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: edgeStyle.stroke }}>
              {ActionTypeIcon && <ActionTypeIcon className="h-4 w-4" />}
              <span>{data?.actionType || "New Technique"}</span>
            </div>

            <div className="space-y-1 text-gray-400">
              {/* Custom Label (if different from action type) */}
              {data?.label && data.label !== data.actionType && data?.displaySettings?.showLabel && (
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
              {data?.mitreAttackId && data?.displaySettings?.showMitreId && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <a
                    href={getMitreTechniqueUrl(data.mitreAttackId)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-300 hover:underline"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    MITRE: {getMitreTechniqueLabel(data.mitreAttackId, data.mitreAttackName)}
                  </a>
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
              {data?.actionType === "Command & Control" && data?.c2Channel && data?.displaySettings?.showC2Channel && (
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  <span>Channel: {data.c2Channel}</span>
                </div>
              )}

              {/* C2 Framework (for Command & Control edges) */}
              {data?.actionType === "Command & Control" && data?.c2Framework && data?.displaySettings?.showC2Framework && (
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
