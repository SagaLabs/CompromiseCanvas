import { expect, test } from "@playwright/test"
import {
  createDefaultAttackerData,
  createDefaultCloudTenantData,
  createDefaultCommandControlData,
  createDefaultExfiltrationData,
  createDefaultIdentityData,
  withNodeDataDefaults,
} from "../lib/node-defaults"
import type { AssetType, NodeData } from "../lib/types"

const nodeData = (type: AssetType, specializedData = {}): NodeData =>
  ({
    label: "Test node",
    type,
    criticality: "Medium",
    services: [],
    actions: [],
    displaySettings: { showHostname: false },
    isCompromised: false,
    investigationStatus: "No Status",
    ...specializedData,
  }) as unknown as NodeData

test("adds defaults for every specialized node type", () => {
  expect(withNodeDataDefaults(nodeData("identity")).identityData).toEqual(
    createDefaultIdentityData(),
  )
  expect(
    withNodeDataDefaults(nodeData("exfiltration")).exfiltrationData,
  ).toEqual(createDefaultExfiltrationData())
  expect(
    withNodeDataDefaults(nodeData("command-control")).commandControlData,
  ).toEqual(createDefaultCommandControlData())
  expect(
    withNodeDataDefaults(nodeData("cloud-tenant")).cloudTenantData,
  ).toEqual(createDefaultCloudTenantData())
  expect(withNodeDataDefaults(nodeData("attacker")).attackerData).toEqual(
    createDefaultAttackerData(),
  )
})

test("merges legacy values and gives each node its own arrays", () => {
  const privileges = ["Domain Admin"]
  const attackVectors = ["Phishing"]
  const identity = withNodeDataDefaults(
    nodeData("identity", {
      identityData: { username: "alice", privileges } as NodeData["identityData"],
    }),
  )
  const attacker = withNodeDataDefaults(
    nodeData("attacker", {
      attackerData: {
        threatActor: "APT29",
        attackVectors,
      } as NodeData["attackerData"],
    }),
  )
  const secondAttacker = withNodeDataDefaults(nodeData("attacker"))

  expect(identity.identityData).toMatchObject({
    username: "alice",
    accountStatus: "Active",
    privileges: ["Domain Admin"],
  })
  expect(identity.identityData?.privileges).not.toBe(privileges)
  expect(attacker.attackerData).toMatchObject({
    threatActor: "APT29",
    infrastructureStatus: "Active",
    attackVectors: ["Phishing"],
  })
  expect(attacker.attackerData?.attackVectors).not.toBe(attackVectors)
  expect(attacker.attackerData?.targetIndustries).not.toBe(
    secondAttacker.attackerData?.targetIndustries,
  )
  expect(attacker.displaySettings).toEqual({
    showHostname: false,
  })
})
