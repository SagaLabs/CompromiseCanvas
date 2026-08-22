import { expect, test } from "@playwright/test"

test("keeps the editor within the viewport around 900px", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Properties" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open Incident Log" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Create report" })).toBeVisible()

  const viewportDimensions = await page.evaluate(() => {
    const header = document.querySelector("header")
    if (!header) throw new Error("Header not found")

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      headerClientWidth: header.clientWidth,
      headerScrollWidth: header.scrollWidth,
    }
  })

  expect(viewportDimensions.scrollWidth).toBeLessThanOrEqual(viewportDimensions.clientWidth)
  expect(viewportDimensions.headerScrollWidth).toBeLessThanOrEqual(viewportDimensions.headerClientWidth)
})
