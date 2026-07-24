const assert = require("node:assert/strict")
const test = require("node:test")
const { layoutSelectedNodes } = require("../lib/selection-layout.mjs")

const node = (id, x, y, options = {}) => ({
  id,
  type: options.type || "customNode",
  position: { x, y },
  selected: options.selected ?? true,
  width: options.width ?? 200,
  height: options.height ?? 120,
  data: {},
})

test("aligns only selected ordinary nodes and leaves groups untouched", () => {
  const nodes = [
    node("a", 0, 0),
    node("b", 100, 200),
    node("outside", 400, 500, { selected: false }),
    node("group", 900, 900, { type: "labeledGroupNode" }),
  ]

  const horizontal = layoutSelectedNodes(nodes, "align-horizontal")
  assert.deepEqual(horizontal.find((item) => item.id === "a").position, { x: -66, y: 100 })
  assert.deepEqual(horizontal.find((item) => item.id === "b").position, { x: 166, y: 100 })
  assert.strictEqual(horizontal.find((item) => item.id === "outside"), nodes[2])
  assert.strictEqual(horizontal.find((item) => item.id === "group"), nodes[3])

  const vertical = layoutSelectedNodes(nodes, "align-vertical")
  assert.deepEqual(vertical.find((item) => item.id === "a").position, { x: 50, y: 0 })
  assert.deepEqual(vertical.find((item) => item.id === "b").position, { x: 50, y: 200 })
})

test("distributes unequal node widths with equal visible gaps", () => {
  const nodes = [
    node("a", 0, 0, { width: 100 }),
    node("b", 160, 10, { width: 200 }),
    node("c", 600, 20, { width: 300 }),
  ]

  const arranged = layoutSelectedNodes(nodes, "distribute-horizontal")
  const [a, b, c] = arranged
  const firstGap = b.position.x - b.width / 2 - (a.position.x + a.width / 2)
  const secondGap = c.position.x - c.width / 2 - (b.position.x + b.width / 2)

  assert.equal(firstGap, secondGap)
  assert.equal(a.position.x, 0)
  assert.equal(c.position.x, 600)
  assert.equal(b.position.y, 10)
})

test("distributes unequal node heights with equal visible gaps", () => {
  const nodes = [
    node("a", 0, 0, { height: 100 }),
    node("b", 10, 200, { height: 200 }),
    node("c", 20, 700, { height: 300 }),
  ]

  const arranged = layoutSelectedNodes(nodes, "distribute-vertical")
  const [a, b, c] = arranged
  const firstGap = b.position.y - b.height / 2 - (a.position.y + a.height / 2)
  const secondGap = c.position.y - c.height / 2 - (b.position.y + b.height / 2)

  assert.equal(firstGap, secondGap)
  assert.equal(a.position.y, 0)
  assert.equal(c.position.y, 700)
  assert.equal(b.position.x, 10)
})

test("returns the original array for insufficient or no-op selections", () => {
  const oneNode = [node("a", 0, 0)]
  assert.strictEqual(layoutSelectedNodes(oneNode, "align-horizontal"), oneNode)

  const twoNodes = [node("a", 0, 0), node("b", 100, 100)]
  assert.strictEqual(layoutSelectedNodes(twoNodes, "distribute-horizontal"), twoNodes)

  const alreadyAligned = [node("a", 0, 50), node("b", 300, 50)]
  assert.strictEqual(layoutSelectedNodes(alreadyAligned, "align-horizontal"), alreadyAligned)
})

test("alignment spreads nodes on the other axis when they would overlap", () => {
  const horizontalRow = [node("a", 0, 100), node("b", 300, 100)]
  const vertical = layoutSelectedNodes(horizontalRow, "align-vertical")

  assert.equal(vertical[0].position.x, vertical[1].position.x)
  assert.ok(
    Math.abs(vertical[1].position.y - vertical[0].position.y) >=
      vertical[0].height / 2 + vertical[1].height / 2 + 32,
  )

  const verticalColumn = [node("a", 100, 0), node("b", 100, 300)]
  const horizontal = layoutSelectedNodes(verticalColumn, "align-horizontal")

  assert.equal(horizontal[0].position.y, horizontal[1].position.y)
  assert.ok(
    Math.abs(horizontal[1].position.x - horizontal[0].position.x) >=
      horizontal[0].width / 2 + horizontal[1].width / 2 + 32,
  )
})
