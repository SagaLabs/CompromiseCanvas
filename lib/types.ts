import type { Node, Edge } from "reactflow"

export type AssetType =
  | "web-server"
  | "database"
  | "workstation"
  | "domain-controller"
  | "firewall"
  | "router"
  | "email-server"
  | "file-server"
  | "identity"
  | "exfiltration"
  | "command-control"
  | "attacker"
  | "cloud-instance"
  | "cloud-storage"
  | "cloud-database"
  | "cloud-load-balancer"
  | "cloud-container"
  | "cloud-function"
  | "cloud-kubernetes"
  | "cloud-tenant"
  | "cloud-email"
  | "cloud-productivity-storage"
  | "cloud-collaboration"
  | "cloud-calendar"
  | "cloud-video"
  | "group"
  | "other"

export type Criticality = "Low" | "Medium" | "High" | "Critical"
export type InvestigationStatus = "No Status" | "Not Investigated" | "Investigating" | "Done"
export type ActionType =
  | "Initial Access"
  | "Lateral Movement"
  | "Privilege Escalation"
  | "Persistence"
  | "Defense Evasion"
  | "Credential Access"
  | "Discovery"
  | "Collection"
  | "Exfiltration"
  | "Command and Control"
  | "Impact"
  | "Other"

export const ACTION_TYPES: ActionType[] = [
  "Initial Access",
  "Lateral Movement",
  "Privilege Escalation",
  "Persistence",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Collection",
  "Exfiltration",
  "Command and Control",
  "Impact",
  "Other",
]

export type EdgeActionType =
  | "Initial Access"
  | "Lateral Movement"
  | "Privilege Escalation"
  | "Persistence"
  | "Defense Evasion"
  | "Credential Access"
  | "Discovery"
  | "Collection"
  | "Exfiltration"
  | "Command & Control"
  | "Impact"
  | "Reconnaissance"
  | "Weaponization"
  | "Delivery"
  | "Exploitation"
  | "Installation"
  | "Data Theft"
  | "Data Manipulation"
  | "Service Abuse"
  | "Network Scanning"
  | "Vulnerability Exploitation"
  | "Social Engineering"
  | "Physical Access"
  | "Supply Chain Attack"
  | "Other"

export const EDGE_ACTION_TYPES: EdgeActionType[] = [
  "Initial Access",
  "Lateral Movement",
  "Privilege Escalation",
  "Persistence",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Collection",
  "Exfiltration",
  "Command & Control",
  "Impact",
  "Reconnaissance",
  "Weaponization",
  "Delivery",
  "Exploitation",
  "Installation",
  "Data Theft",
  "Data Manipulation",
  "Service Abuse",
  "Network Scanning",
  "Vulnerability Exploitation",
  "Social Engineering",
  "Physical Access",
  "Supply Chain Attack",
  "Other",
]


export interface NodeAction {
  id: string
  type: ActionType
  technique: string
  details: string
}

export interface DisplaySettings {
  showHostname: boolean
  showIpAddress: boolean
  showOs: boolean
  showServices: boolean
  showCriticality: boolean
  showActions: boolean
  showDescription: boolean
  // Identity-specific display settings
  showUsername: boolean
  showDomain: boolean
  showAccountType: boolean
  showAccountSource: boolean
  showAccountStatus: boolean
  showRiskLevel: boolean
  showMfaStatus: boolean
  showPrivileges: boolean
  showGroups: boolean
  // Exfiltration-specific display settings
  showMethod: boolean
  showDestination: boolean
  showProtocol: boolean
  showStatus: boolean
  showVolume: boolean
  showDataTypes: boolean
  // C2-specific display settings
  showC2Type: boolean
  showC2Server: boolean
  showC2Protocol: boolean
  showBeaconInterval: boolean
  showImplantType: boolean
  // Cloud tenant-specific display settings
  showTenantId: boolean
  showTenantName: boolean
  showCloudProvider: boolean
  showTenantType: boolean
  showRegion: boolean
  showEnvironment: boolean
  showResourceCount: boolean
  showSecurityScore: boolean
  // Compromised status
  showCompromised: boolean
  // Investigation status
  showInvestigationStatus: boolean
  // Attacker-specific display settings
  showTargetIndustries: boolean
  showIp: boolean
  showAttackVectors: boolean
  showInfrastructureAge: boolean
  showLastSeen: boolean
  showFirstSeen: boolean
  showInfrastructureStatus: boolean
  showThreatActor: boolean
  showLocation: boolean
  showHostingProvider: boolean
  showInfrastructureType: boolean
}

