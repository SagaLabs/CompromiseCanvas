"use client"

import { memo } from "react"
import { Background, ReactFlow, type Node } from "reactflow"
import { GroupNode } from "./labeled-group-node"

const LabeledGroupNodeDemo = memo(() => {
  const defaultNodes: Node[] = [
    {
      id: "1",
      position: { x: 200, y: 200 },
      data: { label: "Asset Group" },
      width: 400,
      height: 250,
      type: "labeledGroupNode",
    },
    {
      id: "2",
      position: { x: 50, y: 100 },
      data: { label: "Web Server" },
      type: "default",
      parentId: "1",
      extent: "parent",
    },
    {
      id: "3",
      position: { x: 200, y: 50 },
      data: { label: "Identity" },
      type: "default",
      parentId: "1",
      extent: "parent",
    },
  ]

  const nodeTypes = {
    labeledGroupNode: GroupNode,
  }

  return (
    <div className="h-full w-full">
      <ReactFlow defaultNodes={defaultNodes} nodeTypes={nodeTypes} fitView>
        <Background />
      </ReactFlow>
    </div>
  )
})

export default LabeledGroupNodeDemo 