"use client"

import { Skull, Search, Check, HelpCircle, Clock, CheckCircle, Circle } from "lucide-react"
import { NodeToolbar as XYNodeToolbar, Position } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { INVESTIGATION_STATUSES, type InvestigationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface NodeToolbarProps {
  nodeId: string
  isVisible: boolean
  isCompromised?: boolean
  investigationStatus?: InvestigationStatus
  onToggleCompromised: () => void
  onSetStatus: (status: InvestigationStatus) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMenuOpenChange?: (open: boolean) => void
}

const STATUS_ICONS: Record<InvestigationStatus, typeof Circle> = {
  "No Status": Circle,
  "Not Investigated": HelpCircle,
  Investigating: Clock,
  Done: CheckCircle,
}

/**
 * Quick-action toolbar for a node, built on React Flow v12's official
 * `NodeToolbar`. Toggles compromised state and sets investigation status,
 * writing through handlers supplied by the node (which persist via setNodes).
 */
export default function NodeToolbar({
  nodeId,
  isVisible,
  isCompromised,
  investigationStatus,
  onToggleCompromised,
  onSetStatus,
  onMouseEnter,
  onMouseLeave,
  onMenuOpenChange,
}: NodeToolbarProps) {
  return (
    <XYNodeToolbar
      nodeId={nodeId}
      isVisible={isVisible}
      position={Position.Top}
      offset={12}
      className={cn(
        "nodrag nopan flex items-center gap-1 rounded-lg",
        "border border-gray-700 bg-gray-800 p-1 shadow-lg",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "h-7 w-7 hover:bg-gray-700",
          isCompromised ? "text-red-500 hover:text-red-400" : "text-gray-300 hover:text-white",
        )}
        title={isCompromised ? "Unmark compromised" : "Mark as compromised"}
        aria-label={isCompromised ? "Unmark compromised" : "Mark as compromised"}
        aria-pressed={isCompromised}
        onClick={() => onToggleCompromised()}
      >
        <Skull className="h-4 w-4" />
      </Button>
      <DropdownMenu onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-gray-300 hover:bg-gray-700 hover:text-white"
            title="Set investigation status"
            aria-label="Set investigation status"
          >
            <Search className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 border-gray-700 bg-gray-800 text-gray-200">
          <DropdownMenuLabel className="text-xs text-gray-400">Investigation status</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {INVESTIGATION_STATUSES.map((status) => {
            const StatusIcon = STATUS_ICONS[status]
            return (
              <DropdownMenuItem
                key={status}
                onSelect={() => onSetStatus(status)}
                className="flex items-center justify-between gap-2 text-xs focus:bg-gray-700 focus:text-white"
              >
                <span className="flex items-center gap-2">
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status}
                </span>
                {status === investigationStatus && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </XYNodeToolbar>
  )
}
