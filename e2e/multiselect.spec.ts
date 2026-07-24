import { expect, test, type Page } from "@playwright/test"

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

function makeEdge(id: string, source: string, target: string, label = "Lateral Movement") {
  return {
    id,
    source,
    target,
    type: "customEdge",
    data: {
      label,
      actionType: "Lateral Movement",
      toolUsed: "",
      userUsed: "",
      timestamp: "2026-07-22T12:00:00.000Z",
      description: "",
      displaySettings: {},
    },
  }
}

const baseSeed = {
  version: "1.0",
  nodes: [
    makeNode("a", "Alpha", 100, 100),
    makeNode("b", "Beta", 350, 220),
    makeNode("c", "Charlie", 720, 420),
  ],
  edges: [makeEdge("e-ab", "a", "b"), makeEdge("e-bc", "b", "c")],
  canvasTitle: "Multiselect test",
  incidentLog: [],
  viewport: { x: 70, y: 100, zoom: 0.72 },
  timestamp: "2026-07-22T12:00:00.000Z",
}

async function seedDiagram(page: Page, snapshot = baseSeed) {
  await page.addInitScript((flow) => {
    localStorage.clear()
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(flow))
    localStorage.setItem("compromise-canvas-autosave-timestamp", flow.timestamp)
  }, snapshot)
  await page.goto("/")
  await expect(page.locator(".react-flow__node")).toHaveCount(snapshot.nodes.length)
  await expect(page.locator(".react-flow__edge")).toHaveCount(snapshot.edges.length)
}

