"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Eye,
  Folder,
  HardDrive,
  Info,
  Key,
  MoveRight,
  Shield,
  Terminal,
  Upload,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getMitreTechniqueUrl } from "@/lib/mitre-attack"
import { ACTION_COLORS } from "@/lib/types"
import type { CustomNode, NodeAction } from "@/lib/types"

const actionIcons: Record<string, typeof Info> = {
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

const formatTimestamp = (value?: string): string | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z")
}

interface HostPathDrilldownProps {
  node: CustomNode | null
  isOpen: boolean
  onClose: () => void
}

export default function HostPathDrilldown({ node, isOpen, onClose }: HostPathDrilldownProps) {
  const actions = useMemo<NodeAction[]>(() => node?.data?.actions ?? [], [node])
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set())
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null)
  const [copyErrorActionId, setCopyErrorActionId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setExpandedActionIds(new Set())
    setCopiedActionId(null)
    setCopyErrorActionId(null)
  }, [isOpen, node?.id])

  const toggleExpanded = (actionId: string) => {
    setExpandedActionIds((current) => {
      const next = new Set(current)
      if (next.has(actionId)) next.delete(actionId)
      else next.add(actionId)
      return next
    })
  }

  const copyEvidence = async (action: NodeAction) => {
    try {
      await navigator.clipboard.writeText(action.details)
      setCopiedActionId(action.id)
      setCopyErrorActionId(null)
      window.setTimeout(() => setCopiedActionId(null), 1500)
    } catch {
      setCopiedActionId(null)
      setCopyErrorActionId(action.id)
    }
  }

  const assetLabel = node?.data?.label || "Asset"
  const subtitle = [node?.data?.hostname, node?.data?.ipAddress, node?.data?.os]
    .filter((value): value is string => Boolean(value) && value !== assetLabel)
    .join(" · ")

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[86vh] max-w-4xl flex-col overflow-hidden border-gray-700 bg-gray-900 p-0 text-white">
        <DialogHeader className="shrink-0 border-b border-gray-800 px-5 py-3">
          <DialogDescription className="sr-only">
            Review ordered attack activity and evidence documented on this asset.
          </DialogDescription>
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="flex flex-wrap items-center gap-1.5 text-base">
                <span className="text-gray-500">Canvas</span>
                <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
                <span className="font-semibold">{assetLabel}</span>
                <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
                <span className="text-gray-400">asset attack path</span>
                <Badge variant="outline" className="ml-2 border-gray-700 text-xs text-gray-400">
                  {actions.length} {actions.length === 1 ? "step" : "steps"}
                </Badge>
              </DialogTitle>
              {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
            </div>
            {actions.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                  onClick={() => setExpandedActionIds(new Set(actions.map((action) => action.id)))}
                >
                  Expand all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                  onClick={() => setExpandedActionIds(new Set())}
                >
                  Collapse all
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 bg-gray-950">
          {actions.length === 0 ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-8 text-center">
              <Info className="h-8 w-8 text-gray-600" aria-hidden="true" />
              <p className="text-sm text-gray-300">No ordered steps documented yet</p>
            </div>
          ) : (
            <ol className="mx-auto max-w-3xl space-y-4 px-6 py-6" aria-label="Ordered asset attack path">
              {actions.map((action, index) => {
                const Icon = actionIcons[action.type] || Info
                const color = ACTION_COLORS[action.type] ?? ACTION_COLORS.Other
                const time = formatTimestamp(action.timestamp)
                const expanded = expandedActionIds.has(action.id)
                const mitreUrl = action.mitreAttackId
                  ? getMitreTechniqueUrl(action.mitreAttackId)
                  : null

                return (
                  <li key={action.id} className="relative pl-10" data-testid="asset-path-step">
                    {index < actions.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[15px] top-8 h-[calc(100%+1rem)] w-px bg-gray-700"
                      />
                    )}
                    <span
                      className="absolute left-0 top-3 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-gray-950 ring-4 ring-gray-950"
                      style={{ backgroundColor: color }}
                      aria-label={`Step ${index + 1}`}
                    >
                      {index + 1}
                    </span>

                    <article className="rounded-lg border border-gray-800 bg-gray-900/90 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
                        <span className="text-sm font-semibold" style={{ color }}>
                          {action.type}
                        </span>
                        {time && <time className="ml-auto text-xs text-gray-500">{time}</time>}
                      </div>

                      {action.technique && (
                        <div className="mt-2 text-sm font-medium text-gray-200">{action.technique}</div>
                      )}

                      {action.mitreAttackId && (
                        <div className="mt-2">
                          {mitreUrl ? (
                            <a
                              href={mitreUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex"
                            >
                              <Badge
                                variant="outline"
                                className="border-cyan-700/60 bg-cyan-950/40 text-[10px] font-normal text-cyan-300 hover:bg-cyan-950/70"
                              >
                                {action.mitreAttackId}
                                {action.mitreAttackName ? ` · ${action.mitreAttackName}` : ""}
                              </Badge>
                            </a>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-cyan-700/60 bg-cyan-950/40 text-[10px] font-normal text-cyan-300"
                            >
                              {action.mitreAttackId}
                              {action.mitreAttackName ? ` · ${action.mitreAttackName}` : ""}
                            </Badge>
                          )}
                        </div>
                      )}

                      {action.details && (
                        <div className="mt-3 rounded-md border border-gray-800 bg-gray-950/70 p-3">
                          <pre
                            className={`select-text whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-gray-300 ${
                              expanded ? "" : "line-clamp-3"
                            }`}
                          >
                            {action.details}
                          </pre>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                              aria-expanded={expanded}
                              onClick={() => toggleExpanded(action.id)}
                            >
                              {expanded ? (
                                <ChevronUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {expanded ? "Collapse evidence" : "Expand evidence"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                              onClick={() => copyEvidence(action)}
                            >
                              {copiedActionId === action.id ? (
                                <Check className="mr-1 h-3.5 w-3.5 text-green-400" aria-hidden="true" />
                              ) : (
                                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {copiedActionId === action.id ? "Copied" : "Copy evidence"}
                            </Button>
                            {copyErrorActionId === action.id && (
                              <span role="status" className="text-xs text-amber-400">
                                Copy failed. Select the evidence text and copy it manually.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  </li>
                )
              })}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
