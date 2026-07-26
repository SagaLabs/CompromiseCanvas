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

interface BoundingRect {
  x: number
  y: number
  width: number
  height: number
}

function boxesOverlap(first: BoundingRect, second: BoundingRect) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  )
}

function horizontalBoxGap(first: BoundingRect, second: BoundingRect) {
  return Math.max(
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
  )
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
    page.locator(
      '[data-edge-action-summary-icon="Privilege Escalation"]',
    ),
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-edge-action-summary-icon="Vulnerability Exploitation"]',
    ),
  ).toBeVisible()

  const bundleCard = page.locator(
    '[data-self-connection-action-bundle-card="true"]',
  )
  await expect(bundleCard).toBeVisible()
  const bundleCardBox = await bundleCard.boundingBox()
  expect(bundleCardBox).not.toBeNull()
  expect(bundleCardBox!.width).toBeLessThanOrEqual(301)

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
        filter: style.filter,
      }
    }),
  )
  routePresentation.forEach((route) => {
    expect(route.dashArray).not.toBe("none")
    expect(Number.parseFloat(route.width)).toBeCloseTo(3)
    expect(route.filter).toContain("drop-shadow")
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
  expect(middleSeparation).toBeCloseTo(3, 0)

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

  const labelBox = await bundleCard.boundingBox()
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

test("balances three compact action types without promoting one", async ({
  page,
}) => {
  const actionTypes = [
    "Privilege Escalation",
    "Vulnerability Exploitation",
    "Credential Access",
  ]
  const selfEdge = {
    id: "e-three-actions",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
      actionType: actionTypes[0],
      actionTypes,
      displaySettings,
    },
  }

  await seedDiagram(page, {
    ...seed,
    nodes: [seed.nodes[0]],
    edges: [selfEdge],
    viewport: { x: 600, y: 550, zoom: 1 },
  })

  const card = page.locator(
    '[data-self-connection-action-bundle-card="true"]',
  )
  const layout = card.locator(
    '[data-edge-action-summary-layout="balanced-grid"]',
  )
  const tiles = actionTypes.map((actionType) =>
    layout.locator(
      `[data-edge-action-summary-icon="${actionType}"]`,
    ),
  )

  await expect(layout).toBeVisible()
  await expect(
    layout.locator("[data-edge-action-summary-overflow]"),
  ).toHaveCount(0)
  for (const tile of tiles) {
    await expect(tile).toBeVisible()
  }

  const [firstBox, secondBox, thirdBox, layoutBox] = await Promise.all([
    tiles[0].boundingBox(),
    tiles[1].boundingBox(),
    tiles[2].boundingBox(),
    layout.boundingBox(),
  ])
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(thirdBox).not.toBeNull()
  expect(layoutBox).not.toBeNull()

  expect(Math.abs(firstBox!.width - secondBox!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(firstBox!.width - thirdBox!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThanOrEqual(1)
  expect(thirdBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height)

  const layoutCenter = layoutBox!.x + layoutBox!.width / 2
  const thirdCenter = thirdBox!.x + thirdBox!.width / 2
  expect(Math.abs(layoutCenter - thirdCenter)).toBeLessThanOrEqual(1)

  const labelMetrics = await layout
    .locator("[data-edge-action-summary-label]")
    .evaluateAll((labels) =>
      labels.map((label) => ({
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
      })),
    )
  labelMetrics.forEach((label) => {
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1)
  })

  const edgePaths = page.locator(
    '.react-flow__edge[data-id="e-three-actions"] .react-flow__edge-path',
  )
  const pathsBeforeSelection = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("d")),
  )
  await card.click()
  await expect(card).toHaveClass(/ip-selection-highlight/)
  const pathsAfterSelection = await edgePaths.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("d")),
  )
  expect(pathsAfterSelection).toEqual(pathsBeforeSelection)
})

