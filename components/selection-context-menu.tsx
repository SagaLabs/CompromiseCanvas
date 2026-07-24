"use client"

import {
  Check,
  Copy,
  LayoutPanelTop,
  Search,
  Skull,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { INVESTIGATION_STATUSES } from "@/lib/types"
import {
  SELECTION_LAYOUT_ACTIONS,
  STATUS_ICONS,
  type SelectionActionsProps,
} from "./selection-actions"

interface SelectionContextMenuProps extends SelectionActionsProps {
  open: boolean
  point: { x: number; y: number } | null
  onOpenChange: (open: boolean) => void
}

export default function SelectionContextMenu({
  open,
  point,
  onOpenChange,
  selectedNodeCount,
  selectedEdgeCount,
  arrangeableNodeCount,
  bulkStatusNodeCount,
  allBulkStatusNodesCompromised,
  bulkInvestigationStatus,
  onCopy,
  onDelete,
  onLayout,
  onToggleCompromised,
  onSetInvestigationStatus,
}: SelectionContextMenuProps) {
  const total = selectedNodeCount + selectedEdgeCount

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed h-px w-px"
          style={{ left: point?.x ?? -1000, top: point?.y ?? -1000 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label="Selection actions"
        align="start"
        side="bottom"
        sideOffset={0}
        className="w-64 border-gray-700 bg-gray-800 text-gray-200"
      >
        <DropdownMenuLabel className="text-xs text-gray-400">
          {total} selected
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          disabled={bulkStatusNodeCount === 0}
          onSelect={onToggleCompromised}
          className="gap-2 text-xs focus:bg-gray-700 focus:text-white"
        >
          <Skull className={allBulkStatusNodesCompromised ? "text-red-400" : ""} aria-hidden="true" />
          {allBulkStatusNodesCompromised ? "Unmark selected as compromised" : "Mark selected as compromised"}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            disabled={bulkStatusNodeCount === 0}
            className="gap-2 text-xs focus:bg-gray-700 focus:text-white data-[state=open]:bg-gray-700 data-[state=open]:text-white"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Investigation status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52 border-gray-700 bg-gray-800 text-gray-200">
            {INVESTIGATION_STATUSES.map((status) => {
              const StatusIcon = STATUS_ICONS[status]
              return (
                <DropdownMenuItem
                  key={status}
                  onSelect={() => onSetInvestigationStatus(status)}
                  className="flex items-center justify-between gap-2 text-xs focus:bg-gray-700 focus:text-white"
                >
                  <span className="flex items-center gap-2">
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {status}
                  </span>
                  {bulkInvestigationStatus === status && <Check className="h-3.5 w-3.5 text-blue-400" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            disabled={arrangeableNodeCount < 2}
            className="gap-2 text-xs focus:bg-gray-700 focus:text-white data-[state=open]:bg-gray-700 data-[state=open]:text-white"
          >
            <LayoutPanelTop className="h-4 w-4" aria-hidden="true" />
            Arrange selection
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 border-gray-700 bg-gray-800 text-gray-200">
            {SELECTION_LAYOUT_ACTIONS.map(({ action, label, minimum, icon: Icon }) => (
              <DropdownMenuItem
                key={action}
                disabled={arrangeableNodeCount < minimum}
                onSelect={() => onLayout(action)}
                className="gap-2 text-xs focus:bg-gray-700 focus:text-white"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          disabled={selectedNodeCount === 0}
          onSelect={onCopy}
          className="gap-2 text-xs focus:bg-gray-700 focus:text-white"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy selection
          <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onDelete}
          className="gap-2 text-xs text-red-400 focus:bg-gray-700 focus:text-red-300"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete selection
          <DropdownMenuShortcut>Del</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
