import { expect, test, type Locator, type Page } from "@playwright/test"

test.setTimeout(90_000)

const specializedAssets = [
  {
    type: "identity",
    label: "Identity",
    category: /Security & Identity/,
    field: "identityData",
    visibleDefault: "User",
    defaults: {
      username: "",
      domain: "",
      accountType: "User",
      accountSource: "Local",
      privileges: [],
      groups: [],
      accountStatus: "Active",
      mfaEnabled: false,
      riskLevel: "Medium",
    },
  },
  {
    type: "cloud-tenant",
    label: "Cloud Tenant",
    category: /Cloud Infrastructure/,
    field: "cloudTenantData",
    visibleDefault: "Azure",
    defaults: {
      tenantId: "",
      tenantName: "",
      cloudProvider: "Azure",
      tenantType: "Entra ID",
      region: "us-east-1",
      environment: "Production",
      resourceCount: 0,
    },
  },
  {
    type: "command-control",
    label: "Command & Control",
    canvasLabel: "Command Control",
    category: /Threat Actor Assets/,
    field: "commandControlData",
    visibleDefault: "HTTP/HTTPS",
    defaults: {
      c2Type: "HTTP/HTTPS",
      c2Server: "",
      c2Protocol: "HTTPS",
      beaconInterval: "60s",
      jitter: 10,
      implantType: "",
      encryption: true,
      obfuscation: [],
      fallbackChannels: [],
      killSwitchEnabled: false,
      persistenceMethods: [],
      operationalStatus: "Active",
    },
  },
  {
    type: "exfiltration",
    label: "Exfiltration",
    category: /Threat Actor Assets/,
    field: "exfiltrationData",
    visibleDefault: "Cloud Storage",
    defaults: {
      method: "Cloud Storage",
      destination: "",
      protocol: "HTTPS",
      encryption: false,
      compression: false,
      dataTypes: [],
      volumeGB: 0,
      transferRate: "",
      detectionEvasion: [],
      exfiltrationWindow: "Business Hours Only",
      status: "Planned",
    },
  },
  {
    type: "attacker",
    label: "Attacker",
    category: /Threat Actor Assets/,
    field: "attackerData",
    visibleDefault: "Status: Active",
    defaults: {
      targetIndustries: [],
      ip: "",
      attackVectors: [],
      infrastructureAge: "",
      lastSeen: "",
      firstSeen: "",
      infrastructureStatus: "Active",
      threatActor: "",
      location: "",
      hostingProvider: "",
      infrastructureType: "VPS",
    },
  },
] as const

const targetPositions = [
  { x: 300, y: 180 },
  { x: 500, y: 180 },
  { x: 300, y: 350 },
  { x: 500, y: 350 },
  { x: 300, y: 520 },
]

const baseLegacyData = (type: string, label: string) => ({
  label,
  type,
  hostname: "",
  ipAddress: "",
  os: "",
  criticality: "Medium",
  services: [],
  actions: [],
  description: "",
})

const nodeByLabel = (page: Page, label: string): Locator =>
  page.locator(".react-flow__node").filter({
    has: page.getByText(label, { exact: true }),
  })

async function readSavedNodes(page: Page) {
  await page.getByRole("button", { name: "Save to browser storage" }).click()
  return page.evaluate(() => {
    const flow = JSON.parse(localStorage.getItem("compromise-canvas-flow") || "{}")
    return flow.nodes || []
  })
}

async function dropSpecializedAssets(page: Page) {
  const canvas = page.locator(".react-flow")
  const openedCategories = new Set<string>()

  for (const [index, asset] of specializedAssets.entries()) {
    const categoryKey = asset.category.source
    if (!openedCategories.has(categoryKey)) {
      await page.getByRole("button", { name: asset.category }).click()
      openedCategories.add(categoryKey)
    }

    await page
      .getByRole("button", { name: `Drag ${asset.label}`, exact: true })
      .dragTo(canvas, { targetPosition: targetPositions[index] })
  }

  await expect(page.locator(".react-flow__node")).toHaveCount(specializedAssets.length)
}

