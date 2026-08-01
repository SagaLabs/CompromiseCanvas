import type {
  CustomEdge,
  CustomNode,
  EdgeActionType,
} from "@/lib/types"
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
  return buildPresentationPlaybackTimelineRuntime(
    nodes,
    edges,
  ) as PresentationPlaybackTimeline
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
