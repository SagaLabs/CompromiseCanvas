import { test, expect, type Locator, type Page } from "@playwright/test"

function makeNode(id: string, label: string, x: number, y: number) {
  return {
    id,
    type: "customNode",
    position: { x, y },
    data: {
      label,
      type: "web-server",
      criticality: "Low",
      services: [],
      actions: [],
      displaySettings: {},
      isCompromised: false,
      investigationStatus: "No Status",
    },
  }
}

const edgeData = {
  label: "Lateral Movement",
  actionType: "Lateral Movement",
  toolUsed: "",
  userUsed: "",
  timestamp: "2026-01-01T00:00:00.000Z",
  description: "",
  displaySettings: {
    showLabel: true,
    showTool: true,
    showUser: true,
    showTimestamp: true,
    showMitreId: false,
    showDescription: false,
    showC2Channel: true,
    showC2Framework: true,
  },
}

interface DiagramSnapshot {
  nodes: unknown[]
  edges: unknown[]
  timestamp: string
  [key: string]: unknown
}

function makeSnapshot(edges: unknown[] = []): DiagramSnapshot {
  return {
    version: "1.0",
    // Stacked vertically so the natural link is bottom -> top.
    nodes: [makeNode("n1", "Alpha", 0, 0), makeNode("n2", "Beta", 0, 400)],
    edges,
    canvasTitle: "Connection sides",
    incidentLog: [],
    viewport: { x: 400, y: 150, zoom: 1 },
    timestamp: new Date().toISOString(),
  }
}

async function seedDiagram(page: Page, snapshot: DiagramSnapshot) {
  await page.addInitScript((snapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(snapshot))
    localStorage.setItem("compromise-canvas-autosave-timestamp", snapshot.timestamp)
  }, snapshot)
  await page.goto("/")
  await expect(page.locator(".react-flow__node")).toHaveCount(snapshot.nodes.length)
}

async function handleCenter(handle: Locator) {
  const box = await handle.boundingBox()
  expect(box).not.toBeNull()
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
}

async function connect(page: Page, source: Locator, target: Locator) {
  const from = await handleCenter(source)
  const to = await handleCenter(target)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

function handle(page: Page, nodeId: string, side: string) {
  return page.locator(
    `.react-flow__node[data-id="${nodeId}"] .react-flow__handle[data-handleid="${side}"]`,
  )
}

test("exposes a connectable handle on every side of an asset", async ({ page }) => {
  await seedDiagram(page, makeSnapshot())
  for (const side of ["top", "right", "bottom", "left"]) {
    await expect(handle(page, "n1", side)).toHaveClass(/connectable/)
  }
})

test("links a stacked asset from bottom to top", async ({ page }) => {
  await seedDiagram(page, makeSnapshot())
  await connect(page, handle(page, "n1", "bottom"), handle(page, "n2", "top"))

  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
  // Autosave is debounced by five seconds.
  await expect
    .poll(async () => {
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("compromise-canvas-autosave-flow") || "{}"),
      )
      const edge = saved.edges?.[0]
      return edge && [edge.source, edge.sourceHandle, edge.target, edge.targetHandle]
    }, { timeout: 15_000 })
    .toEqual(["n1", "bottom", "n2", "top"])
})

test("keeps the drag direction when linking into a top handle from below", async ({ page }) => {
  await seedDiagram(page, makeSnapshot())
  await connect(page, handle(page, "n2", "top"), handle(page, "n1", "bottom"))

  // Autosave is debounced by five seconds.
  await expect
    .poll(async () => {
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("compromise-canvas-autosave-flow") || "{}"),
      )
      const edge = saved.edges?.[0]
      return edge && [edge.source, edge.target]
    }, { timeout: 15_000 })
    .toEqual(["n2", "n1"])
})

