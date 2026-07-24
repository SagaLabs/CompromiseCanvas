import { test, expect, type Locator, type Page } from "@playwright/test"

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

const seed = {
  version: "1.0",
  nodes: [makeNode("n1", "Alpha", 0, 0), makeNode("n2", "Beta", 600, 0)],
  edges: [],
  canvasTitle: "Connection validation",
  incidentLog: [],
  viewport: { x: 100, y: 360, zoom: 1 },
  timestamp: new Date().toISOString(),
}

interface DiagramSnapshot {
  nodes: unknown[]
  edges: unknown[]
  timestamp: string
  [key: string]: unknown
}

async function seedDiagram(page: Page, snapshot: DiagramSnapshot = seed) {
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
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  }
}

async function connect(page: Page, source: Locator, target: Locator) {
  const from = await handleCenter(source)
  const to = await handleCenter(target)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

test("renders a self-connection and its label outside the asset", async ({ page }) => {
  await seedDiagram(page)
  const node = page.locator('.react-flow__node[data-id="n1"]')
  const source = node.locator(".react-flow__handle.source")
  const target = node.locator(".react-flow__handle.target")
  const from = await handleCenter(source)
  const to = await handleCenter(target)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })

  await expect(target).toHaveClass(/connectingto/)
  await expect(target).toHaveClass(/valid/)

  await page.mouse.up()
  const edge = page.locator(".react-flow__edge")
  await expect(edge).toHaveCount(1)

  const edgePath = edge.locator(".react-flow__edge-path")
  await expect(edgePath).toHaveAttribute("d", / C /)

  const label = page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Lateral Movement" })
  await expect(label).toBeVisible()

  const nodeBox = await node.boundingBox()
  const labelBox = await label.boundingBox()
  expect(nodeBox).not.toBeNull()
  expect(labelBox).not.toBeNull()
  expect(labelBox!.y + labelBox!.height).toBeLessThan(nodeBox!.y)

  const interactionPath = edge.locator('path[stroke="transparent"]')
  const routePoint = await interactionPath.evaluate((element) => {
    const path = element as SVGPathElement
    // Use the exposed side of the loop rather than its center, which is covered
    // by the label card.
    const point = path.getPointAtLength(path.getTotalLength() * 0.15)
    const matrix = path.getScreenCTM()
    if (!matrix) throw new Error("Missing route transform")
    return {
      x: point.x * matrix.a + point.y * matrix.c + matrix.e,
      y: point.x * matrix.b + point.y * matrix.d + matrix.f,
    }
  })
  await page.mouse.click(routePoint.x, routePoint.y)
  await expect(edge).toHaveClass(/selected/)
  await expect(page.getByRole("button", { name: "Delete selected edge" })).toBeVisible()

  const pathBeforeMove = await edgePath.getAttribute("d")
  await page.getByRole("button", { name: "Unlock edge to move it" }).click()
  await expect(page.getByRole("button", { name: "Lock edge" })).toBeVisible()

  const dragBox = await label.boundingBox()
  expect(dragBox).not.toBeNull()
  const dragStartX = dragBox!.x + dragBox!.width / 2
  const dragStartY = dragBox!.y + dragBox!.height / 2
  await page.mouse.move(dragStartX, dragStartY)
  await page.mouse.down()
  await page.mouse.move(dragStartX + 60, dragStartY - 40, { steps: 8 })
  await page.mouse.up()

  await expect(edgePath).not.toHaveAttribute("d", pathBeforeMove ?? "")
  const movedLabelBox = await label.boundingBox()
  expect(movedLabelBox).not.toBeNull()
  expect(movedLabelBox!.x).toBeGreaterThan(labelBox!.x + 40)
  expect(movedLabelBox!.y).toBeLessThan(labelBox!.y - 20)
})

test("still allows a connection between different assets", async ({ page }) => {
  await seedDiagram(page)
  const source = page.locator('.react-flow__node[data-id="n1"] .react-flow__handle.source')
  const target = page.locator('.react-flow__node[data-id="n2"] .react-flow__handle.target')
  await connect(page, source, target)
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
})

