"use client"

import { ReactFlowProvider } from "reactflow"
import CompromiseCanvas from "@/components/compromise-canvas"
import { useEffect } from "react"

export default function Home() {
  useEffect(() => {
    document.title = "Compromise Canvas"
  }, [])

  return (
    <ReactFlowProvider>
      <CompromiseCanvas />
    </ReactFlowProvider>
  )
}
