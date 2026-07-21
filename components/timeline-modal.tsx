"use client"

import { useMemo, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Activity,
  ArrowRight,
  Clock,
  Filter,
  Search,
  StickyNote,
  X,
} from "lucide-react"
import type { CustomEdge, EdgeData, EdgeActionType, IncidentLogEntry } from "@/lib/types"
import { getMitreTechniqueLabel, getMitreTechniqueUrl } from "@/lib/mitre-attack"

interface TimelineEvent {
  id: string
  timestamp: string
  parsedDate: Date
  kind: "edge" | "incident"
  actionType?: EdgeActionType
  toolUsed?: string
  userUsed?: string
  mitreAttackId?: string
  mitreAttackName?: string
  description: string
  sourceId?: string
  targetId?: string
  c2Channel?: string
  c2Framework?: string
  incidentCategory?: IncidentLogEntry["category"]
}

interface TimelineModalProps {
  isOpen: boolean
  onClose: () => void
  edges: CustomEdge[]
  nodes: any[]
  incidentLog?: IncidentLogEntry[]
  onHighlightEdge?: (edgeId: string) => void
  onSelectEdge?: (edgeId: string) => void
  onUpdateEdge?: (edgeId: string, data: Partial<EdgeData>) => void
}

const actionTypeTone: Record<EdgeActionType, string> = {
  "Initial Access": "text-red-400 border-red-400/40 bg-red-500/10",
  "Lateral Movement": "text-blue-400 border-blue-400/40 bg-blue-500/10",
  "Privilege Escalation": "text-red-400 border-red-400/40 bg-red-500/10",
  "Persistence": "text-amber-400 border-amber-400/40 bg-amber-500/10",
  "Defense Evasion": "text-amber-400 border-amber-400/40 bg-amber-500/10",
  "Credential Access": "text-purple-400 border-purple-400/40 bg-purple-500/10",
  "Discovery": "text-cyan-400 border-cyan-400/40 bg-cyan-500/10",
  "Collection": "text-cyan-400 border-cyan-400/40 bg-cyan-500/10",
  "Exfiltration": "text-pink-400 border-pink-400/40 bg-pink-500/10",
  "Command & Control": "text-gray-300 border-gray-400/40 bg-gray-500/10",
  "Impact": "text-red-400 border-red-400/40 bg-red-500/10",
  "Reconnaissance": "text-cyan-400 border-cyan-400/40 bg-cyan-500/10",
  "Weaponization": "text-amber-400 border-amber-400/40 bg-amber-500/10",
  "Delivery": "text-blue-400 border-blue-400/40 bg-blue-500/10",
  "Exploitation": "text-red-400 border-red-400/40 bg-red-500/10",
  "Installation": "text-amber-400 border-amber-400/40 bg-amber-500/10",
  "Data Theft": "text-pink-400 border-pink-400/40 bg-pink-500/10",
  "Data Manipulation": "text-purple-400 border-purple-400/40 bg-purple-500/10",
  "Service Abuse": "text-orange-400 border-orange-400/40 bg-orange-500/10",
  "Network Scanning": "text-cyan-400 border-cyan-400/40 bg-cyan-500/10",
  "Vulnerability Exploitation": "text-red-400 border-red-400/40 bg-red-500/10",
  "Social Engineering": "text-orange-400 border-orange-400/40 bg-orange-500/10",
  "Physical Access": "text-orange-400 border-orange-400/40 bg-orange-500/10",
  "Supply Chain Attack": "text-gray-300 border-gray-400/40 bg-gray-500/10",
  "Other": "text-gray-300 border-gray-400/40 bg-gray-500/10",
}

const normalizeText = (value: string) => value.toLowerCase().trim()

