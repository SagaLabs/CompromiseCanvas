import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useNodesState, useEdgesState, type Viewport } from "@xyflow/react"
import { useUndoRedo } from "@/hooks/use-undo-redo"
import { useCopyPaste } from "@/hooks/use-copy-paste"
import { useToast } from "@/components/ui/use-toast"
import { initialNodes, initialEdges } from "@/lib/utils/compromise-canvas-constants"
import type { ActivityLogEntry, CustomNode, CustomEdge, IncidentLogEntry } from "@/lib/types"

const AUTOSAVE_ENABLED_KEY = "compromise-canvas-autosave-enabled"
const AUTOSAVE_FLOW_KEY = "compromise-canvas-autosave-flow"
const AUTOSAVE_TIMESTAMP_KEY = "compromise-canvas-autosave-timestamp"
const AUTOSAVE_DELAY_MS = 5000
const AUTOSAVE_IDLE_TIMEOUT_MS = 2000

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error"

interface AutosaveContent {
  nodes: CustomNode[]
  edges: CustomEdge[]
  viewport?: Viewport
  canvasTitle: string
  incidentLog: IncidentLogEntry[]
}

interface AutosaveSnapshot {
  version: "1.0"
  timestamp?: string
  nodes: CustomNode[]
  edges: CustomEdge[]
  viewport?: Viewport
  canvasTitle: string
  incidentLog: IncidentLogEntry[]
}

const createAutosaveContent = ({ nodes, edges, viewport, canvasTitle, incidentLog }: AutosaveContent): AutosaveContent => ({
  // Selection and drag flags are transient UI state and create noisy writes while moving around the canvas.
  nodes: nodes.map(({ selected: _selected, dragging: _dragging, ...node }) => node),
  edges: edges.map(({ selected: _selected, ...edge }) => edge),
  viewport,
  canvasTitle,
  incidentLog,
})

