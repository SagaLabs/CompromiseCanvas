import type {
  AttackerData,
  CloudTenantData,
  CommandControlData,
  CustomNode,
  ExfiltrationData,
  IdentityData,
  NodeData,
} from "@/lib/types"
import { defaultDisplaySettings } from "@/lib/utils/compromise-canvas-constants"

const mergeDefinedDefaults = <T extends object>(
  defaults: T,
  values?: Partial<T> | null,
): T => {
  if (!values) return defaults

  const merged = { ...defaults } as Record<string, unknown>
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      merged[key] = Array.isArray(value) ? [...value] : value
    }
  })

  return merged as T
}

export const createDefaultIdentityData = (): IdentityData => ({
  username: "",
  domain: "",
  accountType: "User",
  accountSource: "Local",
  privileges: [],
  groups: [],
  accountStatus: "Active",
  mfaEnabled: false,
  riskLevel: "Medium",
})

export const createDefaultExfiltrationData = (): ExfiltrationData => ({
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
})

export const createDefaultCommandControlData = (): CommandControlData => ({
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
})

export const createDefaultCloudTenantData = (): CloudTenantData => ({
  tenantId: "",
  tenantName: "",
  cloudProvider: "Azure",
  tenantType: "Entra ID",
  region: "us-east-1",
  environment: "Production",
  resourceCount: 0,
})

export const createDefaultAttackerData = (): AttackerData => ({
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
})

export const withAttackerDefaults = (
  attackerData?: Partial<AttackerData> | null,
): AttackerData =>
  mergeDefinedDefaults(createDefaultAttackerData(), attackerData)

export const withIdentityDefaults = (
  identityData?: Partial<IdentityData> | null,
): IdentityData =>
  mergeDefinedDefaults(createDefaultIdentityData(), identityData)

export const withExfiltrationDefaults = (
  exfiltrationData?: Partial<ExfiltrationData> | null,
): ExfiltrationData =>
  mergeDefinedDefaults(createDefaultExfiltrationData(), exfiltrationData)

export const withCommandControlDefaults = (
  commandControlData?: Partial<CommandControlData> | null,
): CommandControlData =>
  mergeDefinedDefaults(createDefaultCommandControlData(), commandControlData)

export const withCloudTenantDefaults = (
  cloudTenantData?: Partial<CloudTenantData> | null,
): CloudTenantData =>
  mergeDefinedDefaults(createDefaultCloudTenantData(), cloudTenantData)

export const withNodeDataDefaults = (data: NodeData): NodeData => {
  const legacyDisplaySettings = data.displaySettings as
    | (Partial<NodeData["displaySettings"]> & { showActionPath?: boolean })
    | undefined
  const { showActionPath: legacyShowActionPath, ...displaySettings } =
    legacyDisplaySettings ?? {}
  const normalizedData: NodeData = {
    ...data,
    actionMode:
      data.actionMode === "ordered-path" || data.actionMode === "list"
        ? data.actionMode
        : legacyShowActionPath
          ? "ordered-path"
          : "list",
    actions: Array.isArray(data.actions) ? data.actions : [],
    displaySettings: legacyDisplaySettings
      ? (displaySettings as NodeData["displaySettings"])
      : { ...defaultDisplaySettings },
    isCompromised: data.isCompromised ?? false,
  }

  switch (data.type) {
    case "identity":
      return {
        ...normalizedData,
        identityData: withIdentityDefaults(data.identityData),
      }
    case "exfiltration":
      return {
        ...normalizedData,
        exfiltrationData: withExfiltrationDefaults(data.exfiltrationData),
      }
    case "command-control":
      return {
        ...normalizedData,
        commandControlData: withCommandControlDefaults(data.commandControlData),
      }
    case "cloud-tenant":
      return {
        ...normalizedData,
        cloudTenantData: withCloudTenantDefaults(data.cloudTenantData),
      }
    case "attacker":
      return {
        ...normalizedData,
        attackerData: withAttackerDefaults(data.attackerData),
      }
    default:
      return normalizedData
  }
}

export const withNodeDefaults = (node: CustomNode): CustomNode => ({
  ...node,
  data: withNodeDataDefaults(node.data),
})
