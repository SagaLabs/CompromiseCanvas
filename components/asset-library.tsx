"use client"

import type React from "react"
import {
  Server,
  Database,
  Laptop,
  Shield,
  Router,
  Mail,
  Folder,
  UserCheck,
  Upload,
  Radio,
  HelpCircle,
  User,
  AlertTriangle,
  UserX,
  Cloud,
  HardDrive,
  Loader,
  Box,
  Zap,
  Layers,
  Building2,
  MessageSquare,
  Users,
  Calendar,
  Video,
  ChevronDown,
  ChevronRight,
  Building,
  Lock,
  Globe,
  MessageCircle,
} from "lucide-react"
import type { AssetType } from "@/lib/types"
import { useState } from "react"

interface AssetItemProps {
  type: AssetType
  label: string
  description: string
  icon: React.ElementType
}

interface AssetCategory {
  id: string
  name: string
  icon: React.ElementType
  assets: AssetItemProps[]
}

const assetCategories: AssetCategory[] = [
  {
    id: "on-premises",
    name: "On-Premises Infrastructure",
    icon: Building,
    assets: [
      { type: "web-server", label: "Web Server", description: "HTTP/HTTPS web server", icon: Server },
      { type: "database", label: "Database", description: "Database server", icon: Database },
      { type: "workstation", label: "Workstation", description: "Employee workstation", icon: Laptop },
      { type: "domain-controller", label: "Domain Controller", description: "Active Directory DC", icon: Shield },
      { type: "firewall", label: "Firewall", description: "Network firewall", icon: Router },
      { type: "router", label: "Router", description: "Network router", icon: Router },
      { type: "email-server", label: "Email Server", description: "Mail server", icon: Mail },
      { type: "file-server", label: "File Server", description: "File share server", icon: Folder },
    ]
  },
  {
    id: "cloud-infrastructure",
    name: "Cloud Infrastructure",
    icon: Cloud,
    assets: [
      { type: "cloud-instance", label: "Cloud Instance", description: "Virtual machine in cloud", icon: Server },
      { type: "cloud-database", label: "Cloud Database", description: "Managed database service", icon: Database },
      { type: "cloud-load-balancer", label: "Load Balancer", description: "Cloud load balancer", icon: Loader },
      { type: "cloud-container", label: "Container", description: "Containerized application", icon: Box },
      { type: "cloud-function", label: "Serverless Function", description: "FaaS (Lambda, Functions)", icon: Zap },
      { type: "cloud-kubernetes", label: "Kubernetes Cluster", description: "K8s cluster or namespace", icon: Layers },
      { type: "cloud-tenant", label: "Cloud Tenant", description: "Cloud tenant", icon: Building2 },
    ]
  },
  {
    id: "security-identity",
    name: "Security & Identity",
    icon: Lock,
    assets: [
      { type: "identity", label: "Identity", description: "User or service identity", icon: UserCheck },
    ]
  },
  {
    id: "threat-actor",
    name: "Threat Actor Assets",
    icon: UserX,
    assets: [
      { type: "attacker", label: "Attacker", description: "Threat actor or attacker", icon: UserX },
      { type: "command-control", label: "Command & Control", description: "C2 server or infrastructure", icon: Radio },
      { type: "exfiltration", label: "Exfiltration", description: "Data exfiltration destination", icon: Upload },
    ]
  },
  {
    id: "data-storage",
    name: "Data & Storage",
    icon: HardDrive,
    assets: [
      { type: "cloud-storage", label: "Cloud Storage", description: "Object storage (S3, Blob, etc.)", icon: HardDrive },
      { type: "cloud-productivity-storage", label: "Cloud Productivity Storage", description: "Cloud file storage and sharing", icon: Folder },
    ]
  },
  {
    id: "communication-collaboration",
    name: "Communication & Collaboration",
    icon: MessageCircle,
    assets: [
      { type: "cloud-email", label: "Cloud Email", description: "Cloud email and messaging service", icon: Mail },
      { type: "cloud-collaboration", label: "Cloud Collaboration", description: "Cloud collaboration platform", icon: MessageSquare },
      { type: "cloud-calendar", label: "Cloud Calendar", description: "Cloud calendar and scheduling", icon: Calendar },
      { type: "cloud-video", label: "Cloud Video", description: "Cloud video conferencing", icon: Video },
    ]
  },
  {
    id: "other",
    name: "Other",
    icon: HelpCircle,
    assets: [
      { type: "other", label: "Other", description: "Miscellaneous asset or system", icon: HelpCircle },
    ]
  }
]

// Group node for organizing assets
const groupNode: AssetItemProps = {
  type: "group",
  label: "Asset Group",
  description: "Group of related assets on the same endpoint",
  icon: Folder,
}

interface CategorySectionProps {
  category: AssetCategory
  onDragStart: (event: React.DragEvent, nodeType: AssetType) => void
}

function CategorySection({ category, onDragStart }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded-md bg-gray-800 px-3 py-2 text-left text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <category.icon className="h-4 w-4 text-blue-400" />
        {category.name}
        <span className="ml-auto text-xs text-gray-400">({category.assets.length})</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2 pl-6">
          {category.assets.map((asset) => (
            <div
              key={asset.type}
              className="flex cursor-grab items-center gap-3 rounded-md border border-gray-700 bg-gray-800 p-3 shadow-sm transition-colors hover:border-blue-500 hover:bg-gray-700"
              onDragStart={(event) => onDragStart(event, asset.type)}
              draggable
            >
              <asset.icon className="h-5 w-5 text-blue-400" />
              <div>
                <div className="font-medium text-sm">{asset.label}</div>
                <div className="text-xs text-gray-400">{asset.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssetLibrary() {
  const onDragStart = (event: React.DragEvent, nodeType: AssetType) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-700 bg-gray-900 p-4 text-white flex flex-col">
      <h2 className="mb-4 text-lg font-semibold">Asset Library</h2>
      <p className="mb-6 text-sm text-gray-400">Drag assets to the canvas</p>
      
      <div className="flex-1 overflow-y-auto">
        {/* Asset Categories */}
        <div className="space-y-2">
          {assetCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              onDragStart={onDragStart}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="my-4 border-t border-gray-700" />

        {/* Group node */}
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-gray-300">Organization</div>
          <div
            className="flex cursor-grab items-center gap-3 rounded-md border border-gray-700 bg-gray-800 p-3 shadow-sm transition-colors hover:border-blue-500 hover:bg-gray-700"
            onDragStart={(event) => onDragStart(event, groupNode.type)}
            draggable
          >
            <groupNode.icon className="h-5 w-5 text-blue-400" />
            <div>
              <div className="font-medium text-sm">{groupNode.label}</div>
              <div className="text-xs text-gray-400">{groupNode.description}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
