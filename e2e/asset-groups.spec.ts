import { test, expect, type Locator, type Page } from "@playwright/test"

const displaySettings = {}

function makeAsset(id: string, label: string, x: number, y: number) {
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

function makeGroup(id: string, x: number, y: number) {
  return {
    id,
    type: "labeledGroupNode",
    position: { x, y },
    width: 600,
    height: 400,
    data: {
      label: "Server subnet",
      type: "group",
      color: "blue",
      transparency: 0.2,
      criticality: "Low",
      services: [],
      actions: [],
      displaySettings,
      isCompromised: false,
      investigationStatus: "No Status",
    },
  }
}

const groupId = "group-1"
const firstAssetId = "asset-1"
const secondAssetId = "asset-2"

const seed = {
  version: "1.0",
  nodes: [
    makeGroup(groupId, 300, 100),
    makeAsset(firstAssetId, "Web server", 0, 0),
    makeAsset(secondAssetId, "Database", 600, 0),
  ],
  edges: [],
  canvasTitle: "Asset group connections",
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
  await page.addInitScript((savedSnapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(savedSnapshot))
    localStorage.setItem("compromise-canvas-autosave-timestamp", savedSnapshot.timestamp)
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

async function dragConnection(page: Page, source: Locator, target: Locator) {
  const from = await handleCenter(source)
  const to = await handleCenter(target)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

test("keeps asset groups behind routes without offering connection points", async ({ page }) => {
  await seedDiagram(page)

  const group = page.locator(`.react-flow__node[data-id="${groupId}"]`)
  const groupHandles = group.locator(".react-flow__handle")

  await expect(group).toHaveCSS("z-index", "-10")
  await expect(groupHandles).toHaveCount(4)
  await expect(groupHandles.first()).not.toHaveClass(/(?:^|\s)connectable(?:\s|$)/)
  await expect(groupHandles.first()).toHaveCSS("pointer-events", "none")
  await expect(groupHandles.first()).toHaveCSS("opacity", "0")
})

test("does not create a new route to an asset group", async ({ page }) => {
  await seedDiagram(page)

  const assetSource = page.locator(
    `.react-flow__node[data-id="${firstAssetId}"] .react-flow__handle.source`,
  )
  const groupTarget = page.locator(
    `.react-flow__node[data-id="${groupId}"] .react-flow__handle.target`,
  ).first()

  await dragConnection(page, assetSource, groupTarget)
  await expect(page.locator(".react-flow__edge")).toHaveCount(0)
})

test("still creates routes directly between assets", async ({ page }) => {
  await seedDiagram(page, {
    ...seed,
    nodes: seed.nodes.filter((node) => node.type === "customNode"),
  })

  const source = page.locator(
    `.react-flow__node[data-id="${firstAssetId}"] .react-flow__handle.source`,
  )
  const target = page.locator(
    `.react-flow__node[data-id="${secondAssetId}"] .react-flow__handle.target`,
  )

  await dragConnection(page, source, target)
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
})

test("still renders a route to a group from an older saved canvas", async ({ page }) => {
  await seedDiagram(page, {
    ...seed,
    edges: [
      {
        id: "legacy-group-route",
        source: groupId,
        target: firstAssetId,
        type: "customEdge",
        data: {
          actionType: "Lateral Movement",
          toolUsed: "",
          userUsed: "",
          timestamp: "",
          description: "",
          displaySettings,
        },
      },
    ],
  })

  await expect(page.locator('.react-flow__edge[data-id="legacy-group-route"]')).toHaveCount(1)
})