function expectSpecializedDefaults(nodes: any[]) {
  for (const asset of specializedAssets) {
    const node = nodes.find((candidate) => candidate.data?.type === asset.type)
    expect(node, `${asset.label} should be present`).toBeTruthy()
    expect(node.data[asset.field]).toEqual(asset.defaults)
  }
}

const dataByType = (nodes: any[]) =>
  Object.fromEntries(nodes.map((node) => [node.data.type, node.data]))

function legacyNodes() {
  const partialValues: Record<string, Record<string, unknown>> = {
    identity: { username: "svc-backup", privileges: ["Backup Operators"] },
    "cloud-tenant": { tenantName: "legacy.onmicrosoft.com" },
    "command-control": { c2Server: "c2.example.test", obfuscation: ["DGA"] },
    exfiltration: { destination: "s3://legacy-export", dataTypes: ["Customer PII"] },
    attacker: {
      ip: "203.0.113.10",
      attackVectors: ["Phishing"],
      infrastructureStatus: "Dormant",
    },
  }

  return specializedAssets.map((asset, index) => ({
    id: `legacy-${asset.type}`,
    type: "customNode",
    position: { x: 300 + (index % 2) * 200, y: 180 + Math.floor(index / 2) * 170 },
    data: {
      ...baseLegacyData(
        asset.type,
        "canvasLabel" in asset ? asset.canvasLabel : asset.label,
      ),
      [asset.field]: partialValues[asset.type],
    },
  }))
}

function expectLegacyValuesPreserved(nodes: any[]) {
  const byType = dataByType(nodes)

  expect(byType.identity.identityData).toEqual({
    ...specializedAssets[0].defaults,
    username: "svc-backup",
    privileges: ["Backup Operators"],
  })
  expect(byType["cloud-tenant"].cloudTenantData).toEqual({
    ...specializedAssets[1].defaults,
    tenantName: "legacy.onmicrosoft.com",
  })
  expect(byType["command-control"].commandControlData).toEqual({
    ...specializedAssets[2].defaults,
    c2Server: "c2.example.test",
    obfuscation: ["DGA"],
  })
  expect(byType.exfiltration.exfiltrationData).toEqual({
    ...specializedAssets[3].defaults,
    destination: "s3://legacy-export",
    dataTypes: ["Customer PII"],
  })
  expect(byType.attacker.attackerData).toEqual({
    ...specializedAssets[4].defaults,
    ip: "203.0.113.10",
    attackVectors: ["Phishing"],
    infrastructureStatus: "Dormant",
  })

  return byType
}

async function importDiagram(page: Page, nodes: unknown[]) {
  const fileChooserPromise = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Import JSON file" }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: "legacy-specialized-assets.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: "1.0",
        canvasTitle: "Legacy specialized assets",
        incidentLog: [],
        diagram: {
          nodes,
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      }),
    ),
  })
}

