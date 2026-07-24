import { test, expect, type Page } from "@playwright/test"

// A minimal display-settings stub. The node render reads a couple of these
// non-optionally, so the object must exist; missing keys read as falsy.
const displaySettings = {}

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
      displaySettings,
      isCompromised: false,
      investigationStatus: "No Status",
    },
  }
}

// Two nodes far apart with one edge between them.
const seed = {
  version: "1.0",
  nodes: [makeNode("n1", "Alpha", 0, 0), makeNode("n2", "Beta", 600, 40)],
  edges: [
    {
      id: "e1",
      source: "n1",
      target: "n2",
      type: "customEdge",
      data: {
        actionType: "Lateral Movement",
        toolUsed: "",
        userUsed: "",
        timestamp: "2025-01-01T12:00:00.000Z",
        description: "",
        displaySettings: {},
      },
    },
  ],
  canvasTitle: "Test Diagram",
  incidentLog: [],
  viewport: { x: 100, y: 200, zoom: 1 },
  timestamp: new Date().toISOString(),
}

async function seedDiagram(page: Page, snapshot = seed) {
  await page.addInitScript((snapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(snapshot))
    localStorage.setItem("compromise-canvas-autosave-timestamp", snapshot.timestamp)
  }, snapshot)
  await page.goto("/")
  // Wait for the seeded edge to render.
  await page.locator(".react-flow__edge").first().waitFor()
}

// The visible edge path element (React Flow renders one per edge).
const edgePath = (page: Page) => page.locator(".react-flow__edge-path").first()

test("edge is locked by default and cannot be rerouted by dragging", async ({ page }) => {
  await seedDiagram(page)
  const path = edgePath(page)
  const before = await path.getAttribute("d")

  // Drag across the middle of the canvas where the edge sits.
  const box = await page.locator(".react-flow__viewport").boundingBox()
  expect(box).not.toBeNull()
  const midX = box!.x + box!.width / 2
  const midY = box!.y + box!.height / 2
  await page.mouse.move(midX, midY)
  await page.mouse.down()
  await page.mouse.move(midX + 120, midY - 90, { steps: 8 })
  await page.mouse.up()

  // Locked edge keeps its smoothstep geometry (no bend committed).
  await expect(path).toHaveAttribute("d", before ?? "")
})

test("unlock toggle enables rerouting; drag bends the edge and moves its label", async ({ page }) => {
  await seedDiagram(page)
  const path = edgePath(page)
  // The label card (distinct from the toolbar, which also lives in the edge-label
  // renderer) is the one carrying the edge's action-type text.
  const label = page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Lateral Movement" })

  // Hover the label card (sits on the edge midpoint) to reveal the toolbar.
  await label.hover()

  const unlockBtn = page.getByRole("button", { name: "Unlock edge to move it" })
  await expect(unlockBtn).toBeVisible()

  const pathLocked = await path.getAttribute("d")

  // Unlock: the button flips to a "Lock edge" affordance (state persisted).
  await unlockBtn.click()
  await expect(page.getByRole("button", { name: "Lock edge" })).toBeVisible()

  // Unlocking alone swaps the smoothstep route for a (still straight) quadratic
  // one; this is the geometry a single undo of the drag should restore.
  const pathUnlocked = await path.getAttribute("d")
  expect(pathUnlocked).not.toEqual(pathLocked)
  expect(pathUnlocked).toContain("Q")
  const labelUnlocked = await label.getAttribute("style")

  // Drag the label card to bend the edge through a control point.
  const lb = await label.boundingBox()
  const cx = lb!.x + lb!.width / 2
  const cy = lb!.y + lb!.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 120, cy - 90, { steps: 10 })
  await page.mouse.up()

  // Drag bent the edge: the quadratic control point (and thus the path) moved.
  const pathAfter = await path.getAttribute("d")
  expect(pathAfter).not.toEqual(pathUnlocked)
  expect(pathAfter).toContain("Q")

  // Label card followed the bend.
  const labelAfter = await label.getAttribute("style")
  expect(labelAfter).not.toEqual(labelUnlocked)

  // Undo restores the pre-drag (unlocked, straight) geometry.
  await page.keyboard.press("Control+z")
  await expect(path).toHaveAttribute("d", pathUnlocked ?? "")
})

