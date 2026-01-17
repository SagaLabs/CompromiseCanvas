"use client"

import { Button } from "@/components/ui/button"
import {
  Save,
  Upload,
  Download,
  FileDown,
  FileUp,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2,
  FilePlus,
  Library,
  AlignHorizontalDistributeCenter,
  Loader2,
  Play,
  Pause,
  FileSpreadsheet,
  Activity,
  Undo,
  Redo,
  Copy,
  Clipboard,
  Info,
} from "lucide-react"

interface HeaderControlsProps {
  onSave: () => void
  onLoad: () => void
  onSaveAsJSON: () => void
  onImportJSON: () => void
  onExportCompromisedHosts: () => void
  onZoomIn: () => void
  onZoomOut: () => void
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
  showTemplates: boolean
  showTimeline: boolean
  hasSelection: boolean
  isExporting?: boolean
  animationsEnabled: boolean
  canUndo: boolean
  canRedo: boolean
  canCopy: boolean
  canPaste: boolean
}

export default function HeaderControls({
  onSave,
  onLoad,
  onSaveAsJSON,
  onImportJSON,
  onExportCompromisedHosts,
  onZoomIn,
  onZoomOut,
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
  showTemplates,
  showTimeline,
  hasSelection,
  isExporting = false,
  animationsEnabled,
  canUndo,
  canRedo,
  canCopy,
  canPaste,
}: HeaderControlsProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-blue-400">Compromise Canvas</div>
          <div className="text-sm text-gray-400">Attack Path Designer</div>
        </div>
        <div className="h-6 w-px bg-gray-600"></div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartFromScratch}
            className="text-gray-300 hover:bg-gray-700"
            title="Start from scratch"
          >
            <FilePlus className="h-5 w-5" />
            <span className="sr-only">Start from scratch</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTemplates}
            className={`${showTemplates ? "bg-gray-700 text-blue-400" : "text-gray-300"} hover:bg-gray-700`}
            title="Open templates"
          >
            <Library className="h-5 w-5" />
            <span className="sr-only">Open templates</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTimeline}
            className={`${showTimeline ? "bg-gray-700 text-blue-400" : "text-gray-300"} hover:bg-gray-700`}
            title="Show attack timeline"
          >
            <Activity className="h-5 w-5" />
            <span className="sr-only">Show attack timeline</span>
          </Button>
          <div className="h-6 w-px bg-gray-600"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className={`${canUndo ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-5 w-5" />
            <span className="sr-only">Undo</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className={`${canRedo ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-5 w-5" />
            <span className="sr-only">Redo</span>
          </Button>
          <div className="h-6 w-px bg-gray-600"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
            disabled={!canCopy}
            className={`${canCopy ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Copy (Ctrl+C)"
          >
            <Copy className="h-5 w-5" />
            <span className="sr-only">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPaste}
            disabled={!canPaste}
            className={`${canPaste ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 cursor-not-allowed"}`}
            title="Paste (Ctrl+V)"
          >
            <Clipboard className="h-5 w-5" />
            <span className="sr-only">Paste</span>
          </Button>
          <div className="h-6 w-px bg-gray-600"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            className="text-gray-300 hover:bg-gray-700"
            title="Save to browser storage"
          >
            <Save className="h-5 w-5" />
            <span className="sr-only">Save to browser storage</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLoad}
            className="text-gray-300 hover:bg-gray-700"
            title="Load from browser storage"
          >
            <Upload className="h-5 w-5" />
            <span className="sr-only">Load from browser storage</span>
          </Button>
          <div className="h-6 w-px bg-gray-600"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSaveAsJSON}
            className="text-gray-300 hover:bg-gray-700"
            title="Save as JSON file"
          >
            <FileDown className="h-5 w-5" />
            <span className="sr-only">Save as JSON file</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onImportJSON}
            className="text-gray-300 hover:bg-gray-700"
            title="Import JSON file"
          >
            <FileUp className="h-5 w-5" />
            <span className="sr-only">Import JSON file</span>
          </Button>
          <div className="h-6 w-px bg-gray-600"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExportCompromisedHosts}
            className="text-gray-300 hover:bg-gray-700"
            title="Export compromised hosts to CSV"
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span className="sr-only">Export compromised hosts</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleAnimations} 
          className={`${animationsEnabled ? "text-gray-400" : "text-green-400"} hover:bg-gray-700`}
          title={animationsEnabled ? "Disable animations" : "Enable animations"}
        >
          {animationsEnabled ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          <span className="sr-only">{animationsEnabled ? "Disable animations" : "Enable animations"}</span>
        </Button>

        <Button variant="ghost" size="icon" onClick={onAutoAlign} className="text-gray-300 hover:bg-gray-700">
          <AlignHorizontalDistributeCenter className="h-5 w-5" />
          <span className="sr-only">Auto-align nodes</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onZoomIn} className="text-gray-300 hover:bg-gray-700">
          <ZoomIn className="h-5 w-5" />
          <span className="sr-only">Zoom In</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onZoomOut} className="text-gray-300 hover:bg-gray-700">
          <ZoomOut className="h-5 w-5" />
          <span className="sr-only">Zoom Out</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onFitView} className="text-gray-300 hover:bg-gray-700">
          <Maximize className="h-5 w-5" />
          <span className="sr-only">Fit View</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onShowDataHandling} className="text-blue-400 hover:bg-gray-700">
          <Info className="h-5 w-5" />
          <span className="sr-only">Data Handling Information</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} className="text-red-400 hover:bg-gray-700">
          <Trash2 className="h-5 w-5" />
          <span className="sr-only">Clear</span>
        </Button>
      </div>
    </header>
  )
}
