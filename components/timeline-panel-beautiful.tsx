"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Clock,
  Calendar,
  Filter,
  ArrowRight,
  User,
  Wrench,
  Hash,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Target,
  AlertTriangle,
  Eye,
  Upload,
  Terminal,
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
  nodes: any[]
  onHighlightEdge?: (edgeId: string) => void
  onSelectEdge?: (edgeId: string) => void
}

// Enhanced action type styling with icons and gradients
const actionTypeConfig: Record<EdgeActionType, { 
  color: string, 
  icon: React.ElementType,
  gradient: string,
  description: string 
}> = {
  "Initial Access": { 
    color: "bg-red-500/10 text-red-300 border-red-500/30", 
    icon: Target,
    gradient: "from-red-500/20 to-red-600/10",
    description: "Entry point into target system"
  },
  "Lateral Movement": { 
    color: "bg-blue-500/10 text-blue-300 border-blue-500/30", 
    icon: ArrowRight,
    gradient: "from-blue-500/20 to-blue-600/10",
    description: "Movement between systems"
  },
  "Privilege Escalation": { 
    color: "bg-purple-500/10 text-purple-300 border-purple-500/30", 
    icon: ArrowRight,
    gradient: "from-purple-500/20 to-purple-600/10",
    description: "Elevation of access rights"
  },
  "Persistence": { 
    color: "bg-orange-500/10 text-orange-300 border-orange-500/30", 
    icon: Shield,
    gradient: "from-orange-500/20 to-orange-600/10",
    description: "Maintaining access"
  },
  "Defense Evasion": { 
    color: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30", 
    icon: Eye,
    gradient: "from-yellow-500/20 to-yellow-600/10",
    description: "Avoiding detection"
  },
  "Credential Access": { 
    color: "bg-green-500/10 text-green-300 border-green-500/30", 
    icon: User,
    gradient: "from-green-500/20 to-green-600/10",
    description: "Obtaining credentials"
  },
  "Discovery": { 
    color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30", 
    icon: Eye,
    gradient: "from-cyan-500/20 to-cyan-600/10",
    description: "System reconnaissance"
  },
  "Collection": { 
    color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30", 
    icon: FileText,
    gradient: "from-indigo-500/20 to-indigo-600/10",
    description: "Data gathering"
  },
  "Exfiltration": { 
    color: "bg-pink-500/10 text-pink-300 border-pink-500/30", 
    icon: Upload,
    gradient: "from-pink-500/20 to-pink-600/10",
    description: "Data extraction"
  },
  "Command & Control": { 
    color: "bg-gray-500/10 text-gray-300 border-gray-500/30", 
    icon: Terminal,
    gradient: "from-gray-500/20 to-gray-600/10",
    description: "Remote control channel"
  },
  "Impact": { 
    color: "bg-red-600/10 text-red-300 border-red-600/30", 
    icon: Zap,
    gradient: "from-red-600/20 to-red-700/10",
    description: "System disruption"
  },
  "Reconnaissance": { 
    color: "bg-slate-500/10 text-slate-300 border-slate-500/30", 
    icon: Eye,
    gradient: "from-slate-500/20 to-slate-600/10",
    description: "Information gathering"
  },
  "Weaponization": { 
    color: "bg-amber-500/10 text-amber-300 border-amber-500/30", 
    icon: Wrench,
    gradient: "from-amber-500/20 to-amber-600/10",
    description: "Exploit preparation"
  },
  "Delivery": { 
    color: "bg-lime-500/10 text-lime-300 border-lime-500/30", 
    icon: ArrowRight,
    gradient: "from-lime-500/20 to-lime-600/10",
    description: "Payload delivery"
  },
  "Exploitation": { 
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", 
    icon: AlertTriangle,
    gradient: "from-emerald-500/20 to-emerald-600/10",
    description: "Vulnerability exploitation"
  },
  "Installation": { 
    color: "bg-teal-500/10 text-teal-300 border-teal-500/30", 
    icon: Shield,
    gradient: "from-teal-500/20 to-teal-600/10",
    description: "Malware installation"
  },
  "Data Theft": { 
    color: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30", 
    icon: Upload,
    gradient: "from-fuchsia-500/20 to-fuchsia-600/10",
    description: "Data stealing"
  },
  "Data Manipulation": { 
    color: "bg-violet-500/10 text-violet-300 border-violet-500/30", 
    icon: FileText,
    gradient: "from-violet-500/20 to-violet-600/10",
    description: "Data modification"
  },
  "Service Abuse": { 
    color: "bg-rose-500/10 text-rose-300 border-rose-500/30", 
    icon: AlertTriangle,
    gradient: "from-rose-500/20 to-rose-600/10",
    description: "Service misuse"
  },
  "Network Scanning": { 
    color: "bg-sky-500/10 text-sky-300 border-sky-500/30", 
    icon: Eye,
    gradient: "from-sky-500/20 to-sky-600/10",
    description: "Network discovery"
  },
  "Vulnerability Exploitation": { 
    color: "bg-red-400/10 text-red-300 border-red-400/30", 
    icon: AlertTriangle,
    gradient: "from-red-400/20 to-red-500/10",
    description: "Exploiting vulnerabilities"
  },
  "Social Engineering": { 
    color: "bg-orange-400/10 text-orange-300 border-orange-400/30", 
    icon: User,
    gradient: "from-orange-400/20 to-orange-500/10",
    description: "Human manipulation"
  },
  "Physical Access": { 
    color: "bg-amber-600/10 text-amber-300 border-amber-600/30", 
    icon: Shield,
    gradient: "from-amber-600/20 to-amber-700/10",
    description: "Physical intrusion"
  },
  "Supply Chain Attack": { 
    color: "bg-neutral-500/10 text-neutral-300 border-neutral-500/30", 
    icon: ArrowRight,
    gradient: "from-neutral-500/20 to-neutral-600/10",
    description: "Third-party compromise"
  },
  "Other": { 
    color: "bg-gray-400/10 text-gray-300 border-gray-400/30", 
    icon: AlertTriangle,
    gradient: "from-gray-400/20 to-gray-500/10",
    description: "Other activities"
  },
}

