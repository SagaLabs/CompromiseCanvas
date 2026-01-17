"use client"

import { memo } from "react"
import { Handle, Position } from "reactflow"

import { cn } from "@/lib/utils"

interface BaseNodeProps {
  children?: React.ReactNode
  className?: string
  handles?: {
    position: Position
    type?: "source" | "target"
    id?: string
    className?: string
  }[]
}

const BaseNode = memo(function BaseNode({
  children,
  className,
  handles = [],
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-background p-3 shadow-sm",
        className
      )}
    >
      {handles.map((handle, index) => (
        <Handle
          key={handle.id || index}
          type={handle.type || "source"}
          position={handle.position}
          id={handle.id}
          className={cn("!bg-primary", handle.className)}
        />
      ))}
      {children}
    </div>
  )
})

export { BaseNode } 