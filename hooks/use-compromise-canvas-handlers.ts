import { useCallback } from "react"
import type { ReactFlowInstance, FitViewOptions } from "@xyflow/react"
import type { CustomNode, CustomEdge } from "@/lib/types"
import type { Template } from "@/components/template-panel"
import { defaultDisplaySettings, LAYER_Z_INDEX, FIT_VIEW_OPTIONS } from "@/lib/utils/compromise-canvas-constants"
import { calculateAutoAlignedPositions } from "@/lib/utils/compromise-canvas-utils"

interface UseCompromiseCanvasHandlersProps {
  reactFlowInstance: ReactFlowInstance | null
  nodes: CustomNode[]
  edges: CustomEdge[]
  canvasTitle: string
  incidentLog: any[]
  setNodes: (nodes: CustomNode[]) => void
  setEdges: (edges: CustomEdge[]) => void
  updateNodes: (nodesOrUpdater: CustomNode[] | ((nodes: CustomNode[]) => CustomNode[])) => void
  setSelectedElement: (element: CustomNode | CustomEdge | null) => void
  setShowTemplatePanel: (show: boolean | ((prev: boolean) => boolean)) => void
  setShowTimelinePanel: (show: boolean | ((prev: boolean) => boolean)) => void
  setShowDataHandlingModal: (show: boolean | ((prev: boolean) => boolean)) => void
  setAnimationsEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void
  setSnapToGrid: (enabled: boolean | ((prev: boolean) => boolean)) => void
  setCanvasTitle: (title: string) => void
  setIncidentLog: (log: any[] | ((prev: any[]) => any[])) => void
  reset: (state: { nodes: CustomNode[]; edges: CustomEdge[] }) => void
  fitView: (options?: FitViewOptions) => void
  toast: (options: any) => void
}