export default function TimelinePanel({ edges, nodes, onHighlightEdge, onSelectEdge }: TimelinePanelProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<EdgeActionType[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [groupByDay, setGroupByDay] = useState(false)

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

    return events.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
  }, [edges])

  // Filter events
  const filteredEvents = useMemo(() => {
    if (selectedActionTypes.length === 0) return timelineEvents
    return timelineEvents.filter(event => selectedActionTypes.includes(event.actionType))
  }, [timelineEvents, selectedActionTypes])

  // Group events by day
  const groupedEvents = useMemo(() => {
    if (!groupByDay) {
      return [{ date: null, events: filteredEvents }]
    }

    const groups: Record<string, TimelineEvent[]> = {}
    filteredEvents.forEach(event => {
      const dateKey = event.parsedDate.toISOString().split('T')[0]
      if (!groups[dateKey]) groups[dateKey] = []
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

  const formatTimeDifference = (current: Date, previous: Date) => {
    const diffMs = current.getTime() - previous.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays > 0) return `+${diffDays}d ${diffHours % 24}h`
    if (diffHours > 0) return `+${diffHours}h ${diffMinutes % 60}m`
    return `+${diffMinutes}m`
  }

  if (timelineEvents.length === 0) {
    return (
      <Card className="bg-gray-900/95 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
            Attack Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-12">
            <div className="p-4 bg-gray-800/50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Clock className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Timeline Events</h3>
            <p className="text-sm text-gray-500">Add timestamps to edges to visualize the attack timeline</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/95 border-gray-700/50 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
            Attack Timeline
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium">
              {filteredEvents.length} events
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGroupByDay(!groupByDay)}
              className="text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {groupByDay ? "Ungroup" : "Group by day"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Enhanced Filters */}
        {showFilters && (
          <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Attack Technique
              </h4>
              {selectedActionTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedActionTypes([])}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  Clear all ({selectedActionTypes.length})
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableActionTypes.map(actionType => {
                const config = actionTypeConfig[actionType]
                const IconComponent = config.icon
                const isSelected = selectedActionTypes.includes(actionType)
                
                return (
                  <button
                    key={actionType}
                    onClick={() => toggleActionTypeFilter(actionType)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                      isSelected 
                        ? `${config.color} bg-gradient-to-r ${config.gradient} border-current shadow-lg scale-[1.02]` 
                        : "bg-gray-800/30 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300 hover:border-gray-600/50"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-white/10' : 'bg-gray-700/50'}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{actionType}</div>
                      <div className="text-xs opacity-70 truncate">{config.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-8">
            {groupedEvents.map(({ date, events }, groupIndex) => (
              <div key={date || 'ungrouped'} className="space-y-6">
                {date && (
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-800/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200">
                      {new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-transparent" />
                  </div>
                )}

                <div className="space-y-4 relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 via-purple-500/30 to-transparent" />
                  
                  {events.map((event, eventIndex) => {
                    const previousEvent = eventIndex > 0 ? events[eventIndex - 1] : 
                      (groupIndex > 0 ? groupedEvents[groupIndex - 1].events.slice(-1)[0] : null)
                    
                    const config = actionTypeConfig[event.actionType]
                    const IconComponent = config.icon
                    
                    return (
                      <div
                        key={event.id}
                        className="relative pl-16 group cursor-pointer"
                        onClick={() => onSelectEdge?.(event.id)}
                        onMouseEnter={() => onHighlightEdge?.(event.id)}
                      >
                        {/* Timeline node */}
                        <div className="absolute left-4 top-6 w-4 h-4 rounded-full border-2 border-gray-600 bg-gray-900 flex items-center justify-center group-hover:border-blue-400 transition-colors z-10">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 group-hover:scale-125 transition-transform" />
                        </div>

                        {/* Event card */}
                        <div className={`bg-gradient-to-r ${config.gradient} border border-gray-700/50 rounded-xl p-6 group-hover:border-gray-600/50 group-hover:shadow-lg group-hover:shadow-black/20 transition-all duration-200`}>
                          {/* Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/5 rounded-lg">
                                <Clock className="h-4 w-4 text-gray-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-200 font-mono">
                                  {event.timestamp}
                                </div>
                                {previousEvent && (
                                  <div className="text-xs text-gray-500">
                                    {formatTimeDifference(event.parsedDate, previousEvent.parsedDate)} later
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Badge className={`${config.color} border font-medium flex items-center gap-2 px-3 py-1`}>
                              <IconComponent className="h-3 w-3" />
                              {event.actionType}
                            </Badge>
                          </div>

                          {/* Connection path */}
                          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800/30 rounded-lg">
                            <span className="font-semibold text-gray-200 truncate">
                              {nodeLabels[event.sourceId] || event.sourceId}
                            </span>
                            <ArrowRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-200 truncate">
                              {nodeLabels[event.targetId] || event.targetId}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-3">
                            {event.actionType === "Command & Control" ? (
                              <div className="grid grid-cols-1 gap-3">
                                {event.c2Channel && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                                    <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wider">Channel</div>
                                      <div className="text-sm text-gray-300 font-medium">{event.c2Channel}</div>
                                    </div>
                                  </div>
                                )}
                                {event.c2Framework && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                                    <Terminal className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wider">Framework</div>
                                      <div className="text-sm text-gray-300 font-medium">{event.c2Framework}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {event.toolUsed && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                                    <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wider">Tool</div>
                                      <div className="text-sm text-gray-300 font-medium">{event.toolUsed}</div>
                                    </div>
                                  </div>
                                )}
                                {event.userUsed && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wider">User</div>
                                      <div className="text-sm text-gray-300 font-medium">{event.userUsed}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {event.mitreAttackId && (
                              <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                <Hash className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <div>
                                  <div className="text-xs text-red-400 uppercase tracking-wider">MITRE ATT&CK</div>
                                  <div className="text-sm text-red-300 font-medium">{event.mitreAttackId}</div>
                                </div>
                              </div>
                            )}
                            
                            {event.description && (
                              <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Description</div>
                                  <div className="text-sm text-blue-200 leading-relaxed">{event.description}</div>
                                </div>
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