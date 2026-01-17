"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  X,
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

interface TimelineModalProps {
  isOpen: boolean
  onClose: () => void
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

export default function TimelineModal({ isOpen, onClose, edges, nodes, onHighlightEdge, onSelectEdge }: TimelineModalProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<EdgeActionType[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [groupByDay, setGroupByDay] = useState(false)

  // Only process data when modal is open - major performance optimization
  const nodeLabels = useMemo(() => {
    if (!isOpen) return {}
    const labelMap: Record<string, string> = {}
    nodes.forEach(node => {
      labelMap[node.id] = node.data?.label || node.id
    })
    return labelMap
  }, [nodes, isOpen])

  // Process edges into timeline events only when modal is open
  const timelineEvents = useMemo(() => {
    if (!isOpen) return []
    
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
  }, [edges, isOpen])

  // Filter events only when modal is open
  const filteredEvents = useMemo(() => {
    if (!isOpen) return []
    if (selectedActionTypes.length === 0) return timelineEvents
    return timelineEvents.filter(event => selectedActionTypes.includes(event.actionType))
  }, [timelineEvents, selectedActionTypes, isOpen])

  // Group events by day only when modal is open
  const groupedEvents = useMemo(() => {
    if (!isOpen) return []
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



      const handleEventClick = (eventId: string) => {
      onSelectEdge?.(eventId)
      // Don't close modal automatically - let user see the highlighting
    }

  if (timelineEvents.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
              Attack Timeline
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center text-gray-400">
              <div className="p-6 bg-gray-800/50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Clock className="h-12 w-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-3">No Timeline Events</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Add timestamps to edges to visualize the attack timeline. Load a template or create connections with timestamps to get started.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] bg-gray-900 border border-gray-700 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              Attack Timeline
              <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-sm px-3 py-1">
                {filteredEvents.length} events
              </Badge>
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGroupByDay(!groupByDay)}
                className="text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 ease-out text-sm hover:scale-105"
              >
                <Calendar className="h-4 w-4 mr-1" />
                {groupByDay ? "Ungroup" : "Group"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 ease-out text-sm hover:scale-105"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {showFilters ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-200">Filter by Attack Technique</h4>
                {selectedActionTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedActionTypes([])}
                    className="text-xs text-gray-400 hover:text-gray-200 h-6 px-2 transition-all duration-200 ease-out hover:scale-105"
                  >
                    Clear ({selectedActionTypes.length})
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableActionTypes.map(actionType => {
                  const config = actionTypeConfig[actionType]
                  const IconComponent = config.icon
                  const isSelected = selectedActionTypes.includes(actionType)
                  
                  return (
                    <button
                      key={actionType}
                      onClick={() => toggleActionTypeFilter(actionType)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200 ease-out text-xs hover:scale-105 ${
                        isSelected 
                          ? `${config.color} border-current` 
                          : "bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300"
                      }`}
                    >
                      <IconComponent className="h-3 w-3" />
                      {actionType}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-6">
              {groupedEvents.map(({ date, events }, groupIndex) => (
                <div key={date || 'ungrouped'} className="space-y-4">
                  {date && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-1.5 bg-gray-800/50 rounded-lg">
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

                  <div className="space-y-3 relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 via-purple-500/20 to-transparent" />
                    
                    {events.map((event, eventIndex) => {
                      const config = actionTypeConfig[event.actionType]
                      const IconComponent = config.icon
                      
                      return (
                        <div
                          key={event.id}
                          className="relative pl-10 group cursor-pointer"
                          onClick={() => handleEventClick(event.id)}
                          onMouseEnter={() => onHighlightEdge?.(event.id)}
                          onMouseLeave={() => onHighlightEdge?.("")}
                        >
                          {/* Timeline node */}
                          <div className="absolute left-3 top-4 w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 group-hover:scale-150 transition-all duration-200 ease-out z-10" />

                          {/* Event card */}
                          <div className={`bg-gradient-to-r ${config.gradient} border border-gray-700/30 rounded-lg p-4 group-hover:border-gray-600/50 group-hover:shadow-lg transition-all duration-300 ease-out group-hover:scale-[1.01]`}>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className="text-sm font-mono text-gray-200">
                                    {event.timestamp}
                                  </div>
                                </div>
                              </div>
                              
                              <Badge className={`${config.color} border text-xs px-2 py-1 flex items-center gap-1.5`}>
                                <IconComponent className="h-3 w-3" />
                                {event.actionType}
                              </Badge>
                            </div>

                            {/* Connection path */}
                            <div className="flex items-center gap-2 mb-3 p-2 bg-gray-800/20 rounded-md">
                              <span className="font-medium text-gray-200 text-sm truncate">
                                {nodeLabels[event.sourceId] || event.sourceId}
                              </span>
                              <ArrowRight className="h-3 w-3 text-gray-500 flex-shrink-0" />
                              <span className="font-medium text-gray-200 text-sm truncate">
                                {nodeLabels[event.targetId] || event.targetId}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="space-y-2">
                              {event.actionType === "Command & Control" ? (
                                <div className="flex flex-wrap gap-2">
                                  {event.c2Channel && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/20 rounded text-xs">
                                      <Hash className="h-3 w-3 text-gray-400" />
                                      <span className="text-gray-300">{event.c2Channel}</span>
                                    </div>
                                  )}
                                  {event.c2Framework && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/20 rounded text-xs">
                                      <Terminal className="h-3 w-3 text-gray-400" />
                                      <span className="text-gray-300">{event.c2Framework}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {event.toolUsed && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/20 rounded text-xs">
                                      <Wrench className="h-3 w-3 text-gray-400" />
                                      <span className="text-gray-300">{event.toolUsed}</span>
                                    </div>
                                  )}
                                  {event.userUsed && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/20 rounded text-xs">
                                      <User className="h-3 w-3 text-gray-400" />
                                      <span className="text-gray-300">{event.userUsed}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {event.mitreAttackId && (
                                <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs">
                                  <Hash className="h-3 w-3 text-red-400" />
                                  <span className="text-red-300 font-medium">{event.mitreAttackId}</span>
                                </div>
                              )}
                              
                              {event.description && (
                                <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs">
                                  <div className="text-blue-200 leading-relaxed">{event.description}</div>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}