import {
  EDGE_ACTION_TYPES,
  type EdgeActionType,
  type EdgeData,
} from "@/lib/types"

const edgeActionTypeSet = new Set<string>(EDGE_ACTION_TYPES)

const compactActionTypeLabels: Partial<Record<EdgeActionType, string>> = {
  "Initial Access": "IA",
  "Lateral Movement": "Lat Move",
  "Privilege Escalation": "PrivEsc",
  "Defense Evasion": "Def Evasion",
  "Credential Access": "Cred Access",
  Exfiltration: "Exfil",
  "Command & Control": "C2",
  Reconnaissance: "Recon",
  Weaponization: "Weaponize",
  Exploitation: "Exploit",
  Installation: "Install",
  "Data Manipulation": "Data Manip",
  "Service Abuse": "Svc Abuse",
  "Network Scanning": "Net Scan",
  "Vulnerability Exploitation": "Vuln Exploit",
  "Social Engineering": "Social Eng",
  "Physical Access": "Phys Access",
  "Supply Chain Attack": "Supply Ch.",
}

const isEdgeActionType = (value: unknown): value is EdgeActionType =>
  typeof value === "string" && edgeActionTypeSet.has(value)

export function getCompactEdgeActionTypeLabel(
  actionType: EdgeActionType,
): string {
  return compactActionTypeLabels[actionType] ?? actionType
}

export function getEdgeActionTypes(
  data?: Pick<EdgeData, "actionType" | "actionTypes"> | null,
): EdgeActionType[] {
  if (!data) return []

  const configured = Array.isArray(data.actionTypes)
    ? data.actionTypes.filter(isEdgeActionType)
    : []
  const primary = isEdgeActionType(data.actionType) ? data.actionType : null
  const ordered = primary
    ? [primary, ...configured.filter((actionType) => actionType !== primary)]
    : configured

  return ordered.filter(
    (actionType, index) => ordered.indexOf(actionType) === index,
  )
}

export function createEdgeActionTypeUpdate(
  actionTypes: EdgeActionType[],
): Pick<EdgeData, "actionType" | "actionTypes"> {
  const normalized = actionTypes.filter(
    (actionType, index) =>
      isEdgeActionType(actionType) && actionTypes.indexOf(actionType) === index,
  )

  if (normalized.length === 0) {
    throw new Error("An edge must have at least one action type")
  }

  return {
    actionType: normalized[0],
    actionTypes: normalized.length > 1 ? normalized : undefined,
  }
}

export function replaceEdgeActionTypeAtIndex(
  actionTypes: EdgeActionType[],
  index: number,
  nextActionType: EdgeActionType,
): EdgeActionType[] {
  if (
    index < 0 ||
    index >= actionTypes.length ||
    actionTypes.some(
      (actionType, actionTypeIndex) =>
        actionTypeIndex !== index && actionType === nextActionType,
    )
  ) {
    return actionTypes
  }

  return actionTypes.map((actionType, actionTypeIndex) =>
    actionTypeIndex === index ? nextActionType : actionType,
  )
}
