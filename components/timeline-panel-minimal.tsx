"use client"

import { useMemo } from "react"
import type { CustomEdge, EdgeActionType } from "@/lib/types"

interface TimelineEvent {
  id: string
  timestamp: string
  parsedDate: Date
  actionType: EdgeActionType
  toolUsed: string
  userUsed: string
  mitreAttackId?: string
  description: string
  sourceId: string
  targetId: string
}

interface TimelinePanelProps {
  edges: CustomEdge[]
  nodes: any[]
  onHighlightEdge?: (edgeId: string) => void
  onSelectEdge?: (edgeId: string) => void
}

export default function TimelinePanel({ edges, nodes, onHighlightEdge, onSelectEdge }: TimelinePanelProps) {
  // Create a map for quick node label lookup
  const nodeLabels = useMemo(() => {
    const labelMap: Record<string, string> = {}
    nodes.forEach(node => {
      labelMap[node.id] = node.data?.label || node.id
    })
    return labelMap
  }, [nodes])

  // Process edges into timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = []
    
    edges.forEach(edge => {
      if (edge.data?.timestamp) {
        try {
          const parsedDate = new Date(edge.data.timestamp)
          if (!isNaN(parsedDate.getTime())) {
            events.push({
              id: edge.id,
              timestamp: edge.data.timestamp,
              parsedDate,
              actionType: edge.data.actionType,
              toolUsed: edge.data.toolUsed,
              userUsed: edge.data.userUsed,
              mitreAttackId: edge.data.mitreAttackId,
              description: edge.data.description,
              sourceId: edge.source,
              targetId: edge.target,
            })
          }
        } catch (error) {
          console.warn(`Invalid timestamp format for edge ${edge.id}: ${edge.data.timestamp}`)
        }
      }
    })

    // Sort by timestamp
    return events.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
  }, [edges])

  if (timelineEvents.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            ⚡ Attack Timeline
          </h2>
        </div>
        <div className="p-4">
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-4">🕒</div>
            <p>No timeline events found</p>
            <p className="text-sm mt-2">Add timestamps to edges to see the attack timeline</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          ⚡ Attack Timeline
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
            {timelineEvents.length} events
          </span>
        </h2>
      </div>

      <div className="p-4">
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {timelineEvents.map((event, eventIndex) => {
              const previousEvent = eventIndex > 0 ? timelineEvents[eventIndex - 1] : null
              
              return (
                <div
                  key={event.id}
                  className="relative pl-6 pb-4 cursor-pointer hover:bg-gray-800/50 rounded-lg p-3 transition-colors"
                  onClick={() => onSelectEdge?.(event.id)}
                  onMouseEnter={() => onHighlightEdge?.(event.id)}
                >
                  {/* Timeline line */}
                  <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-700" />
                  
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-4 w-4 h-4 rounded-full border-2 border-gray-700 bg-gray-900 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  </div>

                  <div className="space-y-2">
                    {/* Header with time and action type */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">🕒</span>
                        <span className="text-xs text-gray-400">
                          {event.parsedDate.toLocaleTimeString('en-US', { 
                            hour12: false, 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </span>
                        {previousEvent && (
                          <span className="text-xs text-gray-500">
                            (+{Math.floor((event.parsedDate.getTime() - previousEvent.parsedDate.getTime()) / (1000 * 60))}m)
                          </span>
                        )}
                      </div>
                      <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded">
                        {event.actionType}
                      </span>
                    </div>

                    {/* Connection path */}
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="font-medium">{nodeLabels[event.sourceId] || event.sourceId}</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-medium">{nodeLabels[event.targetId] || event.targetId}</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-xs text-gray-400">
                      {event.toolUsed && (
                        <div className="flex items-center gap-1">
                          <span>🔧</span>
                          <span>Tool: {event.toolUsed}</span>
                        </div>
                      )}
                      {event.userUsed && (
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>User: {event.userUsed}</span>
                        </div>
                      )}
                      {event.mitreAttackId && (
                        <div className="flex items-center gap-1">
                          <span>#</span>
                          <span>MITRE: {event.mitreAttackId}</span>
                        </div>
                      )}
                      {event.description && (
                        <div className="flex items-start gap-1">
                          <span>📄</span>
                          <span className="break-words">{event.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}