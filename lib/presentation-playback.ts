import type {
  CustomEdge,
  CustomNode,
  EdgeActionType,
} from "@/lib/types"
import { getEdgeActionTypeDisplayName } from "@/lib/edge-action-types"
import {
  buildPresentationPlaybackTimeline as buildPresentationPlaybackTimelineRuntime,
  getPresentationPlaybackFrame as getPresentationPlaybackFrameRuntime,
} from "./presentation-playback.mjs"

export interface PresentationPlaybackEvent {
  edgeId: string
  sourceId: string
  sourceLabel: string
  targetId: string
  targetLabel: string
  actionType: EdgeActionType
  // Display name of the action (an Other edge's own name).
  actionLabel: string
  timestamp: string
  timestampMs: number
}

export interface PresentationPlaybackCoverage {
  totalRoutes: number
  timestampedRoutes: number
  missingTimestampRoutes: number
  invalidTimestampRoutes: number
}

export interface PresentationPlaybackIssue {
  edgeId: string
  sourceId: string
  sourceLabel: string
  targetId: string
  targetLabel: string
  actionType: EdgeActionType
  actionLabel: string
  reason: "missing" | "invalid"
}

export interface PresentationPlaybackTimeline {
  events: PresentationPlaybackEvent[]
  coverage: PresentationPlaybackCoverage
  issues: PresentationPlaybackIssue[]
}

export interface PresentationPlaybackFrame {
  currentEvent: PresentationPlaybackEvent | null
  reachedNodeIds: ReadonlySet<string>
  reachedEdgeIds: ReadonlySet<string>
  currentNodeIds: ReadonlySet<string>
}

export function buildPresentationPlaybackTimeline(
  nodes: CustomNode[],
  edges: CustomEdge[],
): PresentationPlaybackTimeline {
  const timeline = buildPresentationPlaybackTimelineRuntime(
    nodes,
    edges,
  ) as Omit<PresentationPlaybackTimeline, "events" | "issues"> & {
    events: Omit<PresentationPlaybackEvent, "actionLabel">[]
    issues: Omit<PresentationPlaybackIssue, "actionLabel">[]
  }
  const edgeLabels = new Map(edges.map((edge) => [edge.id, edge.data?.label]))
  const withActionLabel = <T extends { edgeId: string; actionType: EdgeActionType }>(
    item: T,
  ) => ({
    ...item,
    actionLabel: getEdgeActionTypeDisplayName(item.actionType, edgeLabels.get(item.edgeId)),
  })

  return {
    ...timeline,
    events: timeline.events.map(withActionLabel),
    issues: timeline.issues.map(withActionLabel),
  }
}

export function getPresentationPlaybackFrame(
  events: PresentationPlaybackEvent[],
  requestedIndex: number,
): PresentationPlaybackFrame {
  return getPresentationPlaybackFrameRuntime(
    events,
    requestedIndex,
  ) as PresentationPlaybackFrame
}