test("still renders an edge saved without handle ids", async ({ page }) => {
  await seedDiagram(
    page,
    makeSnapshot([
      { id: "e1", source: "n1", target: "n2", type: "customEdge", data: edgeData },
    ]),
  )
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
  await expect(page.locator('.react-flow__edge[data-id="e1"] path').first()).toHaveAttribute(
    "d",
    /\S/,
  )
})

test("hides and restores the technique box from the edge toolbar", async ({ page }) => {
  await seedDiagram(
    page,
    makeSnapshot([
      {
        id: "e1",
        source: "n1",
        sourceHandle: "bottom",
        target: "n2",
        targetHandle: "top",
        type: "customEdge",
        data: edgeData,
      },
    ]),
  )

  const card = page.locator(".react-flow__edgelabel-renderer").getByText("Lateral Movement")
  await expect(card).toBeVisible()
  await card.hover()
  await page.getByRole("button", { name: "Hide technique box" }).click()
  await expect(card).toHaveCount(0)
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)

  // Autosave is debounced by five seconds.
  await expect
    .poll(async () => {
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("compromise-canvas-autosave-flow") || "{}"),
      )
      return saved.edges?.[0]?.data?.displaySettings?.hideTechniqueBox
    }, { timeout: 15_000 })
    .toBe(true)

  // The toolbar stays reachable from the bare line to bring the box back.
  await page.getByRole("button", { name: "Show technique box" }).click()
  await expect(card).toBeVisible()

  await page.keyboard.press("Control+z")
  await expect(card).toHaveCount(0)
})

function makeStackedSnapshot() {
  // B sits one snap-grid step (15px) right of A; C is far below B.
  return {
    ...makeSnapshot([
      { id: "e1", source: "n1", sourceHandle: "bottom", target: "n2", targetHandle: "top", type: "customEdge", data: edgeData },
      { id: "e2", source: "n2", sourceHandle: "bottom", target: "n3", targetHandle: "top", type: "customEdge", data: edgeData },
    ]),
    nodes: [makeNode("n1", "Alpha", 0, 0), makeNode("n2", "Beta", 15, 300), makeNode("n3", "Gamma", 15, 750)],
  }
}

test("draws a straight line between nearly aligned stacked assets", async ({ page }) => {
  await seedDiagram(page, makeStackedSnapshot())
  const path = page.locator('.react-flow__edge[data-id="e1"] .react-flow__edge-path').first()
  // A straight path is a single move + line, with no smoothstep jog or curve.
  await expect(path).toHaveAttribute("d", /^M\s*[\d.-]+,[\d.-]+\s*L\s*[\d.-]+,[\d.-]+$/)
})

test("skips travelling markers when the technique box covers most of the line", async ({ page }) => {
  await seedDiagram(page, makeStackedSnapshot())
  await expect(page.locator('.react-flow__edge[data-id="e2"] circle')).not.toHaveCount(0)
  await expect(page.locator('.react-flow__edge[data-id="e1"] circle')).toHaveCount(0)
})

test("allows several links between the same two handles and fans them apart", async ({ page }) => {
  await seedDiagram(page, makeSnapshot())
  for (let i = 0; i < 3; i += 1) {
    await connect(page, handle(page, "n1", "bottom"), handle(page, "n2", "top"))
    await expect(page.locator(".react-flow__edge")).toHaveCount(i + 1)
  }

  const ids = await page.locator(".react-flow__edge").evaluateAll((edges) =>
    edges.map((edge) => edge.getAttribute("data-id")),
  )
  expect(new Set(ids).size).toBe(3)

  // Each link gets its own technique box; none of them overlap.
  const cards = page.locator(".react-flow__edgelabel-renderer").getByText("Lateral Movement")
  await expect(cards).toHaveCount(3)
  const boxes = await Promise.all([0, 1, 2].map((index) => cards.nth(index).boundingBox()))
  const xs = boxes.map((box) => box!.x).sort((a, b) => a - b)
  expect(xs[1] - xs[0]).toBeGreaterThan(boxes[0]!.width / 2)
  expect(xs[2] - xs[1]).toBeGreaterThan(boxes[0]!.width / 2)
})
