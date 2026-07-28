export function buildPresentationPlaybackTimeline(nodes, edges) {
  const playbackNodeIds = new Set(
    nodes
      .filter(
        (node) =>
          node.type !== "labeledGroupNode" &&
          node.data.type !== "group",
      )
      .map((node) => node.id),
  )
  const nodeLabels = new Map(
    nodes
      .filter((node) => playbackNodeIds.has(node.id))
      .map((node) => [node.id, node.data.label || node.id]),
  )
  const playbackEdges = edges.filter(
    (edge) =>
      playbackNodeIds.has(edge.source) &&
      playbackNodeIds.has(edge.target),
  )
  let missingTimestampRoutes = 0
  let invalidTimestampRoutes = 0
  const issues = []

  const events = playbackEdges.flatMap((edge, sourceIndex) => {
    const issue = {
      edgeId: edge.id,
      sourceId: edge.source,
      sourceLabel: nodeLabels.get(edge.source) || edge.source,
      targetId: edge.target,
      targetLabel: nodeLabels.get(edge.target) || edge.target,
      actionType: edge.data?.actionType ?? "Other",
    }
    const timestamp = edge.data?.timestamp?.trim()
    if (!timestamp) {
      missingTimestampRoutes += 1
      issues.push({ ...issue, reason: "missing" })
      return []
    }

    const timestampMs = new Date(timestamp).getTime()
    if (Number.isNaN(timestampMs)) {
      invalidTimestampRoutes += 1
      issues.push({ ...issue, reason: "invalid" })
      return []
    }

    return [{
      edgeId: edge.id,
      sourceId: edge.source,
      sourceLabel: issue.sourceLabel,
      targetId: edge.target,
      targetLabel: issue.targetLabel,
      actionType: issue.actionType,
      timestamp,
      timestampMs,
      sourceIndex,
    }]
  })

  events.sort(
    (left, right) =>
      left.timestampMs - right.timestampMs ||
      left.sourceIndex - right.sourceIndex,
  )

  return {
    events: events.map(({ sourceIndex: _sourceIndex, ...event }) => event),
    coverage: {
      totalRoutes: playbackEdges.length,
      timestampedRoutes: events.length,
      missingTimestampRoutes,
      invalidTimestampRoutes,
    },
    issues,
  }
}

export function getPresentationPlaybackFrame(events, requestedIndex) {
  if (events.length === 0) {
    return {
      currentEvent: null,
      reachedNodeIds: new Set(),
      reachedEdgeIds: new Set(),
      currentNodeIds: new Set(),
    }
  }

  const currentIndex = Math.min(
    Math.max(Math.round(requestedIndex), 0),
    events.length - 1,
  )
  const currentEvent = events[currentIndex]
  const reachedNodeIds = new Set()
  const reachedEdgeIds = new Set()

  for (let index = 0; index <= currentIndex; index += 1) {
    const event = events[index]
    reachedNodeIds.add(event.sourceId)
    reachedNodeIds.add(event.targetId)
    reachedEdgeIds.add(event.edgeId)
  }

  return {
    currentEvent,
    reachedNodeIds,
    reachedEdgeIds,
    currentNodeIds: new Set([
      currentEvent.sourceId,
      currentEvent.targetId,
    ]),
  }
}