test("creates specialized assets with stable defaults before selection", async ({ page }) => {
  await page.goto("/")
  await dropSpecializedAssets(page)

  for (const asset of specializedAssets) {
    const label = "canvasLabel" in asset ? asset.canvasLabel : asset.label
    const node = nodeByLabel(page, label)
    await expect(node).toHaveCount(1)
    await expect(node).not.toContainText("No display info")
    await expect(node).toContainText(asset.visibleDefault)
  }

  const beforeSelection = await readSavedNodes(page)
  expectSpecializedDefaults(beforeSelection)
  const dataBeforeSelection = dataByType(beforeSelection)

  for (const asset of specializedAssets) {
    const label = "canvasLabel" in asset ? asset.canvasLabel : asset.label
    await nodeByLabel(page, label).getByText(label, { exact: true }).click()
    await expect(nodeByLabel(page, label)).toHaveClass(/(?:^|\s)selected(?:\s|$)/)
    expect(dataByType(await readSavedNodes(page))).toEqual(dataBeforeSelection)
  }

  // Selection must not add an initialization snapshot. One undo should remove
  // the last dropped node rather than only removing its specialized defaults.
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(specializedAssets.length - 1)
  await expect(nodeByLabel(page, "Attacker")).toHaveCount(0)

  await page.getByRole("button", { name: "Redo", exact: true }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(specializedAssets.length)

  await page.reload()
  await page.getByRole("button", { name: "Load from browser storage" }).click()
  expectSpecializedDefaults(await readSavedNodes(page))
})

test("merges legacy partial values without selection side effects", async ({ page }) => {
  await page.goto("/")
  await importDiagram(page, legacyNodes())
  await expect(page.locator(".react-flow__node")).toHaveCount(specializedAssets.length)

  const normalized = await readSavedNodes(page)
  const byType = expectLegacyValuesPreserved(normalized)

  for (const asset of specializedAssets) {
    const label = "canvasLabel" in asset ? asset.canvasLabel : asset.label
    await nodeByLabel(page, label).getByText(label, { exact: true }).click()
    await expect(nodeByLabel(page, label)).toHaveClass(/(?:^|\s)selected(?:\s|$)/)
    expect(dataByType(await readSavedNodes(page))).toEqual(byType)
  }

  await nodeByLabel(page, "Attacker").getByText("Attacker", { exact: true }).click()
  await page
    .getByPlaceholder("e.g., 192.168.1.100, 10.0.0.50", { exact: true })
    .fill("198.51.100.25")
  const edited = await readSavedNodes(page)
  expect(edited.find((node: any) => node.data.type === "attacker").data.attackerData).toEqual({
    ...specializedAssets[4].defaults,
    ip: "198.51.100.25",
    attackVectors: ["Phishing"],
    infrastructureStatus: "Dormant",
  })
})

test("normalizes partial legacy browser saves before loading", async ({ page }) => {
  await page.goto("/")
  await page.evaluate((nodes) => {
    localStorage.setItem(
      "compromise-canvas-flow",
      JSON.stringify({
        nodes,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        canvasTitle: "Legacy browser save",
        incidentLog: [],
      }),
    )
  }, legacyNodes())

  await page.getByRole("button", { name: "Load from browser storage" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(specializedAssets.length)
  expectLegacyValuesPreserved(await readSavedNodes(page))
})

test("normalizes legacy autosave recovery before installing canvas state", async ({ page }) => {
  await page.goto("/")
  await page.evaluate((nodes) => {
    localStorage.setItem("compromise-canvas-autosave-enabled", "true")
    localStorage.setItem(
      "compromise-canvas-autosave-flow",
      JSON.stringify({
        version: "1.0",
        nodes,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        canvasTitle: "Recovered specialized assets",
        incidentLog: [],
      }),
    )
  }, legacyNodes())

  await page.reload()
  await expect(page.locator(".react-flow__node")).toHaveCount(specializedAssets.length)

  const recovered = await page.evaluate(() => {
    const flow = JSON.parse(localStorage.getItem("compromise-canvas-autosave-flow") || "{}")
    return flow.nodes || []
  })
  const byType = Object.fromEntries(
    recovered.map((node: any) => [node.data.type, node.data]),
  )

  expect(byType.identity.identityData.accountType).toBe("User")
  expect(byType["cloud-tenant"].cloudTenantData.cloudProvider).toBe("Azure")
  expect(byType["command-control"].commandControlData.operationalStatus).toBe("Active")
  expect(byType.exfiltration.exfiltrationData.status).toBe("Planned")
  expect(byType.attacker.attackerData).toEqual({
    ...specializedAssets[4].defaults,
    ip: "203.0.113.10",
    attackVectors: ["Phishing"],
    infrastructureStatus: "Dormant",
  })
})