test("an unlocked edge can be selected without accidentally rerouting it", async ({ page }) => {
  await seedDiagram(page, {
    ...seed,
    edges: seed.edges.map((edge) => ({
      ...edge,
      data: { ...edge.data, unlocked: true },
    })),
  })

  const path = edgePath(page)
  const routeHandle = page.locator(".react-flow__edge path.nopan").first()
  const label = page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Lateral Movement" })
  const before = await path.getAttribute("d")
  const labelBox = await label.boundingBox()
  expect(labelBox).not.toBeNull()

  const labelX = labelBox!.x + labelBox!.width / 2
  const labelY = labelBox!.y + labelBox!.height / 2
  await page.mouse.move(labelX, labelY)
  await page.mouse.down()
  await page.mouse.move(labelX + 2, labelY + 1)
  await page.mouse.up()

  await expect(page.locator(".react-flow__edge").first()).toHaveClass(/selected/)
  await expect(page.getByRole("button", { name: "Delete selected edge" })).toBeVisible()
  await expect(path).toHaveAttribute("d", before ?? "")

  await page.reload()
  await page.locator(".react-flow__edge").first().waitFor()
  await expect(page.locator(".react-flow__edge").first()).not.toHaveClass(/selected/)

  const reloadedRouteHandle = page.locator(".react-flow__edge path.nopan").first()
  const reloadedPath = edgePath(page)
  const reloadedBefore = await reloadedPath.getAttribute("d")
  const point = await reloadedRouteHandle.evaluate((element: SVGPathElement) => {
    const position = element.getPointAtLength(element.getTotalLength() * 0.2)
    const matrix = element.getScreenCTM()
    if (!matrix) throw new Error("Could not read the edge screen transform")
    return {
      x: matrix.a * position.x + matrix.c * position.y + matrix.e,
      y: matrix.b * position.x + matrix.d * position.y + matrix.f,
    }
  })
  await page.mouse.click(point.x, point.y)

  await expect(page.locator(".react-flow__edge").first()).toHaveClass(/selected/)
  await expect(page.getByRole("button", { name: "Delete selected edge" })).toBeVisible()
  await expect(reloadedPath).toHaveAttribute("d", reloadedBefore ?? "")
})

test("Ctrl-click adds an unlocked edge to the current selection", async ({ page }) => {
  await seedDiagram(page, {
    ...seed,
    edges: seed.edges.map((edge) => ({
      ...edge,
      data: { ...edge.data, unlocked: true },
    })),
  })

  await page.locator(".react-flow__node").filter({ hasText: "Alpha" }).click()
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(1)

  const routeHandle = page.locator(".react-flow__edge path.nopan").first()
  const point = await routeHandle.evaluate((element: SVGPathElement) => {
    const position = element.getPointAtLength(element.getTotalLength() * 0.2)
    const matrix = element.getScreenCTM()
    if (!matrix) throw new Error("Could not read the edge screen transform")
    return {
      x: matrix.a * position.x + matrix.c * position.y + matrix.e,
      y: matrix.b * position.x + matrix.d * position.y + matrix.f,
    }
  })

  await page.keyboard.down("Control")
  await page.mouse.click(point.x, point.y)
  await page.keyboard.up("Control")

  await expect(page.locator(".react-flow__node.selected")).toHaveCount(1)
  await expect(page.locator(".react-flow__edge.selected")).toHaveCount(1)
})

test("Ctrl-click adds a locked edge to the current selection", async ({ page }) => {
  await seedDiagram(page)

  await page.locator(".react-flow__node").filter({ hasText: "Alpha" }).click()
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(1)

  const routeHandle = page.locator('.react-flow__edge path[stroke="transparent"]').first()
  const point = await routeHandle.evaluate((element: SVGPathElement) => {
    const position = element.getPointAtLength(element.getTotalLength() * 0.2)
    const matrix = element.getScreenCTM()
    if (!matrix) throw new Error("Could not read the edge screen transform")
    return {
      x: matrix.a * position.x + matrix.c * position.y + matrix.e,
      y: matrix.b * position.x + matrix.d * position.y + matrix.f,
    }
  })

  await page.keyboard.down("Control")
  await page.mouse.click(point.x, point.y)
  await page.keyboard.up("Control")

  await expect(page.locator(".react-flow__node.selected")).toHaveCount(1)
  await expect(page.locator(".react-flow__edge.selected")).toHaveCount(1)
})

test("toolbar edge changes remain intact after a properties edit", async ({ page }) => {
  await seedDiagram(page)
  const label = page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Lateral Movement" })

  await page.getByRole("button", { name: "Open Timeline" }).click()
  await page.getByRole("button").filter({ hasText: "Alpha" }).filter({ hasText: "Beta" }).click()
  await page.keyboard.press("Escape")
  const edgeLabelInput = page.getByRole("textbox").first()
  await expect(edgeLabelInput).toBeVisible()

  await page.getByRole("button", { name: "Unlock edge to move it" }).click()
  await page.getByRole("button", { name: "Change action type" }).click()
  await page.getByRole("menuitem", { name: "Impact" }).click()
  await edgeLabelInput.fill("Preserved change")

  await expect(page.getByRole("button", { name: "Lock edge" })).toBeVisible()
  await expect(page.locator(".react-flow__edgelabel-renderer").getByText("Impact", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const savedEdgeData = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
    return saved.edges[0].data
  })
  expect(savedEdgeData).toMatchObject({
    unlocked: true,
    actionType: "Impact",
    label: "Preserved change",
  })
})
