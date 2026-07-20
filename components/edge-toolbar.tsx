"use client"

import { Trash2 } from "lucide-react"
import { EdgeToolbar as XYEdgeToolbar } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EdgeToolbarProps {
  id: string
  labelX: number
  labelY: number
  isVisible: boolean
  onDelete: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
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
  onDelete,
  onMouseEnter,
  onMouseLeave,
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
