"use client"

import type { Node } from "@xyflow/react"
import type { NodeData } from "@/lib/types"
import { AlertCircle, Shield, Activity } from "lucide-react"

interface StatsPanelProps {
  nodes: Node[]
}

export default function StatsPanel({ nodes }: StatsPanelProps) {
  const totalAssets = nodes.length
  const compromisedCount = nodes.filter((n) => (n.data as NodeData).isCompromised).length
  const criticalCount = nodes.filter((n) => (n.data as NodeData).criticality === "Critical").length
  const highCount = nodes.filter((n) => (n.data as NodeData).criticality === "High").length

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-gray-800/90 border border-gray-700 p-3 backdrop-blur-sm">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Diagram Stats
        </div>

        <div className="space-y-2">
          {/* Total Assets */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" aria-hidden="true" />
              <span className="text-sm text-gray-300">Total Assets</span>
            </div>
            <span className="text-lg font-semibold text-blue-400">{totalAssets}</span>
          </div>

          {/* Compromised */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span className="text-sm text-gray-300">Compromised</span>
            </div>
            <span className="text-lg font-semibold text-red-400">{compromisedCount}</span>
          </div>

          {/* Critical */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span className="text-sm text-gray-300">Critical</span>
            </div>
            <span className="text-lg font-semibold text-amber-400">{criticalCount}</span>
          </div>

          {/* High */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-400" aria-hidden="true" />
              <span className="text-sm text-gray-300">High</span>
            </div>
            <span className="text-lg font-semibold text-orange-400">{highCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
