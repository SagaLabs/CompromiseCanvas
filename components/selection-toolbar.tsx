"use client"

import {
  Check,
  Copy,
  LayoutPanelTop,
  Search,
  Skull,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { INVESTIGATION_STATUSES } from "@/lib/types"
import {
  SELECTION_LAYOUT_ACTIONS,
  STATUS_ICONS,
  type SelectionActionsProps,
} from "./selection-actions"

export default function SelectionToolbar({
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
}: SelectionActionsProps) {
  const total = selectedNodeCount + selectedEdgeCount
  const summary = [
    selectedNodeCount > 0 && `${selectedNodeCount} node${selectedNodeCount === 1 ? "" : "s"}`,
    selectedEdgeCount > 0 && `${selectedEdgeCount} edge${selectedEdgeCount === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ")

  if (total < 2) return null

  return (
    <div
      role="toolbar"
      aria-label="Multiple selection actions"
      className="ip-selection-toolbar nodrag nopan flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-xl backdrop-blur"
    >
      <div className="min-w-[7.5rem] px-2" aria-live="polite">
        <div className="text-xs font-semibold text-blue-400">{total} selected</div>
        <div className="text-[10px] text-gray-400">{summary}</div>
      </div>
      <div className="ip-divider mx-1 h-7 w-px" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={allBulkStatusNodesCompromised
          ? "h-8 w-8 text-red-400 hover:bg-gray-700 hover:text-red-300"
          : "h-8 w-8 text-gray-300 hover:bg-gray-700 hover:text-white"}
        disabled={bulkStatusNodeCount === 0}
        onClick={onToggleCompromised}
        title={allBulkStatusNodesCompromised ? "Unmark selected as compromised" : "Mark selected as compromised"}
        aria-label={allBulkStatusNodesCompromised ? "Unmark selected as compromised" : "Mark selected as compromised"}
        aria-pressed={allBulkStatusNodesCompromised}
      >
        <Skull className="h-4 w-4" aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-300 hover:bg-gray-700 hover:text-white"
            disabled={bulkStatusNodeCount === 0}
            title="Set selected investigation status"
            aria-label="Set selected investigation status"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 border-gray-700 bg-gray-800 text-gray-200">
          <DropdownMenuLabel className="text-xs text-gray-400">Investigation status</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
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
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-300 hover:bg-gray-700 hover:text-white"
            disabled={arrangeableNodeCount < 2}
            title="Arrange selection"
            aria-label="Arrange selection"
          >
            <LayoutPanelTop className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 border-gray-700 bg-gray-800 text-gray-200">
          <DropdownMenuLabel className="text-xs text-gray-400">Arrange selected nodes</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {SELECTION_LAYOUT_ACTIONS.map(({ action, label, minimum, icon: Icon }) => (
            <DropdownMenuItem
              key={action}
              disabled={arrangeableNodeCount < minimum}
              onSelect={() => onLayout(action)}
              className="flex items-center gap-2 text-xs focus:bg-gray-700 focus:text-white"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ip-divider mx-1 h-7 w-px" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-300 hover:bg-gray-700 hover:text-white"
        disabled={selectedNodeCount === 0}
        onClick={onCopy}
        title="Copy selection"
        aria-label="Copy selection"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-400 hover:bg-gray-700 hover:text-red-300"
        onClick={onDelete}
        title="Delete selection"
        aria-label="Delete selection"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
