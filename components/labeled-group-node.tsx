"use client"

import { memo, useState } from "react"
import { Handle, Position, type Node, type NodeProps, NodeResizer } from "@xyflow/react"

import { cn } from "@/lib/utils"
import type { NodeData } from "@/lib/types"
import { useCanvasActions } from "./canvas-actions-context"

const GroupNode = memo(function GroupNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const label = data.label || "Asset Group"
  const color = data.color || "blue"
  const transparency = data.transparency !== undefined ? data.transparency : 0.2
  const [isHovered, setIsHovered] = useState(false)
  const { multiSelectionActive } = useCanvasActions()

  // Map colors to specific Tailwind values for border/text
  const colorMap = {
    blue: { border: "border-blue-400", text: "text-blue-400", bg: "bg-blue-950", handle: "border-blue-400" },
    red: { border: "border-red-400", text: "text-red-400", bg: "bg-red-950", handle: "border-red-400" },
    green: { border: "border-green-400", text: "text-green-400", bg: "bg-green-950", handle: "border-green-400" },
    amber: { border: "border-amber-400", text: "text-amber-400", bg: "bg-amber-950", handle: "border-amber-400" },
    purple: { border: "border-purple-400", text: "text-purple-400", bg: "bg-purple-950", handle: "border-purple-400" },
  }

  const styles = colorMap[color as keyof typeof colorMap] || colorMap.blue

  return (
    <>
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 mix-blend-multiply transition-colors duration-200",
          "backdrop-blur-sm shadow-lg h-full w-full",
          styles.border,
          selected && multiSelectionActive && "ip-multi-selected",
        )}
        style={{
          backgroundColor: styles.bg.replace("bg-", "rgba(") // This is tricky with Tailwind classes, let's use rgba directly mapping or style
          // Actually, best to use style for opacity if using a class is hard, OR use `bg-opacity` if we knew the color code.
          // Let's rely on hex/rgba for background to support varying opacity easily.
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* We'll use a specific background style to handle the variable transparency */}
        <div
          className={cn("absolute inset-0 rounded-lg -z-10", styles.bg)}
          style={{ opacity: transparency }}
        />

        {label && (
          <div className={cn(
            "absolute -top-3 left-4 bg-background border px-3 py-1 text-sm font-semibold rounded-md shadow-sm",
            styles.border, // Border color matches group
            styles.text // Text color matches group
          )}
          >
            {label}
          </div>
        )}

        <Handle
          type="target"
          position={Position.Top}
          className={cn("!border-2 !border-background !w-3 !h-3", styles.handle.replace("border-", "!bg-"))}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn("!border-2 !border-background !w-3 !h-3", styles.handle.replace("border-", "!bg-"))}
        />
        <Handle
          type="target"
          position={Position.Left}
          className={cn("!border-2 !border-background !w-3 !h-3", styles.handle.replace("border-", "!bg-"))}
        />
        <Handle
          type="source"
          position={Position.Right}
          className={cn("!border-2 !border-background !w-3 !h-3", styles.handle.replace("border-", "!bg-"))}
        />
      </div>
      <NodeResizer
        isVisible={!multiSelectionActive && (selected || isHovered)}
        minWidth={300}
        minHeight={200}
        lineClassName={styles.border}
        handleClassName={cn(
          "h-6 w-6 border-2 bg-background rounded-full shadow-sm transition-transform hover:scale-110",
          styles.handle
        )}
        keepAspectRatio={false}
      />
    </>
  )
})

export { GroupNode }