test("edits and removes any self-connection action type", async ({ page }) => {
  const selfEdge = {
    id: "e-editable-actions",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
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
  await page.locator('[data-edge-action-summary="true"]').click()
  await page
    .getByRole("button", { name: "Show full self-connection details" })
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
    page.locator(
      '[data-edge-action-row="Lateral Movement"]',
    ),
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
    page.getByRole("button", {
      name: "Remove Lateral Movement and delete self-connection",
    }),
  ).toBeVisible()

  await page.keyboard.press("Control+z")
  await expect(
    page.getByRole("button", {
      name: "Show full self-connection details",
    }),
  ).toHaveAttribute("aria-pressed", "false")

  await page.keyboard.press("Control+y")
  await expect(edge.locator(".react-flow__edge-path")).toHaveCount(1)

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}"),
  )
  expect(saved.edges[0].data.actionType).toBe("Lateral Movement")
  expect(saved.edges[0].data.actionTypes).toBeUndefined()

  await page
    .getByRole("button", {
      name: "Remove Lateral Movement and delete self-connection",
    })
    .click()
  await expect(edge).toHaveCount(0)

  await page.keyboard.press("Control+z")
  await expect(edge).toHaveCount(1)
  await expect(
    page.locator('[data-edge-action-type="Lateral Movement"]'),
  ).toBeVisible()

  await page.keyboard.press("Control+y")
  await expect(edge).toHaveCount(0)
})