export interface IdentityData {
  username: string
  domain: string
  accountType: "User" | "Service" | "Computer" | "Admin" | "System" | "Active Directory" | "Other"
  accountSource: "Local" | "Cloud" | "Hybrid" | "Federated" | "Active Directory" | "Other"
  privileges: string[]
  groups: string[]
  lastLogon?: string
  passwordLastSet?: string
  accountStatus: "Active" | "Disabled" | "Locked" | "Expired"
  mfaEnabled: boolean
  riskLevel: "Low" | "Medium" | "High" | "Critical"
}

export interface ExfiltrationData {
  method: "Cloud Storage" | "FTP" | "Email" | "DNS Tunneling" | "HTTP/HTTPS" | "Physical Media" | "Messaging" | "Other"
  destination: string // e.g., "s3://attacker-bucket", "ftp://evil.com", "dropbox.com/shared"
  protocol: string // e.g., "HTTPS", "FTP", "SMTP", "DNS"
  encryption: boolean
  compression: boolean
  dataTypes: string[] // e.g., ["Customer PII", "Financial Records", "Source Code"]
  volumeGB: number
  transferRate: string // e.g., "10 MB/s", "Throttled to 1 MB/s"
  detectionEvasion: string[] // e.g., ["Traffic Mimicry", "Steganography", "Legitimate Service Abuse"]
  exfiltrationWindow: string // e.g., "Business Hours Only", "Off-peak", "Continuous"
  status: "Planned" | "In Progress" | "Completed" | "Failed" | "Detected"
}

export interface CommandControlData {
  c2Type: "HTTP/HTTPS" | "DNS" | "ICMP" | "TCP" | "UDP" | "Social Media" | "Cloud Service" | "P2P" | "Other"
  c2Server: string // e.g., "evil.com", "192.168.1.100", "pastebin.com/abc123"
  c2Protocol: string // e.g., "HTTPS", "DNS over HTTPS", "Twitter API"
  beaconInterval: string // e.g., "30s", "5m", "1h", "Random 1-10m"
  jitter: number // 0-100 percentage
  implantType: string // e.g., "Cobalt Strike", "Metasploit", "Custom RAT"
  encryption: boolean
  obfuscation: string[] // e.g., ["Domain Fronting", "Fast Flux", "DGA"]
  fallbackChannels: string[] // e.g., ["backup.evil.com", "twitter.com/evilaccount"]
  killSwitchEnabled: boolean
  persistenceMethods: string[] // e.g., ["Registry", "Scheduled Task", "Service"]
  operationalStatus: "Active" | "Dormant" | "Burned" | "Migrating" | "Terminated"
}

export interface CloudTenantData {
  tenantId: string // e.g., "12345678-1234-1234-1234-123456789012" for Azure, "123456789012" for AWS
  tenantName: string // e.g., "company.onmicrosoft.com", "company.com"
  cloudProvider: "Azure" | "AWS" | "GCP" | "Other"
  tenantType: "Entra ID" | "AWS Organizations" | "Google Workspace" | "Okta" | "Auth0" | "Other"
  subscriptionId?: string // For Azure
  accountId?: string // For AWS
  projectId?: string // For GCP
  region: string // e.g., "us-east-1", "westeurope"
  environment: "Production" | "Development" | "Staging" | "Testing"
  resourceCount: number // Number of resources in the tenant
  securityScore?: number // 0-100
}

