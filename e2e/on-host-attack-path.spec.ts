import { test, expect, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"

const actions = [
  {
    id: "a1",
    type: "Initial Access",
    technique: "Malicious File via invoice.pdf.exe",
    details: "C:\\Users\\dave\\Downloads\\invoice.pdf.exe",
    timestamp: "2026-08-08T17:27:49.000Z",
    mitreAttackId: "T1204.002",
    mitreAttackName: "Malicious File",
  },
  {
    id: "a2",
    type: "Defense Evasion",
    technique: "Disable or Modify Tools via powershell.exe",
    details: "powershell -c Add-MpPreference -ExclusionPath C:\\ProgramData",
    timestamp: "2026-08-08T17:30:11.000Z",
    mitreAttackId: "T1562.001",
    mitreAttackName: "Disable or Modify Tools",
  },
  {
    id: "a3",
    type: "Impact",
    technique: "Inhibit System Recovery via cmd.exe",
    details: "vssadmin delete shadows /all /quiet",
    timestamp: "2026-08-08T17:31:32.000Z",
    mitreAttackId: "T1490",
    mitreAttackName: "Inhibit System Recovery",
  },
]

function makeSeed(withPath = true) {
  return {
    version: "1.0",
    nodes: [
      {
        id: "host-secdis",
        type: "customNode",
        position: { x: 120, y: 120 },
        data: {
          label: "secdis",
          type: "workstation",
          hostname: "",
          ipAddress: "",
          os: "Windows",
          criticality: "Critical",
          services: [],
          actions,
          actionMode: withPath ? "ordered-path" : "list",
          description: "3 on-host steps",
          isCompromised: true,
          investigationStatus: "Investigating",
          displaySettings: { showActions: true, showOs: true },
        },
      },
      {
        id: "bystander",
        type: "customNode",
        position: { x: 700, y: 120 },
        data: {
          label: "fileserver",
          type: "server",
          criticality: "Low",
          services: [],
          actions: [],
          displaySettings: {},
          isCompromised: false,
          investigationStatus: "No Status",
        },
      },
    ],
    edges: [],
    canvasTitle: "On-host path test",
    incidentLog: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    timestamp: new Date().toISOString(),
  }
}

async function seedDiagram(page: Page, seed = makeSeed()) {
  await page.addInitScript((snapshot) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem("compromise-canvas-autosave-flow", JSON.stringify(snapshot))
    localStorage.setItem("compromise-canvas-autosave-timestamp", snapshot.timestamp)
  }, seed)
  await page.goto("/")
  await page.locator(".react-flow__node").first().waitFor()
}

function hostNode(page: Page) {
  return page.locator(".react-flow__node").filter({ hasText: "secdis" }).first()
}

test("collapses the ordered asset path to a step ribbon on the node", async ({ page }) => {
  await seedDiagram(page)
  const node = hostNode(page)
  await expect(node).toContainText("Asset path")
  await expect(node).toContainText("(3 steps)")
  // first and last tactic summarise the chain
  await expect(node).toContainText("Initial Access → Impact")
  // the node must not inline every step's detail — that is what the drill-down is for
  await expect(node).not.toContainText("vssadmin delete shadows")
})

