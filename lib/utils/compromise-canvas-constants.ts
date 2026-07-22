import type { DisplaySettings, EdgeDisplaySettings, CustomNode, CustomEdge } from "@/lib/types"

export const defaultDisplaySettings: DisplaySettings = {
  showHostname: true,
  showIpAddress: true,
  showOs: false,
  showServices: false,
  showCriticality: false,
  showActions: true,
  showDescription: false,
  // Identity-specific
  showUsername: true,
  showDomain: true,
  showAccountType: true,
  showAccountSource: true,
  showAccountStatus: false,
  showRiskLevel: true,
  showMfaStatus: false,
  showPrivileges: false,
  showGroups: false,
  // Exfiltration-specific
  showMethod: true,
  showDestination: true,
  showProtocol: false,
  showStatus: true,
  showVolume: false,
  showDataTypes: false,
  // C2-specific
  showC2Type: true,
  showC2Server: true,
  showC2Protocol: false,
  showBeaconInterval: false,
  showImplantType: false,
  // Cloud tenant-specific
  showTenantId: true,
  showTenantName: true,
  showCloudProvider: true,
  showTenantType: true,
  showRegion: false,
  showEnvironment: false,
  showResourceCount: false,
  showSecurityScore: false,
  // Attacker-specific
  showTargetIndustries: true,
  showIp: true,
  showAttackVectors: true,
  showInfrastructureAge: false,
  showLastSeen: false,
  showFirstSeen: false,
  showInfrastructureStatus: true,
  showThreatActor: true,
  showLocation: false,
  showHostingProvider: false,
  showInfrastructureType: false,
  // Compromised status
  showCompromised: false,
  // Investigation status
  showInvestigationStatus: false,
}

export const defaultEdgeDisplaySettings: EdgeDisplaySettings = {
  showLabel: true,
  showTool: true,
  showUser: true,
  showTimestamp: true,
  showMitreId: false,
  showDescription: false,
  showC2Channel: true,
  showC2Framework: true,
}

// Start with empty canvas - no initial nodes or edges
export const initialNodes: CustomNode[] = []
export const initialEdges: CustomEdge[] = []


export const LAYER_Z_INDEX = {
  GROUP: -10,
  EDGE: 0,
  NODE: 10,
  SELECTED: 20
}

/**
 * Per-side fitView padding so nodes are never tucked behind the fixed side panels.
 * Left asset library panel is `w-64` (256px); right properties panel is `w-80` (320px).
 * Values add a small margin on top of each panel width.
 */
export const FIT_VIEW_OPTIONS = {
  padding: { top: "10%", right: "340px", bottom: "10%", left: "280px" },
} as const

let id = 0
export const getId = () => `dndnode_${id++}`
