import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPresentationPlaybackTimeline,
  getPresentationPlaybackFrame,
} from "../lib/presentation-playback.mjs"

const makeNode = (id, label = id, type = "customNode") => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {
    label,
    type: type === "labeledGroupNode" ? "group" : "web-server",
  },
})

const makeEdge = (id, source, target, timestamp) => ({
  id,
  source,
  target,
  type: "customEdge",
  data: {
    actionType: "Lateral Movement",
    timestamp,
  },
})

test("orders timestamped routes chronologically and keeps ties stable", () => {
  const timeline = buildPresentationPlaybackTimeline(
    [makeNode("a"), makeNode("b"), makeNode("c")],
    [
      makeEdge("late", "a", "b", "2026-07-25T09:00:00.000Z"),
      makeEdge("tie-first", "b", "c", "2026-07-25T08:00:00.000Z"),
      makeEdge("tie-second", "c", "a", "2026-07-25T08:00:00.000Z"),
    ],
  )

  assert.deepEqual(
    timeline.events.map((event) => event.edgeId),
    ["tie-first", "tie-second", "late"],
  )
  assert.deepEqual(timeline.coverage, {
    totalRoutes: 3,
    timestampedRoutes: 3,
    missingTimestampRoutes: 0,
    invalidTimestampRoutes: 0,
  })
})

test("classifies timestamp issues and excludes group or orphan routes", () => {
  const timeline = buildPresentationPlaybackTimeline(
    [
      makeNode("a", "Alpha"),
      makeNode("b", "Beta"),
      makeNode("group", "Subnet", "labeledGroupNode"),
    ],
    [
      makeEdge("self", "a", "a", "2026-07-25T08:00:00.000Z"),
      makeEdge("missing", "a", "b", ""),
      makeEdge("invalid", "b", "a", "not-a-date"),
      makeEdge("group-route", "a", "group", "2026-07-25T08:10:00.000Z"),
      makeEdge("orphan-route", "a", "unknown", "2026-07-25T08:20:00.000Z"),
    ],
  )

  assert.deepEqual(timeline.coverage, {
    totalRoutes: 3,
    timestampedRoutes: 1,
    missingTimestampRoutes: 1,
    invalidTimestampRoutes: 1,
  })
  assert.deepEqual(
    timeline.issues.map(({ edgeId, reason }) => ({ edgeId, reason })),
    [
      { edgeId: "missing", reason: "missing" },
      { edgeId: "invalid", reason: "invalid" },
    ],
  )
  assert.equal(timeline.events[0].sourceLabel, "Alpha")
  assert.equal(timeline.events[0].targetLabel, "Alpha")
})

test("clamps playback frames and accumulates reached routes", () => {
  const events = buildPresentationPlaybackTimeline(
    [makeNode("a"), makeNode("b"), makeNode("c")],
    [
      makeEdge("first", "a", "b", "2026-07-25T08:00:00.000Z"),
      makeEdge("second", "b", "c", "2026-07-25T08:15:00.000Z"),
    ],
  ).events

  const first = getPresentationPlaybackFrame(events, -10)
  assert.equal(first.currentEvent?.edgeId, "first")
  assert.deepEqual([...first.reachedEdgeIds], ["first"])
  assert.deepEqual([...first.currentNodeIds], ["a", "b"])

  const last = getPresentationPlaybackFrame(events, 99)
  assert.equal(last.currentEvent?.edgeId, "second")
  assert.deepEqual([...last.reachedEdgeIds], ["first", "second"])
  assert.deepEqual([...last.reachedNodeIds], ["a", "b", "c"])

  const rounded = getPresentationPlaybackFrame(events, 0.6)
  assert.equal(rounded.currentEvent?.edgeId, "second")

  const empty = getPresentationPlaybackFrame([], 5)
  assert.equal(empty.currentEvent, null)
  assert.equal(empty.reachedNodeIds.size, 0)
  assert.equal(empty.reachedEdgeIds.size, 0)
  assert.equal(empty.currentNodeIds.size, 0)
})
