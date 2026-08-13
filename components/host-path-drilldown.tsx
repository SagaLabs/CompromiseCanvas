"use client"

import { useMemo } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react"
import {
  ArrowUpCircle,
  ChevronRight,
  Eye,
  Folder,
  HardDrive,
  Info,
  Key,
  MoveRight,
  Shield,
  Terminal,
  Upload,
  Zap,
} from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ACTION_COLORS } from "@/lib/types"
import type { ActionType, CustomNode, NodeAction } from "@/lib/types"

const actionIcons: Record<string, typeof Info> = {
  "Initial Access": Key,
  "Lateral Movement": MoveRight,
  "Privilege Escalation": ArrowUpCircle,
  Persistence: HardDrive,
  "Defense Evasion": Shield,
  "Credential Access": Key,
  Discovery: Eye,
  Collection: Folder,
  Exfiltration: Upload,
  "Command and Control": Terminal,
  Impact: Zap,
  Other: Info,
}

const STEP_HEIGHT = 150
const STEP_WIDTH = 460

const formatTimestamp = (value?: string): string | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().replace("T", " ").slice(0, 19) + "Z"
}

function StepLabel({ action, index }: { action: NodeAction; index: number }) {
  const Icon = actionIcons[action.type] || Info
  const color = ACTION_COLORS[action.type] ?? ACTION_COLORS.Other
  const time = formatTimestamp(action.timestamp)
  return (
    <div className="w-full text-left">
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-gray-950"
          style={{ backgroundColor: color }}
        >
          {index + 1}
        </span>
        <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
        <span className="text-sm font-semibold" style={{ color }}>
          {action.type}
        </span>
        {time && <span className="ml-auto text-[10px] text-gray-500">{time}</span>}
      </div>
      {action.technique && (
        <div className="mt-1 text-xs font-medium text-gray-200">{action.technique}</div>
      )}
      {action.mitreAttackId && (
        <Badge
          variant="outline"
          className="mt-1 border-cyan-700/60 bg-cyan-950/40 text-[10px] font-normal text-cyan-300"
        >
          {action.mitreAttackId}
          {action.mitreAttackName ? ` · ${action.mitreAttackName}` : ""}
        </Badge>
      )}
      {action.details && (
        <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-all text-[11px] leading-snug text-gray-400">
          {action.details}
        </div>
      )}
    </div>
  )
}

interface HostPathDrilldownProps {
  node: CustomNode | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Drill-down view of a single host's internal attack path.
 *
 * The main canvas shows movement *between* hosts. This shows what happened
 * *inside* one of them: `node.data.actions` in array order, rendered as a
 * top-to-bottom chain. It is a read-only projection — steps are edited in the
 * properties panel, which keeps one source of truth.
 */
export default function HostPathDrilldown({ node, isOpen, onClose }: HostPathDrilldownProps) {
  const actions = useMemo<NodeAction[]>(() => node?.data?.actions ?? [], [node])

  const { nodes, edges } = useMemo(() => {
    const stepNodes: Node[] = actions.map((action, index) => ({
      id: `step-${action.id}`,
      position: { x: 0, y: index * STEP_HEIGHT },
      data: { label: <StepLabel action={action} index={index} />, actionType: action.type },
      type: "default",
      draggable: false,
      connectable: false,
      style: {
        width: STEP_WIDTH,
        padding: 12,
        borderRadius: 8,
        background: "#0b1220",
        border: `1px solid ${ACTION_COLORS[action.type] ?? ACTION_COLORS.Other}55`,
        boxShadow: `0 0 18px -8px ${ACTION_COLORS[action.type] ?? ACTION_COLORS.Other}`,
        color: "#e5e7eb",
      },
    }))

    const stepEdges: Edge[] = actions.slice(1).map((action, index) => ({
      id: `step-edge-${actions[index].id}-${action.id}`,
      source: `step-${actions[index].id}`,
      target: `step-${action.id}`,
      type: "smoothstep",
      animated: true,
      style: { stroke: `${ACTION_COLORS[action.type] ?? ACTION_COLORS.Other}aa`, strokeWidth: 2 },
    }))

    return { nodes: stepNodes, edges: stepEdges }
  }, [actions])

  const hostLabel = node?.data?.label || "Host"
  // Don't echo the breadcrumb: only show hostname/IP/OS that add something.
  const subtitle = [node?.data?.hostname, node?.data?.ipAddress, node?.data?.os]
    .filter((v): v is string => Boolean(v) && v !== hostLabel)
    .join(" · ")

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[86vh] max-w-3xl flex-col border-gray-700 bg-gray-900 p-0 text-white">
        <DialogHeader className="border-b border-gray-800 px-5 py-3">
          <DialogTitle className="flex flex-wrap items-center gap-1.5 text-base">
            <span className="text-gray-500">Canvas</span>
            <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
            <span className="font-semibold">{hostLabel}</span>
            <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
            <span className="text-gray-400">on-host attack path</span>
            <Badge variant="outline" className="ml-2 border-gray-700 text-xs text-gray-400">
              {actions.length} {actions.length === 1 ? "step" : "steps"}
            </Badge>
          </DialogTitle>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {actions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
              <Info className="h-8 w-8 text-gray-600" aria-hidden="true" />
              <p className="text-sm text-gray-300">No on-host steps documented yet</p>
              <p className="max-w-md text-xs text-gray-500">
                Select this host on the canvas and add steps under <strong>Actions</strong> in the
                properties panel. Steps appear here in order, and can be reordered or sorted by
                timestamp.
              </p>
            </div>
          ) : (
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                /* Steps are meant to be *read*, so open at 1:1 and let the
                   chain scroll. fitView would shrink an 8-step path to
                   unreadable text, and worse the longer the path gets — the
                   Controls' fit-view button is there for the overview. */
                defaultViewport={{ x: 150, y: 24, zoom: 1 }}
                proOptions={{ hideAttribution: true }}
                minZoom={0.15}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                className="bg-gray-950 [&_.react-flow__handle]:opacity-0"
              >
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1f2937" />
                <Controls showInteractive={false} className="!bg-gray-800 !fill-gray-200 !text-gray-200 [&_button]:!border-gray-700 [&_button]:!bg-gray-800 [&_button]:!fill-gray-200 [&_button:hover]:!bg-gray-700" />
              </ReactFlow>
            </ReactFlowProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
