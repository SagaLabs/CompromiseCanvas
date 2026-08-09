import { expect, test, type Locator, type Page } from "@playwright/test"

const themes = [
  "dark",
  "nord",
  "sagalabs",
  "gruvbox",
  "catppuccin",
  "solarized",
  "monokai",
  "dracula",
] as const

const statuses = [
  {
    id: "compromised",
    label: "Compromised and investigating",
    x: 260,
    isCompromised: true,
    investigationStatus: "Investigating",
    className: "ip-node-status-compromised",
  },
  {
    id: "investigating",
    label: "Investigating",
    x: 520,
    isCompromised: false,
    investigationStatus: "Investigating",
    className: "ip-node-status-investigating",
  },
  {
    id: "done",
    label: "Done",
    x: 780,
    isCompromised: false,
    investigationStatus: "Done",
    className: "ip-node-status-done",
  },
  {
    id: "not-investigated",
    label: "Not investigated",
    x: 1040,
    isCompromised: false,
    investigationStatus: "Not Investigated",
    className: "ip-node-status-not-investigated",
  },
] as const

function makeNode(
  id: string,
  label: string,
  x: number,
  isCompromised = false,
  investigationStatus = "No Status",
) {
  return {
    id,
    type: "customNode",
    position: { x, y: 200 },
    data: {
      label,
      type: "web-server",
      criticality: "Low",
      services: [],
      actions: [],
      displaySettings: {},
      isCompromised,
      investigationStatus,
    },
  }
}

const seed = {
  version: "1.0",
  nodes: [
    makeNode("source", "Route source", 0),
    ...statuses.map((status) =>
      makeNode(
        status.id,
        status.label,
        status.x,
        status.isCompromised,
        status.investigationStatus,
      ),
    ),
    makeNode("target", "Route target", 1300),
  ],
  edges: [
    {
      id: "unrelated-route",
      source: "source",
      target: "target",
      type: "customEdge",
      data: {
        actionType: "Lateral Movement",
        toolUsed: "",
        userUsed: "",
        timestamp: "",
        description: "",
        displaySettings: {},
      },
    },
  ],
  canvasTitle: "Status card opacity test",
  incidentLog: [],
  viewport: { x: 80, y: 240, zoom: 0.7 },
  timestamp: "2026-08-09T12:00:00.000Z",
}

async function seedDiagram(page: Page) {
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
  }, seed)
  await page.goto("/")
  await expect(page.locator(".react-flow__node")).toHaveCount(seed.nodes.length)
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
}

const card = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"] > div`)

async function backgroundAlpha(element: Locator) {
  return element.evaluate((card) => {
    const color = getComputedStyle(card).backgroundColor
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error("Canvas 2D context is unavailable")

    canvas.width = 1
    canvas.height = 1
    context.fillStyle = "rgba(0, 0, 0, 0)"
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)

    return { color, alpha: context.getImageData(0, 0, 1, 1).data[3] }
  })
}

test("status cards remain opaque above an unrelated crossing route", async ({
  page,
}) => {
  await seedDiagram(page)

  const routeCrossesCards = await page.evaluate((statusIds) => {
    const path = document.querySelector<SVGPathElement>(
      '.react-flow__edge[data-id="unrelated-route"] .react-flow__edge-path',
    )
    const matrix = path?.getScreenCTM()
    if (!path || !matrix) throw new Error("Unable to measure the test route")

    const length = path.getTotalLength()
    return Object.fromEntries(
      statusIds.map((id) => {
        const card = document.querySelector<HTMLElement>(
          `.react-flow__node[data-id="${id}"] > div`,
        )
        if (!card) throw new Error(`Unable to measure status card: ${id}`)

        const bounds = card.getBoundingClientRect()
        const inset = 8
        let crosses = false
        for (let offset = 0; offset <= length; offset += 2) {
          const pathPoint = path.getPointAtLength(offset)
          const point = new DOMPoint(pathPoint.x, pathPoint.y).matrixTransform(
            matrix,
          )
          if (
            point.x > bounds.left + inset &&
            point.x < bounds.right - inset &&
            point.y > bounds.top + inset &&
            point.y < bounds.bottom - inset
          ) {
            crosses = true
            break
          }
        }
        return [id, crosses]
      }),
    )
  }, statuses.map(({ id }) => id))

  for (const status of statuses) {
    expect(
      routeCrossesCards[status.id],
      `the unrelated route should cross the ${status.label} card`,
    ).toBe(true)
  }

  for (const theme of themes) {
    await page.evaluate((selectedTheme) => {
      localStorage.setItem("theme", selectedTheme)
      document.documentElement.dataset.theme = selectedTheme
    }, theme)
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme)

    for (const status of statuses) {
      const background = await backgroundAlpha(card(page, status.id))
      expect(
        background.alpha,
        `${status.label} background should be opaque in ${theme} (received ${background.color})`,
      ).toBe(255)
    }
  }

  for (const status of statuses) {
    await expect(card(page, status.id)).toHaveClass(
      new RegExp(`(?:^|\\s)${status.className}(?:\\s|$)`),
    )
  }

  // A compromised card keeps the compromised treatment even if it also has
  // an investigation status.
  await expect(card(page, "compromised")).not.toHaveClass(
    /(?:^|\s)ip-node-status-investigating(?:\s|$)/,
  )
})
