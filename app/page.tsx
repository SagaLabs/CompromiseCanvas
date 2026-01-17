"use client"

import { ReactFlowProvider } from "reactflow"
import AttackPathDesigner from "@/components/attack-path-designer"
import { useEffect } from "react"

export default function Home() {
  useEffect(() => {
    document.title = "IntrusionPath - Attack Path Designer"
  }, [])

  return (
    <ReactFlowProvider>
      <AttackPathDesigner />
    </ReactFlowProvider>
  )
}
