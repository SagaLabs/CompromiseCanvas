import { memo, useRef, useState } from "react"
import { type EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from "reactflow"
import type { EdgeData } from "@/lib/types"
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
  Unlock,
  Users,
  Building,
  Package,
  Activity,
  GitBranch,
  GripHorizontal,
  RotateCcw,
} from "lucide-react" // Import necessary icons
import { cn } from "@/lib/utils" // Assuming cn utility is available

interface CustomEdgeProps extends EdgeProps<EdgeData> {
  animationsEnabled?: boolean
  selected?: boolean
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
}: CustomEdgeProps) {
  const { setEdges, getZoom } = useReactFlow()
  const [dragging, setDragging] = useState<"routeOffset" | "labelOffset" | null>(null)
  const dragState = useRef<{
    pointerId: number
    kind: "routeOffset" | "labelOffset"
    startClientX: number
    startClientY: number
    startOffset: { x: number; y: number }
  } | null>(null)

  // Use React Flow's built-in smooth step path for better edge routing
  const automaticPath = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 50, // Larger border radius to avoid obstacles
  })
  const routeOffset = data?.routeOffset ?? { x: 0, y: 0 }
  const labelOffset = data?.labelOffset ?? { x: 0, y: 0 }
  const labelLocked = data?.labelLocked !== false
  const hasCustomRoute = routeOffset.x !== 0 || routeOffset.y !== 0
  const hasCustomLabel = labelOffset.x !== 0 || labelOffset.y !== 0
  const [edgePath, routedLabelX, routedLabelY] = hasCustomRoute
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 50,
        centerX: automaticPath[1] + routeOffset.x,
        centerY: automaticPath[2] + routeOffset.y,
      })
    : automaticPath
  const labelX = routedLabelX + labelOffset.x
  const labelY = routedLabelY + labelOffset.y

  const updateOffset = (kind: "routeOffset" | "labelOffset", offset: { x: number; y: number }) => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: {
                ...edge.data,
                [kind]: offset,
              },
            }
          : edge,
      ),
    )
  }

  const resetOffsets = () => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id !== id) return edge

        const { routeOffset: _routeOffset, labelOffset: _labelOffset, ...dataWithoutOffsets } = edge.data ?? {}
        return {
          ...edge,
          data: dataWithoutOffsets,
        }
      }),
    )
  }

  const setLabelLocked = (locked: boolean) => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id !== id) return edge

        const edgeData = edge.data ?? {}
        if (locked) {
          const { labelOffset: _labelOffset, ...dataWithoutLabelOffset } = edgeData
          return {
            ...edge,
            data: {
              ...dataWithoutLabelOffset,
              labelLocked: true,
            },
          }
        }

        return {
          ...edge,
          data: {
            ...edgeData,
            labelLocked: false,
          },
        }
      }),
    )
  }

  const startDrag = (event: React.PointerEvent<HTMLElement>, kind: "routeOffset" | "labelOffset") => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = {
      pointerId: event.pointerId,
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: kind === "routeOffset" ? routeOffset : labelOffset,
    }
    setDragging(kind)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const currentDrag = dragState.current
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()
    const zoom = getZoom() || 1
    updateOffset(currentDrag.kind, {
      x: currentDrag.startOffset.x + (event.clientX - currentDrag.startClientX) / zoom,
      y: currentDrag.startOffset.y + (event.clientY - currentDrag.startClientY) / zoom,
    })
  }

  const stopDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    dragState.current = null
    setDragging(null)
  }

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

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, ...edgeStyle }}
      />

      {data?.displaySettings?.showLabel !== false && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            onPointerDown={(event) => startDrag(event, labelLocked ? "routeOffset" : "labelOffset")}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className={cn(
              "nodrag nopan absolute pointer-events-auto cursor-move rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-lg",
              "min-w-[220px] max-w-[300px] text-xs text-white", // Increased min-width for better readability
              dragging !== null && "ring-2 ring-blue-400",
            )}
          >
            {/* Main Label / Action Type */}
            <div className="mb-1 flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: edgeStyle.stroke }}>
              <button
                type="button"
                className={cn(
                  "nodrag nopan rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white",
                  dragging === "routeOffset" && "bg-blue-500/20 text-blue-300",
                )}
                title="Drag to move the line route"
                aria-label="Move line route"
                onPointerDown={(event) => startDrag(event, "routeOffset")}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                onClick={(event) => event.stopPropagation()}
              >
                <GitBranch className="h-3.5 w-3.5" />
              </button>
              <GripHorizontal
                className="h-3.5 w-3.5 text-gray-500"
                aria-label={labelLocked ? "Drag card and line" : "Drag label independently"}
              />
              {ActionTypeIcon && <ActionTypeIcon className="h-4 w-4" />}
              <span>{data?.actionType || "New Technique"}</span>
              <button
                type="button"
                className={cn(
                  "nodrag nopan rounded p-1 hover:bg-gray-700 hover:text-white",
                  labelLocked ? "text-blue-300" : "text-gray-400",
                )}
                title={labelLocked ? "Unlock label from line" : "Lock label to line"}
                aria-label={labelLocked ? "Unlock label from line" : "Lock label to line"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  setLabelLocked(!labelLocked)
                }}
              >
                {labelLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
              {(hasCustomRoute || hasCustomLabel) && (
                <button
                  type="button"
                  className="nodrag nopan rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                  title="Reset line and label positions"
                  aria-label="Reset line and label positions"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    resetOffsets()
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
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
                  <span>MITRE: {data.mitreAttackId}</span>
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