test("renders the plain action list when ordered path mode is off", async ({ page }) => {
  await seedDiagram(page, makeSeed(false))
  const node = hostNode(page)
  await expect(node).toContainText("Actions:")
  await expect(node).not.toContainText("Asset path")
  await node.click()
  await expect(page.getByRole("button", { name: "Add Action" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sort by time" })).toHaveCount(0)
  await node.dblclick()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("hydrates the PR's legacy showActionPath flag into ordered mode", async ({ page }) => {
  const seed = makeSeed(false)
  const host = seed.nodes[0]
  delete host.data.actionMode
  ;(host.data.displaySettings as Record<string, unknown>).showActionPath = true
  await seedDiagram(page, seed)

  await expect(hostNode(page)).toContainText("Asset path")
  await hostNode(page).click()
  await expect(page.getByRole("switch", { name: "Ordered Attack Path" })).toBeChecked()
})

test("toggles a node between the action list and ordered path", async ({ page }) => {
  await seedDiagram(page, makeSeed(false))
  const node = hostNode(page)
  await node.click()

  const pathToggle = page.getByRole("switch", { name: "Ordered Attack Path" })
  await expect(pathToggle).not.toBeChecked()
  await pathToggle.click()

  await expect(pathToggle).toBeChecked()
  await expect(node).toContainText("Asset path")
  await expect(node).not.toContainText("Actions:")

  await pathToggle.click()

  await expect(pathToggle).not.toBeChecked()
  await expect(node).toContainText("Actions:")
  await expect(node).not.toContainText("Asset path")
})

test("drills into an asset path on double-click, in order", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await seedDiagram(page)
  await hostNode(page).dblclick()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText("asset attack path")
  await expect(dialog).toContainText("3 steps")

  const steps = dialog.getByTestId("asset-path-step")
  await expect(steps).toHaveCount(3)
  await expect(steps.nth(0)).toContainText("Initial Access")
  await expect(steps.nth(0)).toContainText("T1204.002")
  await expect(steps.nth(1)).toContainText("Defense Evasion")
  await expect(steps.nth(2)).toContainText("Inhibit System Recovery")
  // details belong here, not on the canvas node
  await expect(steps.nth(2)).toContainText("vssadmin delete shadows")
  await expect(dialog.getByRole("button", { name: "Expand evidence" })).toHaveCount(3)

  const finalEvidence = steps.nth(2).locator("pre")
  await expect(finalEvidence).toHaveClass(/line-clamp-3/)
  await steps.nth(2).getByRole("button", { name: "Expand evidence" }).click()
  await expect(finalEvidence).not.toHaveClass(/line-clamp-3/)
  await steps.nth(2).getByRole("button", { name: "Copy evidence" }).click()
  await expect(steps.nth(2).getByRole("button", { name: "Copied" })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "vssadmin delete shadows",
  )

  // steps are laid out top-to-bottom in chain order
  const first = await steps.nth(0).boundingBox()
  const last = await steps.nth(2).boundingBox()
  expect(first!.y).toBeLessThan(last!.y)
})

test("does not open a path when an asset has no steps", async ({ page }) => {
  await seedDiagram(page)
  await page.locator(".react-flow__node").filter({ hasText: "fileserver" }).first().dblclick()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("closes the drill-down and leaves the canvas untouched", async ({ page }) => {
  await seedDiagram(page)
  await hostNode(page).dblclick()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(hostNode(page)).toContainText("Asset path")
})

test("reorders steps from the properties panel", async ({ page }) => {
  await seedDiagram(page)
  await hostNode(page).click()
  await expect(page.getByText("Step 1", { exact: true })).toBeVisible()

  // step 3 (Impact) becomes step 2
  await page.getByRole("button", { name: "Move step 3 earlier" }).click()

  await hostNode(page).dblclick()
  const steps = page.getByRole("dialog").getByTestId("asset-path-step")
  await expect(steps.nth(1)).toContainText("Impact")
  await expect(steps.nth(2)).toContainText("Defense Evasion")
})

test("sorts steps by timestamp on request", async ({ page }) => {
  await seedDiagram(page)
  await hostNode(page).click()

  // scramble, then sort back
  await page.getByRole("button", { name: "Move step 3 earlier" }).click()
  await page.getByRole("button", { name: "Move step 2 earlier" }).click()
  await page.getByRole("button", { name: "Sort by time" }).click()

  await hostNode(page).dblclick()
  const steps = page.getByRole("dialog").getByTestId("asset-path-step")
  await expect(steps.nth(0)).toContainText("Initial Access")
  await expect(steps.nth(1)).toContainText("Defense Evasion")
  await expect(steps.nth(2)).toContainText("Impact")
})

test("does not drill down in presentation mode", async ({ page }) => {
  await seedDiagram(page)
  await page.getByRole("button", { name: "Enter presentation mode" }).click()
  await expect(page.getByRole("button", { name: "Got it" })).toHaveCount(0)

  await hostNode(page).dblclick()
  // presentation clicks drive playback; the drill-down must stay out of the way
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("includes timestamped ordered steps in the attack timeline", async ({ page }) => {
  await seedDiagram(page)
  await page.getByRole("button", { name: "Open Timeline" }).click()

  const timeline = page.getByRole("dialog")
  await expect(timeline).toContainText("3 of 3 events")
  await expect(timeline).toContainText("Asset step 1")
  await expect(timeline).toContainText("Malicious File")
  await expect(timeline).toContainText("vssadmin delete shadows")
})

test("keeps independent action notes out of the ordered timeline", async ({ page }) => {
  await seedDiagram(page, makeSeed(false))
  await page.getByRole("button", { name: "Open Timeline" }).click()

  const timeline = page.getByRole("dialog")
  await expect(timeline).toContainText("No events yet")
  await expect(timeline).not.toContainText("Asset step 1")
})

test("includes ordered asset steps and evidence in the PDF report", async ({ page }) => {
  await seedDiagram(page)

  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Create report" }).click()
  const path = await (await download).path()
  const pdf = await readFile(path!)
  const pdfSource = pdf.toString("latin1")

  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
  expect(pdfSource).toContain("Asset Attack Paths")
  expect(pdfSource).toContain("vssadmin delete shadows")
})

test("round-trips step timestamps and MITRE ids through export", async ({ page }) => {
  await seedDiagram(page)

  await page.getByRole("button", { name: "Export", exact: true }).click()
  const download = page.waitForEvent("download")
  await page.getByRole("menuitem", { name: "Export JSON" }).click()
  const path = await (await download).path()
  const exported = JSON.parse(await readFile(path!, "utf8"))

  const host = exported.diagram.nodes.find((n: any) => n.id === "host-secdis")
  expect(host.data.actionMode).toBe("ordered-path")
  expect(host.data.actions).toHaveLength(3)
  expect(host.data.actions.map((a: any) => a.type)).toEqual([
    "Initial Access",
    "Defense Evasion",
    "Impact",
  ])
  expect(host.data.actions[0].timestamp).toBe("2026-08-08T17:27:49.000Z")
  expect(host.data.actions[0].mitreAttackId).toBe("T1204.002")
  expect(host.data.actions[0].mitreAttackName).toBe("Malicious File")
  expect(host.data.actions[2].details).toContain("vssadmin delete shadows")
})