test("combines multiple action types on one self-connection", async ({ page }) => {
  const selfEdge = {
    id: "e-multi",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
      label: "Privilege Escalation",
      actionType: "Privilege Escalation",
      toolUsed: "",
      userUsed: "",
      timestamp: "",
      description: "",
      displaySettings,
    },
  }

  await seedDiagram(page, {
    ...seed,
    nodes: [seed.nodes[0]],
    edges: [selfEdge],
    viewport: { x: 600, y: 500, zoom: 1 },
  })

  const edge = page.locator(".react-flow__edge")
  const edgePaths = edge.locator(".react-flow__edge-path")
  await expect(edgePaths).toHaveCount(1)

  const label = page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Privilege Escalation" })
  await label.click()

  await expect(page.getByText("Action Types", { exact: true })).toBeVisible()
  const primaryActionType = page.getByRole("combobox", {
    name: "Action type 1",
  })
  await primaryActionType.click()
  await page
    .getByRole("option", { name: "Vulnerability Exploitation" })
    .click()

  await expect(edgePaths).toHaveCount(1)
  await expect(
    page.locator('[data-edge-action-type="Privilege Escalation"]'),
  ).toHaveCount(0)
  await expect(
    page.locator('[data-edge-action-type="Vulnerability Exploitation"]'),
  ).toBeVisible()

  await page.getByRole("button", { name: "Add action type" }).click()
  await page
    .getByRole("menuitem", { name: "Privilege Escalation" })
    .click()

  await expect(edgePaths).toHaveCount(2)
  await expect(
    page.locator('[data-edge-action-type="Privilege Escalation"]'),
  ).toBeVisible()
  await expect(
    page.locator('[data-edge-action-type="Vulnerability Exploitation"]'),
  ).toBeVisible()

  const bundleCard = page.locator(
    '[data-self-connection-action-bundle-card="true"]',
  )
  await expect(bundleCard).toBeVisible()
  const bundleCardBox = await bundleCard.boundingBox()
  expect(bundleCardBox).not.toBeNull()
  expect(bundleCardBox!.width).toBeLessThanOrEqual(301)

  const actionRows = page.locator("[data-edge-action-row]")
  await expect(actionRows).toHaveCount(2)
  const actionRowTextMetrics = await page
    .locator("[data-edge-action-row-text]")
    .evaluateAll((labels) =>
      labels.map((label) => ({
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
        clientHeight: label.clientHeight,
        scrollHeight: label.scrollHeight,
      })),
    )
  actionRowTextMetrics.forEach((label) => {
    expect(label.scrollWidth).toBeLessThanOrEqual(
      label.clientWidth + 1,
    )
    expect(label.scrollHeight).toBeLessThanOrEqual(
      label.clientHeight + 1,
    )
  })

  const routeColors = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => getComputedStyle(path).stroke),
  )
  expect(new Set(routeColors).size).toBe(2)
  const routePresentation = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => {
      const style = getComputedStyle(path)
      return {
        dashArray: style.strokeDasharray,
        width: style.strokeWidth,
      }
    }),
  )
  routePresentation.forEach((route) => {
    expect(route.dashArray).not.toBe("none")
    expect(Number.parseFloat(route.width)).toBeCloseTo(5)
  })
  await expect(page.locator("[data-edge-action-marker]")).toHaveCount(
    2,
  )
  const bundleGeometry = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => {
      const svgPath = path as SVGPathElement
      const totalLength = svgPath.getTotalLength()
      const start = svgPath.getPointAtLength(0)
      const middle = svgPath.getPointAtLength(totalLength / 2)
      const end = svgPath.getPointAtLength(totalLength)
      return {
        start: { x: start.x, y: start.y },
        middle: { x: middle.x, y: middle.y },
        end: { x: end.x, y: end.y },
      }
    }),
  )
  expect(bundleGeometry[0].start).toEqual(bundleGeometry[1].start)
  expect(bundleGeometry[0].end).toEqual(bundleGeometry[1].end)
  const middleSeparation = Math.hypot(
    bundleGeometry[0].middle.x - bundleGeometry[1].middle.x,
    bundleGeometry[0].middle.y - bundleGeometry[1].middle.y,
  )
  expect(middleSeparation).toBeCloseTo(5, 0)

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}"),
  )
  expect(saved.edges[0].data.actionType).toBe("Vulnerability Exploitation")
  expect(saved.edges[0].data.actionTypes).toEqual([
    "Vulnerability Exploitation",
    "Privilege Escalation",
  ])

  await page.keyboard.press("Control+z")
  await expect(edgePaths).toHaveCount(1)
  await expect(
    page.locator('[data-edge-action-type="Privilege Escalation"]'),
  ).toHaveCount(0)
  await expect(
    page.locator('[data-edge-action-type="Vulnerability Exploitation"]'),
  ).toBeVisible()

  await page.keyboard.press("Control+y")
  await expect(edgePaths).toHaveCount(2)

  const pathsBeforeMove = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("d")),
  )
  await page.getByRole("button", { name: "Unlock edge to move it" }).click()

  const labelBox = await label.boundingBox()
  expect(labelBox).not.toBeNull()
  const startX = labelBox!.x + labelBox!.width / 2
  const startY = labelBox!.y + labelBox!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 60, startY - 40, { steps: 8 })
  await page.mouse.up()

  const pathsAfterMove = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("d")),
  )
  expect(pathsAfterMove).not.toEqual(pathsBeforeMove)
})

