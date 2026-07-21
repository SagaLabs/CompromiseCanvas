import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react"
import { Handle, Position, NodeResizer, type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import NodeToolbar from "./node-toolbar"
import {
  Server,
  Database,
  Laptop,
  Shield,
  Router,
  Mail,
  Folder,
  ServerCog,
  Key,
  MoveRight,
  ArrowUpCircle,
  Upload,
  Eye,
  HardDrive,
  Terminal,
  Zap,
  Info,
  UserCheck,
  Radio,
  Skull,
  HelpCircle,

  AlertTriangle,
  UserX,
  Cloud,
  Loader,
  Box,
  Layers,
  Building2,
  MessageSquare,
  Users,
  Calendar,
  Video,
  Clock,
  CheckCircle,
} from "lucide-react"
import type { NodeData, Criticality, InvestigationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const assetIcons = {
  "web-server": Server,
  database: Database,
  workstation: Laptop,
  "domain-controller": Shield,
  firewall: Router, // Using Router for Firewall as it's network-related
  router: Router,
  "email-server": Mail,
  "file-server": Folder,
  identity: UserCheck,
  exfiltration: Upload,
  "command-control": Radio,
  attacker: UserX,
  "cloud-instance": Cloud,
  "cloud-storage": HardDrive,
  "cloud-database": Database,
  "cloud-load-balancer": Loader,
  "cloud-container": Box,
  "cloud-function": Zap,
  "cloud-kubernetes": Layers,
  "cloud-tenant": Building2,
  "cloud-email": Mail,
  "cloud-productivity-storage": Folder,
  "cloud-collaboration": MessageSquare,
  "cloud-calendar": Calendar,
  "cloud-video": Video,
  group: Users,
  other: HelpCircle,
}

const criticalityColors: Record<Criticality, string> = {
  Low: "bg-green-500",
  Medium: "bg-yellow-500",
  High: "bg-orange-500",
  Critical: "bg-red-500",
}

const actionIcons = {
  "Initial Access": Key,
  "Lateral Movement": MoveRight,
  "Privilege Escalation": ArrowUpCircle,
  Persistence: HardDrive,
  "Defense Evasion": Shield,
  "Credential Access": Key,
  Discovery: Eye,
  Collection: Folder,
  Exfiltration: Upload,
  "Command and Control": Terminal,
  Impact: Zap,
  Other: Info,
}

const CustomNode = memo(function CustomNode({ data, isConnectable, selected, id }: NodeProps<Node<NodeData>>) {
  const { setNodes } = useReactFlow()
  const Icon = assetIcons[data.type] || ServerCog // Default icon
  const CriticalityColorClass = criticalityColors[data.criticality] || "bg-gray-500"

  // Memoize node className to avoid repeated conditional evaluation
  const nodeClassName = useMemo(() => {
    if (data.type === "attacker") {
      return "ip-attacker shadow-lg"
    }
    if (data.isCompromised) {
      return "bg-red-900/30 border-red-500/50"
    }
    switch (data.investigationStatus) {
      case "Done":
        return "bg-green-900/20 border-green-500/40"
      case "Investigating":
        return "bg-yellow-900/20 border-yellow-500/40"
      case "Not Investigated":
        return "bg-purple-900/20 border-purple-500/40"
      default:
        return "bg-gray-800 border-gray-700"
    }
  }, [data.type, data.isCompromised, data.investigationStatus])

  // Memoize date formatting for attacker nodes
  const formattedDates = useMemo(() => {
    if (data.type !== "attacker" || !data.attackerData) return null
    return {
      lastSeen: data.attackerData.lastSeen
        ? new Date(data.attackerData.lastSeen).toLocaleDateString()
        : null,
      firstSeen: data.attackerData.firstSeen
        ? new Date(data.attackerData.firstSeen).toLocaleDateString()
        : null,
    }
  }, [data.type, data.attackerData?.lastSeen, data.attackerData?.firstSeen])

  // Memoize style object to prevent recreation on every render
  const nodeStyle = useMemo(() => ({
    width: data.width || 'auto',
    height: data.height || 'auto',
    minWidth: '200px',
    minHeight: '120px',
  }), [data.width, data.height])

  const renderNodeInfo = () => {
    if (data.type === "identity" && data.identityData) {
      return (
        <div className="mt-1 text-sm text-gray-400 text-center">
          {data.displaySettings.showUsername && data.identityData.username && (
            <div>
              {data.displaySettings.showDomain && data.identityData.domain && `${data.identityData.domain}\\`}
              {data.identityData.username}
            </div>
          )}
          {data.displaySettings.showAccountType && data.identityData.accountType && (
            <div className="text-xs">{data.identityData.accountType}</div>
          )}
          {data.displaySettings.showAccountSource && data.identityData.accountSource && (
            <div className="text-xs">{data.identityData.accountSource}</div>
          )}
          {data.displaySettings.showAccountStatus && data.identityData.accountStatus && (
            <div className="text-xs">Status: {data.identityData.accountStatus}</div>
          )}
          {data.displaySettings.showMfaStatus && (
            <div className="text-xs">MFA: {data.identityData.mfaEnabled ? "Enabled" : "Disabled"}</div>
          )}
        </div>
      )
    }

    if (data.type === "exfiltration" && data.exfiltrationData) {
      return (
        <div className="mt-1 text-sm text-gray-400 text-center">
          {data.displaySettings.showMethod && data.exfiltrationData.method && <div>{data.exfiltrationData.method}</div>}
          {data.displaySettings.showDestination && data.exfiltrationData.destination && (
            <div className="text-xs">{data.exfiltrationData.destination}</div>
          )}
          {data.displaySettings.showVolume && data.exfiltrationData.volumeGB > 0 && (
            <div className="text-xs">{data.exfiltrationData.volumeGB} GB</div>
          )}
          {data.displaySettings.showDataTypes &&
            data.exfiltrationData.dataTypes &&
            data.exfiltrationData.dataTypes.length > 0 && (
              <div className="text-xs">
                Types: {data.exfiltrationData.dataTypes.slice(0, 2).join(", ")}
                {data.exfiltrationData.dataTypes.length > 2 ? "…" : ""}
              </div>
            )}
        </div>
      )
    }

    if (data.type === "command-control" && data.commandControlData) {
      return (
        <div className="mt-1 text-sm text-gray-400 text-center">
          {data.displaySettings.showC2Type && data.commandControlData.c2Type && (
            <div>{data.commandControlData.c2Type}</div>
          )}
          {data.displaySettings.showC2Server && data.commandControlData.c2Server && (
            <div className="text-xs">{data.commandControlData.c2Server}</div>
          )}
          {data.displaySettings.showBeaconInterval && data.commandControlData.beaconInterval && (
            <div className="text-xs">Beacon: {data.commandControlData.beaconInterval}</div>
          )}
          {data.displaySettings.showImplantType && data.commandControlData.implantType && (
            <div className="text-xs">{data.commandControlData.implantType}</div>
          )}
        </div>
      )
    }

    if (data.type === "cloud-tenant" && data.cloudTenantData) {
      return (
        <div className="mt-1 text-sm text-gray-400 text-center">
          {data.displaySettings.showTenantId && data.cloudTenantData.tenantId && (
            <div className="text-xs font-mono">{data.cloudTenantData.tenantId}</div>
          )}
          {data.displaySettings.showTenantName && data.cloudTenantData.tenantName && (
            <div className="text-xs">{data.cloudTenantData.tenantName}</div>
          )}
          {data.displaySettings.showCloudProvider && data.cloudTenantData.cloudProvider && (
            <div className="text-xs">{data.cloudTenantData.cloudProvider}</div>
          )}
          {data.displaySettings.showTenantType && data.cloudTenantData.tenantType && (
            <div className="text-xs">{data.cloudTenantData.tenantType}</div>
          )}
          {data.displaySettings.showRegion && data.cloudTenantData.region && (
            <div className="text-xs">{data.cloudTenantData.region}</div>
          )}
          {data.displaySettings.showEnvironment && data.cloudTenantData.environment && (
            <div className="text-xs">{data.cloudTenantData.environment}</div>
          )}
          {data.displaySettings.showResourceCount && data.cloudTenantData.resourceCount > 0 && (
            <div className="text-xs">{data.cloudTenantData.resourceCount} resources</div>
          )}
          {data.displaySettings.showSecurityScore && data.cloudTenantData.securityScore !== undefined && (
            <div className="text-xs">Security: {data.cloudTenantData.securityScore}/100</div>
          )}
        </div>
      )
    }

    if (data.type === "attacker" && data.attackerData) {
      return (
        <div className="mt-1 text-sm text-gray-400 text-center">
          {data.displaySettings.showTargetIndustries && data.attackerData.targetIndustries && data.attackerData.targetIndustries.length > 0 && (
            <div className="text-xs">
              Targets: {data.attackerData.targetIndustries.slice(0, 2).join(", ")}
              {data.attackerData.targetIndustries.length > 2 ? "…" : ""}
            </div>
          )}
          {data.displaySettings.showIp && data.attackerData.ip && (
            <div className="text-xs">{data.attackerData.ip}</div>
          )}
          {data.displaySettings.showAttackVectors && data.attackerData.attackVectors && data.attackerData.attackVectors.length > 0 && (
            <div className="text-xs">
              Vectors: {data.attackerData.attackVectors.slice(0, 2).join(", ")}
              {data.attackerData.attackVectors.length > 2 ? "…" : ""}
            </div>
          )}
          {data.displaySettings.showInfrastructureAge && data.attackerData.infrastructureAge && (
            <div className="text-xs">Age: {data.attackerData.infrastructureAge}</div>
          )}
          {data.displaySettings.showLastSeen && formattedDates?.lastSeen && (
            <div className="text-xs">Last: {formattedDates.lastSeen}</div>
          )}
          {data.displaySettings.showFirstSeen && formattedDates?.firstSeen && (
            <div className="text-xs">First: {formattedDates.firstSeen}</div>
          )}
          {data.displaySettings.showInfrastructureStatus && data.attackerData.infrastructureStatus && (
            <div className="text-xs">Status: {data.attackerData.infrastructureStatus}</div>
          )}
          {data.displaySettings.showThreatActor && data.attackerData.threatActor && (
            <div className="text-xs">{data.attackerData.threatActor}</div>
          )}
          {data.displaySettings.showLocation && data.attackerData.location && (
            <div className="text-xs">{data.attackerData.location}</div>
          )}
          {data.displaySettings.showHostingProvider && data.attackerData.hostingProvider && (
            <div className="text-xs">{data.attackerData.hostingProvider}</div>
          )}
          {data.displaySettings.showInfrastructureType && data.attackerData.infrastructureType && (
            <div className="text-xs">{data.attackerData.infrastructureType}</div>
          )}
        </div>
      )
    }

    // Default display for other node types (including "other")
    const infoItems = []

    // Don't show hostname, IP, or OS for cloud tenant or attacker nodes
    if (data.type !== "cloud-tenant" && data.type !== "attacker") {
      if (data.displaySettings.showHostname && data.hostname) {
        infoItems.push(data.hostname)
      }

      if (data.displaySettings.showIpAddress && data.ipAddress) {
        infoItems.push(data.ipAddress)
      }

      if (data.displaySettings.showOs && data.os) {
        infoItems.push(data.os)
      }
    }

    if (data.displaySettings.showServices && data.services && data.services.length > 0) {
      infoItems.push(`Services: ${data.services.join(", ")}`)
    }

    if (infoItems.length === 0) {
      return <div className="mt-1 text-sm text-gray-400">No display info</div>
    }

    return (
      <div className="mt-1 text-sm text-gray-400 text-center">
        {infoItems.map((item, index) => (
          <div key={index} className={index > 0 ? "text-xs" : ""}>
            {item}
          </div>
        ))}
      </div>
    )
  }

  const renderStatusBadge = () => {
    let statusLabel = ""
    let statusValue = ""
    let shouldShow = false

    if (data.type === "identity") {
      statusLabel = "Risk Level:"
      statusValue = data.identityData?.riskLevel || data.criticality
      shouldShow = data.displaySettings.showRiskLevel
    } else if (data.type === "exfiltration") {
      statusLabel = "Status:"
      statusValue = data.exfiltrationData?.status || "Planned"
      shouldShow = data.displaySettings.showStatus
    } else if (data.type === "command-control") {
      statusLabel = "Status:"
      statusValue = data.commandControlData?.operationalStatus || "Active"
      shouldShow = data.displaySettings.showStatus
    } else if (data.type === "attacker") {
      statusLabel = "Status:"
      statusValue = data.attackerData?.infrastructureStatus || "Active"
      shouldShow = data.displaySettings.showInfrastructureStatus
    } else {
      statusLabel = "Criticality:"
      statusValue = data.criticality
      shouldShow = data.displaySettings.showCriticality
    }

    if (!shouldShow) {
      return null
    }

    return (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="font-medium">{statusLabel}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-white", CriticalityColorClass)}>{statusValue}</span>
      </div>
    )
  }

  const [isHovered, setIsHovered] = useState(false)
  // Keep the toolbar mounted while its status menu is open (pointer leaves the node).
  const [menuOpen, setMenuOpen] = useState(false)

  // Hover-intent: delay hiding so the pointer can travel from the node to the
  // floating toolbar without it vanishing mid-reach.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToolbar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setIsHovered(true)
  }, [])
  const hideToolbar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setIsHovered(false), 300)
  }, [])
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const toggleCompromised = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isCompromised: !node.data.isCompromised } }
          : node,
      ),
    )
  }, [id, setNodes])

  const setInvestigationStatus = useCallback(
    (investigationStatus: InvestigationStatus) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, investigationStatus } } : node,
        ),
      )
    },
    [id, setNodes],
  )

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border px-4 py-3 shadow-md",
        nodeClassName,
        "text-white",
        selected && "animate-border-pulse border-4 border-blue-400"
      )}
      style={nodeStyle}
      onMouseEnter={showToolbar}
      onMouseLeave={hideToolbar}
    >
      {data.type !== "attacker" && (
        <NodeToolbar
          nodeId={id}
          isVisible={isHovered || selected || menuOpen}
          isCompromised={data.isCompromised}
          investigationStatus={data.investigationStatus}
          onToggleCompromised={toggleCompromised}
          onSetStatus={setInvestigationStatus}
          onMouseEnter={showToolbar}
          onMouseLeave={hideToolbar}
          onMenuOpenChange={setMenuOpen}
        />
      )}
      <NodeResizer
        isVisible={selected || isHovered}
        minWidth={200}
        minHeight={120}
        lineClassName="border-blue-400 border-2"
        handleClassName="h-5 w-5 border-2 bg-white border-blue-400 rounded shadow-md transition-transform hover:scale-110"
        onResize={(event, params) => {
          setNodes((nodes) =>
            nodes.map((node) => {
              if (node.id === id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    width: params.width,
                    height: params.height,
                  },
                }
              }
              return node
            })
          )
        }}
      />
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-red-500" />

      {/* Compromised indicator */}
      {data.isCompromised && (
        <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1">
          <Skull className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Investigation status indicators */}
      {/* No Status shows no icon */}

      {data.investigationStatus === "Not Investigated" && !data.isCompromised && data.type !== "attacker" && (
        <div className="absolute -top-2 -left-2 bg-purple-600 rounded-full p-1">
          <HelpCircle className="h-3 w-3 text-white" />
        </div>
      )}

      {data.investigationStatus === "Investigating" && !data.isCompromised && data.type !== "attacker" && (
        <div className="absolute -top-2 -left-2 bg-yellow-600 rounded-full p-1">
          <Clock className="h-3 w-3 text-white animate-pulse" />
        </div>
      )}

      {data.investigationStatus === "Done" && !data.isCompromised && data.type !== "attacker" && (
        <div className="absolute -top-2 -left-2 bg-green-600 rounded-full p-1">
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Combined indicators when both investigated and compromised */}
      {/* No Status shows no icon even when compromised */}

      {data.investigationStatus === "Not Investigated" && data.isCompromised && data.type !== "attacker" && (
        <div className="absolute -top-2 -left-2 bg-purple-600 rounded-full p-1">
          <HelpCircle className="h-3 w-3 text-white" />
        </div>
      )}

      {data.investigationStatus === "Investigating" && data.isCompromised && data.type !== "attacker" && (
        <div className="absolute -top-2 -left-2 bg-yellow-600 rounded-full p-1">
          <Clock className="h-3 w-3 text-white animate-pulse" />
        </div>
      )}

      {data.investigationStatus === "Done" && data.isCompromised && data.type !== "attacker" && (
        <div className="absolute -top-2 -left-2 bg-green-600 rounded-full p-1">
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Attacker threat indicator */}
      {data.type === "attacker" && (
        <div className={cn(
          "absolute bg-orange-600 rounded-full p-1 animate-pulse",
          data.investigationStatus !== "Not Investigated" ? "-bottom-2 -left-2" : "-top-2 -left-2"
        )}>
          <AlertTriangle className="h-3 w-3 text-white" />
        </div>
      )}

      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn("h-6 w-6", data.type === "attacker" ? "text-orange-400" : "text-blue-400")} />}
        <div className={cn("text-lg font-semibold", data.type === "attacker" ? "text-orange-100" : "text-white")}>{data.label}</div>
      </div>

      {renderNodeInfo()}
      {renderStatusBadge()}

      {data.displaySettings.showDescription && data.description && (
        <div className="mt-2 w-full text-left text-xs text-gray-400">
          <div className="font-medium text-gray-300">Description:</div>
          <div className="text-xs text-gray-400 break-words whitespace-pre-wrap overflow-hidden max-w-full">{data.description}</div>
        </div>
      )}

      {data.displaySettings.showActions && data.actions && data.actions.length > 0 && (
        <div className="mt-2 w-full text-left text-xs text-gray-400">
          <div className="font-medium text-gray-300">Actions:</div>
          <ul className="list-inside list-none space-y-1">
            {data.actions.map((action) => {
              const ActionIcon = actionIcons[action.type] || Info
              return (
                <li key={action.id} className="flex items-center gap-1">
                  <ActionIcon className="h-3 w-3 text-purple-400" />
                  <span>
                    {action.type}: {action.technique}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-red-500" />
    </div>
  )
})

export default CustomNode
