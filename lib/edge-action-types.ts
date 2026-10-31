import { defaultEdgeDisplaySettings } from "@/lib/utils/compromise-canvas-constants"
import {
  EDGE_ACTION_TYPES,
  type EdgeActionType,
  type CustomEdge,
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

/** The action type whose title is the edge's own editable name. */
export const NAMED_EDGE_ACTION_TYPE: EdgeActionType = "Other"
export const DEFAULT_NEW_EDGE_LABEL = "New Technique"

/**
 * Display name for an "Other" edge. The editable edge label is the name; a
 * blank label, the new-edge placeholder, or a leftover action-type name falls
 * back to "Other".
 */
export function getNamedEdgeName(label?: string): string {
  const trimmed = label?.trim()
  if (
    !trimmed ||
    trimmed === DEFAULT_NEW_EDGE_LABEL ||
    edgeActionTypeSet.has(trimmed)
  ) {
    return NAMED_EDGE_ACTION_TYPE
  }
  return trimmed
}

/** Name shown for one of an edge's action types: Other uses the edge's own name. */
export function getEdgeActionTypeDisplayName(
  actionType: EdgeActionType,
  label?: string,
): string {
  return actionType === NAMED_EDGE_ACTION_TYPE
    ? getNamedEdgeName(label)
    : actionType
}

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

/**
 * Action-type change for an edge. Switching to "Other" also turns on the
 * description, since an Other box is meant to explain the link in prose.
 */
export function createEdgeActionTypeChange(
  data: Pick<EdgeData, "actionType" | "actionTypes" | "displaySettings"> | undefined,
  actionTypes: EdgeActionType[],
): Partial<EdgeData> {
  const update: Partial<EdgeData> = createEdgeActionTypeUpdate(actionTypes)
  const addsNamedType =
    actionTypes.includes(NAMED_EDGE_ACTION_TYPE) &&
    !getEdgeActionTypes(data).includes(NAMED_EDGE_ACTION_TYPE)

  if (addsNamedType) {
    update.displaySettings = {
      ...(data?.displaySettings ?? defaultEdgeDisplaySettings),
      showDescription: true,
    }
  }

  return update
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

export function withoutTransientEdgeViewState(
  edge: CustomEdge,
): CustomEdge {
  if (
    !edge.data ||
    !Object.prototype.hasOwnProperty.call(
      edge.data,
      "actionTypesExpanded",
    )
  ) {
    return edge
  }

  const {
    actionTypesExpanded: _legacyExpandedState,
    ...persistentData
  } = edge.data

  return {
    ...edge,
    data: persistentData as EdgeData,
  }
}
