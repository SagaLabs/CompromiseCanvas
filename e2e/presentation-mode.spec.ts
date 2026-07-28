import { expect, test, type Page } from "@playwright/test"

const nodeDisplaySettings = {
  showHostname: false,
  showIpAddress: false,
  showOs: false,
  showServices: false,
  showCriticality: false,
  showActions: false,
  showDescription: false,
}

const edgeDisplaySettings = {
  showLabel: true,
  showTool: false,
  showUser: false,
  showTimestamp: false,
  showMitreId: false,
  showDescription: false,
  showC2Channel: false,
  showC2Framework: false,
}

function makeNode(id: string, label: string, x: number, y: number) {
  return {
    id,
    type: "customNode",
    position: { x, y },
    data: {
      label,
      type: "web-server",
      hostname: `${id}.example.test`,
      ipAddress: "",
      os: "",
      criticality: "Medium",
      services: [],
      actions: [],
      description: `Hidden details for ${label}`,
      displaySettings: { ...nodeDisplaySettings },
      isCompromised: false,
      investigationStatus: "No Status",
    },
  }
}

function makeEdge({
  id,
  source,
  target,
  actionType,
  timestamp,
}: {
  id: string
  source: string
  target: string
  actionType: string
  timestamp: string
}) {
  return {
    id,
    source,
    target,
    type: "customEdge",
    data: {
      label: actionType,
      actionType,
      toolUsed: `${actionType} tool`,
      userUsed: "",
      timestamp,
      description: `Hidden details for ${actionType}`,
      displaySettings: { ...edgeDisplaySettings },
    },
  }
}

const seed = {
  version: "1.0",
  nodes: [
    makeNode("a", "VPN Gateway", 0, 0),
    makeNode("b", "Application Server", 500, 0),
    makeNode("c", "Domain Controller", 1000, 0),
  ],
  edges: [
    makeEdge({
      id: "e-initial",
      source: "a",
      target: "b",
      actionType: "Initial Access",
      timestamp: "2026-07-25T08:00:00.000Z",
    }),
    makeEdge({
      id: "e-lateral",
      source: "b",
      target: "c",
      actionType: "Lateral Movement",
      timestamp: "2026-07-25T08:15:00.000Z",
    }),
    makeEdge({
      id: "e-untimed",
      source: "c",
      target: "a",
      actionType: "Exfiltration",
      timestamp: "",
    }),
  ],
  canvasTitle: "Presentation playback test",
  incidentLog: [],
  viewport: { x: 100, y: 250, zoom: 0.7 },
  timestamp: "2026-07-25T12:00:00.000Z",
}

async function seedDiagram(page: Page, snapshot: any = seed) {
  await page.addInitScript((snapshot) => {
    localStorage.clear()
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem(
      "compromise-canvas-autosave-flow",
      JSON.stringify(snapshot),
    )
    localStorage.setItem(
      "compromise-canvas-autosave-timestamp",
      snapshot.timestamp,
    )
  }, snapshot)
  await page.goto("/")
  await expect(page.locator(".react-flow__node")).toHaveCount(
    snapshot.nodes.length,
  )
  await expect(page.locator(".react-flow__edge")).toHaveCount(
    snapshot.edges.length,
  )
}

async function enterPresentation(page: Page) {
  await page
    .getByRole("button", { name: "Enter presentation mode" })
    .click()
  await expect(page.getByRole("button", { name: "Got it" })).toHaveCount(0)
}

