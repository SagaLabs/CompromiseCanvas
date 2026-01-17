"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps, NodeResizer } from "reactflow"

import { cn } from "@/lib/utils"
import { BaseNode } from "./base-node"
import type { NodeData } from "@/lib/types"

const GroupNode = memo(function GroupNode({ data, selected }: NodeProps<NodeData>) {
  const label = data.label || "Asset Group"
  
  return (
    <>
      <NodeResizer 
        isVisible={selected} 
        minWidth={300} 
        minHeight={200}
        lineClassName="border-blue-400"
        handleClassName="h-3 w-3 border-2 border-blue-400 bg-background rounded"
        keepAspectRatio={false}
      />
         <div
       className={cn(
         "relative rounded-lg border-2 border-dashed border-blue-400/60 bg-blue-950/20 p-6",
         "backdrop-blur-sm shadow-lg min-w-[300px] min-h-[200px]"
       )}
       style={{ zIndex: -1 }}
     >
      {label && (
        <div className="absolute -top-3 left-4 bg-background border border-blue-400/30 px-3 py-1 text-sm font-semibold text-blue-400 rounded-md shadow-sm">
          {label}
        </div>
      )}
     
      
      
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-400 !border-2 !border-background !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-400 !border-2 !border-background !w-3 !h-3"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-400 !border-2 !border-background !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-400 !border-2 !border-background !w-3 !h-3"
      />
    </div>
    </>
  )
})

export { GroupNode } 