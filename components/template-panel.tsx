"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutTemplate,
  Plus,
  Download,
  Trash2,
  Database,
  Shield,
  Router,
  Globe,
  Building,
  X,
  Search,
} from "lucide-react"
import type { Node, Edge } from "@xyflow/react"
import type { IncidentLogEntry } from "@/lib/types"
import { builtInTemplates } from "@/lib/templates"

export interface Template {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  nodes: Node[]
  edges: Edge[]
  incidentLog?: IncidentLogEntry[]
  createdAt: string
  isBuiltIn: boolean
}

interface TemplatePanelProps {
  onLoadTemplate: (template: Template) => void
  onSaveAsTemplate: (name: string, description: string, category: string, tags: string[]) => void
  currentNodes: Node[]
  currentEdges: Edge[]
  onClose: () => void
}

const defaultDisplaySettings = {
  showHostname: true,
  showIpAddress: true,
  showOs: true,
  showServices: true,
  showCriticality: true,
  showActions: true,
  showDescription: true,
  showUsername: false,
  showDomain: false,
  showAccountType: false,
  showAccountSource: false,
  showAccountStatus: false,
  showRiskLevel: false,
  showMfaStatus: false,
  showPrivileges: false,
  showGroups: false,
  showMethod: false,
  showDestination: false,
  showProtocol: false,
  showStatus: false,
  showVolume: false,
  showDataTypes: false,
  showC2Type: false,
  showC2Server: false,
  showC2Protocol: false,
  showBeaconInterval: false,
  showImplantType: false,
  showTenantId: true,
  showTenantName: true,
  showCloudProvider: true,
  showTenantType: true,
  showRegion: false,
  showEnvironment: false,
  showResourceCount: false,
  showSecurityScore: false,
  showCompromised: false,
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
}

// Built-in templates are now imported from lib/templates.ts

export default function TemplatePanel({
  onLoadTemplate,
  onSaveAsTemplate,
  currentNodes,
  currentEdges,
  onClose,
}: TemplatePanelProps) {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const savedTemplates = localStorage.getItem("compromise-canvas-templates")
    const userTemplates = savedTemplates ? JSON.parse(savedTemplates) : []
    return [...builtInTemplates, ...userTemplates]
  })

  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateDescription, setNewTemplateDescription] = useState("")
  const [newTemplateCategory, setNewTemplateCategory] = useState("")
  const [newTemplateTags, setNewTemplateTags] = useState("")

  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))]

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return

    const tags = newTemplateTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag)
    onSaveAsTemplate(newTemplateName, newTemplateDescription, newTemplateCategory, tags)

    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: newTemplateName,
      description: newTemplateDescription,
      category: newTemplateCategory || "Custom",
      tags,
      nodes: currentNodes.map(({ selected: _selected, dragging: _dragging, ...node }) => node as Node),
      edges: currentEdges.map(({ selected: _selected, ...edge }) => edge as Edge),
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    }

    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)

    const userTemplates = updatedTemplates.filter((t) => !t.isBuiltIn)
    localStorage.setItem("compromise-canvas-templates", JSON.stringify(userTemplates))

    setNewTemplateName("")
    setNewTemplateDescription("")
    setNewTemplateCategory("")
    setNewTemplateTags("")
    setIsCreateDialogOpen(false)
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      const updatedTemplates = templates.filter((t) => t.id !== templateId)
      setTemplates(updatedTemplates)

      const userTemplates = updatedTemplates.filter((t) => !t.isBuiltIn)
      localStorage.setItem("compromise-canvas-templates", JSON.stringify(userTemplates))
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Web Security":
        return <Globe className="h-4 w-4 text-blue-500" aria-hidden="true" />
      case "Social Engineering":
        return <Shield className="h-4 w-4 text-orange-500" aria-hidden="true" />
      case "Network Security":
        return <Router className="h-4 w-4 text-purple-500" aria-hidden="true" />
      case "Database":
        return <Database className="h-4 w-4 text-green-500" aria-hidden="true" />
      case "Malware":
        return <Shield className="h-4 w-4 text-red-500" aria-hidden="true" />
      case "Supply Chain":
        return <LayoutTemplate className="h-4 w-4 text-yellow-500" aria-hidden="true" />
      case "APT":
        return <Shield className="h-4 w-4 text-red-600" aria-hidden="true" />
      case "Cloud Security":
        return <Globe className="h-4 w-4 text-cyan-500" aria-hidden="true" />
      case "Insider Threat":
        return <Shield className="h-4 w-4 text-pink-500" aria-hidden="true" />
      default:
        return <Building className="h-4 w-4 text-gray-500" aria-hidden="true" />
    }
  }

  return (
    <aside className="ip-panel w-96 flex-shrink-0 border-r flex flex-col">
      {/* Header */}
      <div className="ip-panel-muted border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <LayoutTemplate className="h-6 w-6 text-blue-400" aria-hidden="true" />
            Templates
          </h2>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white border-gray-600 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Template</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Save the current diagram as a reusable template
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name" className="text-white">
                      Name
                    </Label>
                    <Input
                      id="template-name"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-description" className="text-white">
                      Description
                    </Label>
                    <Textarea
                      id="template-description"
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      placeholder="Describe this Compromise Canvas template"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-category" className="text-white">
                      Category
                    </Label>
                    <Input
                      id="template-category"
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      placeholder="e.g., Web Security, Network"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-tags" className="text-white">
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="template-tags"
                      value={newTemplateTags}
                      onChange={(e) => setNewTemplateTags(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      placeholder="e.g., web, sql-injection, privilege-escalation"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTemplate}
                      disabled={!newTemplateName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Create Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-300 hover:bg-gray-700 hover:text-white"
              aria-label="Close templates panel"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            aria-label="Search templates"
            name="templateSearch"
            autoComplete="off"
            placeholder="Search templates…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={
                selectedCategory === category
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
                  : "border-gray-600 text-white bg-gray-700 hover:bg-gray-600 hover:text-white text-xs"
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <ScrollArea className="flex-1 h-0 min-h-0">
        <div className="p-4 space-y-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>No templates found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="bg-gray-700 border-gray-600 hover:bg-gray-650 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getCategoryIcon(template.category)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-base font-semibold leading-tight">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="text-gray-300 text-sm mt-1 line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onLoadTemplate(template)}
                        className="h-8 w-8 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300"
                        title="Load template"
                        aria-label="Load template"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      {!template.isBuiltIn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="h-8 w-8 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                          title="Delete template"
                          aria-label="Delete template"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-gray-600 text-gray-200 hover:bg-gray-500"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 4 && (
                        <Badge variant="secondary" className="text-xs bg-gray-600 text-gray-200">
                          +{template.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">
                      {template.nodes.length} nodes • {template.edges.length} edges
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        template.isBuiltIn ? "bg-green-600/20 text-green-400" : "bg-blue-600/20 text-blue-400"
                      }`}
                    >
                      {template.isBuiltIn ? "Built-in" : "Custom"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