test("edits and removes any self-connection action type", async ({ page }) => {
  const selfEdge = {
    id: "e-editable-actions",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
      label: "Privilege Escalation",
      actionType: "Privilege Escalation",
      actionTypes: [
        "Privilege Escalation",
        "Vulnerability Exploitation",
      ],
      toolUsed: "",
      userUsed: "",
      timestamp: "",
      description: "",
      displaySettings,
    },
  }

  await seedDiagram(page, {
    ...seed,
    nodes: [seed.nodes[0]],
    edges: [selfEdge],
    viewport: { x: 600, y: 500, zoom: 1 },
  })

  const edge = page.locator(".react-flow__edge")
  await page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Privilege Escalation" })
    .click()

  await page
    .getByRole("combobox", { name: "Action type 2" })
    .click()
  await page
    .getByRole("option", { name: "Lateral Movement" })
    .click()

  await expect(
    page.locator('[data-edge-action-type="Vulnerability Exploitation"]'),
  ).toHaveCount(0)
  await expect(
    page.locator('[data-edge-action-type="Lateral Movement"]'),
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Remove Privilege Escalation" })
    .click()

  await expect(edge).toHaveCount(1)
  await expect(edge.locator(".react-flow__edge-path")).toHaveCount(1)
  await expect(
    page.locator('[data-edge-action-type="Privilege Escalation"]'),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Remove Lateral Movement" }),
  ).toHaveCount(0)

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}"),
  )
  expect(saved.edges[0].data.actionType).toBe("Lateral Movement")
  expect(saved.edges[0].data.actionTypes).toBeUndefined()
})

test("keeps a multi-action self-connection card outside the asset", async ({
  page,
}) => {
  const selfEdge = {
    id: "e-multi-clearance",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
      label: "Privilege Escalation",
      actionType: "Privilege Escalation",
      actionTypes: [
        "Privilege Escalation",
        "Vulnerability Exploitation",
        "Persistence",
        "Credential Access",
      ],
      toolUsed: "",
      userUsed: "",
      timestamp: "",
      description: "",
      displaySettings,
    },
  }

  await seedDiagram(page, {
    ...seed,
    nodes: [seed.nodes[0]],
    edges: [selfEdge],
    viewport: { x: 600, y: 650, zoom: 1 },
  })

  const node = page.locator('.react-flow__node[data-id="n1"]')
  const bundleCard = page.locator(
    '[data-self-connection-action-bundle-card="true"]',
  )
  await expect(bundleCard).toBeVisible()
  await expect(bundleCard.locator("[data-edge-action-row]")).toHaveCount(4)

  const nodeBox = await node.boundingBox()
  const bundleCardBox = await bundleCard.boundingBox()
  expect(nodeBox).not.toBeNull()
  expect(bundleCardBox).not.toBeNull()
  expect(bundleCardBox!.y + bundleCardBox!.height).toBeLessThan(
    nodeBox!.y - 8,
  )
})

test("keeps a self-connection label outside a tall resized asset", async ({ page }) => {
  const tallNode = {
    ...seed.nodes[0],
    data: {
      ...seed.nodes[0].data,
      width: 220,
      height: 600,
    },
  }
  const selfEdge = {
    id: "e1",
    source: tallNode.id,
    target: tallNode.id,
    type: "customEdge",
    data: {
      actionType: "Privilege Escalation",
      toolUsed: "",
      userUsed: "",
      timestamp: "",
      description: "",
      displaySettings,
    },
  }

  await seedDiagram(page, {
    ...seed,
    nodes: [tallNode],
    edges: [selfEdge],
    viewport: { x: 600, y: 500, zoom: 1 },
  })

  const node = page.locator('.react-flow__node[data-id="n1"]')
  const label = page
    .locator(".react-flow__edgelabel-renderer > div")
    .filter({ hasText: "Privilege Escalation" })
  await expect(label).toBeVisible()

  const nodeBox = await node.boundingBox()
  const labelBox = await label.boundingBox()
  expect(nodeBox).not.toBeNull()
  expect(labelBox).not.toBeNull()
  expect(labelBox!.y + labelBox!.height).toBeLessThan(nodeBox!.y)
})
