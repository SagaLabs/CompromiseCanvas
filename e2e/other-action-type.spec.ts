import { test, expect, type Page } from "@playwright/test"

function makeNode(id: string, label: string, x: number, y: number) {
  return {
    id,
    type: "customNode",
    position: { x, y },
    data: {
      label,
      type: "workstation",
      criticality: "Low",
      services: [],
      actions: [],
      displaySettings: {},
      isCompromised: false,
      investigationStatus: "No Status",
    },
  }
}

function makeSnapshot(edgeOverrides: Record<string, unknown> = {}) {
  return {
    version: "1.0",
    nodes: [makeNode("n1", "Alpha", 0, 0), makeNode("n2", "Beta", 600, 0)],
    edges: [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        type: "customEdge",
        data: {
          label: "New Technique",
          actionType: "Lateral Movement",
          toolUsed: "",
          userUsed: "",
          timestamp: "2026-01-01T10:00:00.000Z",
          description: "",
          displaySettings: { showLabel: true, showTimestamp: true },
          ...edgeOverrides,
        },
      },
    ],
    canvasTitle: "Other action type",
    incidentLog: [],
    viewport: { x: 150, y: 300, zoom: 1 },
    timestamp: new Date().toISOString(),
  }
}

async function seedDiagram(page: Page, snapshot = makeSnapshot()) {
  await page.addInitScript((snapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(snapshot))
    localStorage.setItem("compromise-canvas-autosave-timestamp", snapshot.timestamp)
  }, snapshot)
  await page.goto("/")
  await expect(page.locator(".react-flow__node")).toHaveCount(snapshot.nodes.length)
}

const otherTitle = (page: Page) =>
  page.locator('.react-flow__edgelabel-renderer [data-edge-action-type="Other"]')

test("switching to Other from the edge toolbar shows the description", async ({ page }) => {
  await seedDiagram(page, makeSnapshot({ description: "Remote support tool used by the attacker" }))
  await expect(page.getByText("Desc: Remote support tool used by the attacker")).toHaveCount(0)

  await page.locator(".react-flow__edgelabel-renderer").getByText("Lateral Movement").click()
  const trigger = page.getByRole("button", { name: "Change action type" })
  await trigger.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("menuitem", { name: "Other", exact: true }).click()

  await expect(otherTitle(page)).toHaveText("Other")
  await expect(otherTitle(page).locator("svg.lucide-info")).toHaveCount(1)
  await expect(page.getByText("Desc: Remote support tool used by the attacker")).toBeVisible()
})

test("renames an Other box inline and shows the name in the timeline", async ({ page }) => {
  await seedDiagram(page, makeSnapshot({ actionType: "Other" }))

  await otherTitle(page).getByText("Other").dblclick()
  const input = page.getByRole("textbox", { name: "Box name" })
  await expect(input).toBeFocused()
  await input.fill("AnyDesk session")
  await input.press("Enter")

  await expect(otherTitle(page)).toHaveText("AnyDesk session")
  // The name is the title, so it is not repeated as a "Label:" line.
  await expect(page.getByText("Label: AnyDesk session")).toHaveCount(0)

  // Autosave is debounced by five seconds.
  await expect
    .poll(async () => {
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("compromise-canvas-autosave-flow") || "{}"),
      )
      return saved.edges?.[0]?.data?.label
    }, { timeout: 15_000 })
    .toBe("AnyDesk session")

  await page.getByRole("button", { name: "Show attack timeline" }).click()
  await expect(page.getByRole("dialog").getByText("AnyDesk session", { exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)

  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect(otherTitle(page)).toHaveText("Other")
})

test("Escape cancels an inline rename", async ({ page }) => {
  await seedDiagram(page, makeSnapshot({ actionType: "Other", label: "RDP over VPN" }))

  await otherTitle(page).getByText("RDP over VPN").dblclick()
  const input = page.getByRole("textbox", { name: "Box name" })
  await input.fill("Something else")
  await input.press("Escape")

  await expect(otherTitle(page)).toHaveText("RDP over VPN")
})

test("edits the Other name from the properties panel", async ({ page }) => {
  await seedDiagram(page, makeSnapshot({ actionType: "Other" }))

  await otherTitle(page).click()
  const name = page.getByPlaceholder("e.g. AnyDesk session")
  await name.fill("TeamViewer session")
  await expect(otherTitle(page)).toHaveText("TeamViewer session")
})

test("renames an Other box from the edge toolbar", async ({ page }) => {
  await seedDiagram(page, makeSnapshot({ actionType: "Other" }))

  await otherTitle(page).click()
  await page.getByRole("button", { name: "Rename box" }).click()
  const input = page.getByRole("textbox", { name: "Box name" })
  await input.fill("SSH tunnel")
  await input.press("Enter")
  await expect(otherTitle(page)).toHaveText("SSH tunnel")
})

test("does not offer rename for other action types", async ({ page }) => {
  await seedDiagram(page)

  await page.locator(".react-flow__edgelabel-renderer").getByText("Lateral Movement").click()
  await expect(page.getByRole("button", { name: "Change action type" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Rename box" })).toHaveCount(0)
})