test("keeps a multi-action self-connection card outside the asset", async ({
  page,
}) => {
  const longLabel =
    "Recovered Tier-0 credentials through a vulnerable VPN gateway"
  const localTimestamp = new Date(2026, 2, 18, 8, 7).toISOString()
  const selfEdge = {
    id: "e-multi-clearance",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
      actionType: "Privilege Escalation",
      actionTypes: [
        "Privilege Escalation",
        "Vulnerability Exploitation",
        "Persistence",
        "Credential Access",
      ],
      actionTypesExpanded: true,
      label: longLabel,
      toolUsed: "Nanodump-compatible loader",
      userUsed: "KVS\\adm.maya.cho",
      timestamp: localTimestamp,
      description: "Recovered a reusable Tier-0 administrative credential.",
      mitreAttackTechniques: [
        {
          id: "T1068",
          name: "Exploitation for Privilege Escalation",
        },
        {
          id: "T1059",
          name: "Command and Scripting Interpreter",
        },
      ],
      displaySettings: {
        ...displaySettings,
        showLabel: true,
        showTool: true,
        showUser: true,
        showTimestamp: true,
        showMitreId: true,
        showDescription: true,
      },
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
  const actionSummary = page.locator(
    '[data-edge-action-summary="true"]',
  )
  const actionReveal = page.locator(
    '[data-edge-action-reveal="true"]',
  )
  await expect(bundleCard).toBeVisible()
  await expect(actionSummary).toBeVisible()
  await expect(actionReveal).toHaveCount(0)
  const migratedAutosave = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  expect(
    migratedAutosave.edges[0].data.actionTypesExpanded,
  ).toBeUndefined()
  await expect(
    bundleCard.locator("[data-edge-compact-title]"),
  ).toHaveText(longLabel)
  await expect(
    bundleCard.locator("[data-edge-compact-title]"),
  ).toHaveAttribute("title", longLabel)
  await expect(bundleCard).toContainText("18 Mar 08:07")
  await expect(
    bundleCard.locator("[data-edge-compact-hidden-details]"),
  ).toHaveText("+4 details")
  await expect(bundleCard).not.toContainText("T1068")
  await expect(bundleCard).not.toContainText("T1059")
  await expect(
    bundleCard.locator("[data-edge-expanded-metadata]"),
  ).toHaveCount(0)
  await expect(bundleCard).not.toContainText("Nanodump-compatible loader")
  await expect(bundleCard).not.toContainText("KVS\\adm.maya.cho")
  await expect(
    actionSummary.locator("[data-edge-action-summary-icon]"),
  ).toHaveCount(4)
  await expect(
    actionSummary.locator(
      '[data-edge-action-summary-label="Privilege Escalation"]',
    ),
  ).toHaveText("PrivEsc")
  await expect(
    actionSummary.locator(
      '[data-edge-action-summary-icon="Privilege Escalation"]',
    ),
  ).toHaveAttribute("title", "Privilege Escalation")
  await expect(
    actionSummary.locator(
      '[data-edge-action-summary-label="Vulnerability Exploitation"]',
    ),
  ).toHaveText("Vuln Exploit")
  await expect(
    actionSummary.locator(
      '[data-edge-action-summary-label="Persistence"]',
    ),
  ).toHaveText("Persistence")
  await expect(
    actionSummary.locator(
      '[data-edge-action-summary-label="Credential Access"]',
    ),
  ).toHaveText("Cred Access")
  await expect(
    actionSummary.locator("[data-edge-action-summary-overflow]"),
  ).toHaveCount(0)
  await expect(
    bundleCard.locator("[data-edge-action-color-strip]"),
  ).toHaveCount(0)

  await expect
    .poll(async () => {
      const nodeBox = await node.boundingBox()
      const cardBox = await bundleCard.boundingBox()
      if (!nodeBox || !cardBox) return Number.NEGATIVE_INFINITY
      return nodeBox.y - (cardBox.y + cardBox.height)
    })
    .toBeGreaterThanOrEqual(12)

  const nodeBox = await node.boundingBox()
  const bundleCardBox = await bundleCard.boundingBox()
  expect(nodeBox).not.toBeNull()
  expect(bundleCardBox).not.toBeNull()
  expect(bundleCardBox!.height).toBeLessThanOrEqual(140)

  await actionSummary.hover()
  await expect(actionReveal).toHaveCount(0)
  const toolbarBox = await page
    .locator(".react-flow__edge-toolbar")
    .boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(horizontalBoxGap(toolbarBox!, bundleCardBox!)).toBeGreaterThanOrEqual(
    16,
  )
  expect(horizontalBoxGap(toolbarBox!, bundleCardBox!)).toBeLessThanOrEqual(
    32,
  )
  expect(boxesOverlap(toolbarBox!, nodeBox!)).toBe(false)

  await page
    .getByRole("button", { name: "Show full self-connection details" })
    .click()
  await expect(
    page.getByRole("button", {
      name: "Return to compact self-connection",
    }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    bundleCard.locator("[data-edge-action-color-strip]"),
  ).toHaveCount(0)

  await page.mouse.move(400, 180)
  await expect(actionReveal).toBeVisible()
  const pinnedCardBox = await bundleCard.boundingBox()
  const pinnedActionRevealBox = await actionReveal.boundingBox()
  const visibilityToggleBox = await page
    .getByRole("button", {
      name: "Return to compact self-connection",
    })
    .boundingBox()
  expect(pinnedCardBox).not.toBeNull()
  expect(pinnedActionRevealBox).not.toBeNull()
  expect(visibilityToggleBox).not.toBeNull()
  await expect
    .poll(async () => {
      const currentNodeBox = await node.boundingBox()
      const currentCardBox = await bundleCard.boundingBox()
      if (!currentNodeBox || !currentCardBox) {
        return Number.NEGATIVE_INFINITY
      }
      return (
        currentNodeBox.y -
        (currentCardBox.y + currentCardBox.height)
      )
    })
    .toBeGreaterThanOrEqual(12)
  expect(pinnedActionRevealBox!.x).toBeGreaterThanOrEqual(
    pinnedCardBox!.x,
  )
  expect(pinnedActionRevealBox!.y).toBeGreaterThanOrEqual(
    pinnedCardBox!.y,
  )
  expect(
    pinnedActionRevealBox!.x + pinnedActionRevealBox!.width,
  ).toBeLessThanOrEqual(
    pinnedCardBox!.x + pinnedCardBox!.width,
  )
  expect(
    pinnedActionRevealBox!.y + pinnedActionRevealBox!.height,
  ).toBeLessThanOrEqual(
    pinnedCardBox!.y + pinnedCardBox!.height,
  )
  await actionSummary.hover()
  const expandedToolbarBox = await page
    .locator(".react-flow__edge-toolbar")
    .boundingBox()
  expect(expandedToolbarBox).not.toBeNull()
  expect(boxesOverlap(expandedToolbarBox!, pinnedCardBox!)).toBe(false)
  expect(
    horizontalBoxGap(expandedToolbarBox!, pinnedCardBox!),
  ).toBeGreaterThanOrEqual(16)
  expect(
    horizontalBoxGap(expandedToolbarBox!, pinnedCardBox!),
  ).toBeLessThanOrEqual(32)
  expect(visibilityToggleBox!.x).toBeGreaterThanOrEqual(
    pinnedCardBox!.x,
  )
  expect(visibilityToggleBox!.x + visibilityToggleBox!.width).toBeLessThanOrEqual(
    pinnedCardBox!.x + pinnedCardBox!.width,
  )
  await expect(bundleCard).toContainText("T1059")
  await expect(bundleCard).toContainText("Nanodump-compatible loader")
  await expect(bundleCard).toContainText("KVS\\adm.maya.cho")
  await expect(bundleCard).toContainText(
    "Recovered a reusable Tier-0 administrative credential.",
  )
  await expect(
    bundleCard.locator("[data-edge-expanded-label]"),
  ).toHaveCount(0)
  const expandedTitleMetrics = await bundleCard
    .locator("[data-edge-compact-title]")
    .evaluate((title) => ({
      clientWidth: title.clientWidth,
      scrollWidth: title.scrollWidth,
      clientHeight: title.clientHeight,
      scrollHeight: title.scrollHeight,
    }))
  expect(expandedTitleMetrics.scrollWidth).toBeLessThanOrEqual(
    expandedTitleMetrics.clientWidth + 1,
  )
  expect(expandedTitleMetrics.scrollHeight).toBeLessThanOrEqual(
    expandedTitleMetrics.clientHeight + 1,
  )
  await expect(
    bundleCard.locator("[data-edge-expanded-metadata]"),
  ).toBeVisible()

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}"),
  )
  expect(saved.edges[0].data.actionTypesExpanded).toBeUndefined()

  await page
    .getByRole("button", { name: "Load from browser storage" })
    .click()
  await expect(
    page.getByRole("button", {
      name: "Show full self-connection details",
    }),
  ).toHaveAttribute("aria-pressed", "false")
  await page.mouse.move(400, 180)
  await expect(actionReveal).toHaveCount(0)

  await page.keyboard.press("Control+z")
  await expect(actionReveal).toHaveCount(0)

  await page.keyboard.press("Control+y")
  await expect(actionReveal).toHaveCount(0)

  await page
    .getByRole("button", { name: "Show full self-connection details" })
    .click()
  await expect(actionReveal).toBeVisible()
  await page.keyboard.press("Control+z")
  await expect(actionReveal).toBeVisible()
})

