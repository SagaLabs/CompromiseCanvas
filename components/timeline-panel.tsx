"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Clock,
  Calendar,
  Filter,
  ArrowRight,
  User,
  Tool,
  Hash,
  FileText,
  ChevronDown,
  ChevronRight,
  Activity,
} from "lucide-react"
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
  c2Channel?: string
  c2Framework?: string
}

interface TimelinePanelProps {
  edges: CustomEdge[]
  nodes: any[] // For getting node labels
  onHighlightEdge?: (edgeId: string) => void
  onSelectEdge?: (edgeId: string) => void
}

const actionTypeColors: Record<EdgeActionType, string> = {
  "Initial Access": "bg-red-500/20 text-red-400 border-red-500/30",
  "Lateral Movement": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Privilege Escalation": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Persistence": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Defense Evasion": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Credential Access": "bg-green-500/20 text-green-400 border-green-500/30",
  "Discovery": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Collection": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Exfiltration": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Command & Control": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Impact": "bg-red-600/20 text-red-300 border-red-600/30",
  "Reconnaissance": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "Weaponization": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Delivery": "bg-lime-500/20 text-lime-400 border-lime-500/30",
  "Exploitation": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Installation": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Data Theft": "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  "Data Manipulation": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Service Abuse": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "Network Scanning": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "Vulnerability Exploitation": "bg-red-400/20 text-red-300 border-red-400/30",
  "Social Engineering": "bg-orange-400/20 text-orange-300 border-orange-400/30",
  "Physical Access": "bg-amber-600/20 text-amber-400 border-amber-600/30",
  "Supply Chain Attack": "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
  "Other": "bg-gray-400/20 text-gray-300 border-gray-400/30",
}

export default function TimelinePanel({ edges, nodes, onHighlightEdge, onSelectEdge }: TimelinePanelProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<EdgeActionType[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [groupByDay, setGroupByDay] = useState(true)

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
              c2Channel: edge.data.c2Channel,
              c2Framework: edge.data.c2Framework,
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

  // Filter events by selected action types
  const filteredEvents = useMemo(() => {
    if (selectedActionTypes.length === 0) {
      return timelineEvents
    }
    return timelineEvents.filter(event => selectedActionTypes.includes(event.actionType))
  }, [timelineEvents, selectedActionTypes])

  // Group events by day if enabled
  const groupedEvents = useMemo(() => {
    if (!groupByDay) {
      return [{ date: null, events: filteredEvents }]
    }

    const groups: Record<string, TimelineEvent[]> = {}
    filteredEvents.forEach(event => {
      const dateKey = event.parsedDate.toISOString().split('T')[0] // YYYY-MM-DD format
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({ date, events }))
  }, [filteredEvents, groupByDay])

  // Get unique action types for filtering
  const availableActionTypes = useMemo(() => {
    const types = new Set<EdgeActionType>()
    timelineEvents.forEach(event => types.add(event.actionType))
    return Array.from(types).sort()
  }, [timelineEvents])

  const toggleActionTypeFilter = (actionType: EdgeActionType) => {
    setSelectedActionTypes(prev => 
      prev.includes(actionType) 
        ? prev.filter(t => t !== actionType)
        : [...prev, actionType]
    )
  }

  const clearFilters = () => {
    setSelectedActionTypes([])
  }

  const formatTimeDifference = (current: Date, previous: Date) => {
    const diffMs = current.getTime() - previous.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      return `+${diffDays}d ${diffHours % 24}h`
    } else if (diffHours > 0) {
      return `+${diffHours}h ${diffMinutes % 60}m`
    } else {
      return `+${diffMinutes}m`
    }
  }

  if (timelineEvents.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Attack Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline events found</p>
            <p className="text-sm mt-2">Add timestamps to edges to see the attack timeline</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Attack Timeline
            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
              {filteredEvents.length} events
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGroupByDay(!groupByDay)}
              className="text-gray-300 hover:bg-gray-700"
            >
              <Calendar className="h-4 w-4 mr-1" />
              {groupByDay ? "Ungroup" : "Group by day"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-300 hover:bg-gray-700"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {showFilters ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-300">Filter by Action Type</h4>
              {selectedActionTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Clear all
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableActionTypes.map(actionType => (
                <Badge
                  key={actionType}
                  variant={selectedActionTypes.includes(actionType) ? "default" : "secondary"}
                  className={`cursor-pointer transition-colors ${
                    selectedActionTypes.includes(actionType) 
                      ? actionTypeColors[actionType] 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  onClick={() => toggleActionTypeFilter(actionType)}
                >
                  {actionType}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-6">
            {groupedEvents.map(({ date, events }, groupIndex) => (
              <div key={date || 'ungrouped'} className="space-y-4">
                {date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-300">
                      {new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <Separator className="flex-1 bg-gray-700" />
                  </div>
                )}

                <div className="space-y-3">
                  {events.map((event, eventIndex) => {
                    const previousEvent = eventIndex > 0 ? events[eventIndex - 1] : 
                      (groupIndex > 0 ? groupedEvents[groupIndex - 1].events.slice(-1)[0] : null)
                    
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
                              <Clock className="h-3 w-3 text-gray-400" />
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
                                  ({formatTimeDifference(event.parsedDate, previousEvent.parsedDate)})
                                </span>
                              )}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${actionTypeColors[event.actionType]}`}
                            >
                              {event.actionType}
                            </Badge>
                          </div>

                          {/* Connection path */}
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="font-medium">{nodeLabels[event.sourceId] || event.sourceId}</span>
                            <ArrowRight className="h-3 w-3 text-gray-500" />
                            <span className="font-medium">{nodeLabels[event.targetId] || event.targetId}</span>
                          </div>

                          {/* Details */}
                          <div className="space-y-1 text-xs text-gray-400">
                            {event.actionType === "Command & Control" ? (
                              <div className="space-y-1">
                                {event.c2Channel && (
                                  <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    <span>Channel: {event.c2Channel}</span>
                                  </div>
                                )}
                                {event.c2Framework && (
                                  <div className="flex items-center gap-1">
                                    <Tool className="h-3 w-3" />
                                    <span>Framework: {event.c2Framework}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {event.toolUsed && (
                                  <div className="flex items-center gap-1">
                                    <Tool className="h-3 w-3" />
                                    <span>Tool: {event.toolUsed}</span>
                                  </div>
                                )}
                                {event.userUsed && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>User: {event.userUsed}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {event.mitreAttackId && (
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span>MITRE: {event.mitreAttackId}</span>
                              </div>
                            )}
                            
                            {event.description && (
                              <div className="flex items-start gap-1">
                                <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
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
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}