export default function TimelineModal({
  isOpen,
  onClose,
  edges,
  nodes,
  incidentLog = [],
  onHighlightEdge,
  onSelectEdge,
  onUpdateEdge,
}: TimelineModalProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<EdgeActionType[]>([])
  const [query, setQuery] = useState("")
  const [includeIncidentLog, setIncludeIncidentLog] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editTimestamp, setEditTimestamp] = useState("")

  const toLocalInputValue = (isoString: string) => {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ""
    const pad = (value: number) => String(value).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`
  }

  const startEdit = (event: TimelineEvent) => {
    setEditingEventId(event.id)
    setEditTimestamp(toLocalInputValue(event.timestamp))
  }

  const cancelEdit = () => {
    setEditingEventId(null)
    setEditTimestamp("")
  }

  const saveEdit = (eventId: string) => {
    if (!onUpdateEdge) {
      cancelEdit()
      return
    }
    if (!editTimestamp) {
      onUpdateEdge(eventId, { timestamp: "" })
      cancelEdit()
      return
    }
    const parsedDate = new Date(editTimestamp)
    if (Number.isNaN(parsedDate.getTime())) return
    onUpdateEdge(eventId, { timestamp: parsedDate.toISOString() })
    cancelEdit()
  }

  const nodeLabels = useMemo(() => {
    if (!isOpen) return {}
    const labelMap: Record<string, string> = {}
    nodes.forEach((node) => {
      labelMap[node.id] = node.data?.label || node.id
    })
    return labelMap
  }, [nodes, isOpen])

  const timelineEvents = useMemo(() => {
    if (!isOpen) return []
    const events: TimelineEvent[] = []

    edges.forEach((edge) => {
      if (edge.data?.timestamp) {
        const parsedDate = new Date(edge.data.timestamp)
        if (!isNaN(parsedDate.getTime())) {
          events.push({
            id: edge.id,
            timestamp: edge.data.timestamp,
            parsedDate,
            kind: "edge",
            actionType: edge.data.actionType,
            toolUsed: edge.data.toolUsed,
            userUsed: edge.data.userUsed,
            mitreAttackId: edge.data.mitreAttackId,
            mitreAttackName: edge.data.mitreAttackName,
            description: edge.data.description,
            sourceId: edge.source,
            targetId: edge.target,
            c2Channel: edge.data.c2Channel,
            c2Framework: edge.data.c2Framework,
          })
        }
      }
    })

    if (includeIncidentLog) {
      incidentLog.forEach((entry) => {
        if (!entry.timestamp) return
        const parsedDate = new Date(entry.timestamp)
        if (Number.isNaN(parsedDate.getTime())) return
        events.push({
          id: entry.id,
          timestamp: entry.timestamp,
          parsedDate,
          kind: "incident",
          description: entry.description,
          incidentCategory: entry.category,
        })
      })
    }

    return [...events].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
  }, [edges, incidentLog, includeIncidentLog, isOpen])

  const availableActionTypes = useMemo(() => {
    const types = new Set<EdgeActionType>()
    timelineEvents.forEach((event) => {
      if (event.kind === "edge" && event.actionType) {
        types.add(event.actionType)
      }
    })
    return Array.from(types).sort()
  }, [timelineEvents])

  const filteredEvents = useMemo(() => {
    if (!isOpen) return []
    const normalizedQuery = normalizeText(query)

    return timelineEvents.filter((event) => {
      if (
        event.kind === "edge" &&
        selectedActionTypes.length > 0 &&
        event.actionType &&
        !selectedActionTypes.includes(event.actionType)
      ) {
        return false
      }

      if (!normalizedQuery) return true

      const sourceLabel = event.sourceId ? nodeLabels[event.sourceId] || event.sourceId : ""
      const targetLabel = event.targetId ? nodeLabels[event.targetId] || event.targetId : ""

      const haystack = [
        event.actionType || "",
        event.toolUsed || "",
        event.userUsed || "",
        event.mitreAttackId || "",
        event.mitreAttackName || "",
        event.incidentCategory || "",
        event.description,
        sourceLabel,
        targetLabel,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [timelineEvents, selectedActionTypes, query, nodeLabels, isOpen])

  const formatIsoSeconds = (value: Date) => {
    return value.toISOString().replace(/\.\d{3}Z$/, "Z")
  }

  const formatDelta = (start: Date, current: Date) => {
    const deltaMs = current.getTime() - start.getTime()
    if (deltaMs <= 0) return "T+0"
    const totalSeconds = Math.floor(deltaMs / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (days > 0) return `T+${days}d ${hours}h`
    if (hours > 0) return `T+${hours}h ${minutes}m`
    if (minutes > 0) return `T+${minutes}m ${seconds}s`
    return `T+${seconds}s`
  }

  const toggleActionType = (actionType: EdgeActionType) => {
    setSelectedActionTypes((prev) =>
      prev.includes(actionType) ? prev.filter((t) => t !== actionType) : [...prev, actionType],
    )
  }

  const clearFilters = () => {
    setSelectedActionTypes([])
    setQuery("")
  }

  const handleEventClick = (eventId: string) => {
    onSelectEdge?.(eventId)
  }

  const hasEvents = timelineEvents.length > 0

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="ip-panel ip-text border-t ip-border p-0">
        <SheetHeader className="ip-panel-muted px-6 py-4 border-b ip-border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border ip-border p-2">
                <Activity className="h-5 w-5 ip-accent" aria-hidden="true" />
              </div>
              <div>
                <SheetTitle className="ip-text text-lg">Attack Timeline</SheetTitle>
                <SheetDescription className="ip-text-muted">
                  {hasEvents ? `${filteredEvents.length} of ${timelineEvents.length} events` : "No events yet"}
                </SheetDescription>
              </div>
            </div>

            <div className="flex flex-1 items-center gap-3 sm:justify-end">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ip-text-muted" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search timeline events"
                  name="timelineSearch"
                  autoComplete="off"
                  placeholder="Search technique, tool, asset…"
                  className="ip-panel ip-border ip-text pl-9"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border ip-border px-3 py-1 text-xs">
                <Switch checked={includeIncidentLog} onCheckedChange={setIncludeIncidentLog} aria-label="Include incident log" />
                <span className="ip-text-muted">Include incident log</span>
              </div>
              {(query || selectedActionTypes.length > 0) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-300 hover:bg-gray-700">
                  Clear
                </Button>
              )}
            </div>
          </div>

          {availableActionTypes.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs ip-text-muted">
                <Filter className="h-3 w-3" aria-hidden="true" />
                Filter:
              </div>
              {availableActionTypes.map((actionType) => {
                const isActive = selectedActionTypes.includes(actionType)
                const tone = actionTypeTone[actionType] || "text-gray-300 border-gray-400/40 bg-gray-500/10"

                return (
                  <button
                    key={actionType}
                    onClick={() => toggleActionType(actionType)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      isActive ? tone : "ip-panel-muted ip-border ip-text-muted hover:text-gray-200"
                    }`}
                  >
                    {actionType}
                  </button>
                )
              })}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
            {!hasEvents ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 ip-text-muted">
                <Clock className="h-10 w-10 opacity-60" />
                <div className="text-sm">Add timestamps to edges to build the timeline.</div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 ip-text-muted">
                <Filter className="h-10 w-10 opacity-60" />
                <div className="text-sm">No events match the current filters.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event, index) => {
                  const sourceLabel = event.sourceId ? nodeLabels[event.sourceId] || event.sourceId : ""
                  const targetLabel = event.targetId ? nodeLabels[event.targetId] || event.targetId : ""
                  const tone =
                    event.kind === "edge" && event.actionType
                      ? actionTypeTone[event.actionType] || "text-gray-300 border-gray-400/40 bg-gray-500/10"
                      : "text-gray-200 border-gray-400/40 bg-gray-500/10"
                  const startDate = filteredEvents[0]?.parsedDate
                  const deltaLabel = startDate ? formatDelta(startDate, event.parsedDate) : ""
                  const isIncident = event.kind === "incident"

                  return (
                    <div
                      key={event.id}
                      className="ip-panel-muted border ip-border rounded-lg px-4 py-3 transition hover:bg-gray-700"
                      onClick={() => {
                        if (!isIncident) handleEventClick(event.id)
                      }}
                      onMouseEnter={() => {
                        if (!isIncident) onHighlightEdge?.(event.id)
                      }}
                      onMouseLeave={() => {
                        if (!isIncident) onHighlightEdge?.("")
                      }}
                      role={isIncident ? undefined : "button"}
                      tabIndex={isIncident ? -1 : 0}
                      onKeyDown={(e) => {
                        if (isIncident) return
                        if (e.key === "Enter" || e.key === " ") {
                          handleEventClick(event.id)
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isIncident ? (
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>
                              Incident Log
                            </span>
                          ) : (
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>
                              {event.actionType}
                            </span>
                          )}
                          {isIncident && event.incidentCategory && (
                            <span className="rounded-full border px-2 py-0.5 text-xs ip-text-muted">
                              {event.incidentCategory}
                            </span>
                          )}
                          <span className="text-xs ip-text-muted">{formatIsoSeconds(event.parsedDate)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs ip-text-muted">
                          <span>{deltaLabel}</span>
                          <span>#{index + 1}</span>
                        </div>
                      </div>

                      {isIncident ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <StickyNote className="h-4 w-4 ip-text-muted" />
                          <span className="font-medium ip-text">Incident Log Entry</span>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium ip-text truncate">{sourceLabel}</span>
                          <ArrowRight className="h-4 w-4 ip-text-muted" />
                          <span className="font-medium ip-text truncate">{targetLabel}</span>
                        </div>
                      )}

                      {!isIncident && editingEventId === event.id ? (
                        <div className="mt-3 space-y-2">
                          <Input
                            type="datetime-local"
                            value={editTimestamp}
                            onChange={(e) => setEditTimestamp(e.target.value)}
                            className="ip-panel ip-border ip-text"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                saveEdit(event.id)
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-300 hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEdit()
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {!isIncident &&
                            (event.toolUsed || event.userUsed || event.mitreAttackId || event.description) && (
                            <div className="mt-2 grid gap-1 text-xs ip-text-muted">
                              {event.toolUsed && <div>Tool: {event.toolUsed}</div>}
                              {event.userUsed && <div>User: {event.userUsed}</div>}
                              {event.mitreAttackId && (
                                <div>
                                  <a
                                    href={getMitreTechniqueUrl(event.mitreAttackId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:text-blue-300 hover:underline"
                                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                                  >
                                    MITRE: {getMitreTechniqueLabel(event.mitreAttackId, event.mitreAttackName)}
                                  </a>
                                </div>
                              )}
                              {event.description && <div className="ip-text">{event.description}</div>}
                            </div>
                          )}
                          {event.description && isIncident && (
                            <div className="mt-2 text-xs ip-text-muted">{event.description}</div>
                          )}
                          {!isIncident && (
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-400 hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEdit(event)
                                }}
                              >
                                Edit Timestamp
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
