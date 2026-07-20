"use client"

import { MousePointer2, Trash2 } from "lucide-react"
import { EdgeLabelRenderer } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EdgeToolbarProps {
  id: string
  labelX: number
  labelY: number
  onSelect: () => void
  onDelete: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Floating quick-action toolbar shown at an edge's midpoint on hover/select.
 * Actions are routed through app handlers (passed as props) so they persist in
 * the controlled app state rather than mutating the React Flow store directly.
 */
export default function EdgeToolbar({
  id,
  labelX,
  labelY,
  onSelect,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}: EdgeToolbarProps) {
  return (
    <EdgeLabelRenderer>
      <div
        style={{
          // Offset above the label card so the two don't overlap.
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 56}px)`,
        }}
        className={cn(
          "nodrag nopan absolute pointer-events-auto flex items-center gap-1 rounded-lg",
          "border border-gray-700 bg-gray-800 p-1 shadow-lg",
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-gray-200 hover:bg-gray-700 hover:text-white"
          title="Select edge"
          aria-label="Select edge"
          onClick={() => onSelect()}
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
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
      </div>
    </EdgeLabelRenderer>
  )
}
