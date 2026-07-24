"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MitreTechniquePicker } from "@/components/mitre-technique-picker"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Plus,
  X,
  Trash2,
  Key,
  MoveRight,
  ArrowUpCircle,
  Upload,
  Eye,
  HardDrive,
  Terminal,
  Zap,
  Info,
  Shield,
  Palette,
} from "lucide-react" // Import all necessary icons
import {
  type NodeData,
  type EdgeData,
  type Criticality,
  type ActionType,
  ACTION_TYPES,
  type EdgeActionType,
  EDGE_ACTION_TYPES,
  type NodeAction,
  type IdentityData,
  type ExfiltrationData,
  type CommandControlData,
  type CloudTenantData,
  type AttackerData,
  type DisplaySettings,
  type EdgeDisplaySettings,
  type InvestigationStatus,
} from "@/lib/types"
import type { CustomNode, CustomEdge } from "@/lib/types"
import { normalizeMitreTechniqueReferences } from "@/lib/mitre-attack"

// Define action icons mapping directly in this component
const actionIcons = {
  "Initial Access": Key,
  "Lateral Movement": MoveRight,
  "Privilege Escalation": ArrowUpCircle,
  Persistence: HardDrive,
  "Defense Evasion": Shield,
  "Credential Access": Key, // Re-using Key for Credential Access
  Discovery: Eye,
  Collection: HardDrive, // Re-using HardDrive for Collection
  Exfiltration: Upload,
  "Command and Control": Terminal,
  Impact: Zap,
  Other: Info,
}

interface PropertiesPanelProps {
  selectedElement: CustomNode | CustomEdge | null
  selectedNodeCount?: number
  selectedEdgeCount?: number
  updateNode: (id: string, data: Partial<NodeData>) => void
  updateEdge: (id: string, data: Partial<EdgeData>) => void
  onDelete: () => void
}