export const useCompromiseCanvasState = () => {
  const { toast } = useToast()

  // Initialize undo/redo functionality
  const { takeSnapshot, undo, redo, canUndo, canRedo, reset } = useUndoRedo({
    nodes: initialNodes,
    edges: initialEdges,
  })

  // Initialize copy/paste functionality
  const { copyElements, pasteElements, hasClipboardData, clearClipboard } = useCopyPaste()

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, setEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedElement, setSelectedElement] = useState<CustomNode | CustomEdge | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [showTimelinePanel, setShowTimelinePanel] = useState(false)
  const [showDataHandlingModal, setShowDataHandlingModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [canvasTitle, setCanvasTitle] = useState("Intrusion Path Diagram")
  const [autosaveEnabled, setAutosaveEnabled] = useState(false)
  const [autosaveReady, setAutosaveReady] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle")
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null)
  const [pendingAutosaveViewport, setPendingAutosaveViewport] = useState<Viewport | null>(null)
  const lastAutosaveContentRef = useRef<string | null>(null)
  const latestAutosaveContentRef = useRef<AutosaveContent>({
    nodes: initialNodes,
    edges: initialEdges,
    canvasTitle: "Intrusion Path Diagram",
    incidentLog: [],
  })

  // Activity Log state
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [showActivityLog, setShowActivityLog] = useState(false)

  // Incident Log state
  const [incidentLog, setIncidentLog] = useState<IncidentLogEntry[]>(() => {
    if (typeof window === "undefined") return []
    const storedLog = localStorage.getItem("compromise-canvas-incident-log")
    return storedLog ? JSON.parse(storedLog) : []
  })
  const [showIncidentLogPanel, setShowIncidentLogPanel] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("compromise-canvas-incident-log", JSON.stringify(incidentLog))
  }, [incidentLog])

  // Restore autosaved work only when autosave was enabled in the previous session.
  // Autosaves use a separate storage slot so the manual Save/Load checkpoint remains untouched.
  useEffect(() => {
    if (typeof window === "undefined") return

    const wasEnabled = localStorage.getItem(AUTOSAVE_ENABLED_KEY) === "true"
    setAutosaveEnabled(wasEnabled)

    if (wasEnabled) {
      const storedSnapshot = localStorage.getItem(AUTOSAVE_FLOW_KEY)
      if (storedSnapshot) {
        try {
          const snapshot = JSON.parse(storedSnapshot) as AutosaveSnapshot
          if (!Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
            throw new Error("Autosave snapshot has an invalid structure")
          }

          setNodes(snapshot.nodes)
          setEdges(snapshot.edges)
          setCanvasTitle(snapshot.canvasTitle || "Intrusion Path Diagram")
          setIncidentLog(Array.isArray(snapshot.incidentLog) ? snapshot.incidentLog : [])
          reset({ nodes: snapshot.nodes, edges: snapshot.edges })
          const restoredTimestamp = snapshot.timestamp || localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY)
          setLastAutosavedAt(restoredTimestamp)
          lastAutosaveContentRef.current = JSON.stringify(
            {
              version: "1.0",
              ...createAutosaveContent({
                nodes: snapshot.nodes,
                edges: snapshot.edges,
                viewport: snapshot.viewport,
                canvasTitle: snapshot.canvasTitle || "Intrusion Path Diagram",
                incidentLog: Array.isArray(snapshot.incidentLog) ? snapshot.incidentLog : [],
              }),
            },
          )

          setPendingAutosaveViewport(snapshot.viewport ?? null)
        } catch {
          setAutosaveStatus("error")
        }
      }
    }

    setAutosaveReady(true)
  }, [reset, setEdges, setNodes])

  useEffect(() => {
    if (!reactFlowInstance || !pendingAutosaveViewport) return

    reactFlowInstance.setViewport(pendingAutosaveViewport)
    setPendingAutosaveViewport(null)
  }, [reactFlowInstance, pendingAutosaveViewport])

  latestAutosaveContentRef.current = {
    nodes,
    edges,
    viewport: reactFlowInstance?.getViewport(),
    canvasTitle,
    incidentLog,
  }

  const writeAutosave = useCallback(() => {
    if (!autosaveReady || !autosaveEnabled || typeof window === "undefined") return

    try {
      setAutosaveStatus("saving")
      const content = createAutosaveContent(latestAutosaveContentRef.current)
      const snapshot: AutosaveSnapshot = {
        version: "1.0",
        ...content,
      }
      const serializedContent = JSON.stringify(snapshot)

      if (serializedContent === lastAutosaveContentRef.current) {
        setAutosaveStatus("saved")
        return
      }

      const timestamp = new Date().toISOString()
      localStorage.setItem(AUTOSAVE_FLOW_KEY, serializedContent)
      localStorage.setItem(AUTOSAVE_TIMESTAMP_KEY, timestamp)
      lastAutosaveContentRef.current = serializedContent
      setLastAutosavedAt(timestamp)
      setAutosaveStatus("saved")
    } catch {
      setAutosaveStatus("error")
    }
  }, [autosaveReady, autosaveEnabled])

  useEffect(() => {
    if (!autosaveReady || !autosaveEnabled || typeof window === "undefined") return

    setAutosaveStatus("pending")
    let idleCallbackId: number | undefined
    const timeoutId = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleCallbackId = window.requestIdleCallback(writeAutosave, { timeout: AUTOSAVE_IDLE_TIMEOUT_MS })
      } else {
        writeAutosave()
      }
    }, AUTOSAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
      if (idleCallbackId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallbackId)
      }
    }
  }, [autosaveReady, autosaveEnabled, nodes, edges, canvasTitle, incidentLog, reactFlowInstance, writeAutosave])

  useEffect(() => {
    if (!autosaveReady || !autosaveEnabled || typeof window === "undefined") return

    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") writeAutosave()
    }

    window.addEventListener("pagehide", writeAutosave)
    document.addEventListener("visibilitychange", flushWhenHidden)
    return () => {
      window.removeEventListener("pagehide", writeAutosave)
      document.removeEventListener("visibilitychange", flushWhenHidden)
    }
  }, [autosaveReady, autosaveEnabled, writeAutosave])

  const handleToggleAutosave = useCallback((enabled: boolean) => {
    setAutosaveEnabled(enabled)
    setAutosaveStatus(enabled ? "pending" : "idle")

    try {
      localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled))
    } catch {
      setAutosaveStatus("error")
    }
  }, [])

  // Custom setNodes and setEdges that also take snapshots
  const updateNodes = useCallback(
    (nodesOrUpdater: CustomNode[] | ((nodes: CustomNode[]) => CustomNode[])) => {
      setNodes((currentNodes) => {
        const newNodes = typeof nodesOrUpdater === "function" ? nodesOrUpdater(currentNodes) : nodesOrUpdater
        // Take snapshot after state update
        takeSnapshot({ nodes: newNodes, edges })
        return newNodes
      })
    },
    [setNodes, takeSnapshot, edges],
  )

  const updateEdges = useCallback(
    (edgesOrUpdater: CustomEdge[] | ((edges: CustomEdge[]) => CustomEdge[])) => {
      setEdges((currentEdges) => {
        const newEdges = typeof edgesOrUpdater === "function" ? edgesOrUpdater(currentEdges) : edgesOrUpdater
        // Take snapshot after state update
        takeSnapshot({ nodes, edges: newEdges })
        return newEdges
      })
    },
    [setEdges, takeSnapshot, nodes],
  )

  // Handle undo/redo operations
  const handleUndo = useCallback(() => {
    const previousState = undo()
    if (previousState) {
      setNodes(previousState.nodes)
      setEdges(previousState.edges)
    }
  }, [undo, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    const nextState = redo()
    if (nextState) {
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
    }
  }, [redo, setNodes, setEdges])

  // Copy/Paste handlers
  const handleCopy = useCallback(() => {
    if (!reactFlowInstance) return false

    const selectedNodes = nodes.filter((node) => node.selected)
    const selectedEdges = edges.filter((edge) => edge.selected)

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      // If no multi-selection, copy the single selected element
      if (selectedElement) {
        if (selectedElement.type !== "customEdge") {
          return copyElements([selectedElement as CustomNode], [])
        } else {
          return copyElements([], [selectedElement as CustomEdge])
        }
      }
      return false
    }

    return copyElements(selectedNodes, selectedEdges)
  }, [reactFlowInstance, nodes, edges, selectedElement, copyElements])

  const handlePaste = useCallback(
    (pastePosition?: { x: number; y: number }) => {
      if (!reactFlowInstance || !hasClipboardData()) return

      const result = pasteElements(pastePosition, nodes, edges)
      if (!result) return

      const { nodes: newNodes, edges: newEdges } = result

      // Clear current selection first
      const clearedNodes = nodes.map((node) => ({ ...node, selected: false }))
      const clearedEdges = edges.map((edge) => ({ ...edge, selected: false }))

      // Add new elements
      const allNodes = [...clearedNodes, ...newNodes]
      const allEdges = [...clearedEdges, ...newEdges]

      updateNodes(allNodes)
      updateEdges(allEdges)

      // Clear single element selection since we now have multi-selection
      setSelectedElement(null)

      toast({
        title: "Pasted Successfully",
        description: `Pasted ${newNodes.length} node(s) and ${newEdges.length} edge(s)`,
        variant: "default",
      })
    },
    [reactFlowInstance, hasClipboardData, pasteElements, nodes, edges, updateNodes, updateEdges, setSelectedElement, toast],
  )

  // Keyboard event listener for Delete/Backspace and Undo/Redo
  const setupKeyboardHandlers = useCallback(
    (handleDeleteSelected: () => void) => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Check if the event target is an input or textarea to avoid interfering with typing
        const targetTagName = (event.target as HTMLElement).tagName
        if (targetTagName === "INPUT" || targetTagName === "TEXTAREA") {
          return
        }

        // Copy/Paste shortcuts
        if ((event.ctrlKey || event.metaKey) && event.key === "c") {
          event.preventDefault()
          const success = handleCopy()
          if (success) {
            toast({
              title: "Copied",
              description: "Selected elements copied to clipboard",
              variant: "default",
            })
          }
        } else if ((event.ctrlKey || event.metaKey) && event.key === "v") {
          event.preventDefault()
          handlePaste()
        }
        // Undo/Redo shortcuts
        else if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if ((event.ctrlKey || event.metaKey) && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
          event.preventDefault()
          handleRedo()
        } else if (event.key === "Delete" || event.key === "Backspace") {
          if (selectedElement) {
            // Only trigger if an element is selected
            event.preventDefault() // Prevent default browser behavior
            handleDeleteSelected()
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => {
        window.removeEventListener("keydown", handleKeyDown)
      }
    },
    [handleCopy, handlePaste, handleUndo, handleRedo, selectedElement, toast],
  )

  return {
    // State
    nodes,
    edges,
    reactFlowInstance,
    selectedElement,
    snapToGrid,
    showTemplatePanel,
    showTimelinePanel,
    showDataHandlingModal,
    isExporting,
    animationsEnabled,
    canvasTitle,
    autosaveEnabled,
    autosaveStatus,
    lastAutosavedAt,
    activityLog,
    showActivityLog,
    incidentLog,
    showIncidentLogPanel,
    // State setters
    setNodes,
    setEdges,
    setReactFlowInstance,
    setSelectedElement,
    setSnapToGrid,
    setShowTemplatePanel,
    setShowTimelinePanel,
    setShowDataHandlingModal,
    setIsExporting,
    setAnimationsEnabled,
    setCanvasTitle,
    handleToggleAutosave,
    setActivityLog,
    setShowActivityLog,
    setIncidentLog,
    setShowIncidentLogPanel,
    // ReactFlow handlers
    onNodesChange,
    setEdgesChange,
    // Update functions with snapshots
    updateNodes,
    updateEdges,
    // Undo/Redo
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    reset,
    takeSnapshot,
    // Copy/Paste
    handleCopy,
    handlePaste,
    hasClipboardData,
    clearClipboard,
    // Keyboard handlers
    setupKeyboardHandlers,
    // Toast
    toast,
  }
}
