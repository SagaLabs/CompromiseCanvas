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
  viewport: { x: 100, y: 200, zoom: 1 },
  timestamp: new Date().toISOString(),
}

async function seedDiagram(page: Page) {
  await page.addInitScript((snapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(snapshot))
    localStorage.setItem("compromise-canvas-autosave-timestamp", snapshot.timestamp)
  }, seed)
  await page.goto("/")
  await expect(page.locator(".react-flow__node")).toHaveCount(2)
}

async function handleCenter(handle: Locator) {
  const box = await handle.boundingBox()
  expect(box).not.toBeNull()
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  }
}

test("rejects a connection back to the same asset", async ({ page }) => {
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
  await expect(target).not.toHaveClass(/valid/)

  await page.mouse.up()
  await expect(page.locator(".react-flow__edge")).toHaveCount(0)
})

test("still allows a connection between different assets", async ({ page }) => {
  await seedDiagram(page)
  const source = page.locator('.react-flow__node[data-id="n1"] .react-flow__handle.source')
  const target = page.locator('.react-flow__node[data-id="n2"] .react-flow__handle.target')
  const from = await handleCenter(source)
  const to = await handleCenter(target)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })

  await expect(target).toHaveClass(/connectingto/)
  await expect(target).toHaveClass(/valid/)

  await page.mouse.up()
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
})