export default function PropertiesPanel({
  selectedElement,
  selectedNodeCount = 0,
  selectedEdgeCount = 0,
  updateNode,
  updateEdge,
  onDelete,
}: PropertiesPanelProps) {
  const [nodeData, setNodeData] = useState<NodeData | null>(null)
  const [edgeData, setEdgeData] = useState<EdgeData | null>(null)
  const toLocalInputValue = (isoString?: string) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ""
    const pad = (value: number) => String(value).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`
  }

  const nowLocalInputValue = () => {
    const date = new Date()
    const pad = (value: number) => String(value).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`
  }

  // Extract stable references to avoid re-running effect during drag/resize
  const elementId = selectedElement?.id
  const elementType = selectedElement?.type
  const elementData = selectedElement && "data" in selectedElement ? selectedElement.data : null

  useEffect(() => {
    if (elementData) {
      if (elementType !== "customEdge") {
        setNodeData(elementData as NodeData)
        setEdgeData(null)
      } else {
        setEdgeData(elementData as EdgeData)
        setNodeData(null)
      }
    } else {
      setNodeData(null)
      setEdgeData(null)
    }
  }, [elementId, elementType, elementData])

  const handleNodeChange = (field: keyof NodeData, value: any) => {
    if (nodeData) {
      const newData = { ...nodeData, [field]: value }
      setNodeData(newData)
      updateNode(selectedElement!.id, newData)
    }
  }

  const handleIdentityChange = (field: keyof IdentityData, value: any) => {
    if (nodeData && nodeData.identityData) {
      const newIdentityData = { ...nodeData.identityData, [field]: value }
      const newData = { ...nodeData, identityData: newIdentityData }
      setNodeData(newData)
      updateNode(selectedElement!.id, newData)
    }
  }

  const handleExfiltrationChange = (field: keyof ExfiltrationData, value: any) => {
    if (nodeData && nodeData.exfiltrationData) {
      const newExfiltrationData = { ...nodeData.exfiltrationData, [field]: value }
      const newData = { ...nodeData, exfiltrationData: newExfiltrationData }
      setNodeData(newData)
      updateNode(selectedElement!.id, newData)
    }
  }

  const handleAddDataType = () => {
    if (nodeData?.exfiltrationData) {
      const newDataTypes = [...nodeData.exfiltrationData.dataTypes, ""]
      handleExfiltrationChange("dataTypes", newDataTypes)
    }
  }

  const handleDataTypeChange = (index: number, value: string) => {
    if (nodeData?.exfiltrationData) {
      const newDataTypes = [...nodeData.exfiltrationData.dataTypes]
      newDataTypes[index] = value
      handleExfiltrationChange("dataTypes", newDataTypes)
    }
  }

  const handleRemoveDataType = (index: number) => {
    if (nodeData?.exfiltrationData) {
      const newDataTypes = nodeData.exfiltrationData.dataTypes.filter((_, i) => i !== index)
      handleExfiltrationChange("dataTypes", newDataTypes)
    }
  }

  const handleAddDetectionEvasion = () => {
    if (nodeData?.exfiltrationData) {
      const newEvasion = [...nodeData.exfiltrationData.detectionEvasion, ""]
      handleExfiltrationChange("detectionEvasion", newEvasion)
    }
  }

  const handleDetectionEvasionChange = (index: number, value: string) => {
    if (nodeData?.exfiltrationData) {
      const newEvasion = [...nodeData.exfiltrationData.detectionEvasion]
      newEvasion[index] = value
      handleExfiltrationChange("detectionEvasion", newEvasion)
    }
  }

  const handleRemoveDetectionEvasion = (index: number) => {
    if (nodeData?.exfiltrationData) {
      const newEvasion = nodeData.exfiltrationData.detectionEvasion.filter((_, i) => i !== index)
      handleExfiltrationChange("detectionEvasion", newEvasion)
    }
  }

  const handleEdgeChange = (field: keyof EdgeData, value: any) => {
    if (edgeData) {
      const newData = { ...edgeData, [field]: value }
      setEdgeData(newData)
      updateEdge(selectedElement!.id, newData)
    }
  }

  const handleMitreTechniqueChange = (techniques: Array<{ id: string; name: string }>) => {
    if (edgeData && selectedElement) {
      const primaryTechnique = techniques[0]
      const newData = {
        ...edgeData,
        mitreAttackId: primaryTechnique?.id || "",
        mitreAttackName: primaryTechnique?.name || "",
        mitreAttackTechniques: techniques,
      }
      setEdgeData(newData)
      updateEdge(selectedElement.id, newData)
    }
  }

  const handleEdgeDisplaySettingChange = (field: keyof EdgeDisplaySettings, value: boolean) => {
    if (edgeData && selectedElement) {
      // Ensure displaySettings exists with defaults
      const currentDisplaySettings = edgeData.displaySettings || {
        showLabel: true,
        showTool: true,
        showUser: true,
        showTimestamp: true,
        showMitreId: false,
        showDescription: false,
        showC2Channel: true,
        showC2Framework: true,
      }

      const newDisplaySettings = { ...currentDisplaySettings, [field]: value }
      const newData = { ...edgeData, displaySettings: newDisplaySettings }
      setEdgeData(newData)
      updateEdge(selectedElement.id, newData)
    } else {
    }
  }

  const handleAddService = () => {
    if (nodeData) {
      const newServices = [...nodeData.services, ""]
      handleNodeChange("services", newServices)
    }
  }

  const handleServiceChange = (index: number, value: string) => {
    if (nodeData) {
      const newServices = [...nodeData.services]
      newServices[index] = value
      handleNodeChange("services", newServices)
    }
  }

  const handleRemoveService = (index: number) => {
    if (nodeData) {
      const newServices = nodeData.services.filter((_, i) => i !== index)
      handleNodeChange("services", newServices)
    }
  }

  const handleAddPrivilege = () => {
    if (nodeData?.identityData) {
      const newPrivileges = [...nodeData.identityData.privileges, ""]
      handleIdentityChange("privileges", newPrivileges)
    }
  }

  const handlePrivilegeChange = (index: number, value: string) => {
    if (nodeData?.identityData) {
      const newPrivileges = [...nodeData.identityData.privileges]
      newPrivileges[index] = value
      handleIdentityChange("privileges", newPrivileges)
    }
  }

  const handleRemovePrivilege = (index: number) => {
    if (nodeData?.identityData) {
      const newPrivileges = nodeData.identityData.privileges.filter((_, i) => i !== index)
      handleIdentityChange("privileges", newPrivileges)
    }
  }

  const handleAddGroup = () => {
    if (nodeData?.identityData) {
      const newGroups = [...nodeData.identityData.groups, ""]
      handleIdentityChange("groups", newGroups)
    }
  }

  const handleGroupChange = (index: number, value: string) => {
    if (nodeData?.identityData) {
      const newGroups = [...nodeData.identityData.groups]
      newGroups[index] = value
      handleIdentityChange("groups", newGroups)
    }
  }

  const handleRemoveGroup = (index: number) => {
    if (nodeData?.identityData) {
      const newGroups = nodeData.identityData.groups.filter((_, i) => i !== index)
      handleIdentityChange("groups", newGroups)
    }
  }

  const handleAddAction = () => {
    if (nodeData) {
      const newActions = [
        ...(nodeData.actions || []),
        { id: `action-${Date.now()}`, type: "Other", technique: "", details: "" },
      ]
      handleNodeChange("actions", newActions)
    }
  }

  const handleActionChange = (index: number, field: keyof NodeAction, value: any) => {
    if (nodeData) {
      const newActions = [...(nodeData.actions || [])]
      newActions[index] = { ...newActions[index], [field]: value }
      handleNodeChange("actions", newActions)
    }
  }

  const handleRemoveAction = (index: number) => {
    if (nodeData) {
      const newActions = (nodeData.actions || []).filter((_, i) => i !== index)
      handleNodeChange("actions", newActions)
    }
  }

  const handleDisplaySettingChange = (field: keyof DisplaySettings, value: boolean) => {
    if (nodeData) {
      const newDisplaySettings = { ...nodeData.displaySettings, [field]: value }
      const newData = { ...nodeData, displaySettings: newDisplaySettings }
      setNodeData(newData)
      updateNode(selectedElement!.id, newData)
    }
  }

  const handleCommandControlChange = (field: keyof CommandControlData, value: any) => {
    if (nodeData && nodeData.commandControlData) {
      const newCommandControlData = { ...nodeData.commandControlData, [field]: value }
      const newData = { ...nodeData, commandControlData: newCommandControlData }
      setNodeData(newData)
      updateNode(selectedElement!.id, newData)
    }
  }

  const handleAddObfuscation = () => {
    if (nodeData?.commandControlData) {
      const newObfuscation = [...nodeData.commandControlData.obfuscation, ""]
      handleCommandControlChange("obfuscation", newObfuscation)
    }
  }

  const handleObfuscationChange = (index: number, value: string) => {
    if (nodeData?.commandControlData) {
      const newObfuscation = [...nodeData.commandControlData.obfuscation]
      newObfuscation[index] = value
      handleCommandControlChange("obfuscation", newObfuscation)
    }
  }

  const handleRemoveObfuscation = (index: number) => {
    if (nodeData?.commandControlData) {
      const newObfuscation = nodeData.commandControlData.obfuscation.filter((_, i) => i !== index)
      handleCommandControlChange("obfuscation", newObfuscation)
    }
  }

  const handleAddFallbackChannel = () => {
    if (nodeData?.commandControlData) {
      const newChannels = [...nodeData.commandControlData.fallbackChannels, ""]
      handleCommandControlChange("fallbackChannels", newChannels)
    }
  }

  const handleFallbackChannelChange = (index: number, value: string) => {
    if (nodeData?.commandControlData) {
      const newChannels = [...nodeData.commandControlData.fallbackChannels]
      newChannels[index] = value
      handleCommandControlChange("fallbackChannels", newChannels)
    }
  }

  const handleRemoveFallbackChannel = (index: number) => {
    if (nodeData?.commandControlData) {
      const newChannels = nodeData.commandControlData.fallbackChannels.filter((_, i) => i !== index)
      handleCommandControlChange("fallbackChannels", newChannels)
    }
  }

  const handleAddPersistenceMethod = () => {
    if (nodeData?.commandControlData) {
      const newMethods = [...nodeData.commandControlData.persistenceMethods, ""]
      handleCommandControlChange("persistenceMethods", newMethods)
    }
  }

  const handlePersistenceMethodChange = (index: number, value: string) => {
    if (nodeData?.commandControlData) {
      const newMethods = [...nodeData.commandControlData.persistenceMethods]
      newMethods[index] = value
      handleCommandControlChange("persistenceMethods", newMethods)
    }
  }

  const handleRemovePersistenceMethod = (index: number) => {
    if (nodeData?.commandControlData) {
      const newMethods = nodeData.commandControlData.persistenceMethods.filter((_, i) => i !== index)
      handleCommandControlChange("persistenceMethods", newMethods)
    }
  }

  const handleCloudTenantChange = (field: keyof CloudTenantData, value: any) => {
    if (nodeData?.cloudTenantData) {
      const newCloudTenantData = { ...nodeData.cloudTenantData, [field]: value }
      handleNodeChange("cloudTenantData", newCloudTenantData)
    }
  }

  const handleAttackerChange = (field: keyof AttackerData, value: any) => {
    if (nodeData && nodeData.attackerData) {
      const newAttackerData = { ...nodeData.attackerData, [field]: value }
      const newData = { ...nodeData, attackerData: newAttackerData }
      setNodeData(newData)
      updateNode(selectedElement!.id, newData)
    }
  }

  const handleAddTargetIndustry = () => {
    if (nodeData?.attackerData) {
      const newIndustries = [...nodeData.attackerData.targetIndustries, ""]
      handleAttackerChange("targetIndustries", newIndustries)
    }
  }

  const handleTargetIndustryChange = (index: number, value: string) => {
    if (nodeData?.attackerData) {
      const newIndustries = [...nodeData.attackerData.targetIndustries]
      newIndustries[index] = value
      handleAttackerChange("targetIndustries", newIndustries)
    }
  }

  const handleRemoveTargetIndustry = (index: number) => {
    if (nodeData?.attackerData) {
      const newIndustries = nodeData.attackerData.targetIndustries.filter((_, i) => i !== index)
      handleAttackerChange("targetIndustries", newIndustries)
    }
  }

  const handleAddAttackVector = () => {
    if (nodeData?.attackerData) {
      const newVectors = [...nodeData.attackerData.attackVectors, ""]
      handleAttackerChange("attackVectors", newVectors)
    }
  }

  const handleAttackVectorChange = (index: number, value: string) => {
    if (nodeData?.attackerData) {
      const newVectors = [...nodeData.attackerData.attackVectors]
      newVectors[index] = value
      handleAttackerChange("attackVectors", newVectors)
    }
  }

  const handleRemoveAttackVector = (index: number) => {
    if (nodeData?.attackerData) {
      const newVectors = nodeData.attackerData.attackVectors.filter((_, i) => i !== index)
      handleAttackerChange("attackVectors", newVectors)
    }
  }

  // Initialize identity data when node type changes to identity
  useEffect(() => {
    if (nodeData?.type === "identity" && !nodeData.identityData) {
      const defaultIdentityData: IdentityData = {
        username: "",
        domain: "",
        accountType: "User",
        accountSource: "Local",
        privileges: [],
        groups: [],
        accountStatus: "Active",
        mfaEnabled: false,
        riskLevel: "Medium",
      }
      handleNodeChange("identityData", defaultIdentityData)
    }
  }, [nodeData?.type])

  // Initialize exfiltration data when node type changes to exfiltration
  useEffect(() => {
    if (nodeData?.type === "exfiltration" && !nodeData.exfiltrationData) {
      const defaultExfiltrationData: ExfiltrationData = {
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
      }
      handleNodeChange("exfiltrationData", defaultExfiltrationData)
    }
  }, [nodeData?.type])

  // Initialize command control data when node type changes to command-control
  useEffect(() => {
    if (nodeData?.type === "command-control" && !nodeData.commandControlData) {
      const defaultCommandControlData: CommandControlData = {
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
      }
      handleNodeChange("commandControlData", defaultCommandControlData)
    }
  }, [nodeData?.type])

  // Initialize cloud tenant data when node type changes to cloud-tenant
  useEffect(() => {
    if (nodeData?.type === "cloud-tenant" && !nodeData.cloudTenantData) {
      const defaultCloudTenantData: CloudTenantData = {
        tenantId: "",
        tenantName: "",
        cloudProvider: "Azure",
        tenantType: "Entra ID",
        region: "us-east-1",
        environment: "Production",
        resourceCount: 0,
      }
      handleNodeChange("cloudTenantData", defaultCloudTenantData)
    }
  }, [nodeData?.type])

  // Initialize attacker data when node type changes to attacker
  useEffect(() => {
    if (nodeData?.type === "attacker" && !nodeData.attackerData) {
      const defaultAttackerData: AttackerData = {
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
      }
      handleNodeChange("attackerData", defaultAttackerData)
    }
  }, [nodeData?.type])

  if (!selectedElement) {
    const totalSelected = selectedNodeCount + selectedEdgeCount
    return (
      <aside className="ip-panel w-80 flex-shrink-0 border-l p-4">
        <h2 className="mb-4 text-lg font-semibold">{totalSelected > 1 ? "Selection" : "Properties"}</h2>
        {totalSelected > 1 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-300">
              {selectedNodeCount} node{selectedNodeCount === 1 ? "" : "s"} and {selectedEdgeCount} edge{selectedEdgeCount === 1 ? "" : "s"} selected.
            </p>
            <p className="text-xs text-gray-400">
              Use the selection toolbar to edit, arrange, copy, or delete the selection.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Select a node or edge to view/edit its properties.</p>
        )}
      </aside>
    )
  }

  return (
    <aside className="ip-panel w-80 flex-shrink-0 overflow-y-auto border-l p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Properties</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-red-400 hover:bg-gray-700"
          title={`Delete selected ${selectedElement.type === "customEdge" ? "edge" : "node"}`}
          aria-label={`Delete selected ${selectedElement.type === "customEdge" ? "edge" : "node"}`}
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Delete Selected</span>
        </Button>
      </div>

      {nodeData && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="label" className="text-sm">
              Label
            </Label>
            <Input
              id="label"
              value={nodeData.label}
              onChange={(e) => handleNodeChange("label", e.target.value)}
              className="mt-1 bg-gray-800 text-white border-gray-700"
            />
          </div>

          {/* Asset Group Appearance */}
          {nodeData.type === "group" && (
            <div className="border-t border-gray-700 pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-200">Appearance</h3>
              </div>

              <div>
                <Label htmlFor="color" className="text-sm mb-2 block">Color</Label>
                <Select
                  value={nodeData.color || "blue"}
                  onValueChange={(value) => handleNodeChange("color", value)}
                >
                  <SelectTrigger className="w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select Color" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="transparency" className="text-sm">Transparency</Label>
                  <span className="text-xs text-gray-400">{Math.round((nodeData.transparency || 0.2) * 100)}%</span>
                </div>
                <Slider
                  value={[nodeData.transparency || 0.2]}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  onValueChange={(value) => handleNodeChange("transparency", value[0])}
                  className="py-2"
                />
              </div>
            </div>
          )}

          {/* Compromised Status */}
          {nodeData.type !== "group" && (
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-compromised"
                  checked={nodeData.isCompromised || false}
                  onCheckedChange={(checked) => handleNodeChange("isCompromised", checked)}
                />
                <Label htmlFor="is-compromised" className="text-sm font-semibold text-red-400">
                  Mark as Compromised
                </Label>
              </div>
            </div>
          )}

          {/* Investigation Status */}
          {nodeData.type !== "group" && nodeData.type !== "attacker" && (
            <div className="border-t border-gray-700 pt-4">
              <Label htmlFor="investigation-status" className="text-sm font-semibold text-blue-400">
                Investigation Status
              </Label>
              <Select
                value={nodeData.investigationStatus || "No Status"}
                onValueChange={(value: InvestigationStatus) => handleNodeChange("investigationStatus", value)}
              >
                <SelectTrigger className="mt-1 bg-gray-800 text-white border-gray-700">
                  <SelectValue placeholder="Select investigation status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="No Status" className="text-gray-400 hover:bg-gray-700">
                    No Status
                  </SelectItem>
                  <SelectItem value="Not Investigated" className="text-purple-400 hover:bg-gray-700">
                    Not Investigated
                  </SelectItem>
                  <SelectItem value="Investigating" className="text-yellow-400 hover:bg-gray-700">
                    Investigating
                  </SelectItem>
                  <SelectItem value="Done" className="text-green-400 hover:bg-gray-700">
                    Done
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}



          {/* Identity-specific fields */}
          {nodeData.type === "identity" && nodeData.identityData && (
            <>
              <div>
                <Label htmlFor="username" className="text-sm">
                  Username
                </Label>
                <Input
                  id="username"
                  value={nodeData.identityData.username}
                  onChange={(e) => handleIdentityChange("username", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="domain" className="text-sm">
                  Domain
                </Label>
                <Input
                  id="domain"
                  value={nodeData.identityData.domain}
                  onChange={(e) => handleIdentityChange("domain", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="accountType" className="text-sm">
                  Account Type
                </Label>
                <Select
                  value={nodeData.identityData.accountType}
                  onValueChange={(value) => handleIdentityChange("accountType", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Computer">Computer</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                    <SelectItem value="Active Directory">Active Directory</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accountSource" className="text-sm">
                  Account Source
                </Label>
                <Select
                  value={nodeData.identityData.accountSource}
                  onValueChange={(value) => handleIdentityChange("accountSource", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select account source" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Local">Local Account</SelectItem>
                    <SelectItem value="Cloud">Cloud Account</SelectItem>
                    <SelectItem value="Hybrid">Hybrid Account</SelectItem>
                    <SelectItem value="Federated">Federated Account</SelectItem>
                    <SelectItem value="Active Directory">Active Directory</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accountStatus" className="text-sm">
                  Account Status
                </Label>
                <Select
                  value={nodeData.identityData.accountStatus}
                  onValueChange={(value) => handleIdentityChange("accountStatus", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select account status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                    <SelectItem value="Locked">Locked</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="riskLevel" className="text-sm">
                  Risk Level
                </Label>
                <Select
                  value={nodeData.identityData.riskLevel}
                  onValueChange={(value) => handleIdentityChange("riskLevel", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="mfaEnabled"
                  checked={nodeData.identityData.mfaEnabled}
                  onCheckedChange={(checked) => handleIdentityChange("mfaEnabled", checked)}
                />
                <Label htmlFor="mfaEnabled" className="text-sm">
                  MFA Enabled
                </Label>
              </div>
              <div>
                <Label htmlFor="lastLogon" className="text-sm">
                  Last Logon
                </Label>
                <Input
                  id="lastLogon"
                  value={nodeData.identityData.lastLogon || ""}
                  onChange={(e) => handleIdentityChange("lastLogon", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 2024-01-15T10:30:00Z"
                />
              </div>
              <div>
                <Label htmlFor="passwordLastSet" className="text-sm">
                  Password Last Set
                </Label>
                <Input
                  id="passwordLastSet"
                  value={nodeData.identityData.passwordLastSet || ""}
                  onChange={(e) => handleIdentityChange("passwordLastSet", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 2024-01-01T00:00:00Z"
                />
              </div>
              <div>
                <Label className="text-sm">Privileges</Label>
                {nodeData.identityData.privileges.map((privilege, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={privilege}
                      onChange={(e) => handlePrivilegeChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., SeDebugPrivilege"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePrivilege(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove privilege"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPrivilege}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Privilege
                </Button>
              </div>
              <div>
                <Label className="text-sm">Groups</Label>
                {nodeData.identityData.groups.map((group, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={group}
                      onChange={(e) => handleGroupChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Domain Admins"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGroup(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove group"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroup}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Group
                </Button>
              </div>
            </>
          )}

          {/* Exfiltration-specific fields */}
          {nodeData.type === "exfiltration" && nodeData.exfiltrationData && (
            <>
              <div>
                <Label htmlFor="exfil-method" className="text-sm">
                  Exfiltration Method
                </Label>
                <Select
                  value={nodeData.exfiltrationData.method}
                  onValueChange={(value) => handleExfiltrationChange("method", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select exfiltration method" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Cloud Storage">Cloud Storage</SelectItem>
                    <SelectItem value="FTP">FTP</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="DNS Tunneling">DNS Tunneling</SelectItem>
                    <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                    <SelectItem value="Physical Media">Physical Media</SelectItem>
                    <SelectItem value="Messaging">Messaging</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="destination" className="text-sm">
                  Destination
                </Label>
                <Input
                  id="destination"
                  value={nodeData.exfiltrationData.destination}
                  onChange={(e) => handleExfiltrationChange("destination", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., s3://attacker-bucket, ftp://evil.com, dropbox.com/shared"
                />
              </div>
              <div>
                <Label htmlFor="protocol" className="text-sm">
                  Protocol
                </Label>
                <Input
                  id="protocol"
                  value={nodeData.exfiltrationData.protocol}
                  onChange={(e) => handleExfiltrationChange("protocol", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., HTTPS, FTP, SMTP, DNS"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-sm">
                  Status
                </Label>
                <Select
                  value={nodeData.exfiltrationData.status}
                  onValueChange={(value) => handleExfiltrationChange("status", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Detected">Detected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="encryption"
                    checked={nodeData.exfiltrationData.encryption}
                    onCheckedChange={(checked) => handleExfiltrationChange("encryption", checked)}
                  />
                  <Label htmlFor="encryption" className="text-sm">
                    Encrypted
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="compression"
                    checked={nodeData.exfiltrationData.compression}
                    onCheckedChange={(checked) => handleExfiltrationChange("compression", checked)}
                  />
                  <Label htmlFor="compression" className="text-sm">
                    Compressed
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="volumeGB" className="text-sm">
                  Volume (GB)
                </Label>
                <Input
                  id="volumeGB"
                  type="number"
                  value={nodeData.exfiltrationData.volumeGB}
                  onChange={(e) => handleExfiltrationChange("volumeGB", Number.parseFloat(e.target.value) || 0)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="transferRate" className="text-sm">
                  Transfer Rate
                </Label>
                <Input
                  id="transferRate"
                  value={nodeData.exfiltrationData.transferRate}
                  onChange={(e) => handleExfiltrationChange("transferRate", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 10 MB/s, Throttled to 1 MB/s"
                />
              </div>
              <div>
                <Label htmlFor="exfiltrationWindow" className="text-sm">
                  Exfiltration Window
                </Label>
                <Select
                  value={nodeData.exfiltrationData.exfiltrationWindow}
                  onValueChange={(value) => handleExfiltrationChange("exfiltrationWindow", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select window" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Business Hours Only">Business Hours Only</SelectItem>
                    <SelectItem value="Off-peak">Off-peak</SelectItem>
                    <SelectItem value="Continuous">Continuous</SelectItem>
                    <SelectItem value="Weekends Only">Weekends Only</SelectItem>
                    <SelectItem value="Custom Schedule">Custom Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Data Types</Label>
                {nodeData.exfiltrationData.dataTypes.map((dataType, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={dataType}
                      onChange={(e) => handleDataTypeChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Customer PII, Financial Records"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDataType(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove data type"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDataType}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Data Type
                </Button>
              </div>
              <div>
                <Label className="text-sm">Detection Evasion Techniques</Label>
                {nodeData.exfiltrationData.detectionEvasion.map((technique, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={technique}
                      onChange={(e) => handleDetectionEvasionChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Traffic Mimicry, Steganography"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDetectionEvasion(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove detection evasion technique"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDetectionEvasion}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Evasion Technique
                </Button>
              </div>
            </>
          )}

          {/* Cloud Tenant-specific fields */}
          {nodeData.type === "cloud-tenant" && nodeData.cloudTenantData && (
            <>
              <div>
                <Label htmlFor="tenant-id" className="text-sm">
                  Tenant ID
                </Label>
                <Input
                  id="tenant-id"
                  value={nodeData.cloudTenantData.tenantId}
                  onChange={(e) => handleCloudTenantChange("tenantId", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700 font-mono"
                  placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                />
              </div>
              <div>
                <Label htmlFor="tenant-name" className="text-sm">
                  Tenant Name
                </Label>
                <Input
                  id="tenant-name"
                  value={nodeData.cloudTenantData.tenantName}
                  onChange={(e) => handleCloudTenantChange("tenantName", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., company.onmicrosoft.com"
                />
              </div>
              <div>
                <Label htmlFor="cloud-provider" className="text-sm">
                  Cloud Provider
                </Label>
                <Select
                  value={nodeData.cloudTenantData.cloudProvider}
                  onValueChange={(value) => handleCloudTenantChange("cloudProvider", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select cloud provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Azure">Azure</SelectItem>
                    <SelectItem value="AWS">AWS</SelectItem>
                    <SelectItem value="GCP">GCP</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tenant-type" className="text-sm">
                  Tenant Type
                </Label>
                <Select
                  value={nodeData.cloudTenantData.tenantType}
                  onValueChange={(value) => handleCloudTenantChange("tenantType", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select tenant type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Entra ID">Entra ID (Azure AD)</SelectItem>
                    <SelectItem value="AWS Organizations">AWS Organizations</SelectItem>
                    <SelectItem value="Google Workspace">Google Workspace</SelectItem>
                    <SelectItem value="Okta">Okta</SelectItem>
                    <SelectItem value="Auth0">Auth0</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subscription-id" className="text-sm">
                  Subscription ID (Azure)
                </Label>
                <Input
                  id="subscription-id"
                  value={nodeData.cloudTenantData.subscriptionId || ""}
                  onChange={(e) => handleCloudTenantChange("subscriptionId", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700 font-mono"
                  placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                />
              </div>
              <div>
                <Label htmlFor="account-id" className="text-sm">
                  Account ID (AWS)
                </Label>
                <Input
                  id="account-id"
                  value={nodeData.cloudTenantData.accountId || ""}
                  onChange={(e) => handleCloudTenantChange("accountId", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700 font-mono"
                  placeholder="e.g., 123456789012"
                />
              </div>
              <div>
                <Label htmlFor="project-id" className="text-sm">
                  Project ID (GCP)
                </Label>
                <Input
                  id="project-id"
                  value={nodeData.cloudTenantData.projectId || ""}
                  onChange={(e) => handleCloudTenantChange("projectId", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., my-project-123456"
                />
              </div>
              <div>
                <Label htmlFor="region" className="text-sm">
                  Region
                </Label>
                <Input
                  id="region"
                  value={nodeData.cloudTenantData.region}
                  onChange={(e) => handleCloudTenantChange("region", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., us-east-1, westeurope"
                />
              </div>
              <div>
                <Label htmlFor="environment" className="text-sm">
                  Environment
                </Label>
                <Select
                  value={nodeData.cloudTenantData.environment}
                  onValueChange={(value) => handleCloudTenantChange("environment", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Staging">Staging</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resource-count" className="text-sm">
                  Resource Count
                </Label>
                <Input
                  id="resource-count"
                  type="number"
                  value={nodeData.cloudTenantData.resourceCount}
                  onChange={(e) => handleCloudTenantChange("resourceCount", Number.parseInt(e.target.value) || 0)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="Number of resources"
                />
              </div>
              <div>
                <Label htmlFor="security-score" className="text-sm">
                  Security Score (0-100)
                </Label>
                <Input
                  id="security-score"
                  type="number"
                  min="0"
                  max="100"
                  value={nodeData.cloudTenantData.securityScore || ""}
                  onChange={(e) => handleCloudTenantChange("securityScore", Number.parseInt(e.target.value) || undefined)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="0-100"
                />
              </div>

            </>
          )}

          {/* Attacker-specific fields */}
          {nodeData.type === "attacker" && nodeData.attackerData && (
            <>
              <div>
                <Label className="text-sm">Target Industries</Label>
                {nodeData.attackerData.targetIndustries.map((industry, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={industry}
                      onChange={(e) => handleTargetIndustryChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Financial Services, Healthcare"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTargetIndustry(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove target industry"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTargetIndustry}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Target Industry
                </Button>
              </div>
              <div>
                <Label htmlFor="attacker-ip" className="text-sm">
                  IP
                </Label>
                <Input
                  id="attacker-ip"
                  value={nodeData.attackerData.ip}
                  onChange={(e) => handleAttackerChange("ip", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 192.168.1.100, 10.0.0.50"
                />
              </div>
              <div>
                <Label className="text-sm">Attack Vectors</Label>
                {nodeData.attackerData.attackVectors.map((vector, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={vector}
                      onChange={(e) => handleAttackVectorChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Phishing, Ransomware, APT"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttackVector(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove attack vector"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAttackVector}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Attack Vector
                </Button>
              </div>
              <div>
                <Label htmlFor="infrastructure-age" className="text-sm">
                  Infrastructure Age
                </Label>
                <Input
                  id="infrastructure-age"
                  value={nodeData.attackerData.infrastructureAge}
                  onChange={(e) => handleAttackerChange("infrastructureAge", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 2 years, 6 months, New"
                />
              </div>
              <div>
                <Label htmlFor="last-seen" className="text-sm">
                  Last Seen
                </Label>
                <Input
                  id="last-seen"
                  value={nodeData.attackerData.lastSeen}
                  onChange={(e) => handleAttackerChange("lastSeen", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 2024-01-15T10:30:00Z"
                />
              </div>
              <div>
                <Label htmlFor="first-seen" className="text-sm">
                  First Seen
                </Label>
                <Input
                  id="first-seen"
                  value={nodeData.attackerData.firstSeen}
                  onChange={(e) => handleAttackerChange("firstSeen", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 2023-06-01T00:00:00Z"
                />
              </div>
              <div>
                <Label htmlFor="infrastructure-status" className="text-sm">
                  Infrastructure Status
                </Label>
                <Select
                  value={nodeData.attackerData.infrastructureStatus}
                  onValueChange={(value) => handleAttackerChange("infrastructureStatus", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Dormant">Dormant</SelectItem>
                    <SelectItem value="Burned">Burned</SelectItem>
                    <SelectItem value="Migrating">Migrating</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="threat-actor" className="text-sm">
                  Threat Actor
                </Label>
                <Input
                  id="threat-actor"
                  value={nodeData.attackerData.threatActor}
                  onChange={(e) => handleAttackerChange("threatActor", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., APT29, Lazarus Group, Unknown"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-sm">
                  Location
                </Label>
                <Input
                  id="location"
                  value={nodeData.attackerData.location}
                  onChange={(e) => handleAttackerChange("location", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., Russia, North Korea, Unknown"
                />
              </div>
              <div>
                <Label htmlFor="hosting-provider" className="text-sm">
                  Hosting Provider
                </Label>
                <Input
                  id="hosting-provider"
                  value={nodeData.attackerData.hostingProvider}
                  onChange={(e) => handleAttackerChange("hostingProvider", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., OVH, DigitalOcean, AWS, Unknown"
                />
              </div>
              <div>
                <Label htmlFor="infrastructure-type" className="text-sm">
                  Infrastructure Type
                </Label>
                <Select
                  value={nodeData.attackerData.infrastructureType}
                  onValueChange={(value) => handleAttackerChange("infrastructureType", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select infrastructure type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="VPS">VPS</SelectItem>
                    <SelectItem value="Dedicated Server">Dedicated Server</SelectItem>
                    <SelectItem value="Cloud Instance">Cloud Instance</SelectItem>
                    <SelectItem value="Botnet">Botnet</SelectItem>
                    <SelectItem value="Compromised Host">Compromised Host</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Command & Control-specific fields */}
          {nodeData.type === "command-control" && nodeData.commandControlData && (
            <>
              <div>
                <Label htmlFor="c2-type" className="text-sm">
                  C2 Type
                </Label>
                <Select
                  value={nodeData.commandControlData.c2Type}
                  onValueChange={(value) => handleCommandControlChange("c2Type", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select C2 type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                    <SelectItem value="DNS">DNS</SelectItem>
                    <SelectItem value="ICMP">ICMP</SelectItem>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Cloud Service">Cloud Service</SelectItem>
                    <SelectItem value="P2P">P2P</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="c2-server" className="text-sm">
                  C2 Server
                </Label>
                <Input
                  id="c2-server"
                  value={nodeData.commandControlData.c2Server}
                  onChange={(e) => handleCommandControlChange("c2Server", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., evil.com, 192.168.1.100, pastebin.com/abc123"
                />
              </div>
              <div>
                <Label htmlFor="c2-protocol" className="text-sm">
                  C2 Protocol
                </Label>
                <Input
                  id="c2-protocol"
                  value={nodeData.commandControlData.c2Protocol}
                  onChange={(e) => handleCommandControlChange("c2Protocol", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., HTTPS, DNS over HTTPS, Twitter API"
                />
              </div>
              <div>
                <Label htmlFor="beacon-interval" className="text-sm">
                  Beacon Interval
                </Label>
                <Input
                  id="beacon-interval"
                  value={nodeData.commandControlData.beaconInterval}
                  onChange={(e) => handleCommandControlChange("beaconInterval", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., 30s, 5m, 1h, Random 1-10m"
                />
              </div>
              <div>
                <Label htmlFor="jitter" className="text-sm">
                  Jitter (%)
                </Label>
                <Input
                  id="jitter"
                  type="number"
                  min="0"
                  max="100"
                  value={nodeData.commandControlData.jitter}
                  onChange={(e) => handleCommandControlChange("jitter", Number.parseInt(e.target.value) || 0)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="0-100"
                />
              </div>
              <div>
                <Label htmlFor="implant-type" className="text-sm">
                  Implant Type
                </Label>
                <Input
                  id="implant-type"
                  value={nodeData.commandControlData.implantType}
                  onChange={(e) => handleCommandControlChange("implantType", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., Cobalt Strike, Metasploit, Custom RAT"
                />
              </div>
              <div>
                <Label htmlFor="operational-status" className="text-sm">
                  Operational Status
                </Label>
                <Select
                  value={nodeData.commandControlData.operationalStatus}
                  onValueChange={(value) => handleCommandControlChange("operationalStatus", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Dormant">Dormant</SelectItem>
                    <SelectItem value="Burned">Burned</SelectItem>
                    <SelectItem value="Migrating">Migrating</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="c2-encryption"
                    checked={nodeData.commandControlData.encryption}
                    onCheckedChange={(checked) => handleCommandControlChange("encryption", checked)}
                  />
                  <Label htmlFor="c2-encryption" className="text-sm">
                    Encrypted
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="kill-switch"
                    checked={nodeData.commandControlData.killSwitchEnabled}
                    onCheckedChange={(checked) => handleCommandControlChange("killSwitchEnabled", checked)}
                  />
                  <Label htmlFor="kill-switch" className="text-sm">
                    Kill Switch
                  </Label>
                </div>
              </div>
              <div>
                <Label className="text-sm">Obfuscation Techniques</Label>
                {nodeData.commandControlData.obfuscation.map((technique, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={technique}
                      onChange={(e) => handleObfuscationChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Domain Fronting, Fast Flux, DGA"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveObfuscation(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove obfuscation technique"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddObfuscation}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Obfuscation
                </Button>
              </div>
              <div>
                <Label className="text-sm">Fallback Channels</Label>
                {nodeData.commandControlData.fallbackChannels.map((channel, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={channel}
                      onChange={(e) => handleFallbackChannelChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., backup.evil.com, twitter.com/evilaccount"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFallbackChannel(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove fallback channel"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFallbackChannel}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Fallback Channel
                </Button>
              </div>
              <div>
                <Label className="text-sm">Persistence Methods</Label>
                {nodeData.commandControlData.persistenceMethods.map((method, index) => (
                  <div key={index} className="mt-1 flex items-center gap-2">
                    <Input
                      value={method}
                      onChange={(e) => handlePersistenceMethodChange(index, e.target.value)}
                      className="flex-1 bg-gray-800 text-white border-gray-700"
                      placeholder="e.g., Registry, Scheduled Task, Service"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePersistenceMethod(index)}
                      className="text-red-400 hover:bg-gray-700"
                      aria-label="Remove persistence method"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPersistenceMethod}
                  className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Persistence Method
                </Button>
              </div>
            </>
          )}

          {/* Standard node fields for non-identity, non-cloud-tenant, and non-group nodes */}
          {nodeData.type !== "identity" && nodeData.type !== "cloud-tenant" && nodeData.type !== "group" && (
            <>
              <div>
                <Label htmlFor="hostname" className="text-sm">
                  Hostname
                </Label>
                <Input
                  id="hostname"
                  value={nodeData.hostname || ""}
                  onChange={(e) => handleNodeChange("hostname", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="ipAddress" className="text-sm">
                  IP Address
                </Label>
                <Input
                  id="ipAddress"
                  value={nodeData.ipAddress || ""}
                  onChange={(e) => handleNodeChange("ipAddress", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="os" className="text-sm">
                  Operating System
                </Label>
                <Input
                  id="os"
                  value={nodeData.os || ""}
                  onChange={(e) => handleNodeChange("os", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                />
              </div>
            </>
          )}

          {nodeData.type !== "group" && (
            <div>
              <Label htmlFor="criticality" className="text-sm">
                Criticality
              </Label>
              <Select
                value={nodeData.criticality}
                onValueChange={(value: Criticality) => handleNodeChange("criticality", value)}
              >
                <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                  <SelectValue placeholder="Select criticality" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700">
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeData.type !== "identity" && nodeData.type !== "cloud-tenant" && nodeData.type !== "group" && (
            <div>
              <Label className="text-sm">Services</Label>
              {nodeData.services.map((service, index) => (
                <div key={index} className="mt-1 flex items-center gap-2">
                  <Input
                    value={service}
                    onChange={(e) => handleServiceChange(index, e.target.value)}
                    className="flex-1 bg-gray-800 text-white border-gray-700"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveService(index)}
                    className="text-red-400 hover:bg-gray-700"
                    aria-label="Remove service"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddService}
                className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Service
              </Button>
            </div>
          )}

          {nodeData.type !== "group" && (
            <div>
              <Label className="text-sm">Actions</Label>
              {(nodeData.actions || []).map((action, index) => {
                const ActionIcon = actionIcons[action.type] || Info // Get the icon based on action type
                return (
                  <div key={action.id} className="mt-2 rounded-md border border-gray-700 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Action {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAction(index)}
                        className="text-red-400 hover:bg-gray-700"
                        aria-label="Remove action"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div>
                      <Label htmlFor={`action-type-${index}`} className="text-xs">
                        Type
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        {" "}
                        {/* Added flex container for icon and select */}
                        <ActionIcon className="h-4 w-4 text-purple-400" /> {/* Display the icon */}
                        <Select
                          value={action.type}
                          onValueChange={(value: ActionType) => handleActionChange(index, "type", value)}
                        >
                          <SelectTrigger
                            id={`action-type-${index}`}
                            className="flex-1 bg-gray-800 text-white border-gray-700 text-xs"
                          >
                            <SelectValue placeholder="Select action type" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 text-white border-gray-700">
                            {ACTION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`action-technique-${index}`} className="text-xs">
                        Technique
                      </Label>
                      <Input
                        id={`action-technique-${index}`}
                        value={action.technique}
                        onChange={(e) => handleActionChange(index, "technique", e.target.value)}
                        className="mt-1 bg-gray-800 text-white border-gray-700 text-xs"
                        placeholder="e.g., SQL Injection"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`action-details-${index}`} className="text-xs">
                        Details
                      </Label>
                      <Textarea
                        id={`action-details-${index}`}
                        value={action.details}
                        onChange={(e) => handleActionChange(index, "details", e.target.value)}
                        className="mt-1 bg-gray-800 text-white border-gray-700 text-xs"
                        placeholder="e.g., webshell placed in C:\inet\, local user created"
                      />
                    </div>
                  </div>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAction}
                className="mt-2 w-full border-gray-700 text-white hover:bg-gray-700 bg-transparent"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Action
              </Button>
            </div>
          )}

          <div>
            <Label htmlFor="description" className="text-sm">
              Description
            </Label>
            <Textarea
              id="description"
              value={nodeData.description || ""}
              onChange={(e) => handleNodeChange("description", e.target.value)}
              className="mt-1 bg-gray-800 text-white border-gray-700"
              placeholder="Additional notes about this asset"
            />
          </div>

          {/* Display Settings Section */}
          {nodeData.type !== "group" && (
            <div className="border-t border-gray-700 pt-4">
              <Label className="text-sm font-semibold text-gray-300">Display Settings</Label>
              <div className="mt-2 space-y-2">
                {nodeData.type !== "identity" &&
                  nodeData.type !== "exfiltration" &&
                  nodeData.type !== "command-control" && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-hostname" className="text-xs text-gray-400">
                          Show Hostname
                        </Label>
                        <Switch
                          id="show-hostname"
                          checked={nodeData.displaySettings.showHostname}
                          onCheckedChange={(checked) => handleDisplaySettingChange("showHostname", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-ip" className="text-xs text-gray-400">
                          Show IP Address
                        </Label>
                        <Switch
                          id="show-ip"
                          checked={nodeData.displaySettings.showIpAddress}
                          onCheckedChange={(checked) => handleDisplaySettingChange("showIpAddress", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-os" className="text-xs text-gray-400">
                          Show OS
                        </Label>
                        <Switch
                          id="show-os"
                          checked={nodeData.displaySettings.showOs}
                          onCheckedChange={(checked) => handleDisplaySettingChange("showOs", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-services" className="text-xs text-gray-400">
                          Show Services
                        </Label>
                        <Switch
                          id="show-services"
                          checked={nodeData.displaySettings.showServices}
                          onCheckedChange={(checked) => handleDisplaySettingChange("showServices", checked)}
                        />
                      </div>
                    </>
                  )}

                {nodeData.type === "identity" && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-username" className="text-xs text-gray-400">
                        Show Username
                      </Label>
                      <Switch
                        id="show-username"
                        checked={nodeData.displaySettings.showUsername}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showUsername", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-domain" className="text-xs text-gray-400">
                        Show Domain
                      </Label>
                      <Switch
                        id="show-domain"
                        checked={nodeData.displaySettings.showDomain}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showDomain", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-account-type" className="text-xs text-gray-400">
                        Show Account Type
                      </Label>
                      <Switch
                        id="show-account-type"
                        checked={nodeData.displaySettings.showAccountType}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showAccountType", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-account-source" className="text-xs text-gray-400">
                        Show Account Source
                      </Label>
                      <Switch
                        id="show-account-source"
                        checked={nodeData.displaySettings.showAccountSource}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showAccountSource", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-account-status" className="text-xs text-gray-400">
                        Show Account Status
                      </Label>
                      <Switch
                        id="show-account-status"
                        checked={nodeData.displaySettings.showAccountStatus}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showAccountStatus", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-mfa-status" className="text-xs text-gray-400">
                        Show MFA Status
                      </Label>
                      <Switch
                        id="show-mfa-status"
                        checked={nodeData.displaySettings.showMfaStatus}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showMfaStatus", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-risk-level" className="text-xs text-gray-400">
                        Show Risk Level
                      </Label>
                      <Switch
                        id="show-risk-level"
                        checked={nodeData.displaySettings.showRiskLevel}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showRiskLevel", checked)}
                      />
                    </div>
                  </>
                )}

                {nodeData.type === "exfiltration" && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-method" className="text-xs text-gray-400">
                        Show Method
                      </Label>
                      <Switch
                        id="show-method"
                        checked={nodeData.displaySettings.showMethod}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showMethod", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-destination" className="text-xs text-gray-400">
                        Show Destination
                      </Label>
                      <Switch
                        id="show-destination"
                        checked={nodeData.displaySettings.showDestination}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showDestination", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-status" className="text-xs text-gray-400">
                        Show Status
                      </Label>
                      <Switch
                        id="show-status"
                        checked={nodeData.displaySettings.showStatus}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showStatus", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-volume" className="text-xs text-gray-400">
                        Show Volume
                      </Label>
                      <Switch
                        id="show-volume"
                        checked={nodeData.displaySettings.showVolume}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showVolume", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-data-types" className="text-xs text-gray-400">
                        Show Data Types
                      </Label>
                      <Switch
                        id="show-data-types"
                        checked={nodeData.displaySettings.showDataTypes}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showDataTypes", checked)}
                      />
                    </div>
                  </>
                )}

                {nodeData.type === "command-control" && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-c2-type" className="text-xs text-gray-400">
                        Show C2 Type
                      </Label>
                      <Switch
                        id="show-c2-type"
                        checked={nodeData.displaySettings.showC2Type}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showC2Type", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-c2-server" className="text-xs text-gray-400">
                        Show C2 Server
                      </Label>
                      <Switch
                        id="show-c2-server"
                        checked={nodeData.displaySettings.showC2Server}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showC2Server", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-beacon-interval" className="text-xs text-gray-400">
                        Show Beacon Interval
                      </Label>
                      <Switch
                        id="show-beacon-interval"
                        checked={nodeData.displaySettings.showBeaconInterval}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showBeaconInterval", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-implant-type" className="text-xs text-gray-400">
                        Show Implant Type
                      </Label>
                      <Switch
                        id="show-implant-type"
                        checked={nodeData.displaySettings.showImplantType}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showImplantType", checked)}
                      />
                    </div>
                  </>
                )}

                {nodeData.type === "cloud-tenant" && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-tenant-id" className="text-xs text-gray-400">
                        Show Tenant ID
                      </Label>
                      <Switch
                        id="show-tenant-id"
                        checked={nodeData.displaySettings.showTenantId}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showTenantId", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-tenant-name" className="text-xs text-gray-400">
                        Show Tenant Name
                      </Label>
                      <Switch
                        id="show-tenant-name"
                        checked={nodeData.displaySettings.showTenantName}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showTenantName", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-cloud-provider" className="text-xs text-gray-400">
                        Show Cloud Provider
                      </Label>
                      <Switch
                        id="show-cloud-provider"
                        checked={nodeData.displaySettings.showCloudProvider}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showCloudProvider", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-tenant-type" className="text-xs text-gray-400">
                        Show Tenant Type
                      </Label>
                      <Switch
                        id="show-tenant-type"
                        checked={nodeData.displaySettings.showTenantType}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showTenantType", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-region" className="text-xs text-gray-400">
                        Show Region
                      </Label>
                      <Switch
                        id="show-region"
                        checked={nodeData.displaySettings.showRegion}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showRegion", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-environment" className="text-xs text-gray-400">
                        Show Environment
                      </Label>
                      <Switch
                        id="show-environment"
                        checked={nodeData.displaySettings.showEnvironment}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showEnvironment", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-resource-count" className="text-xs text-gray-400">
                        Show Resource Count
                      </Label>
                      <Switch
                        id="show-resource-count"
                        checked={nodeData.displaySettings.showResourceCount}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showResourceCount", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-security-score" className="text-xs text-gray-400">
                        Show Security Score
                      </Label>
                      <Switch
                        id="show-security-score"
                        checked={nodeData.displaySettings.showSecurityScore}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showSecurityScore", checked)}
                      />
                    </div>
                  </>
                )}

                {nodeData.type === "attacker" && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-target-industries" className="text-xs text-gray-400">
                        Show Target Industries
                      </Label>
                      <Switch
                        id="show-target-industries"
                        checked={nodeData.displaySettings.showTargetIndustries}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showTargetIndustries", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-attacker-ip" className="text-xs text-gray-400">
                        Show IP
                      </Label>
                      <Switch
                        id="show-attacker-ip"
                        checked={nodeData.displaySettings.showIp}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showIp", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-attack-vectors" className="text-xs text-gray-400">
                        Show Attack Vectors
                      </Label>
                      <Switch
                        id="show-attack-vectors"
                        checked={nodeData.displaySettings.showAttackVectors}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showAttackVectors", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-infrastructure-age" className="text-xs text-gray-400">
                        Show Infrastructure Age
                      </Label>
                      <Switch
                        id="show-infrastructure-age"
                        checked={nodeData.displaySettings.showInfrastructureAge}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showInfrastructureAge", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-last-seen" className="text-xs text-gray-400">
                        Show Last Seen
                      </Label>
                      <Switch
                        id="show-last-seen"
                        checked={nodeData.displaySettings.showLastSeen}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showLastSeen", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-first-seen" className="text-xs text-gray-400">
                        Show First Seen
                      </Label>
                      <Switch
                        id="show-first-seen"
                        checked={nodeData.displaySettings.showFirstSeen}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showFirstSeen", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-infrastructure-status" className="text-xs text-gray-400">
                        Show Infrastructure Status
                      </Label>
                      <Switch
                        id="show-infrastructure-status"
                        checked={nodeData.displaySettings.showInfrastructureStatus}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showInfrastructureStatus", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-threat-actor" className="text-xs text-gray-400">
                        Show Threat Actor
                      </Label>
                      <Switch
                        id="show-threat-actor"
                        checked={nodeData.displaySettings.showThreatActor}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showThreatActor", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-location" className="text-xs text-gray-400">
                        Show Location
                      </Label>
                      <Switch
                        id="show-location"
                        checked={nodeData.displaySettings.showLocation}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showLocation", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-hosting-provider" className="text-xs text-gray-400">
                        Show Hosting Provider
                      </Label>
                      <Switch
                        id="show-hosting-provider"
                        checked={nodeData.displaySettings.showHostingProvider}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showHostingProvider", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-infrastructure-type" className="text-xs text-gray-400">
                        Show Infrastructure Type
                      </Label>
                      <Switch
                        id="show-infrastructure-type"
                        checked={nodeData.displaySettings.showInfrastructureType}
                        onCheckedChange={(checked) => handleDisplaySettingChange("showInfrastructureType", checked)}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-criticality" className="text-xs text-gray-400">
                    Show Criticality
                  </Label>
                  <Switch
                    id="show-criticality"
                    checked={nodeData.displaySettings.showCriticality}
                    onCheckedChange={(checked) => handleDisplaySettingChange("showCriticality", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-actions" className="text-xs text-gray-400">
                    Show Actions
                  </Label>
                  <Switch
                    id="show-actions"
                    checked={nodeData.displaySettings.showActions}
                    onCheckedChange={(checked) => handleDisplaySettingChange("showActions", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-description" className="text-xs text-gray-400">
                    Show Description
                  </Label>
                  <Switch
                    id="show-description"
                    checked={nodeData.displaySettings.showDescription}
                    onCheckedChange={(checked) => handleDisplaySettingChange("showDescription", checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {edgeData && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="edge-label" className="text-sm">
              Label
            </Label>
            <Input
              id="edge-label"
              value={edgeData.label || ""}
              onChange={(e) => handleEdgeChange("label", e.target.value)}
              className="mt-1 bg-gray-800 text-white border-gray-700"
            />
          </div>
          <div>
            <Label htmlFor="edge-action-type" className="text-sm">
              Action Type
            </Label>
            <Select
              value={edgeData.actionType}
              onValueChange={(value: EdgeActionType) => handleEdgeChange("actionType", value)}
            >
              <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                {EDGE_ACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields based on action type */}
          {edgeData.actionType === "Command & Control" ? (
            <>
              <div>
                <Label htmlFor="c2-channel" className="text-sm">
                  C2 Channel
                </Label>
                <Select
                  value={edgeData.c2Channel || ""}
                  onValueChange={(value) => handleEdgeChange("c2Channel", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select C2 channel" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                    <SelectItem value="DNS">DNS</SelectItem>
                    <SelectItem value="ICMP">ICMP</SelectItem>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Cloud Service">Cloud Service</SelectItem>
                    <SelectItem value="P2P">P2P</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="c2-framework" className="text-sm">
                  C2 Framework
                </Label>
                <Select
                  value={edgeData.c2Framework || ""}
                  onValueChange={(value) => handleEdgeChange("c2Framework", value)}
                >
                  <SelectTrigger className="mt-1 w-full bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select C2 framework" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="Cobalt Strike">Cobalt Strike</SelectItem>
                    <SelectItem value="Empire">Empire</SelectItem>
                    <SelectItem value="Metasploit">Metasploit</SelectItem>
                    <SelectItem value="Covenant">Covenant</SelectItem>
                    <SelectItem value="Sliver">Sliver</SelectItem>
                    <SelectItem value="Mythic">Mythic</SelectItem>
                    <SelectItem value="PoshC2">PoshC2</SelectItem>
                    <SelectItem value="Havoc">Havoc</SelectItem>
                    <SelectItem value="Custom RAT">Custom RAT</SelectItem>
                    <SelectItem value="Living off the Land">Living off the Land</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="tool-used" className="text-sm">
                  Tool Used
                </Label>
                <Input
                  id="tool-used"
                  value={edgeData.toolUsed}
                  onChange={(e) => handleEdgeChange("toolUsed", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., Mimikatz, PSEXEC"
                />
              </div>
              <div>
                <Label htmlFor="user-used" className="text-sm">
                  User Used
                </Label>
                <Input
                  id="user-used"
                  value={edgeData.userUsed}
                  onChange={(e) => handleEdgeChange("userUsed", e.target.value)}
                  className="mt-1 bg-gray-800 text-white border-gray-700"
                  placeholder="e.g., test.local\\httpsvc, Administrator"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="timestamp" className="text-sm">
              Timestamp (ISO8601)
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="timestamp"
                type="datetime-local"
                value={toLocalInputValue(edgeData.timestamp)}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) {
                    handleEdgeChange("timestamp", "")
                    return
                  }
                  const parsedDate = new Date(value)
                  handleEdgeChange(
                    "timestamp",
                    Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString(),
                  )
                }}
                className="bg-gray-800 text-white border-gray-700"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-700"
                onClick={() => handleEdgeChange("timestamp", new Date().toISOString())}
              >
                Now
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-700"
                onClick={() => handleEdgeChange("timestamp", "")}
              >
                Clear
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="mitre-attack-id" className="text-sm">
              MITRE ATT&CK ID
            </Label>
            <MitreTechniquePicker
              techniques={normalizeMitreTechniqueReferences(
                edgeData.mitreAttackTechniques,
                edgeData.mitreAttackId,
                edgeData.mitreAttackName,
              )}
              onChange={handleMitreTechniqueChange}
            />
          </div>
          <div>
            <Label htmlFor="edge-description" className="text-sm">
              Description
            </Label>
            <Textarea
              id="edge-description"
              value={edgeData.description}
              onChange={(e) => handleEdgeChange("description", e.target.value)}
              className="mt-1 bg-gray-800 text-white border-gray-700"
              placeholder="Detailed description of the technique and its execution."
            />
          </div>

          {/* Edge Display Settings */}
          <div className="border-t border-gray-700 pt-4">
            <Label className="text-sm font-semibold text-gray-300">Display Settings</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-label" className="text-xs text-gray-400">
                  Show Label Box
                </Label>
                <Switch
                  id="show-label"
                  checked={edgeData.displaySettings?.showLabel ?? true}
                  onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showLabel", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-tool" className="text-xs text-gray-400">
                  Show Tool
                </Label>
                <Switch
                  id="show-tool"
                  checked={edgeData.displaySettings?.showTool ?? true}
                  onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showTool", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-user" className="text-xs text-gray-400">
                  Show User
                </Label>
                <Switch
                  id="show-user"
                  checked={edgeData.displaySettings?.showUser ?? true}
                  onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showUser", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-timestamp" className="text-xs text-gray-400">
                  Show Timestamp
                </Label>
                <Switch
                  id="show-timestamp"
                  checked={edgeData.displaySettings?.showTimestamp ?? true}
                  onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showTimestamp", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-mitre-id" className="text-xs text-gray-400">
                  Show MITRE ID
                </Label>
                <Switch
                  id="show-mitre-id"
                  checked={edgeData.displaySettings?.showMitreId ?? false}
                  onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showMitreId", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-description" className="text-xs text-gray-400">
                  Show Description
                </Label>
                <Switch
                  id="show-description"
                  checked={edgeData.displaySettings?.showDescription ?? false}
                  onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showDescription", checked)}
                />
              </div>
              {edgeData.actionType === "Command & Control" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-c2-channel" className="text-xs text-gray-400">
                      Show C2 Channel
                    </Label>
                    <Switch
                      id="show-c2-channel"
                      checked={edgeData.displaySettings?.showC2Channel ?? true}
                      onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showC2Channel", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-c2-framework" className="text-xs text-gray-400">
                      Show C2 Framework
                    </Label>
                    <Switch
                      id="show-c2-framework"
                      checked={edgeData.displaySettings?.showC2Framework ?? true}
                      onCheckedChange={(checked) => handleEdgeDisplaySettingChange("showC2Framework", checked)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