const node = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`)

async function selectNodes(page: Page, ids: string[]) {
  for (const id of ids) {
    await node(page, id).click({ modifiers: ["Shift"] })
  }
}

async function immediateShiftClicks(page: Page, ids: string[]) {
  await page.evaluate((nodeIds) => {
    const dispatchClick = (element: Element, pointerId: number) => {
      const bounds = element.getBoundingClientRect()
      const clientX = bounds.left + bounds.width / 2
      const clientY = bounds.top + bounds.height / 2

      element.dispatchEvent(new PointerEvent("pointerdown", {
        pointerId,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX,
        clientY,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))
      element.dispatchEvent(new PointerEvent("pointerup", {
        pointerId,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX,
        clientY,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))
      element.dispatchEvent(new MouseEvent("click", {
        button: 0,
        buttons: 0,
        clientX,
        clientY,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))
    }

    // Keep the keydown and every click in one browser task. This reproduces
    // the window before React Flow's key-state effect has committed.
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Shift",
      code: "ShiftLeft",
      shiftKey: true,
      bubbles: true,
    }))
    nodeIds.forEach((id, index) => {
      const element = document.querySelector(`.react-flow__node[data-id="${id}"]`)
      if (!element) throw new Error(`Missing test node: ${id}`)
      dispatchClick(element, index + 1)
    })
    window.dispatchEvent(new KeyboardEvent("keyup", {
      key: "Shift",
      code: "ShiftLeft",
      bubbles: true,
    }))
  }, ids)
}

async function shiftJitterClick(page: Page, id: string) {
  const bounds = await node(page, id).boundingBox()
  expect(bounds).not.toBeNull()

  const x = bounds!.x + bounds!.width / 2
  const y = bounds!.y + bounds!.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 3, y + 2)
  await page.mouse.up()
}

async function expectSelectedNodes(page: Page, selectedIds: string[]) {
  const selected = new Set(selectedIds)
  for (const id of baseSeed.nodes.map((item) => item.id)) {
    if (selected.has(id)) await expect(node(page, id)).toHaveClass(/selected/)
    else await expect(node(page, id)).not.toHaveClass(/selected/)
  }
}

async function saveGraph(page: Page) {
  await page.getByRole("button", { name: "Save to browser storage" }).click()
  return page.evaluate(() => JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}"))
}

function positionsById(graph: { nodes: Array<{ id: string; position: { x: number; y: number } }> }) {
  return new Map(graph.nodes.map((item) => [item.id, item.position]))
}

function nodeDataById(graph: { nodes: Array<{ id: string; data: Record<string, unknown> }> }) {
  return new Map<string, Record<string, unknown>>(
    graph.nodes.map((item) => [item.id, item.data]),
  )
}

function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  )
}

test("Shift-click toggles selection and Shift-drag creates a full-containment marquee", async ({ page }) => {
  await seedDiagram(page)

  await node(page, "a").click()
  await node(page, "b").click({ modifiers: ["Shift"] })
  await expectSelectedNodes(page, ["a", "b"])

  const toolbar = page.getByRole("toolbar", { name: "Multiple selection actions" })
  await expect(toolbar).toBeVisible()
  await expect(toolbar).toContainText("2 selected")
  await expect(page.getByText("2 nodes and 0 edges selected.", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Arrange selection" }).click()
  await expect(page.getByRole("menuitem", { name: "Distribute horizontally" })).toBeDisabled()
  await expect(page.getByRole("menuitem", { name: "Distribute vertically" })).toBeDisabled()
  await page.keyboard.press("Escape")

  // Multi-selection has one compact action surface; per-node toolbars and
  // resize handles should not stack on top of it.
  await expect(page.getByRole("button", { name: "Mark as compromised" })).toHaveCount(0)
  await expect(page.locator(".react-flow__resize-control")).toHaveCount(0)
  await expect(toolbar.getByRole("button")).toHaveCount(5)
  const [toolbarBox, canvasBox, titlePanelBox] = await Promise.all([
    toolbar.boundingBox(),
    page.locator(".react-flow").boundingBox(),
    page.locator(".react-flow__panel.top.left").boundingBox(),
  ])
  expect(toolbarBox).not.toBeNull()
  expect(canvasBox).not.toBeNull()
  expect(titlePanelBox).not.toBeNull()
  expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x)
  expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width)
  expect(boxesOverlap(toolbarBox!, titlePanelBox!)).toBeFalsy()

  await node(page, "b").click({ modifiers: ["Shift"] })
  await expectSelectedNodes(page, ["a"])
  await expect(toolbar).toHaveCount(0)

  await node(page, "c").click()
  await expectSelectedNodes(page, ["c"])

  const pane = page.locator(".react-flow__pane")
  const paneBox = await pane.boundingBox()
  expect(paneBox).not.toBeNull()
  await pane.click({ position: { x: paneBox!.width - 15, y: 20 } })
  await expectSelectedNodes(page, [])

  const [aBox, bBox] = await Promise.all([node(page, "a").boundingBox(), node(page, "b").boundingBox()])
  expect(aBox).not.toBeNull()
  expect(bBox).not.toBeNull()
  const start = {
    x: Math.min(aBox!.x, bBox!.x) - 12,
    y: Math.min(aBox!.y, bBox!.y) - 12,
  }
  const end = {
    x: Math.max(aBox!.x + aBox!.width, bBox!.x + bBox!.width) + 12,
    y: Math.max(aBox!.y + aBox!.height, bBox!.y + bBox!.height) + 12,
  }

  await page.mouse.move(start.x, start.y)
  await page.keyboard.down("Shift")
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 12 })
  await expect(page.locator(".react-flow__selection")).toBeVisible()
  await page.mouse.up()
  await page.keyboard.up("Shift")

  await expectSelectedNodes(page, ["a", "b"])
  await expect(page.locator(".react-flow__selection")).toHaveCount(0)
})

test("plain mouse drag pans the canvas without starting a selection", async ({ page }) => {
  await seedDiagram(page)

  const pane = page.locator(".react-flow__pane")
  const paneBox = await pane.boundingBox()
  expect(paneBox).not.toBeNull()

  const viewport = page.locator(".react-flow__viewport")
  const before = await viewport.getAttribute("transform")
  const start = {
    x: paneBox!.x + paneBox!.width - 30,
    y: paneBox!.y + paneBox!.height - 30,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x - 120, start.y - 80, { steps: 10 })
  await expect(page.locator(".react-flow__selection")).toHaveCount(0)
  await page.mouse.up()

  await expect(viewport).not.toHaveAttribute("transform", before ?? "")
  await expectSelectedNodes(page, [])
})

test("an immediate Shift-click preserves the existing selection", async ({ page }) => {
  await seedDiagram(page)

  await node(page, "a").click()
  await immediateShiftClicks(page, ["b"])

  await expectSelectedNodes(page, ["a", "b"])
})

test("rapid held-Shift clicks add and remove without replacing the selection", async ({ page }) => {
  await seedDiagram(page)

  await immediateShiftClicks(page, ["a", "b", "c", "b"])

  await expectSelectedNodes(page, ["a", "c"])
})

test("holding Shift before the first click builds a multi-selection", async ({ page }) => {
  await seedDiagram(page)

  await page.keyboard.down("Shift")
  // Let React Flow commit its held-key state before the first pointer event.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await expect(page.locator(".react-flow__pane")).toHaveClass(/selection/)
  await node(page, "a").click()
  await node(page, "b").click()
  await node(page, "c").click()
  await expectSelectedNodes(page, ["a", "b", "c"])

  await node(page, "b").click()
  await expectSelectedNodes(page, ["a", "c"])

  await node(page, "c").click()
  await page.keyboard.up("Shift")
  await expectSelectedNodes(page, ["a"])
})

test("held-Shift clicks tolerate pointer jitter and copy every selected asset", async ({ page }) => {
  await seedDiagram(page)

  await page.keyboard.down("Shift")
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await shiftJitterClick(page, "a")
  await shiftJitterClick(page, "b")
  await page.keyboard.up("Shift")
  await expectSelectedNodes(page, ["a", "b"])

  await page.keyboard.press("Control+c")
  await page.keyboard.press("Control+v")
  await expect(page.locator(".react-flow__node")).toHaveCount(5)

  const pasted = await saveGraph(page)
  expect(pasted.nodes.filter((item: { id: string }) => item.id.startsWith("copied_node_"))).toHaveLength(2)
})

test("deleting a selected group removes incident edges and is one undo step", async ({ page }) => {
  await seedDiagram(page)
  await selectNodes(page, ["a", "b"])

  await page.keyboard.press("Delete")
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await expect(node(page, "c")).toBeVisible()
  await expect(page.locator(".react-flow__edge")).toHaveCount(0)

  await page.keyboard.press("Control+z")
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await expect(page.locator(".react-flow__edge")).toHaveCount(2)

  await page.keyboard.press("Control+y")
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await expect(page.locator(".react-flow__edge")).toHaveCount(0)
})

test("copy/paste preserves parallel internal edges, excludes external edges, and undoes atomically", async ({ page }) => {
  const snapshot = {
    ...baseSeed,
    edges: [
      makeEdge("e-ab-1", "a", "b", "First internal edge"),
      makeEdge("e-ab-2", "a", "b", "Second internal edge"),
      makeEdge("e-bc", "b", "c", "External edge"),
    ],
  }
  await seedDiagram(page, snapshot)
  await selectNodes(page, ["a", "b"])

  await page.keyboard.press("Control+c")
  await page.keyboard.press("Control+v")
  await expect(page.locator(".react-flow__node")).toHaveCount(5)
  await expect(page.locator(".react-flow__edge")).toHaveCount(5)

  const pasted = await saveGraph(page)
  const copiedNodes = pasted.nodes.filter((item: { id: string }) => item.id.startsWith("copied_node_"))
  const copiedNodeIds = new Set(copiedNodes.map((item: { id: string }) => item.id))
  const copiedEdges = pasted.edges.filter((item: { id: string }) => item.id.startsWith("copied_edge_"))

  expect(copiedNodes).toHaveLength(2)
  expect(copiedEdges).toHaveLength(2)
  expect(new Set(copiedEdges.map((item: { id: string }) => item.id)).size).toBe(2)
  for (const edge of copiedEdges) {
    expect(copiedNodeIds.has(edge.source)).toBeTruthy()
    expect(copiedNodeIds.has(edge.target)).toBeTruthy()
  }
  expect(copiedEdges.map((item: { data: { label: string } }) => item.data.label).sort()).toEqual([
    "First internal edge",
    "Second internal edge",
  ])

  await page.keyboard.press("Control+z")
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await expect(page.locator(".react-flow__edge")).toHaveCount(3)

  await page.keyboard.press("Control+y")
  await expect(page.locator(".react-flow__node")).toHaveCount(5)
  await expect(page.locator(".react-flow__edge")).toHaveCount(5)
})

test("selection alignment and distribution affect only selected nodes and each undo atomically", async ({ page }) => {
  await seedDiagram(page)
  await selectNodes(page, ["a", "b", "c"])

  await page.getByRole("button", { name: "Arrange selection" }).click()
  await page.getByRole("menuitem", { name: "Align horizontal centers" }).click()
  let graph = await saveGraph(page)
  let positions = positionsById(graph)
  expect(positions.get("a")?.y).toBe(260)
  expect(positions.get("b")?.y).toBe(260)
  expect(positions.get("c")?.y).toBe(260)
  expect(positions.get("a")?.x).toBe(100)
  expect(positions.get("b")?.x).toBe(350)
  expect(positions.get("c")?.x).toBe(720)

  await page.keyboard.press("Control+z")
  graph = await saveGraph(page)
  positions = positionsById(graph)
  expect(positions.get("a")).toEqual({ x: 100, y: 100 })
  expect(positions.get("b")).toEqual({ x: 350, y: 220 })
  expect(positions.get("c")).toEqual({ x: 720, y: 420 })
  await expectSelectedNodes(page, ["a", "b", "c"])

  await page.getByRole("button", { name: "Arrange selection" }).click()
  await page.getByRole("menuitem", { name: "Distribute horizontally" }).click()
  graph = await saveGraph(page)
  positions = positionsById(graph)

  const graphNodes = new Map<
    string,
    { position: { x: number; y: number }; measured?: { width?: number }; width?: number; data: { width?: number } }
  >(graph.nodes.map((item: { id: string }) => [item.id, item]))
  const width = (id: string) => {
    const item = graphNodes.get(id)!
    return item.measured?.width ?? item.width ?? item.data.width ?? 200
  }
  const firstGap = positions.get("b")!.x - width("b") / 2 - (positions.get("a")!.x + width("a") / 2)
  const secondGap = positions.get("c")!.x - width("c") / 2 - (positions.get("b")!.x + width("b") / 2)

  expect(firstGap).toBeCloseTo(secondGap, 5)
  expect(positions.get("a")).toEqual({ x: 100, y: 100 })
  expect(positions.get("c")).toEqual({ x: 720, y: 420 })
  expect(positions.get("b")?.y).toBe(220)

  await page.keyboard.press("Control+z")
  graph = await saveGraph(page)
  positions = positionsById(graph)
  expect(positions.get("a")).toEqual({ x: 100, y: 100 })
  expect(positions.get("b")).toEqual({ x: 350, y: 220 })
  expect(positions.get("c")).toEqual({ x: 720, y: 420 })
})

test("bulk compromised and investigation status changes are atomic and selection-scoped", async ({ page }) => {
  const snapshot = {
    ...baseSeed,
    nodes: baseSeed.nodes.map((item) => item.id === "c"
      ? { ...item, data: { ...item.data, type: "attacker" } }
      : item),
  }
  await seedDiagram(page, snapshot)
  await selectNodes(page, ["a", "b", "c"])

  await page.getByRole("button", { name: "Mark selected as compromised" }).click()
  let graph = await saveGraph(page)
  let data = nodeDataById(graph)
  expect(data.get("a")?.isCompromised).toBe(true)
  expect(data.get("b")?.isCompromised).toBe(true)
  expect(data.get("c")?.isCompromised).toBe(false)
  await expect(page.getByRole("button", { name: "Unmark selected as compromised" })).toBeVisible()

  await page.keyboard.press("Control+z")
  graph = await saveGraph(page)
  data = nodeDataById(graph)
  expect(data.get("a")?.isCompromised).toBe(false)
  expect(data.get("b")?.isCompromised).toBe(false)
  await expectSelectedNodes(page, ["a", "b", "c"])

  await page.getByRole("button", { name: "Set selected investigation status" }).click()
  await page.getByRole("menuitem", { name: "Done" }).click()
  graph = await saveGraph(page)
  data = nodeDataById(graph)
  expect(data.get("a")?.investigationStatus).toBe("Done")
  expect(data.get("b")?.investigationStatus).toBe("Done")
  expect(data.get("c")?.investigationStatus).toBe("No Status")

  await page.keyboard.press("Control+z")
  graph = await saveGraph(page)
  data = nodeDataById(graph)
  expect(data.get("a")?.investigationStatus).toBe("No Status")
  expect(data.get("b")?.investigationStatus).toBe("No Status")
})

test("right-clicking one asset selects it and opens the shared actions menu", async ({ page }) => {
  await seedDiagram(page)

  await node(page, "a").click({ button: "right" })
  const menu = page.getByRole("menu", { name: "Selection actions" })
  await expect(menu).toBeVisible()
  await expect(menu).toContainText("1 selected")
  await expectSelectedNodes(page, ["a"])
  await expect(menu.getByRole("menuitem", { name: "Copy selection" })).toBeVisible()
  await expect(menu.getByRole("menuitem", { name: "Delete selection" })).toBeVisible()

  await page.keyboard.press("Escape")
  await node(page, "b").click({ button: "right" })
  await expect(menu).toContainText("1 selected")
  await expectSelectedNodes(page, ["b"])
})

test("right-clicking a selected asset preserves bulk actions without triggering pane paste", async ({ page }) => {
  await seedDiagram(page)
  await selectNodes(page, ["a", "b"])
  await page.keyboard.press("Control+c")

  await node(page, "a").click({ button: "right" })
  const menu = page.getByRole("menu", { name: "Selection actions" })
  await expect(menu).toBeVisible()
  await expect(menu).toContainText("2 selected")
  await expect(menu.getByRole("menuitem", { name: "Copy selection" })).toBeVisible()
  await expect(menu.getByRole("menuitem", { name: "Delete selection" })).toBeVisible()
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await expectSelectedNodes(page, ["a", "b"])

  await menu.getByRole("menuitem", { name: "Mark selected as compromised" }).click()
  let graph = await saveGraph(page)
  let data = nodeDataById(graph)
  expect(data.get("a")?.isCompromised).toBe(true)
  expect(data.get("b")?.isCompromised).toBe(true)
  expect(data.get("c")?.isCompromised).toBe(false)

  await page.keyboard.press("Control+z")
  await expectSelectedNodes(page, ["a", "b"])

  await node(page, "a").click({ button: "right" })
  await menu.getByRole("menuitem", { name: "Investigation status" }).hover()
  await page.getByRole("menuitem", { name: "Done" }).click()
  graph = await saveGraph(page)
  data = nodeDataById(graph)
  expect(data.get("a")?.investigationStatus).toBe("Done")
  expect(data.get("b")?.investigationStatus).toBe("Done")
  expect(data.get("c")?.investigationStatus).toBe("No Status")

  await page.keyboard.press("Control+z")
  await node(page, "a").click({ button: "right" })
  await menu.getByRole("menuitem", { name: "Arrange selection" }).hover()
  await expect(page.getByRole("menuitem", { name: "Align vertical centers" })).toBeVisible()
  await page.keyboard.press("Escape")

  const pane = page.locator(".react-flow__pane")
  const paneBox = await pane.boundingBox()
  expect(paneBox).not.toBeNull()
  await pane.click({
    button: "right",
    position: { x: 20, y: paneBox!.height / 2 },
    force: true,
  })
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await expect(menu).toHaveCount(0)
})
