"use client"

import { Trash2, Tag, Check } from "lucide-react"
import { EdgeToolbar as XYEdgeToolbar } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { EDGE_ACTION_TYPES, type EdgeActionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EdgeToolbarProps {
  id: string
  labelX: number
  labelY: number
  isVisible: boolean
  currentActionType?: string
  onSetActionType: (actionType: EdgeActionType) => void
  onDelete: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMenuOpenChange?: (open: boolean) => void
}

/**
 * Quick-action toolbar for an edge, built on React Flow v12's official
 * `EdgeToolbar` (positioning/visibility handled by the library). Actions are
 * routed through app handlers (props) so they persist in the controlled state.
 */
export default function EdgeToolbar({
  id,
  labelX,
  labelY,
  isVisible,
  currentActionType,
  onSetActionType,
  onDelete,
  onMouseEnter,
  onMouseLeave,
  onMenuOpenChange,
}: EdgeToolbarProps) {
  return (
    <XYEdgeToolbar
      edgeId={id}
      x={labelX}
      y={labelY - 60}
      isVisible={isVisible}
      alignY="bottom"
      className={cn(
        "nodrag nopan flex items-center gap-1 rounded-lg",
        "border border-gray-700 bg-gray-800 p-1 shadow-lg",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <DropdownMenu onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-gray-200 hover:bg-gray-700 hover:text-white"
            title="Change action type"
            aria-label="Change action type"
          >
            <Tag className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-56 overflow-y-auto border-gray-700 bg-gray-800 text-gray-200"
        >
          <DropdownMenuLabel className="text-xs text-gray-400">Action type</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {EDGE_ACTION_TYPES.map((type) => (
            <DropdownMenuItem
              key={type}
              onSelect={() => onSetActionType(type)}
              className="flex items-center justify-between gap-2 text-xs focus:bg-gray-700 focus:text-white"
            >
              <span>{type}</span>
              {type === currentActionType && <Check className="h-3.5 w-3.5 text-blue-400" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-red-400 hover:bg-gray-700 hover:text-red-300"
        title="Delete edge"
        aria-label="Delete edge"
        onClick={() => onDelete()}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </XYEdgeToolbar>
  )
}
