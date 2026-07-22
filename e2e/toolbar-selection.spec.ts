import { test, expect, type Page } from "@playwright/test"

async function seedDiagram(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: /On-Premises Infrastructure/ }).click()
  await page.getByRole("button", { name: "Drag Web Server" }).dragTo(page.locator(".react-flow"), {
    targetPosition: { x: 500, y: 350 },
  })
  await page.locator(".react-flow__node").getByText("Web Server", { exact: true }).waitFor()
}

async function selectNode(page: Page) {
  await page.locator(".react-flow__node").getByText("Web Server", { exact: true }).click()
  await expect(page.getByRole("button", { name: "Mark as compromised" })).toBeVisible()
}

test("node toolbar compromised toggle stays synchronized and is one undo step", async ({ page }) => {
  await seedDiagram(page)
  await selectNode(page)

  await page.getByRole("button", { name: "Mark as compromised" }).click()
  await expect(page.getByRole("switch", { name: "Mark as Compromised" })).toBeChecked()

  await page.keyboard.press("Control+z")
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await expect(page.getByRole("switch", { name: "Mark as Compromised" })).not.toBeChecked()
})

test("investigation quick action stays synchronized and is one undo step", async ({ page }) => {
  await seedDiagram(page)
  await selectNode(page)

  await page.getByLabel("Set investigation status").click()
  await page.getByRole("menuitem", { name: "Done" }).click()
  const investigationSelect = page.getByText("Investigation Status", { exact: true }).locator("..").getByRole("combobox")
  await expect(investigationSelect).toHaveText("Done")

  await page.keyboard.press("Control+z")
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await expect(investigationSelect).toHaveText("No Status")
})

test("copy after a toolbar edit uses the live node data", async ({ page }) => {
  await seedDiagram(page)
  await selectNode(page)

  await page.getByRole("button", { name: "Mark as compromised" }).click()
  await page.getByRole("button", { name: "Copy" }).click()
  await page.keyboard.press("Control+z")
  await page.getByRole("button", { name: "Paste" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(2)

  await page.getByRole("button", { name: "Save to browser storage" }).click()
  const compromisedStates = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
    return saved.nodes.map((node: { data: { isCompromised?: boolean } }) => Boolean(node.data.isCompromised))
  })
  expect(compromisedStates.sort()).toEqual([false, true])
})

test("web manifest is linked and its icon URLs resolve", async ({ page, request }) => {
  await page.goto("/")
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/favicons/site.webmanifest")

  const manifestResponse = await request.get("/favicons/site.webmanifest")
  expect(manifestResponse.ok()).toBeTruthy()
  const manifest = await manifestResponse.json()
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([
    "/favicons/android-chrome-192x192.png",
    "/favicons/android-chrome-512x512.png",
  ])

  for (const icon of manifest.icons) {
    const response = await request.get(icon.src)
    expect(response.status()).toBe(200)
  }
})
