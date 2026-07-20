import { useState, useCallback, useEffect, useMemo } from "react"
import { useNodesState, useEdgesState } from "@xyflow/react"
import { useUndoRedo } from "@/hooks/use-undo-redo"
import { useCopyPaste } from "@/hooks/use-copy-paste"
import { useToast } from "@/components/ui/use-toast"
import { initialNodes, initialEdges } from "@/lib/utils/compromise-canvas-constants"
import type { ActivityLogEntry, CustomNode, CustomEdge } from "@/lib/types"

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

  // Activity Log state
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [showActivityLog, setShowActivityLog] = useState(false)

  // Incident Log state
  const [incidentLog, setIncidentLog] = useState<any[]>(() => {
    if (typeof window === "undefined") return []
    const storedLog = localStorage.getItem("compromise-canvas-incident-log")
    return storedLog ? JSON.parse(storedLog) : []
  }) // Using any[] temporarily until types are globally available or import updated
  const [showIncidentLogPanel, setShowIncidentLogPanel] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("compromise-canvas-incident-log", JSON.stringify(incidentLog))
  }, [incidentLog])

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