const canvasNode = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`)

const edgePath = (page: Page, id: string) =>
  page.locator(
    `.react-flow__edge[data-id="${id}"] .react-flow__edge-path`,
  )

const stripNodeMeasurements = (nodes: any[]) =>
  nodes.map(({ measured: _measured, ...node }) => node)

test("scrubs through timestamped routes and marks incomplete coverage", async ({
  page,
}) => {
  await seedDiagram(page)
  const savedBefore = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  await enterPresentation(page)

  await page.getByRole("button", { name: "Attack playback" }).click()

  const playback = page.locator("[data-presentation-playback-controls]")
  await expect(playback).toBeVisible()
  await expect(playback).toContainText("Step 1 of 2")
  await expect(playback).toContainText("Playback includes 2 of 3 routes")
  await expect(
    playback.locator("[data-presentation-playback-marker]"),
  ).toHaveCount(2)

  await expect(
    canvasNode(page, "a").locator(
      '[data-presentation-playback-state="current"]',
    ),
  ).toBeVisible()
  await expect(
    canvasNode(page, "b").locator(
      '[data-presentation-playback-state="current"]',
    ),
  ).toBeVisible()
  await expect(
    canvasNode(page, "c").locator(
      '[data-presentation-playback-state="future"]',
    ),
  ).toBeVisible()
  await expect(
    canvasNode(page, "c").locator(
      '[data-presentation-playback-state="future"]',
    ),
  ).toHaveCSS("opacity", "1")
  await expect(
    page.getByRole("button", { name: "Lateral Movement details" }),
  ).toHaveCSS("opacity", "1")
  await expect(edgePath(page, "e-initial")).toHaveCSS("opacity", "1")
  await expect(edgePath(page, "e-lateral")).toHaveCSS("opacity", "0.12")
  await expect(edgePath(page, "e-untimed")).toHaveCSS("opacity", "0.12")

  const untimedRouteIssue = playback.locator(
    '[data-presentation-timestamp-issue="e-untimed"]',
  )
  await expect(untimedRouteIssue).toContainText(
    "Domain Controller → VPN Gateway",
  )
  await expect(untimedRouteIssue).toContainText("Missing timestamp")

  await untimedRouteIssue.click()
  await expect(untimedRouteIssue).toHaveAttribute("aria-pressed", "true")
  await expect(
    canvasNode(page, "a").locator(
      '[data-presentation-playback-state="missing"]',
    ),
  ).toBeVisible()
  await expect(
    canvasNode(page, "c").locator(
      '[data-presentation-playback-state="missing"]',
    ),
  ).toBeVisible()
  await expect(edgePath(page, "e-untimed")).toHaveCSS("opacity", "1")
  await expect(
    page.locator(
      '.react-flow__edgelabel-renderer [data-presentation-playback-state="missing"]',
    ),
  ).toContainText("Missing or invalid timestamp")

  await untimedRouteIssue.click()
  await expect(untimedRouteIssue).toHaveAttribute("aria-pressed", "false")
  await expect(edgePath(page, "e-untimed")).toHaveCSS("opacity", "0.12")

  await page.getByRole("button", { name: "Next attack step" }).click()

  await expect(playback).toContainText("Step 2 of 2")
  await expect(
    canvasNode(page, "a").locator(
      '[data-presentation-playback-state="reached"]',
    ),
  ).toBeVisible()
  await expect(
    canvasNode(page, "b").locator(
      '[data-presentation-playback-state="current"]',
    ),
  ).toBeVisible()
  await expect(
    canvasNode(page, "c").locator(
      '[data-presentation-playback-state="current"]',
    ),
  ).toBeVisible()
  await expect(edgePath(page, "e-initial")).toHaveCSS("opacity", "0.7")
  await expect(edgePath(page, "e-lateral")).toHaveCSS("opacity", "1")
  await expect(edgePath(page, "e-untimed")).toHaveCSS("opacity", "0.12")

  await page.getByRole("button", { name: "Close attack playback" }).click()
  await expect(playback).toHaveCount(0)
  await expect(
    canvasNode(page, "c").locator("[data-presentation-playback-state]"),
  ).toHaveCount(0)
  await expect(edgePath(page, "e-untimed")).toHaveCSS("opacity", "1")

  const savedAfter = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  expect(stripNodeMeasurements(savedAfter.nodes)).toEqual(
    stripNodeMeasurements(savedBefore.nodes),
  )
  expect(savedAfter.edges).toEqual(savedBefore.edges)
  expect(savedAfter.canvasTitle).toBe(savedBefore.canvasTitle)
  expect(savedAfter.incidentLog).toEqual(savedBefore.incidentLog)
  expect(savedAfter.viewport).toEqual(savedBefore.viewport)
})

test("keeps the playback panel clear of the diagram and restores the presentation view", async ({
  page,
}) => {
  await seedDiagram(page, {
    ...seed,
    nodes: [
      makeNode("a", "VPN Gateway", 0, 0),
      makeNode("b", "Bottom-row Server", 500, 900),
    ],
    edges: [
      makeEdge({
        id: "e-tall-layout",
        source: "a",
        target: "b",
        actionType: "Lateral Movement",
        timestamp: "2026-07-25T08:15:00.000Z",
      }),
    ],
  })
  await enterPresentation(page)
  await page.waitForTimeout(400)

  const viewport = page.locator(".react-flow__viewport")
  const presentationTransform = await viewport.getAttribute("style")
  expect(presentationTransform).not.toBeNull()

  await page.getByRole("button", { name: "Attack playback" }).click()

  const playback = page.locator("[data-presentation-playback-controls]")
  const bottomNode = canvasNode(page, "b")
  await expect(playback).toBeVisible()
  await expect(viewport).not.toHaveAttribute("style", presentationTransform!)
  await expect
    .poll(async () => {
      const [playbackBox, nodeBox] = await Promise.all([
        playback.boundingBox(),
        bottomNode.boundingBox(),
      ])
      if (!playbackBox || !nodeBox) return -1
      return playbackBox.y - (nodeBox.y + nodeBox.height)
    })
    .toBeGreaterThanOrEqual(8)

  await page.getByRole("button", { name: "Close attack playback" }).click()
  await expect(playback).toHaveCount(0)
  await expect(viewport).toHaveAttribute("style", presentationTransform!)
})

test("uses temporary spacing for expanded details and restores the original presentation layout", async ({
  page,
}) => {
  const denseSeed = {
    ...seed,
    nodes: [
      makeNode("a", "Entry Gateway", 0, 0),
      makeNode("b", "Application Server", 0, 260),
      makeNode("c", "Domain Controller", 0, 520),
    ],
    edges: [
      makeEdge({
        id: "e-dense-one",
        source: "a",
        target: "b",
        actionType: "Initial Access",
        timestamp: "2026-07-25T08:00:00.000Z",
      }),
      makeEdge({
        id: "e-dense-two",
        source: "b",
        target: "c",
        actionType: "Lateral Movement",
        timestamp: "2026-07-25T08:15:00.000Z",
      }),
    ],
  }

  await seedDiagram(page, denseSeed)
  const savedBefore = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  await enterPresentation(page)
  await page.waitForTimeout(400)

  const viewport = page.locator(".react-flow__viewport")
  const viewportBefore = await viewport.getAttribute("style")
  const positionsBefore = await page.locator(".react-flow__node").evaluateAll(
    (elements) =>
      Object.fromEntries(
        elements.map((element) => [
          element.getAttribute("data-id"),
          element.getAttribute("style"),
        ]),
      ),
  )

  await page.getByRole("button", { name: "Show all details" }).click()

  await expect
    .poll(async () => {
      const pairs = [
        ["a", "e-dense-one", "b"],
        ["b", "e-dense-two", "c"],
      ] as const
      const gaps = await Promise.all(
        pairs.map(async ([sourceId, edgeId, targetId]) => {
          const [sourceBox, edgeBox, targetBox] = await Promise.all([
            canvasNode(page, sourceId).boundingBox(),
            page
              .locator(`[data-presentation-edge-id="${edgeId}"]`)
              .boundingBox(),
            canvasNode(page, targetId).boundingBox(),
          ])
          if (!sourceBox || !edgeBox || !targetBox) return -1

          return Math.min(
            edgeBox.y - (sourceBox.y + sourceBox.height),
            targetBox.y - (edgeBox.y + edgeBox.height),
          )
        }),
      )
      return Math.min(...gaps)
    })
    .toBeGreaterThanOrEqual(8)

  const positionsExpanded = await page.locator(".react-flow__node").evaluateAll(
    (elements) =>
      Object.fromEntries(
        elements.map((element) => [
          element.getAttribute("data-id"),
          element.getAttribute("style"),
        ]),
      ),
  )
  expect(positionsExpanded).not.toEqual(positionsBefore)

  await page.getByRole("button", { name: "Hide all details" }).click()
  await expect(viewport).toHaveAttribute("style", viewportBefore!)
  await expect
    .poll(() =>
      page.locator(".react-flow__node").evaluateAll(
        (elements) =>
          Object.fromEntries(
            elements.map((element) => [
              element.getAttribute("data-id"),
              element.getAttribute("style"),
            ]),
          ),
      ),
    )
    .toEqual(positionsBefore)

  const savedAfter = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  expect(stripNodeMeasurements(savedAfter.nodes)).toEqual(
    stripNodeMeasurements(savedBefore.nodes),
  )
  expect(savedAfter.edges).toEqual(savedBefore.edges)
  expect(savedAfter.viewport).toEqual(savedBefore.viewport)
  expect(savedAfter.canvasTitle).toBe(savedBefore.canvasTitle)
  expect(savedAfter.incidentLog).toEqual(savedBefore.incidentLog)
})

test("keeps an already-spaced presentation and its camera still", async ({
  page,
}) => {
  await seedDiagram(page, {
    ...seed,
    nodes: [
      makeNode("a", "VPN Gateway", 0, 0),
      makeNode("b", "Application Server", 1000, 0),
      makeNode("c", "Domain Controller", 2000, 0),
    ],
  })
  await enterPresentation(page)
  await page.waitForTimeout(400)

  const viewport = page.locator(".react-flow__viewport")
  const viewportBefore = await viewport.getAttribute("style")
  const centersBefore = await page
    .locator(".react-flow__node")
    .evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => {
          const bounds = element.getBoundingClientRect()
          return [
            element.getAttribute("data-id"),
            {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2,
            },
          ]
        }),
      ),
    ) as Record<string, { x: number; y: number }>

  await page.getByRole("button", { name: "Show all details" }).click()
  await expect(page.getByText("Hidden details for VPN Gateway")).toBeVisible()
  await page.waitForTimeout(400)

  const centersAfter = await page
    .locator(".react-flow__node")
    .evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => {
          const bounds = element.getBoundingClientRect()
          return [
            element.getAttribute("data-id"),
            {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2,
            },
          ]
        }),
      ),
    ) as Record<string, { x: number; y: number }>

  await expect(viewport).toHaveAttribute("style", viewportBefore!)
  for (const [nodeId, before] of Object.entries(centersBefore)) {
    const after = centersAfter[nodeId]
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1)
  }
})

test("show all details remains temporary and restores configured fields", async ({
  page,
}) => {
  await seedDiagram(page)
  await enterPresentation(page)

  await expect(page.getByText("Hidden details for VPN Gateway")).toHaveCount(0)
  await canvasNode(page, "a").click()
  await expect(page.getByText("Hidden details for VPN Gateway")).toBeVisible()

  await page.getByRole("button", { name: "Show all details" }).click()
  await expect(
    page.getByText("Hidden details for Application Server"),
  ).toBeVisible()
  await expect(page.getByText("Hidden details for Initial Access")).toBeVisible()

  // Individual clicks do not silently change per-card expansion while the
  // global override is active.
  await canvasNode(page, "b").click({ force: true })
  await page.getByRole("button", { name: "Hide all details" }).click()
  await expect(page.getByText("Hidden details for VPN Gateway")).toBeVisible()
  await expect(
    page.getByText("Hidden details for Application Server"),
  ).toHaveCount(0)
  await expect(page.getByText("Hidden details for Initial Access")).toHaveCount(0)

  await canvasNode(page, "a").click()
  await expect(page.getByText("Hidden details for VPN Gateway")).toHaveCount(0)

  await page.getByRole("button", { name: "Exit presentation" }).click()
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  expect(saved.nodes[0].data.displaySettings.showDescription).toBe(false)
  expect(saved.edges[0].data.displaySettings.showDescription).toBe(false)
})

test("keeps merged multi-action self-connection expansion independent in presentation", async ({
  page,
}) => {
  const baseSelfConnection = makeEdge({
    id: "e-self-actions",
    source: "a",
    target: "a",
    actionType: "Privilege Escalation",
    timestamp: "2026-07-25T08:05:00.000Z",
  })
  const selfConnection = {
    ...baseSelfConnection,
    data: {
      ...baseSelfConnection.data,
      actionTypes: [
        "Privilege Escalation",
        "Credential Access",
      ],
    },
  }

  await seedDiagram(page, {
    ...seed,
    nodes: seed.nodes.slice(0, 1),
    edges: [selfConnection],
  })

  const actionToggle = page.locator(
    '[data-edge-action-visibility-toggle="true"]',
  )
  await actionToggle.click()
  await expect(actionToggle).toHaveAttribute("aria-pressed", "true")

  await enterPresentation(page)
  await expect(actionToggle).toHaveAttribute("aria-pressed", "false")
  await expect(page.locator('[data-edge-action-reveal="true"]')).toHaveCount(0)

  await page.getByRole("button", { name: "Show all details" }).click()
  await expect(actionToggle).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator('[data-edge-action-reveal="true"]')).toBeVisible()
  await expect(
    page.locator('[data-edge-action-row="Privilege Escalation"]'),
  ).toBeVisible()
  await expect(
    page.locator('[data-edge-action-row="Credential Access"]'),
  ).toBeVisible()

  await page.getByRole("button", { name: "Exit presentation" }).click()
  await expect(actionToggle).toHaveAttribute("aria-pressed", "true")
})

test("hides editor chrome, preserves edits, and restores the editor with Escape", async ({
  page,
}) => {
  await seedDiagram(page)

  const firstNode = canvasNode(page, "a")
  await firstNode.click()
  await expect(firstNode).toHaveClass(/selected/)

  const properties = page.getByRole("complementary").filter({
    has: page.getByRole("heading", { name: "Properties" }),
  })
  await properties
    .getByText("Hostname", { exact: true })
    .locator("..")
    .locator("input")
    .fill("vpn-gateway.changed.test")

  const viewport = page.locator(".react-flow__viewport")
  const editorTransform = await viewport.getAttribute("style")
  expect(editorTransform).not.toBeNull()

  await page
    .getByRole("button", { name: "Enter presentation mode" })
    .click()

  const savedOnEntry = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  expect(savedOnEntry.nodes[0].data.hostname).toBe(
    "vpn-gateway.changed.test",
  )

  await expect(
    page.getByRole("heading", { name: "Asset Library" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Properties" }),
  ).toHaveCount(0)
  await expect(page.locator(".react-flow__controls")).toHaveCount(0)
  const handles = firstNode.locator(".react-flow__handle")
  await expect(handles).toHaveCount(2)
  await expect(handles.nth(0)).toHaveCSS("opacity", "0")
  await expect(handles.nth(1)).toHaveCSS("opacity", "0")
  await expect(firstNode).not.toHaveClass(/selected/)

  await expect(page.getByRole("button", { name: "Got it" })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await expect(
    page.getByRole("heading", { name: "Asset Library" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Properties" }),
  ).toBeVisible()
  await expect(firstNode).toHaveClass(/selected/)
  await expect(viewport).toHaveAttribute("style", editorTransform!)
})

test("fades controls without hiding branding and reveals them on pointer movement", async ({
  page,
}) => {
  await seedDiagram(page)
  await enterPresentation(page)

  const branding = page.locator("[data-presentation-branding]")
  const controls = page.locator("[data-presentation-controls]")
  await expect(branding).toBeVisible()
  expect(
    await branding.evaluate(
      (image) => (image as HTMLImageElement).naturalWidth,
    ),
  ).toBeGreaterThan(0)

  await expect(controls).toHaveAttribute("data-controls-visible", "true")
  await page.waitForTimeout(2700)
  await expect(controls).toHaveAttribute("data-controls-visible", "false")
  await expect(
    controls.getByRole("button", {
      name: "Exit presentation",
      includeHidden: true,
    }),
  ).toHaveAttribute("tabindex", "-1")

  await page.mouse.move(400, 300)
  await expect(controls).toHaveAttribute("data-controls-visible", "true")

  const showAllDetails = controls.getByRole("button", {
    name: "Show all details",
  })
  await showAllDetails.focus()
  await page.keyboard.press("ArrowRight")
  await page.waitForTimeout(2700)
  await expect(showAllDetails).toBeFocused()
  await expect(controls).toHaveAttribute("data-controls-visible", "true")

  await page.getByRole("button", { name: "VPN Gateway details" }).focus()
  await page.waitForTimeout(2700)
  await expect(controls).toHaveAttribute("data-controls-visible", "false")
})

test("reveals complete details from partial settings and keeps hidden routes keyboard accessible", async ({
  page,
}) => {
  const partialSeed = {
    ...seed,
    nodes: [
      {
        ...seed.nodes[0],
        data: {
          ...seed.nodes[0].data,
          displaySettings: { showHostname: false },
        },
      },
      seed.nodes[1],
    ],
    edges: [
      {
        ...seed.edges[0],
        target: "b",
        data: {
          ...seed.edges[0].data,
          displaySettings: { showLabel: false },
          mitreAttackId: "T1003",
        },
      },
    ],
  }

  await seedDiagram(page, partialSeed)
  await enterPresentation(page)

  const hiddenRoute = page.getByRole("button", {
    name: "Initial Access details",
  })
  await expect(hiddenRoute).toBeVisible()
  await hiddenRoute.focus()
  await hiddenRoute.press("Enter")

  await expect(
    page.getByText("Hidden details for Initial Access"),
  ).toBeVisible()
  await expect(page.getByText("Initial Access tool")).toBeVisible()

  const mitreLink = hiddenRoute.locator('a[href*="/techniques/T1003"]')
  await expect(mitreLink).toBeVisible()
  await mitreLink.focus()
  await mitreLink.press(" ")
  await expect(hiddenRoute).toHaveAttribute("aria-expanded", "true")
  await expect(
    page.getByText("Hidden details for Initial Access"),
  ).toBeVisible()

  const node = page.getByRole("button", { name: "VPN Gateway details" })
  await node.focus()
  await node.press(" ")
  await expect(page.getByText("Hidden details for VPN Gateway")).toBeVisible()

  await page.getByRole("button", { name: "Exit presentation" }).click()
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("compromise-canvas-autosave-flow") || "{}",
    ),
  )
  expect(saved.nodes[0].data.displaySettings).toEqual({
    showHostname: false,
  })
  expect(saved.edges[0].data.displaySettings).toEqual({
    showLabel: false,
  })
})

test("renders a stable single-step playback without an invalid slider", async ({
  page,
}) => {
  await seedDiagram(page, {
    ...seed,
    nodes: seed.nodes.slice(0, 2),
    edges: seed.edges.slice(0, 1),
  })
  await enterPresentation(page)
  await page.getByRole("button", { name: "Attack playback" }).click()

  const playback = page.locator("[data-presentation-playback-controls]")
  await expect(playback).toContainText("Step 1 of 1")
  await expect(
    playback.locator("[data-presentation-single-step-track]"),
  ).toBeVisible()
  await expect(
    playback.getByRole("slider", { name: "Attack timeline position" }),
  ).toHaveCount(0)
})

test("navigates attack playback with arrow keys without double-handling the slider", async ({
  page,
}) => {
  await seedDiagram(page, {
    ...seed,
    edges: seed.edges.map((edge, index) =>
      index === 2
        ? {
            ...edge,
            data: {
              ...edge.data,
              timestamp: "2026-07-25T08:30:00.000Z",
            },
          }
        : edge,
    ),
  })
  await enterPresentation(page)
  await page.getByRole("button", { name: "Attack playback" }).click()

  const playback = page.locator("[data-presentation-playback-controls]")
  await expect(playback).toContainText("Step 1 of 3")

  await page.keyboard.press("ArrowRight")
  await expect(playback).toContainText("Step 2 of 3")
  await page.keyboard.press("ArrowRight")
  await expect(playback).toContainText("Step 3 of 3")
  await page.keyboard.press("ArrowRight")
  await expect(playback).toContainText("Step 3 of 3")

  await page.keyboard.press("ArrowLeft")
  await expect(playback).toContainText("Step 2 of 3")
  await page.keyboard.press("ArrowLeft")
  await expect(playback).toContainText("Step 1 of 3")

  const slider = playback.locator('[role="slider"]')
  await slider.focus()
  await slider.press("ArrowRight")
  await expect(playback).toContainText("Step 2 of 3")

  await page.getByRole("button", { name: "Close attack playback" }).click()
  await expect(playback).toHaveCount(0)
  await page.keyboard.press("ArrowRight")
  await expect(playback).toHaveCount(0)
})

test("gently follows the current playback route and restores the presentation view", async ({
  page,
}) => {
  await seedDiagram(page)
  await enterPresentation(page)
  await page.waitForTimeout(400)

  const viewport = page.locator(".react-flow__viewport")
  const presentationTransform = await viewport.getAttribute("style")
  const presentationZoom = await viewport.evaluate(
    (element) =>
      new DOMMatrix(getComputedStyle(element).transform).a,
  )
  await page.getByRole("button", { name: "Attack playback" }).click()

  await expect(
    page.getByRole("button", { name: "Focus current attack step" }),
  ).toBeVisible()
  await expect
    .poll(() => viewport.getAttribute("style"))
    .not.toBe(presentationTransform)
  await page.waitForTimeout(500)
  const focusedZoom = await viewport.evaluate(
    (element) =>
      new DOMMatrix(getComputedStyle(element).transform).a,
  )
  expect(focusedZoom).toBeLessThanOrEqual(presentationZoom + 0.26)

  const firstStepTransform = await viewport.getAttribute("style")
  await page.keyboard.press("ArrowRight")
  await expect(
    page.locator("[data-presentation-playback-controls]"),
  ).toContainText("Step 2 of 2")
  await expect
    .poll(() => viewport.getAttribute("style"))
    .not.toBe(firstStepTransform)
  await page.waitForTimeout(500)

  await page.getByRole("button", { name: "Close attack playback" }).click()
  await expect(viewport).toHaveAttribute("style", presentationTransform!)
})