export const useCompromiseCanvasHandlers = ({
  reactFlowInstance,
  nodes,
  edges,
  canvasTitle,
  incidentLog,
  setNodes,
  setEdges,
  updateNodes,
  setSelectedElement,
  setShowTemplatePanel,
  setShowTimelinePanel,
  setShowDataHandlingModal,
  setAnimationsEnabled,
  setSnapToGrid,
  setCanvasTitle,
  setIncidentLog,
  reset,
  fitView,
  toast,
}: UseCompromiseCanvasHandlersProps) => {
  const handleSave = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()
      const saveData = {
        ...flow,
        canvasTitle: canvasTitle,
        incidentLog: incidentLog,
      }
      localStorage.setItem("compromise-canvas-flow", JSON.stringify(saveData))
      toast({
        title: "Saved Successfully",
        description: "Compromise Canvas diagram saved to browser storage",
        variant: "default",
      })
    }
  }, [reactFlowInstance, canvasTitle, incidentLog])

  const handleLoad = useCallback(() => {
    const flowString = localStorage.getItem("compromise-canvas-flow")
    if (flowString) {
      const flow = JSON.parse(flowString)
        if (flow.nodes && flow.edges) {
        // Ensure all nodes have display settings and compromised status
        const nodesWithDisplaySettings = flow.nodes.map((node: any) => ({
          ...node,
          data: {
            ...node.data,
            displaySettings: node.data.displaySettings || { ...defaultDisplaySettings },
            isCompromised: node.data.isCompromised || false,
          },
          // Enforce z-index layering
          zIndex: node.type === "labeledGroupNode" ? LAYER_Z_INDEX.GROUP : LAYER_Z_INDEX.NODE,
        }))
        const newNodes = nodesWithDisplaySettings || []
        const newEdges = flow.edges || []
        setNodes(newNodes)
        setEdges(newEdges)
        // Reset undo/redo history when loading
        reset({ nodes: newNodes, edges: newEdges })

        // Load canvas title if available
        if (flow.canvasTitle) {
          setCanvasTitle(flow.canvasTitle)
        }
        if (flow.incidentLog) {
          setIncidentLog(flow.incidentLog)
        }

        // Auto-align after loading disabled - user can manually align
        // setTimeout(() => {
        //   if (onAutoAlign) onAutoAlign()
        // }, 100)

        toast({
          title: "Loaded Successfully",
          description: "Compromise Canvas diagram loaded from browser storage",
          variant: "default",
        })
      }
    } else {
      toast({
        title: "Load Failed",
        description: "No saved Compromise Canvas diagram found in browser storage",
        variant: "destructive",
      })
    }
  }, [setNodes, setEdges, reset, setCanvasTitle, setIncidentLog])

  const handleSaveAsJSON = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()
      const jsonData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        canvasTitle: canvasTitle,
        incidentLog: incidentLog,
        diagram: {
          nodes: flow.nodes,
          edges: flow.edges,
          viewport: flow.viewport,
        },
      }

      const dataStr = JSON.stringify(jsonData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `compromise-canvas-diagram-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert("Diagram exported as JSON file!")
    }
  }, [reactFlowInstance, canvasTitle, incidentLog])

  const handleImportJSON = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target?.result as string)

            // Validate JSON structure
            if (!jsonData.diagram || !jsonData.diagram.nodes || !jsonData.diagram.edges) {
              throw new Error("Invalid diagram format")
            }

            // Ensure all nodes have display settings and compromised status
            const nodesWithDisplaySettings = jsonData.diagram.nodes.map((node: any) => ({
              ...node,
              data: {
                ...node.data,
                displaySettings: node.data.displaySettings || { ...defaultDisplaySettings },
                isCompromised: node.data.isCompromised || false,
              },
            }))

            if (nodes.length > 0 || edges.length > 0) {
              if (window.confirm("Importing will replace the current diagram. Continue?")) {
                setNodes(nodesWithDisplaySettings)
                setEdges(jsonData.diagram.edges)
                setSelectedElement(null)
                // Reset undo/redo history when importing
                reset({ nodes: nodesWithDisplaySettings, edges: jsonData.diagram.edges })

                // Load canvas title if available
                if (jsonData.canvasTitle) {
                  setCanvasTitle(jsonData.canvasTitle)
                }
                if (jsonData.incidentLog) {
                  setIncidentLog(jsonData.incidentLog)
                }

                // Apply viewport if available
                if (jsonData.diagram.viewport && reactFlowInstance) {
                  setTimeout(() => {
                    reactFlowInstance.setViewport(jsonData.diagram.viewport)
                  }, 100)
                }

                alert("Diagram imported successfully!")
              }
            } else {
              setNodes(nodesWithDisplaySettings)
              setEdges(jsonData.diagram.edges)
              setSelectedElement(null)
              // Reset undo/redo history when importing
              reset({ nodes: nodesWithDisplaySettings, edges: jsonData.diagram.edges })

              // Load canvas title if available
              if (jsonData.canvasTitle) {
                setCanvasTitle(jsonData.canvasTitle)
              }
              if (jsonData.incidentLog) {
                setIncidentLog(jsonData.incidentLog)
              }

              // Apply viewport if available
              if (jsonData.diagram.viewport && reactFlowInstance) {
                setTimeout(() => {
                  reactFlowInstance.setViewport(jsonData.diagram.viewport)
                }, 100)
              }

              alert("Diagram imported successfully!")
            }
          } catch (error) {
            console.error("Import error:", error)
            toast({
              title: "Import Failed",
              description: "Failed to import diagram. Please check the file format.",
              variant: "destructive",
            })
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [nodes, edges, setNodes, setEdges, setSelectedElement, reset, setCanvasTitle, setIncidentLog, reactFlowInstance])

  const handleClear = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedElement(null)
    setIncidentLog([])
    // Reset undo/redo history when clearing
    reset({ nodes: [], edges: [] })
    toast({
      title: "Diagram Cleared",
      description: "Canvas has been reset",
      variant: "default",
    })
  }, [setNodes, setEdges, setIncidentLog, setSelectedElement, reset])

  const handleStartFromScratch = useCallback(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setNodes([])
      setEdges([])
      setSelectedElement(null)
      setIncidentLog([])
      setShowTemplatePanel(false)
      // Reset undo/redo history when starting from scratch
      reset({ nodes: [], edges: [] })
      toast({
        title: "New Diagram",
        description: "Started a fresh diagram from scratch",
        variant: "default",
      })
    } else {
      // Already empty, just close template panel if open
      setShowTemplatePanel(false)
    }
  }, [nodes, edges, setNodes, setEdges, setIncidentLog, setSelectedElement, setShowTemplatePanel, reset])

  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn()
  }, [reactFlowInstance])

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut()
  }, [reactFlowInstance])

  const handleFitView = useCallback(() => {
    fitView(FIT_VIEW_OPTIONS)
  }, [fitView])

  const handleToggleGrid = useCallback(() => {
    setSnapToGrid((prev) => !prev)
  }, [setSnapToGrid])

  const handleLoadTemplate = useCallback(
    (template: Template) => {
      // Logic for loading template
      // Ensure all template nodes have display settings and compromised status
      const nodesWithDisplaySettings = template.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          displaySettings: node.data.displaySettings || { ...defaultDisplaySettings },
          isCompromised: node.data.isCompromised || false,
        },
      }))
      setNodes(nodesWithDisplaySettings)
      setEdges(template.edges as CustomEdge[])
      setIncidentLog(template.incidentLog ?? [])
      setSelectedElement(null)
      setShowTemplatePanel(false) // Close template panel after loading
      // Reset undo/redo history when loading template
      reset({ nodes: nodesWithDisplaySettings, edges: template.edges as CustomEdge[] })

      // setTimeout(() => {
      //   if (onAutoAlign) onAutoAlign()
      // }, 100) // Small delay to ensure nodes are rendered

      toast({
        title: "Template Loaded",
        description: `Loaded template: ${template.name}`,
        variant: "default",
      })
    },
    [setNodes, setEdges, setIncidentLog, setSelectedElement, setShowTemplatePanel, reset],
  )

  const handleSaveAsTemplate = useCallback((name: string, description: string, category: string, tags: string[]) => {
    // This function is called by the TemplatePanel component
    // The actual template creation is handled there
  }, [])

  const handleToggleTemplatePanel = useCallback(() => {
    setShowTemplatePanel((prev) => !prev)
  }, [setShowTemplatePanel])

  const handleCloseTemplatePanel = useCallback(() => {
    setShowTemplatePanel(false)
  }, [setShowTemplatePanel])

  const handleToggleAnimations = useCallback(() => {
    setAnimationsEnabled((prev) => !prev)
  }, [setAnimationsEnabled])

  const handleToggleTimelinePanel = useCallback(() => {
    setShowTimelinePanel((prev) => !prev)
  }, [setShowTimelinePanel])

  const handleCloseTimelinePanel = useCallback(() => {
    setShowTimelinePanel(false)
  }, [setShowTimelinePanel])

  const handleShowDataHandling = useCallback(() => {
    setShowDataHandlingModal(true)
  }, [setShowDataHandlingModal])

  const handleCloseDataHandling = useCallback(() => {
    setShowDataHandlingModal(false)
  }, [setShowDataHandlingModal])

  const handleHighlightEdge = useCallback(
    (edgeId: string) => {
      // Find and highlight the edge
      const edge = edges.find((e) => e.id === edgeId)
      if (edge) {
        setSelectedElement(edge)
      }
    },
    [edges, setSelectedElement],
  )

  const handleSelectEdge = useCallback(
    (edgeId: string) => {
      // Find and select the edge
      const edge = edges.find((e) => e.id === edgeId)
      if (edge) {
        setSelectedElement(edge)
      }
    },
    [edges, setSelectedElement],
  )

  const handleAutoAlign = useCallback(() => {
    if (nodes.length === 0) return

    const newPositions = calculateAutoAlignedPositions(nodes, edges)

    // Apply positions with animation-friendly update
    updateNodes((nds) =>
      nds.map((node) => {
        const newPos = newPositions.get(node.id)
        if (newPos) {
          return {
            ...node,
            position: newPos,
          }
        }
        return node
      }),
    )

    // Fit view with generous padding after a short delay
    setTimeout(() => {
      fitView({
        padding: 0.6, // Even more padding to account for connection points
        duration: 800,
        minZoom: 0.1,
        maxZoom: 1.5,
      })
    }, 150)
  }, [nodes, edges, updateNodes, fitView])



  return {
    handleSave,
    handleLoad,
    handleSaveAsJSON,
    handleImportJSON,
    handleClear,
    handleStartFromScratch,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleToggleGrid,
    handleLoadTemplate,
    handleSaveAsTemplate,
    handleToggleTemplatePanel,
    handleCloseTemplatePanel,
    handleToggleAnimations,
    handleToggleTimelinePanel,
    handleCloseTimelinePanel,
    handleShowDataHandling,
    handleCloseDataHandling,
    handleHighlightEdge,
    handleSelectEdge,
    handleAutoAlign,

  }
}
