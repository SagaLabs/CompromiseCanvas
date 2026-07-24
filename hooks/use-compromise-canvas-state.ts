import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import {
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react"
import { useUndoRedo } from "@/hooks/use-undo-redo"
import { useCopyPaste } from "@/hooks/use-copy-paste"
import { useToast } from "@/components/ui/use-toast"
import { initialNodes, initialEdges } from "@/lib/utils/compromise-canvas-constants"
import type { ActivityLogEntry, CustomNode, CustomEdge, IncidentLogEntry, InvestigationStatus } from "@/lib/types"
import { layoutSelectedNodes, type SelectionLayoutAction } from "@/lib/selection-layout"

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

interface SelectionReference {
  id: string
  kind: "node" | "edge"
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

  const [nodes, setNodes, applyNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, applyEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectionReference, setSelectionReference] = useState<SelectionReference | null>(null)
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

  const selectedElement = useMemo<CustomNode | CustomEdge | null>(() => {
    if (!selectionReference) return null

    return selectionReference.kind === "node"
      ? nodes.find((node) => node.id === selectionReference.id) ?? null
      : edges.find((edge) => edge.id === selectionReference.id) ?? null
  }, [selectionReference, nodes, edges])

  const selectedNodeCount = useMemo(() => nodes.filter((node) => node.selected).length, [nodes])
  const selectedEdgeCount = useMemo(() => edges.filter((edge) => edge.selected).length, [edges])
  const arrangeableNodeCount = useMemo(
    () => nodes.filter((node) => node.selected && node.type !== "labeledGroupNode").length,
    [nodes],
  )
  const bulkStatusNodes = useMemo(
    () => nodes.filter(
      (node) => node.selected && node.type === "customNode" && node.data.type !== "attacker",
    ),
    [nodes],
  )
  const allBulkStatusNodesCompromised = bulkStatusNodes.length > 0 && bulkStatusNodes.every(
    (node) => node.data.isCompromised,
  )
  const bulkInvestigationStatus = bulkStatusNodes.length > 0 && bulkStatusNodes.every(
    (node) => node.data.investigationStatus === bulkStatusNodes[0].data.investigationStatus,
  ) ? bulkStatusNodes[0].data.investigationStatus : null

  const setSelectedElement = useCallback((element: CustomNode | CustomEdge | null) => {
    setSelectionReference(
      element
        ? {
            id: element.id,
            kind: element.type === "customEdge" ? "edge" : "node",
          }
        : null,
    )
  }, [])

  useEffect(() => {
    if (selectionReference && !selectedElement) {
      setSelectionReference(null)
    }
  }, [selectionReference, selectedElement])

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

  const onNodesChange = useCallback(
    (changes: NodeChange<CustomNode>[]) => {
      const applyChanges = () => applyNodesChange(changes)

      // React Flow reads selection from its internal copy before controlled
      // state normally renders back. Commit selection immediately so a second
      // fast Shift-click sees the result of the first one and can toggle it.
      if (changes.some((change) => change.type === "select")) flushSync(applyChanges)
      else applyChanges()

      // Selection changes are transient. Record only completed position
      // changes so pointer drags and keyboard moves each become undoable.
      if (changes.some((change) => change.type === "position" && change.dragging !== true)) {
        const changedNodes = applyNodeChanges(changes, nodes).map(
          ({ dragging: _dragging, ...node }) => node as CustomNode,
        )
        takeSnapshot({ nodes: changedNodes, edges })
      }
    },
    [applyNodesChange, nodes, edges, takeSnapshot],
  )

  const setEdgesChange = useCallback(
    (changes: EdgeChange<CustomEdge>[]) => {
      const applyChanges = () => applyEdgesChange(changes)
      if (changes.some((change) => change.type === "select")) flushSync(applyChanges)
      else applyChanges()
    },
    [applyEdgesChange],
  )

  // Handle undo/redo operations
  const handleUndo = useCallback(() => {
    const previousState = undo()
    if (previousState) {
      const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
      const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id))
      setNodes(previousState.nodes.map((node) => ({ ...node, selected: selectedNodeIds.has(node.id) })))
      setEdges(previousState.edges.map((edge) => ({ ...edge, selected: selectedEdgeIds.has(edge.id) })))
    }
  }, [undo, nodes, edges, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    const nextState = redo()
    if (nextState) {
      const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
      const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id))
      setNodes(nextState.nodes.map((node) => ({ ...node, selected: selectedNodeIds.has(node.id) })))
      setEdges(nextState.edges.map((edge) => ({ ...edge, selected: selectedEdgeIds.has(edge.id) })))
    }
  }, [redo, nodes, edges, setNodes, setEdges])

  // Copy/Paste handlers
  const handleCopy = useCallback(() => {
    if (!reactFlowInstance) return false

    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length === 0) {
      // If no multi-selection, copy the single selected element
      if (selectedElement && selectedElement.type !== "customEdge") {
        return copyElements([selectedElement as CustomNode], edges)
      }
      return false
    }

    // Pass the complete edge set. The clipboard helper keeps only edges whose
    // source and target are both in the selected node set.
    return copyElements(selectedNodes, edges)
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

      setNodes(allNodes)
      setEdges(allEdges)
      takeSnapshot({ nodes: allNodes, edges: allEdges })

      // Clear single element selection since we now have multi-selection
      setSelectedElement(null)

      toast({
        title: "Pasted Successfully",
        description: `Pasted ${newNodes.length} node(s) and ${newEdges.length} edge(s)`,
        variant: "default",
      })
    },
    [reactFlowInstance, hasClipboardData, pasteElements, nodes, edges, setNodes, setEdges, takeSnapshot, setSelectedElement, toast],
  )

  const handleSelectionLayout = useCallback(
    (action: SelectionLayoutAction) => {
      const arrangedNodes = layoutSelectedNodes(nodes, action)
      if (arrangedNodes === nodes) return false

      setNodes(arrangedNodes)
      takeSnapshot({ nodes: arrangedNodes, edges })
      return true
    },
    [nodes, edges, setNodes, takeSnapshot],
  )

  const updateBulkStatusNodes = useCallback(
    (data: Partial<Pick<CustomNode["data"], "isCompromised" | "investigationStatus">>) => {
      const eligibleIds = new Set(bulkStatusNodes.map((node) => node.id))
      if (eligibleIds.size === 0) return false

      const updatedNodes = nodes.map((node) =>
        eligibleIds.has(node.id) ? { ...node, data: { ...node.data, ...data } } : node,
      )
      setNodes(updatedNodes)
      takeSnapshot({ nodes: updatedNodes, edges })
      return true
    },
    [bulkStatusNodes, nodes, edges, setNodes, takeSnapshot],
  )

  const handleToggleSelectedCompromised = useCallback(
    () => updateBulkStatusNodes({ isCompromised: !allBulkStatusNodesCompromised }),
    [allBulkStatusNodesCompromised, updateBulkStatusNodes],
  )

  const handleSetSelectedInvestigationStatus = useCallback(
    (investigationStatus: InvestigationStatus) => updateBulkStatusNodes({ investigationStatus }),
    [updateBulkStatusNodes],
  )

  const clearSelection = useCallback(() => {
    setNodes((current) => current.map((node) => node.selected ? { ...node, selected: false } : node))
    setEdges((current) => current.map((edge) => edge.selected ? { ...edge, selected: false } : edge))
    setSelectedElement(null)
  }, [setNodes, setEdges, setSelectedElement])

  // Keyboard event listener for Delete/Backspace and Undo/Redo
  const setupKeyboardHandlers = useCallback(
    (handleDeleteSelected: () => boolean) => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Let focused controls such as Radix menus consume Escape first.
        if (event.defaultPrevented) return

        // Check if the event target is an input or textarea to avoid interfering with typing
        const targetTagName = (event.target as HTMLElement).tagName
        const target = event.target as HTMLElement
        if (targetTagName === "INPUT" || targetTagName === "TEXTAREA" || targetTagName === "SELECT" || target.isContentEditable) {
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
          if (handleDeleteSelected()) event.preventDefault()
        } else if (event.key === "Escape" && (selectedNodeCount > 0 || selectedEdgeCount > 0)) {
          event.preventDefault()
          clearSelection()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => {
        window.removeEventListener("keydown", handleKeyDown)
      }
    },
    [handleCopy, handlePaste, handleUndo, handleRedo, selectedNodeCount, selectedEdgeCount, clearSelection, toast],
  )

  return {
    // State
    nodes,
    edges,
    reactFlowInstance,
    selectedElement,
    selectedNodeCount,
    selectedEdgeCount,
    arrangeableNodeCount,
    bulkStatusNodeCount: bulkStatusNodes.length,
    allBulkStatusNodesCompromised,
    bulkInvestigationStatus,
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
    handleSelectionLayout,
    handleToggleSelectedCompromised,
    handleSetSelectedInvestigationStatus,
    hasClipboardData,
    clearClipboard,
    // Keyboard handlers
    setupKeyboardHandlers,
    // Toast
    toast,
  }
}
