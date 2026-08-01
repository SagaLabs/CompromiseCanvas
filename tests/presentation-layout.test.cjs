const assert = require("node:assert/strict")
const test = require("node:test")

const {
  buildExpandedPresentationLayout,
} = require("../lib/presentation-layout.mjs")

const node = (
  id,
  x,
  y,
  width,
  height,
  type = "customNode",
) => ({
  id,
  type,
  position: { x, y },
  measured: { width, height },
})

test("adds vertical room for an expanded route card between its endpoints", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [
      node("source", 0, 0, 220, 180),
      node("target", 0, 300, 220, 200),
    ],
    edges: [{ id: "route", source: "source", target: "target" }],
    edgeLabelSizes: {
      route: { width: 240, height: 190 },
    },
    gap: 40,
  })

  const sourceY = layout.positions.source.y
  const targetY = layout.positions.target.y
  assert.equal(targetY - sourceY, 180 / 2 + 200 / 2 + 190 + 80)
  assert.equal(layout.positions.source.x, 0)
  assert.equal(layout.positions.target.x, 0)
})

test("preserves layout direction while resolving a crowded route", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [
      node("left", -200, 100, 260, 140),
      node("right", 200, 100, 260, 140),
    ],
    edges: [{ id: "route", source: "left", target: "right" }],
    edgeLabelSizes: {
      route: { width: 220, height: 120 },
    },
    gap: 40,
  })

  assert.equal(layout.positions.left.y, 100)
  assert.equal(layout.positions.right.y, 100)
  assert.ok(layout.positions.left.x < -200)
  assert.ok(layout.positions.right.x > 200)
  assert.equal(
    layout.positions.left.x + layout.positions.right.x,
    0,
  )
})

test("moves and grows group backdrops with the temporary layout", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [
      node("group", 0, 0, 600, 400, "labeledGroupNode"),
      node("source", -100, 0, 220, 140),
      node("target", 100, 0, 220, 140),
    ],
    edges: [{ id: "route", source: "source", target: "target" }],
    edgeLabelSizes: {
      route: { width: 220, height: 120 },
    },
    gap: 40,
  })

  assert.equal(layout.positions.group.x, 0)
  assert.ok(layout.groupSizes.group.width > 600)
  assert.equal(layout.groupSizes.group.height, 400)
})

test("ignores self-connections when calculating endpoint spacing", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [node("asset", 50, 75, 220, 180)],
    edges: [{ id: "self", source: "asset", target: "asset" }],
    edgeLabelSizes: {
      self: { width: 300, height: 400 },
    },
  })

  assert.deepEqual(layout.positions.asset, { x: 50, y: 75 })
  assert.equal(layout.hasChanges, false)
})

test("leaves an already-spaced layout exactly where the author placed it", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [
      node("source", 120, 80, 220, 180),
      node("target", 120, 980, 220, 200),
    ],
    edges: [{ id: "route", source: "source", target: "target" }],
    edgeLabelSizes: {
      route: { width: 240, height: 190 },
    },
    gap: 40,
  })

  assert.deepEqual(layout.positions, {
    source: { x: 120, y: 80 },
    target: { x: 120, y: 980 },
  })
  assert.equal(layout.hasChanges, false)
})

test("moves only the crowded part of a mixed-density canvas", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [
      node("source", 0, 0, 220, 200),
      node("target", 0, 300, 220, 200),
      node("already-spaced", 600, 1800, 220, 200),
    ],
    edges: [{ id: "route", source: "source", target: "target" }],
    edgeLabelSizes: {
      route: { width: 220, height: 100 },
    },
    gap: 40,
  })

  assert.equal(
    layout.positions.target.y - layout.positions.source.y,
    200 / 2 + 200 / 2 + 100 + 80,
  )
  assert.equal(
    layout.positions.source.y + layout.positions.target.y,
    300,
  )
  assert.deepEqual(
    layout.positions["already-spaced"],
    { x: 600, y: 1800 },
  )
  assert.equal(layout.positions.source.x, 0)
  assert.equal(layout.positions.target.x, 0)
  assert.equal(layout.hasChanges, true)
})

test("leaves a diagonal route alone when the other axis has clearance", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: [
      node("source", 0, 0, 300, 100),
      node("target", 400, 350, 300, 100),
    ],
    edges: [{ id: "route", source: "source", target: "target" }],
    edgeLabelSizes: {
      route: { width: 220, height: 100 },
    },
    gap: 40,
  })

  assert.deepEqual(layout.positions, {
    source: { x: 0, y: 0 },
    target: { x: 400, y: 350 },
  })
  assert.equal(layout.hasChanges, false)
})

test("fully separates a dense stack before returning its layout", () => {
  const layout = buildExpandedPresentationLayout({
    nodes: Array.from({ length: 20 }, (_, index) =>
      node(`node-${index}`, 0, 0, 200, 120),
    ),
    edges: [],
    gap: 40,
  })
  const yPositions = Object.values(layout.positions)
    .map((position) => position.y)
    .sort((first, second) => first - second)

  for (let index = 1; index < yPositions.length; index += 1) {
    assert.ok(yPositions[index] - yPositions[index - 1] >= 159.97)
  }
  assert.ok(
    Math.abs(yPositions.reduce((total, value) => total + value, 0)) <
      0.01,
  )
  assert.equal(layout.hasChanges, true)
})
