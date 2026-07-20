import test from "node:test"
import assert from "node:assert/strict"
import {
  calculateDragOffset,
  hasOffset,
  isConnectionAllowed,
  readOffset,
  resetEdgePosition,
  updateLabelLock,
} from "../lib/utils/flexible-connections"

test("allows connections between different nodes", () => {
  assert.equal(isConnectionAllowed({ source: "node-a", target: "node-b" }), true)
})

test("rejects self-connections and incomplete endpoints", () => {
  assert.equal(isConnectionAllowed({ source: "node-a", target: "node-a" }), false)
  assert.equal(isConnectionAllowed({ source: null, target: "node-b" }), false)
  assert.equal(isConnectionAllowed({ source: "node-a", target: null }), false)
})

test("reads valid offsets and sanitizes malformed imported values", () => {
  assert.deepEqual(readOffset({ x: 12, y: -4 }), { x: 12, y: -4 })
  assert.deepEqual(readOffset({ x: "12", y: Number.NaN }), { x: 0, y: 0 })
  assert.deepEqual(readOffset(null), { x: 0, y: 0 })
})

test("detects whether an offset changes automatic positioning", () => {
  assert.equal(hasOffset({ x: 0, y: 0 }), false)
  assert.equal(hasOffset({ x: 0.001, y: 0 }), true)
  assert.equal(hasOffset({ x: 0, y: -1 }), true)
})

test("converts screen movement into flow coordinates at different zoom levels", () => {
  assert.deepEqual(
    calculateDragOffset({ x: 10, y: 20 }, { x: 100, y: 100 }, { x: 140, y: 80 }, 2),
    { x: 30, y: 10 },
  )
  assert.deepEqual(
    calculateDragOffset({ x: 10, y: 20 }, { x: 100, y: 100 }, { x: 140, y: 80 }, 0.5),
    { x: 90, y: -20 },
  )
})

test("uses a safe zoom fallback for invalid values", () => {
  const expected = { x: 50, y: 0 }
  assert.deepEqual(calculateDragOffset({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 50, y: 0 }, 0), expected)
  assert.deepEqual(calculateDragOffset({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 50, y: 0 }, Number.NaN), expected)
})

test("reset removes only custom position data", () => {
  assert.deepEqual(
    resetEdgePosition({
      actionType: "Lateral Movement",
      routeOffset: { x: 10, y: 20 },
      labelOffset: { x: -5, y: 4 },
      labelLocked: false,
    }),
    { actionType: "Lateral Movement", labelLocked: false },
  )
})

test("locking snaps the label to the line and unlocking preserves its current position", () => {
  const unlocked = {
    actionType: "Lateral Movement",
    routeOffset: { x: 30, y: 10 },
    labelOffset: { x: 8, y: -2 },
    labelLocked: false,
  }

  assert.deepEqual(updateLabelLock(unlocked, true), {
    actionType: "Lateral Movement",
    routeOffset: { x: 30, y: 10 },
    labelLocked: true,
  })
  assert.deepEqual(updateLabelLock(unlocked, false), unlocked)
})

test("position data survives a JSON round trip", () => {
  const data = {
    routeOffset: { x: 123.5, y: -44.25 },
    labelOffset: { x: 8, y: 12 },
    labelLocked: false,
  }
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data)
})