test("keeps a large pinned action list clear of its asset", async ({
  page,
}) => {
  const selfEdge = {
    id: "e-many-actions",
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
        "Defense Evasion",
        "Discovery",
        "Collection",
        "Impact",
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
  const actionSummary = page.locator(
    '[data-edge-action-summary="true"]',
  )
  await expect(
    actionSummary.locator("[data-edge-action-summary-icon]"),
  ).toHaveCount(3)
  await expect(
    actionSummary.locator("[data-edge-action-summary-overflow]"),
  ).toHaveText("+5 more")

  await page
    .getByRole("button", { name: "Show full self-connection details" })
    .click()
  await expect(bundleCard.locator("[data-edge-action-row]")).toHaveCount(8)

  await expect
    .poll(async () => {
      const nodeBox = await node.boundingBox()
      const cardBox = await bundleCard.boundingBox()
      if (!nodeBox || !cardBox) return Number.NEGATIVE_INFINITY
      return nodeBox.y - (cardBox.y + cardBox.height)
    })
    .toBeGreaterThanOrEqual(12)

  await actionSummary.hover()
  const cardBox = await bundleCard.boundingBox()
  const toolbarBox = await page
    .locator(".react-flow__edge-toolbar")
    .boundingBox()
  expect(cardBox).not.toBeNull()
  expect(toolbarBox).not.toBeNull()
  expect(boxesOverlap(toolbarBox!, cardBox!)).toBe(false)
  expect(horizontalBoxGap(toolbarBox!, cardBox!)).toBeGreaterThanOrEqual(16)
  expect(horizontalBoxGap(toolbarBox!, cardBox!)).toBeLessThanOrEqual(32)
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
