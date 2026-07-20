"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Save,
  Upload,
  ClipboardList,
  FileDown,
  FileUp,
  Maximize,
  Trash2,
  FilePlus,
  Library,
  AlignHorizontalDistributeCenter,
  Play,
  Pause,
  Activity,
  Undo,
  Redo,
  Copy,
  Clipboard,
  Info,
} from "lucide-react"
import ThemePicker from "./theme-picker"
import { DownloadImageMenuItems } from "./download-button"
import ExportReportButton from "./export-report-button"
import { Switch } from "@/components/ui/switch"
import type { AutosaveStatus } from "@/hooks/use-compromise-canvas-state"

interface HeaderControlsProps {
  onSave: () => void
  onLoad: () => void
  onSaveAsJSON: () => void
  onImportJSON: () => void
  onFitView: () => void
  onToggleTemplates: () => void
  onToggleTimeline: () => void
  onStartFromScratch: () => void
  onAutoAlign: () => void
  onClear: () => void
  onToggleAnimations: () => void
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onShowDataHandling: () => void
  onToggleIncidentLog: () => void
  showTemplates: boolean
  showTimeline: boolean
  showIncidentLog: boolean
  hasSelection: boolean
  isExporting?: boolean
  animationsEnabled: boolean
  canUndo: boolean
  canRedo: boolean
  canCopy: boolean
  canPaste: boolean
  autosaveEnabled: boolean
  autosaveStatus: AutosaveStatus
  lastAutosavedAt: string | null
  onToggleAutosave: (enabled: boolean) => void
}

export default function HeaderControls({
  onSave,
  onLoad,
  onSaveAsJSON,
  onImportJSON,
  onFitView,
  onToggleTemplates,
  onToggleTimeline,
  onStartFromScratch,
  onAutoAlign,
  onClear,
  onToggleAnimations,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onShowDataHandling,
  onToggleIncidentLog,
  showTemplates,
  showTimeline,
  showIncidentLog,
  hasSelection,
  isExporting = false,
  animationsEnabled,
  canUndo,
  canRedo,
  canCopy,
  canPaste,
  autosaveEnabled,
  autosaveStatus,
  lastAutosavedAt,
  onToggleAutosave,
}: HeaderControlsProps) {
  const autosaveLabel = !autosaveEnabled
    ? "Autosave off"
    : autosaveStatus === "pending"
      ? "Changes pending"
      : autosaveStatus === "saving"
      ? "Saving…"
      : autosaveStatus === "error"
        ? "Autosave failed"
        : "Autosaved"

  const autosaveTitle = lastAutosavedAt
    ? `${autosaveLabel} at ${new Date(lastAutosavedAt).toLocaleTimeString()}`
    : autosaveLabel

  return (
    <header className="ip-header flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-blue-400">Compromise Canvas</div>
          <div className="text-xs text-gray-500">by SagaLabs</div>
        </div>
        <div className="ip-divider h-6 w-px"></div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartFromScratch}
            className="text-gray-300 hover:bg-gray-700"
            title="Start from scratch"
            aria-label="Start from scratch"
          >
            <FilePlus className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Start from scratch</span>
          </Button>
          <div
            className="flex items-center gap-2 rounded-md border border-gray-700 px-2 py-1"
            title={autosaveTitle}
          >
            <Switch
              checked={autosaveEnabled}
              onCheckedChange={onToggleAutosave}
              aria-label="Toggle autosave"
            />
            <span
              className={`whitespace-nowrap text-xs ${
                autosaveStatus === "error" ? "text-red-400" : autosaveEnabled ? "text-green-400" : "text-gray-500"
              }`}
              aria-live="polite"
            >
              {autosaveLabel}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTemplates}
            className={`${showTemplates ? "bg-gray-700 text-blue-400" : "text-gray-300"} hover:bg-gray-700`}
            title="Open templates"
            aria-label="Open templates"
          >
            <Library className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Open templates</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTimeline}
            className={`${showTimeline ? "bg-gray-700 text-blue-400" : "text-gray-300"} hover:bg-gray-700`}
            title="Show attack timeline"
            aria-label="Show attack timeline"
          >
            <Activity className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Show attack timeline</span>
          </Button>
          <div className="ip-divider h-6 w-px"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className={`${canUndo ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Undo</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className={`${canRedo ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Redo</span>
          </Button>
          <div className="ip-divider h-6 w-px"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
            disabled={!canCopy}
            className={`${canCopy ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Copy (Ctrl+C)"
            aria-label="Copy"
          >
            <Copy className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPaste}
            disabled={!canPaste}
            className={`${canPaste ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Paste (Ctrl+V)"
            aria-label="Paste"
          >
            <Clipboard className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Paste</span>
          </Button>
          <div className="ip-divider h-6 w-px"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            className="text-gray-300 hover:bg-gray-700"
            title="Save to browser storage"
            aria-label="Save to browser storage"
          >
            <Save className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Save to browser storage</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLoad}
            className="text-gray-300 hover:bg-gray-700"
            title="Load from browser storage"
            aria-label="Load from browser storage"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Load from browser storage</span>
          </Button>
          <div className="ip-divider h-6 w-px"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onImportJSON}
            className="text-gray-300 hover:bg-gray-700"
            title="Import JSON file"
            aria-label="Import JSON file"
          >
            <FileUp className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Import JSON file</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleIncidentLog}
          className="bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:text-white"
          title="Open Incident Log"
        >
          <ClipboardList className="h-4 w-4 mr-2" aria-hidden="true" />
          Incident Log
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:text-white"
              title="Export"
            >
              <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onSaveAsJSON}>
              <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
              Export JSON
            </DropdownMenuItem>
            <DownloadImageMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
        <ExportReportButton
          label="Create report"
          variant="ghost"
          size="sm"
          className="bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:text-white"
        />
        <ThemePicker />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAnimations}
          className={`${animationsEnabled ? "text-gray-400" : "text-green-400"} hover:bg-gray-700`}
          title={animationsEnabled ? "Disable animations" : "Enable animations"}
          aria-label={animationsEnabled ? "Disable animations" : "Enable animations"}
        >
          {animationsEnabled ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
          <span className="sr-only">{animationsEnabled ? "Disable animations" : "Enable animations"}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onAutoAlign}
          className="text-gray-300 hover:bg-gray-700"
          aria-label="Auto-align nodes"
        >
          <AlignHorizontalDistributeCenter className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Auto-align nodes</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onFitView}
          className="text-gray-300 hover:bg-gray-700"
          aria-label="Fit view"
        >
          <Maximize className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Fit View</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowDataHandling}
          className="text-blue-400 hover:bg-gray-700"
          aria-label="Data handling information"
        >
          <Info className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Data Handling Information</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="text-red-400 hover:bg-gray-700"
          aria-label="Clear canvas"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Clear</span>
        </Button>
      </div>
    </header>
  )
}
