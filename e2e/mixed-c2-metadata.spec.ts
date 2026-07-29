import { expect, test, type Page } from "@playwright/test"
import type { EdgeActionType } from "../lib/types"

const displaySettings = {}

const node = {
  id: "n1",
  type: "customNode",
  position: { x: 0, y: 0 },
  data: {
    label: "VPN Gateway",
    type: "vpn-gateway",
    criticality: "Critical",
    services: [],
    actions: [],
    displaySettings,
    isCompromised: true,
    investigationStatus: "Investigating",
  },
}

function makeSnapshot(actionTypes: EdgeActionType[]) {
  const timestamp = new Date().toISOString()

  return {
    version: "1.0",
    nodes: [node],
    edges: [
      {
        id: "e-self",
        source: "n1",
        target: "n1",
        type: "customEdge",
        data: {
          actionType: actionTypes[0],
          actionTypes: actionTypes.length > 1 ? actionTypes : undefined,
          toolUsed: "",
          userUsed: "",
          timestamp: "",
          description: "",
          c2Channel: "",
          c2Framework: "",
          displaySettings,
        },
      },
    ],
    canvasTitle: "Mixed C2 metadata",
    incidentLog: [],
    viewport: { x: 600, y: 500, zoom: 1 },
    timestamp,
  }
}

async function seedSelfConnection(
  page: Page,
  actionTypes: EdgeActionType[],
) {
  const snapshot = makeSnapshot(actionTypes)
  await page.addInitScript((savedSnapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem(
      "compromise-canvas-autosave-flow",
      JSON.stringify(savedSnapshot),
    )
    localStorage.setItem(
      "compromise-canvas-autosave-timestamp",
      savedSnapshot.timestamp,
    )
  }, snapshot)

  await page.goto("/")
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)

  const card =
    actionTypes.length > 1
      ? page.locator('[data-self-connection-action-bundle-card="true"]')
      : page.locator(`[data-edge-action-type="${actionTypes[0]}"]`)
  await card.click()
  await expect(page.getByText("Action Types", { exact: true })).toBeVisible()
}

async function expectToolAndUserFields(page: Page, visible: boolean) {
  const toolField = page.getByPlaceholder("e.g., Mimikatz, PSEXEC")
  const userField = page.locator('input[placeholder*="Administrator"]')
  const toolToggle = page.getByText("Show Tool", { exact: true })
  const userToggle = page.getByText("Show User", { exact: true })

  if (visible) {
    await expect(toolField).toBeVisible()
    await expect(userField).toBeVisible()
    await expect(toolToggle).toBeVisible()
    await expect(userToggle).toBeVisible()
  } else {
    await expect(toolField).toHaveCount(0)
    await expect(userField).toHaveCount(0)
    await expect(toolToggle).toHaveCount(0)
    await expect(userToggle).toHaveCount(0)
  }
}

async function expectC2Fields(page: Page, visible: boolean) {
  const channelToggle = page.getByText("Show C2 Channel", { exact: true })
  const frameworkToggle = page.getByText("Show C2 Framework", {
    exact: true,
  })

  if (visible) {
    await expect(page.getByText("C2 Channel", { exact: true })).toBeVisible()
    await expect(page.getByText("C2 Framework", { exact: true })).toBeVisible()
    await expect(channelToggle).toBeVisible()
    await expect(frameworkToggle).toBeVisible()
  } else {
    await expect(page.getByText("C2 Channel", { exact: true })).toHaveCount(0)
    await expect(page.getByText("C2 Framework", { exact: true })).toHaveCount(0)
    await expect(channelToggle).toHaveCount(0)
    await expect(frameworkToggle).toHaveCount(0)
  }
}

test("shows C2 and non-C2 metadata for a mixed self-connection", async ({
  page,
}) => {
  await seedSelfConnection(page, ["Command & Control", "Lateral Movement"])

  await expectC2Fields(page, true)
  await expectToolAndUserFields(page, true)

  await page.getByPlaceholder("e.g., Mimikatz, PSEXEC").fill("Remote service")
  await page.locator('input[placeholder*="Administrator"]').fill("KVS\\svc-vpn")

  await page
    .getByText("C2 Channel", { exact: true })
    .locator("..")
    .getByRole("combobox")
    .click()
  await page.getByRole("option", { name: "DNS", exact: true }).click()

  await page
    .getByText("C2 Framework", { exact: true })
    .locator("..")
    .getByRole("combobox")
    .click()
  await page.getByRole("option", { name: "Sliver", exact: true }).click()

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const savedEdgeData = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
        .edges[0].data,
  )
  expect(savedEdgeData).toMatchObject({
    toolUsed: "Remote service",
    userUsed: "KVS\\svc-vpn",
    c2Channel: "DNS",
    c2Framework: "Sliver",
  })
})

test("keeps pure C2 self-connections limited to C2 metadata", async ({
  page,
}) => {
  await seedSelfConnection(page, ["Command & Control"])

  await expectC2Fields(page, true)
  await expectToolAndUserFields(page, false)
})

test("keeps pure non-C2 self-connections limited to tool and user metadata", async ({
  page,
}) => {
  await seedSelfConnection(page, ["Lateral Movement"])

  await expectC2Fields(page, false)
  await expectToolAndUserFields(page, true)
})