export interface AttackerData {
  targetIndustries: string[] // e.g., ["Financial Services", "Healthcare", "Technology"]
  ip: string // e.g., "192.168.1.100", "10.0.0.50"
  attackVectors: string[] // e.g., ["Phishing", "Ransomware", "APT"]
  infrastructureAge: string // e.g., "2 years", "6 months", "New"
  lastSeen: string // ISO8601 format (e.g., 'YYYY-MM-DDTHH:MM:SSZ')
  firstSeen: string // ISO8601 format (e.g., 'YYYY-MM-DDTHH:MM:SSZ')
  infrastructureStatus: "Active" | "Dormant" | "Burned" | "Migrating" | "Terminated"
  threatActor: string // e.g., "APT29", "Lazarus Group", "Unknown"
  location: string // e.g., "Russia", "North Korea", "Unknown"
  hostingProvider: string // e.g., "OVH", "DigitalOcean", "AWS", "Unknown"
  infrastructureType: "VPS" | "Dedicated Server" | "Cloud Instance" | "Botnet" | "Compromised Host" | "Other"
}

export interface NodeData {
  label: string
  type: AssetType
  hostname?: string
  ipAddress?: string
  os?: string
  criticality: Criticality
  services: string[]
  actions: NodeAction[]
  description?: string
  // Display settings
  displaySettings: DisplaySettings
  // Identity-specific data
  identityData?: IdentityData
  // Exfiltration-specific data
  exfiltrationData?: ExfiltrationData
  // Command & Control-specific data
  commandControlData?: CommandControlData
  // Cloud tenant-specific data
  cloudTenantData?: CloudTenantData
  // Attacker-specific data
  attackerData?: AttackerData
  // Compromised status
  isCompromised: boolean
  // Investigation status
  investigationStatus: InvestigationStatus
  // Resize properties
  width?: number
  height?: number
  // Group styling
  color?: "blue" | "red" | "green" | "amber" | "purple"
  transparency?: number
}

export interface EdgeDisplaySettings {
  showLabel: boolean
  showTool: boolean
  showUser: boolean
  showTimestamp: boolean
  showMitreId: boolean
  showDescription: boolean
  showC2Channel: boolean
  showC2Framework: boolean
}

export interface AnimationSettings {
  enableAnimations: boolean
}

export interface EdgeData {
  label?: string
  actionType: EdgeActionType
  toolUsed: string // For non-C2 edges, this is "Tool Used"
  userUsed: string // For non-C2 edges, this is "User Used"
  timestamp: string // ISO8601 format (e.g., 'YYYY-MM-DDTHH:MM:SSZ')
  mitreAttackId?: string
  description: string // New field for detailed description
  // Offsets remain relative to the automatic path so custom positioning still follows moving nodes.
  routeOffset?: { x: number; y: number }
  labelOffset?: { x: number; y: number }
  // Labels follow their route unless the user explicitly unlocks them.
  labelLocked?: boolean
  // C2-specific fields
  c2Channel?: string // For C2 edges: HTTP/HTTPS, DNS, ICMP, etc.
  c2Framework?: string // For C2 edges: Cobalt Strike, Empire, Metasploit, etc.
  // Display settings
  displaySettings: EdgeDisplaySettings
}

export type CustomNode = Node<NodeData>
export type CustomEdge = Edge<EdgeData>

// IR Activity Log types
export type ActivityCategory =
  | "Containment"
  | "Remediation"
  | "Detection"
  | "Communication"
  | "Evidence"
  | "Recovery"
  | "Other"

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "Containment",
  "Remediation",
  "Detection",
  "Communication",
  "Evidence",
  "Recovery",
  "Other",
]

export interface ActivityLogEntry {
  id: string
  timestamp: string           // ISO date string
  category: ActivityCategory
  description: string
  performedBy?: string        // Analyst name
  relatedNodeIds?: string[]   // Link to affected nodes
}

export interface IncidentLogEntry {
  id: string
  timestamp: string // ISO string
  description: string
  category: "Response" | "Observation" | "Meeting" | "Containment" | "Eradication" | "Recovery" | "Acquisition" | "Other"
}
