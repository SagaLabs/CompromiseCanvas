import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Bug,
  Building,
  Database,
  Eye,
  FileText,
  Hammer,
  Key,
  Lock,
  MoveRight,
  Package,
  Search,
  Shield,
  Target,
  Terminal,
  Truck,
  Upload,
  Users,
  Zap,
} from "lucide-react"
import type { EdgeActionType } from "@/lib/types"

export interface EdgeActionVisual {
  icon: LucideIcon
  stroke: string
  strokeWidth: number
  strokeDasharray: string
}

export const DEFAULT_EDGE_ACTION_VISUAL: EdgeActionVisual = {
  icon: Activity,
  stroke: "#8b5cf6",
  strokeWidth: 2,
  strokeDasharray: "5 5",
}

export const EDGE_ACTION_VISUALS: Record<
  EdgeActionType,
  EdgeActionVisual
> = {
  "Initial Access": {
    icon: Target,
    stroke: "#ef4444",
    strokeWidth: 3,
    strokeDasharray: "8 4",
  },
  "Lateral Movement": {
    icon: MoveRight,
    stroke: "#f59e0b",
    strokeWidth: 2,
    strokeDasharray: "5 5",
  },
  "Privilege Escalation": {
    icon: Shield,
    stroke: "#dc2626",
    strokeWidth: 3,
    strokeDasharray: "12 6",
  },
  Persistence: {
    icon: Lock,
    stroke: "#7c3aed",
    strokeWidth: 2,
    strokeDasharray: "3 3",
  },
  "Defense Evasion": {
    icon: Eye,
    stroke: "#059669",
    strokeWidth: 2,
    strokeDasharray: "6 3",
  },
  "Credential Access": {
    icon: Key,
    stroke: "#d97706",
    strokeWidth: 2,
    strokeDasharray: "4 4",
  },
  Discovery: {
    icon: Search,
    stroke: "#0891b2",
    strokeWidth: 2,
    strokeDasharray: "5 5",
  },
  Collection: {
    icon: Database,
    stroke: "#0d9488",
    strokeWidth: 2,
    strokeDasharray: "7 3",
  },
  Exfiltration: {
    icon: Upload,
    stroke: "#be185d",
    strokeWidth: 3,
    strokeDasharray: "10 5",
  },
  "Command & Control": {
    icon: Terminal,
    stroke: "#7c2d12",
    strokeWidth: 2,
    strokeDasharray: "6 6",
  },
  Impact: {
    icon: Zap,
    stroke: "#991b1b",
    strokeWidth: 4,
    strokeDasharray: "15 8",
  },
  Reconnaissance: {
    icon: Search,
    stroke: "#1e40af",
    strokeWidth: 2,
    strokeDasharray: "4 8",
  },
  Weaponization: {
    icon: Hammer,
    stroke: "#92400e",
    strokeWidth: 2,
    strokeDasharray: "8 4",
  },
  Delivery: {
    icon: Truck,
    stroke: "#a16207",
    strokeWidth: 2,
    strokeDasharray: "6 3",
  },
  Exploitation: {
    icon: Bug,
    stroke: "#b91c1c",
    strokeWidth: 3,
    strokeDasharray: "9 4",
  },
  Installation: {
    icon: Package,
    stroke: "#6b21a8",
    strokeWidth: 2,
    strokeDasharray: "5 5",
  },
  "Data Theft": {
    icon: Upload,
    stroke: "#be123c",
    strokeWidth: 3,
    strokeDasharray: "8 4",
  },
  "Data Manipulation": {
    icon: FileText,
    stroke: "#c026d3",
    strokeWidth: 2,
    strokeDasharray: "4 6",
  },
  "Service Abuse": {
    icon: Activity,
    stroke: "#15803d",
    strokeWidth: 2,
    strokeDasharray: "3 7",
  },
  "Network Scanning": {
    icon: Search,
    stroke: "#0c4a6e",
    strokeWidth: 2,
    strokeDasharray: "5 5",
  },
  "Vulnerability Exploitation": {
    icon: Bug,
    stroke: "#f97316",
    strokeWidth: 3,
    strokeDasharray: "7 3",
  },
  "Social Engineering": {
    icon: Users,
    stroke: "#0369a1",
    strokeWidth: 2,
    strokeDasharray: "6 4",
  },
  "Physical Access": {
    icon: Building,
    stroke: "#854d0e",
    strokeWidth: 3,
    strokeDasharray: "10 5",
  },
  "Supply Chain Attack": {
    icon: Package,
    stroke: "#7c2d12",
    strokeWidth: 2,
    strokeDasharray: "8 6",
  },
  Other: DEFAULT_EDGE_ACTION_VISUAL,
}

export function getEdgeActionVisual(
  actionType?: string,
): EdgeActionVisual {
  return (
    EDGE_ACTION_VISUALS[actionType as EdgeActionType] ??
    DEFAULT_EDGE_ACTION_VISUAL
  )
}
