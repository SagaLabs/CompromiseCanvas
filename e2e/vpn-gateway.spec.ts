import { test, expect } from "@playwright/test"

test("adds and reloads a VPN gateway with the expected asset type", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: /On-Premises Infrastructure/ }).click()

  const vpnGateway = page.getByRole("button", { name: "Drag VPN Gateway" })
  await expect(vpnGateway).toContainText("Remote access gateway")
  await vpnGateway.dragTo(page.locator(".react-flow"), {
    targetPosition: { x: 500, y: 350 },
  })

  const node = page.locator(".react-flow__node").filter({ hasText: "VPN Gateway" })
  await expect(node).toBeVisible()
  await node.getByText("VPN Gateway", { exact: true }).click()

  const properties = page.getByRole("complementary").filter({
    has: page.getByRole("heading", { name: "Properties" }),
  })
  await properties.getByText("Hostname", { exact: true }).locator("..").locator("input").fill("vpn-gateway-01")
  await properties.getByText("IP Address", { exact: true }).locator("..").locator("input").fill("203.0.113.10")
  await properties.getByText("Operating System", { exact: true }).locator("..").locator("input").fill("FortiOS 7.4")
  await page.getByRole("button", { name: "Save to browser storage" }).click()

  const savedNode = await page.evaluate(() => {
    const flow = JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
    return flow.nodes?.[0]
  })
  expect(savedNode).toMatchObject({
    type: "customNode",
    data: {
      type: "vpn-gateway",
      label: "VPN Gateway",
      hostname: "vpn-gateway-01",
      ipAddress: "203.0.113.10",
      os: "FortiOS 7.4",
    },
  })

  await page.reload()
  await page.getByRole("button", { name: "Load from browser storage" }).click()

  const restoredNode = page.locator(".react-flow__node").filter({ hasText: "VPN Gateway" })
  await expect(restoredNode).toContainText("vpn-gateway-01")
  await expect(restoredNode).toContainText("203.0.113.10")
})
