import { getEdgeActionTypes } from "@/lib/edge-action-types"
import { normalizeMitreTechniqueReferences } from "@/lib/mitre-attack"
import type {
  ActionType,
  CustomEdge,
  CustomNode,
  EdgeActionType,
  IncidentLogEntry,
  MitreTechniqueReference,
} from "@/lib/types"

export type TimelineActionType = EdgeActionType | ActionType

export interface TimelineEvent {
  id: string
  timestamp: string
  parsedDate: Date
  kind: "edge" | "node-action" | "incident"
  actionType?: TimelineActionType
  actionTypes?: TimelineActionType[]
  toolUsed?: string
  userUsed?: string
  technique?: string
  mitreAttackId?: string
  mitreAttackName?: string
  mitreAttackTechniques?: MitreTechniqueReference[]
  description: string
  sourceId?: string
  targetId?: string
  nodeId?: string
  actionId?: string
  stepIndex?: number
  c2Channel?: string
  c2Framework?: string
  incidentCategory?: IncidentLogEntry["category"]
}

interface BuildTimelineEventsOptions {
  nodes: CustomNode[]
  edges: CustomEdge[]
  incidentLog?: IncidentLogEntry[]
  includeIncidentLog?: boolean
}

const parseTimestamp = (timestamp?: string) => {
  if (!timestamp) return null
  const parsedDate = new Date(timestamp)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export const buildTimelineEvents = ({
  nodes,
  edges,
  incidentLog = [],
  includeIncidentLog = false,
}: BuildTimelineEventsOptions): TimelineEvent[] => {
  const events: TimelineEvent[] = []

  edges.forEach((edge) => {
    const parsedDate = parseTimestamp(edge.data?.timestamp)
    if (!parsedDate || !edge.data) return
    events.push({
      id: edge.id,
      timestamp: edge.data.timestamp,
      parsedDate,
      kind: "edge",
      actionType: edge.data.actionType,
      actionTypes: getEdgeActionTypes(edge.data),
      toolUsed: edge.data.toolUsed,
      userUsed: edge.data.userUsed,
      mitreAttackId: edge.data.mitreAttackId,
      mitreAttackName: edge.data.mitreAttackName,
      mitreAttackTechniques: normalizeMitreTechniqueReferences(
        edge.data.mitreAttackTechniques,
        edge.data.mitreAttackId,
        edge.data.mitreAttackName,
      ),
      description: edge.data.description,
      sourceId: edge.source,
      targetId: edge.target,
      c2Channel: edge.data.c2Channel,
      c2Framework: edge.data.c2Framework,
    })
  })

  nodes.forEach((node) => {
    if (node.type === "labeledGroupNode" || node.data.actionMode !== "ordered-path") return
    node.data.actions.forEach((action, stepIndex) => {
      const parsedDate = parseTimestamp(action.timestamp)
      if (!parsedDate || !action.timestamp) return
      events.push({
        id: `node-action:${node.id}:${action.id}`,
        timestamp: action.timestamp,
        parsedDate,
        kind: "node-action",
        actionType: action.type,
        actionTypes: [action.type],
        technique: action.technique,
        mitreAttackId: action.mitreAttackId,
        mitreAttackName: action.mitreAttackName,
        mitreAttackTechniques: normalizeMitreTechniqueReferences(
          undefined,
          action.mitreAttackId,
          action.mitreAttackName,
        ),
        description: action.details,
        nodeId: node.id,
        actionId: action.id,
        stepIndex,
      })
    })
  })

  if (includeIncidentLog) {
    incidentLog.forEach((entry) => {
      const parsedDate = parseTimestamp(entry.timestamp)
      if (!parsedDate) return
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

  return events.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
}
