import { test, expect, type Page } from "@playwright/test"
import {
  getMitreTechniqueUrl,
  normalizeMitreTechniqueReferences,
  searchMitreTechniques,
} from "../lib/mitre-attack"

const displaySettings = { showLabel: true, showMitreId: true }

function makeSeed(mitreAttackId = "T1552", mitreAttackName = "Unsecured Credentials") {
  return {
    version: "1.0",
    nodes: [
      { id: "n1", type: "customNode", position: { x: 0, y: 0 }, data: { label: "Alpha", type: "web-server", criticality: "Low", services: [], actions: [], displaySettings: {}, isCompromised: false, investigationStatus: "No Status" } },
      { id: "n2", type: "customNode", position: { x: 600, y: 40 }, data: { label: "Beta", type: "web-server", criticality: "Low", services: [], actions: [], displaySettings: {}, isCompromised: false, investigationStatus: "No Status" } },
    ],
    edges: [{
      id: "e1",
      source: "n1",
      target: "n2",
      type: "customEdge",
      data: {
        actionType: "Credential Access",
        toolUsed: "",
        userUsed: "",
        timestamp: "2025-01-01T12:00:00.000Z",
        mitreAttackId,
        mitreAttackName,
        description: "",
        displaySettings,
      },
    }],
    canvasTitle: "MITRE Test",
    incidentLog: [],
    viewport: { x: 100, y: 200, zoom: 1 },
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
  await page.locator(".react-flow__edge").first().waitFor()
}

async function selectEdge(page: Page) {
  await page.getByRole("button", { name: "Open Timeline" }).click()
  await page.getByRole("button").filter({ hasText: "Alpha" }).filter({ hasText: "Beta" }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByText("MITRE ATT&CK ID", { exact: true })).toBeVisible()
}

test("searches the real catalog by ID, name, and tactic and normalizes legacy data", () => {
  expect(searchMitreTechniques("T1552").some((technique) => technique.id === "T1552")).toBeTruthy()
  expect(searchMitreTechniques("unsecured credentials").some((technique) => technique.id === "T1552")).toBeTruthy()
  expect(searchMitreTechniques("credential-access").some((technique) => technique.id === "T1552")).toBeTruthy()
  expect(normalizeMitreTechniqueReferences(undefined, "T1552", "Unsecured Credentials")).toEqual([
    { id: "T1552", name: "Unsecured Credentials" },
  ])
  expect(getMitreTechniqueUrl("legacy-invalid-id")).toBeUndefined()
})

test("adds, removes, links, and persists multiple techniques from legacy edge data", async ({ page }) => {
  await seedDiagram(page)
  await selectEdge(page)

  await expect(page.getByRole("complementary").getByRole("link", { name: /Open T1552/ })).toHaveAttribute(
    "href",
    "https://attack.mitre.org/techniques/T1552",
  )
  await page.getByRole("complementary").getByRole("combobox").filter({ hasText: "Add technique" }).click()
  await page.getByPlaceholder("Search techniques…").fill("T1059")
  await page.getByRole("option").filter({ hasText: "T1059" }).filter({ hasText: "Command and Scripting Interpreter" }).first().click()
  await expect(page.getByRole("button", { name: "T1059 — Command and Scripting Interpreter", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  let savedTechniques = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
    return saved.edges[0].data.mitreAttackTechniques
  })
  expect(savedTechniques.map((technique: { id: string }) => technique.id)).toEqual(["T1552", "T1059"])

  await page.getByRole("button", { name: /Remove T1552/ }).click()
  await page.getByRole("button", { name: "Save to browser storage" }).click()
  savedTechniques = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
    return saved.edges[0].data
  })
  expect(savedTechniques).toMatchObject({
    mitreAttackId: "T1059",
    mitreAttackName: "Command and Scripting Interpreter",
    mitreAttackTechniques: [{ id: "T1059", name: "Command and Scripting Interpreter" }],
  })
})

test("renders an invalid legacy technique as plain text without a broken link", async ({ page }) => {
  await seedDiagram(page, makeSeed("LEGACY-ID", "Legacy technique"))

  const edgeLabel = page.locator(".react-flow__edgelabel-renderer").filter({ hasText: "LEGACY-ID — Legacy technique" })
  await expect(edgeLabel).toBeVisible()
  await expect(edgeLabel.getByRole("link", { name: /LEGACY-ID/ })).toHaveCount(0)

  await page.getByRole("button", { name: "Open Timeline" }).click()
  const timelineEntry = page.getByRole("button").filter({ hasText: "Alpha" }).filter({ hasText: "Beta" })
  await expect(timelineEntry.getByText(/LEGACY-ID — Legacy technique/)).toBeVisible()
  await expect(timelineEntry.getByRole("link", { name: /LEGACY-ID/ })).toHaveCount(0)
})
