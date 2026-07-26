import { expect, test, type Page } from "@playwright/test"

import { EDGE_ACTION_TYPES, type EdgeActionType } from "../lib/types"

const displaySettings = {}

function makeSelfConnection(actionTypes: EdgeActionType[]) {
  return {
    id: "e-toolbar-actions",
    source: "n1",
    target: "n1",
    type: "customEdge",
    data: {
      actionType: actionTypes[0],
      actionTypes,
      toolUsed: "",
      userUsed: "",
      timestamp: "",
      description: "",
      displaySettings,
    },
  }
}

async function seedDiagram(
  page: Page,
  actionTypes: EdgeActionType[],
  viewport = { x: 300, y: 280, zoom: 1 },
) {
  const snapshot = {
    version: "1.0",
    nodes: [
      {
        id: "n1",
        type: "customNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Alpha",
          type: "web-server",
          criticality: "Low",
          services: [],
          actions: [],
          displaySettings,
          isCompromised: false,
          investigationStatus: "No Status",
        },
      },
    ],
    edges: [makeSelfConnection(actionTypes)],
    canvasTitle: "Toolbar action menu",
    incidentLog: [],
    viewport,
    timestamp: new Date().toISOString(),
  }

  await page.addInitScript((diagram) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem(
      "compromise-canvas-autosave-flow",
      JSON.stringify(diagram),
    )
    localStorage.setItem(
      "compromise-canvas-autosave-timestamp",
      diagram.timestamp,
    )
  }, snapshot)

  await page.goto("/")
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
  await page.locator('[data-edge-action-summary="true"]').click()
  await expect(
    page.getByRole("button", { name: "Change action type" }),
  ).toBeVisible()
}

async function openActionMenuWithKeyboard(page: Page) {
  const trigger = page.getByRole("button", { name: "Change action type" })
  await trigger.focus()
  await page.keyboard.press("Enter")

  const menu = page.getByRole("menu")
  await expect(menu).toBeVisible()
  return menu
}

test("edits and removes self-connection actions from the toolbar by keyboard", async ({
  page,
}) => {
  await seedDiagram(page, [
    "Privilege Escalation",
    "Vulnerability Exploitation",
  ])

  await openActionMenuWithKeyboard(page)
  await expect(
    page.getByRole("menuitem", { name: "Change Privilege Escalation" }),
  ).toBeFocused()

  await page.keyboard.press("ArrowRight")
  await expect(
    page.getByRole("menuitem", { name: "Initial Access", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Enter")

  await expect(
    page.locator('[data-edge-action-summary-icon="Initial Access"]'),
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-edge-action-summary-icon="Privilege Escalation"]',
    ),
  ).toHaveCount(0)

  await openActionMenuWithKeyboard(page)
  await expect(
    page.getByRole("menuitem", { name: "Change Initial Access" }),
  ).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(
    page.getByRole("menuitem", { name: "Remove Initial Access" }),
  ).toBeFocused()
  await page.keyboard.press("Enter")

  await expect(
    page.locator('[data-edge-action-summary-icon="Initial Access"]'),
  ).toHaveCount(0)
  await expect(
    page.locator(
      '[data-edge-action-type="Vulnerability Exploitation"]',
    ),
  ).toBeVisible()
  await expect(page.getByRole("menu")).toHaveCount(0)

  await openActionMenuWithKeyboard(page)
  await expect(
    page.getByRole("menuitem", {
      name: "Change Vulnerability Exploitation",
    }),
  ).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(
    page.getByRole("menuitem", {
      name: "Remove Vulnerability Exploitation and delete self-connection",
    }),
  ).toBeFocused()
  await page.keyboard.press("Enter")

  await expect(page.locator(".react-flow__edge")).toHaveCount(0)
})

test("keeps a full action menu inside the viewport and scrolls to keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 360 })
  await seedDiagram(page, EDGE_ACTION_TYPES)

  const menu = await openActionMenuWithKeyboard(page)
  const menuBox = await menu.boundingBox()
  const viewport = page.viewportSize()
  expect(menuBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(menuBox!.x).toBeGreaterThanOrEqual(7)
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(
    viewport!.width - 7,
  )
  expect(menuBox!.y).toBeGreaterThanOrEqual(7)
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(
    viewport!.height - 7,
  )

  const overflow = await menu.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight)

  const expectedMainMenuLabels = EDGE_ACTION_TYPES.flatMap(
    (actionType) => [
      `Change ${actionType}`,
      `Remove ${actionType}`,
    ],
  )

  for (const [index, label] of expectedMainMenuLabels.entries()) {
    await expect(
      page.getByRole("menuitem", { name: label, exact: true }),
    ).toBeFocused()
    if (index < expectedMainMenuLabels.length - 1) {
      await page.keyboard.press("ArrowDown")
    }
  }

  expect(await menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect(
    page.getByRole("menuitem", { name: "Remove Other" }),
  ).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(menu).toHaveCount(0)

  const updatedMenu = await openActionMenuWithKeyboard(page)
  await expect(
    page.getByRole("menuitem", { name: "Remove Other" }),
  ).toHaveCount(0)
  await expect(
    updatedMenu.getByRole("menuitem", { name: /^Remove / }),
  ).toHaveCount(EDGE_ACTION_TYPES.length - 1)
})
