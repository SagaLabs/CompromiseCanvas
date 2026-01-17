"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
  getRectOfNodes,
  ReactFlowProvider,
  MiniMap,
} from "reactflow"
import "reactflow/dist/style.css"
import CustomNode from "./custom-node"
import CustomEdge from "./custom-edge"
import { GroupNode } from "./labeled-group-node"
import AssetLibrary from "./asset-library"
import PropertiesPanel from "./properties-panel"
import HeaderControls from "./header-controls"
import DownloadButton from "./download-button"
import MobileWarning from "./mobile-warning"
import CanvasTitle from "./canvas-title"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "./ui/use-toast"
import type { NodeData, EdgeData, AssetType, DisplaySettings, EdgeDisplaySettings } from "@/lib/types"
import TemplatePanel, { type Template } from "./template-panel"
import TimelineModal from "./timeline-modal"
import DataHandlingModal from "./data-handling-modal"
import { builtInTemplates } from "@/lib/templates"
import { useUndoRedo } from "@/hooks/use-undo-redo"
import { useCopyPaste } from "@/hooks/use-copy-paste"

const nodeTypes = { 
  customNode: CustomNode,
  labeledGroupNode: GroupNode
}

// Create edge types with animation setting and selection state
// Memoize to prevent unnecessary re-renders during dragging
const createEdgeTypes = (animationsEnabled: boolean, selectedElement: Node | Edge | null) => ({
  customEdge: (props: any) => (
    <CustomEdge 
      {...props} 
      animationsEnabled={animationsEnabled} 
      selected={selectedElement?.id === props.id && selectedElement?.type === "customEdge"}
    />
  )
})

const defaultDisplaySettings: DisplaySettings = {
  showHostname: true,
  showIpAddress: true,
  showOs: false,
  showServices: false,
  showCriticality: false,
  showActions: true,
  showDescription: false,
  // Identity-specific
  showUsername: true,
  showDomain: true,
  showAccountType: true,
  showAccountSource: true,
  showAccountStatus: false,
  showRiskLevel: true,
  showMfaStatus: false,
  showPrivileges: false,
  showGroups: false,
  // Exfiltration-specific
  showMethod: true,
  showDestination: true,
  showProtocol: false,
  showStatus: true,
  showVolume: false,
  showDataTypes: false,
  // C2-specific
  showC2Type: true,
  showC2Server: true,
  showC2Protocol: false,
  showBeaconInterval: false,
  showImplantType: false,
  // Cloud tenant-specific
  showTenantId: true,
  showTenantName: true,
  showCloudProvider: true,
  showTenantType: true,
  showRegion: false,
  showEnvironment: false,
  showResourceCount: false,
  showSecurityScore: false,
  // Attacker-specific
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
  // Compromised status
  showCompromised: false,
  // Investigation status
  showInvestigationStatus: false,
}

const defaultEdgeDisplaySettings: EdgeDisplaySettings = {
  showLabel: true,
  showTool: true,
  showUser: true,
  showTimestamp: true,
  showMitreId: false,
  showDescription: false,
  showC2Channel: true,
  showC2Framework: true,
}

// Start with empty canvas - no initial nodes or edges
const initialNodes: Node[] = []
const initialEdges: Edge[] = []

let id = 0
const getId = () => `dndnode_${id++}`

export default function AttackPathDesigner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()
  const { toast } = useToast()
  
  // Mobile detection
  const isMobile = useMobile()
  const [showMobileWarning, setShowMobileWarning] = useState(true)
  const [dismissedMobileWarning, setDismissedMobileWarning] = useState(false)
  
  // Initialize undo/redo functionality
  const { takeSnapshot, undo, redo, canUndo, canRedo, reset } = useUndoRedo({
    nodes: initialNodes,
    edges: initialEdges
  })
  
  // Initialize copy/paste functionality
  const { copyElements, pasteElements, hasClipboardData, clearClipboard } = useCopyPaste()
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, setEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedElement, setSelectedElement] = useState<Node | Edge | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [showTimelinePanel, setShowTimelinePanel] = useState(false)
  const [showDataHandlingModal, setShowDataHandlingModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [canvasTitle, setCanvasTitle] = useState("Intrusion Path Diagram")

  // Memoize edge types to prevent recreation on every render during dragging
  const edgeTypes = useMemo(() => createEdgeTypes(animationsEnabled, selectedElement), [animationsEnabled, selectedElement])

  // Custom setNodes and setEdges that also take snapshots
  const updateNodes = useCallback((nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => {
    setNodes((currentNodes) => {
      const newNodes = typeof nodesOrUpdater === 'function' ? nodesOrUpdater(currentNodes) : nodesOrUpdater
      // Take snapshot after state update
      setTimeout(() => takeSnapshot({ nodes: newNodes, edges }), 0)
      return newNodes
    })
  }, [takeSnapshot, edges])

  const updateEdges = useCallback((edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => {
    setEdges((currentEdges) => {
      const newEdges = typeof edgesOrUpdater === 'function' ? edgesOrUpdater(currentEdges) : edgesOrUpdater
      // Take snapshot after state update
      setTimeout(() => takeSnapshot({ nodes, edges: newEdges }), 0)
      return newEdges
    })
  }, [takeSnapshot, nodes])

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

    const selectedNodes = nodes.filter(node => node.selected)
    const selectedEdges = edges.filter(edge => edge.selected)
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      // If no multi-selection, copy the single selected element
      if (selectedElement) {
        if (selectedElement.type !== "customEdge") {
          return copyElements([selectedElement as Node], [])
        } else {
          return copyElements([], [selectedElement as Edge])
        }
      }
      return false
    }

    return copyElements(selectedNodes, selectedEdges)
  }, [reactFlowInstance, nodes, edges, selectedElement, copyElements])

  const handlePaste = useCallback((pastePosition?: { x: number; y: number }) => {
    if (!reactFlowInstance || !hasClipboardData()) return

    const result = pasteElements(pastePosition, nodes, edges)
    if (!result) return

    const { nodes: newNodes, edges: newEdges } = result
    
    // Clear current selection first
    const clearedNodes = nodes.map(node => ({ ...node, selected: false }))
    const clearedEdges = edges.map(edge => ({ ...edge, selected: false }))
    
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
  }, [reactFlowInstance, hasClipboardData, pasteElements, nodes, edges, updateNodes, updateEdges, toast])

  // Export compromised hosts functionality
  const exportCompromisedHosts = useCallback(() => {
    const compromisedNodes = nodes.filter(node => 
      node.data && (node.data as NodeData).isCompromised
    )

    if (compromisedNodes.length === 0) {
      toast({
        title: "No Compromised Hosts",
        description: "There are no hosts marked as compromised to export.",
        variant: "default",
      })
      return
    }

    const exportData = compromisedNodes.map(node => {
      const data = node.data as NodeData
      const exportItem: Record<string, any> = {
        hostname: data.hostname || '',
        ipAddress: data.ipAddress || '',
        description: data.description || '',
        investigationStatus: data.investigationStatus,
      }

      return exportItem
    })

    // Create CSV content
    if (exportData.length === 0) return

    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header]
          if (value === undefined || value === null) return ''
          // Escape commas and quotes in CSV
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )
    ].join('\n')

    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `compromised-hosts-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: `Exported ${compromisedNodes.length} compromised host(s) to CSV file.`,
      variant: "default",
    })
  }, [nodes, toast])


  const onConnect = useCallback(
    (params: Connection) =>
      updateEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "customEdge",
            data: {
              label: "New Technique",
              actionType: "Lateral Movement", // Default for new edges
              toolUsed: "",
              userUsed: "",
              timestamp: new Date().toISOString(),
              mitreAttackId: "",
              description: "",
              displaySettings: { ...defaultEdgeDisplaySettings },
            },
          },
          eds,
        ),
      ),
    [updateEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
        const type = event.dataTransfer.getData("application/reactflow") as AssetType

        // check if the dropped element is valid
        if (typeof type === "undefined" || !type) {
          return
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })

        // Handle group nodes differently
        if (type === "group") {
          const newNode: Node = {
            id: getId(),
            type: "labeledGroupNode",
            position,
            data: {
              label: "Asset Group",
              type,
              hostname: "",
              ipAddress: "",
              os: "",
              criticality: "Medium",
              services: [],
              actions: [],
              description: "",
              displaySettings: { ...defaultDisplaySettings },
              isCompromised: false,
            },
            width: 400,
            height: 250,
          }
          updateNodes((nds) => nds.concat(newNode))
          return
        }

        const newNode: Node = {
          id: getId(),
          type: "customNode",
          position,
          data: {
            label: type
              .split("-")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" "),
            type,
            hostname: "",
            ipAddress: "",
            os: "",
            criticality: "Medium",
            services: [],
            actions: [],
            description: "",
            displaySettings: { ...defaultDisplaySettings },
            isCompromised: false,
          },
        }

        updateNodes((nds) => nds.concat(newNode))
      }
    },
    [reactFlowInstance, updateNodes],
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedElement(node)
  }, [])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedElement(edge)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedElement(null)
  }, [])

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    
    if (hasClipboardData()) {
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (reactFlowBounds && reactFlowInstance) {
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })
        handlePaste(position)
      }
    }
  }, [hasClipboardData, reactFlowInstance, handlePaste])

  const updateNode = useCallback(
    (id: string, data: Partial<NodeData>) => {
      updateNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: { ...node.data, ...data },
              }
            : node,
        ),
      )
    },
    [updateNodes],
  )

  const updateEdge = useCallback(
    (id: string, data: Partial<EdgeData>) => {
      updateEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: { ...edge.data, ...data },
              }
            : edge,
        ),
      )
    },
    [updateEdges],
  )

  const handleDeleteSelected = useCallback(() => {
    if (selectedElement) {
      if (
        window.confirm(
          `Are you sure you want to delete the selected ${selectedElement.type === "customEdge" ? "edge" : "node"}?`,
        )
      ) {
        if (selectedElement.type !== "customEdge") {
          // It's a node - delete node and connected edges in one operation
          const newNodes = nodes.filter((node) => node.id !== selectedElement.id)
          const newEdges = edges.filter((edge) => edge.source !== selectedElement.id && edge.target !== selectedElement.id)
          setNodes(newNodes)
          setEdges(newEdges)
          // Take snapshot after both updates
          setTimeout(() => takeSnapshot({ nodes: newNodes, edges: newEdges }), 0)
        } else {
          // It's an edge
          updateEdges((eds) => eds.filter((edge) => edge.id !== selectedElement.id))
        }
        setSelectedElement(null) // Deselect after deletion
      }
    }
  }, [selectedElement, nodes, edges, updateEdges, takeSnapshot, setNodes, setEdges])

  // Check if two positions would cause overlapping connection points
  const wouldConnectionPointsOverlap = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    const minDistance = 120 // Minimum distance between connection points (handles + some buffer)
    const distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
    return distance < minDistance
  }

  // Find a safe position that doesn't cause connection point overlaps
  const findSafePosition = (
    desiredPos: { x: number; y: number },
    existingPositions: { x: number; y: number }[],
    attempt = 0,
  ): { x: number; y: number } => {
    if (attempt > 20) return desiredPos // Fallback after too many attempts

    // Check if current position is safe
    const isSafe = existingPositions.every((pos) => !wouldConnectionPointsOverlap(desiredPos, pos))

    if (isSafe) {
      return desiredPos
    }

    // Try adjusting position in a spiral pattern
    const offset = 60 + attempt * 30 // Increase offset with each attempt
    const angle = (attempt * 45) % 360 // Try different angles
    const radians = (angle * Math.PI) / 180

    const newPos = {
      x: desiredPos.x + Math.cos(radians) * offset,
      y: desiredPos.y + Math.sin(radians) * offset,
    }

    return findSafePosition(newPos, existingPositions, attempt + 1)
  }

  // Auto-align nodes function - with connection point collision detection
  const handleAutoAlign = useCallback(() => {
    if (nodes.length === 0) return

    // Even more generous spacing to account for connection points
    const nodeSpacing = 500 // Increased to account for connection point clearance
    const levelSpacing = 400 // Increased vertical spacing
    const maxNodesPerLevel = 3 // Keep conservative
    const rowOffset = 200 // Larger offset between rows

    // Create a more sophisticated layout using Dagre-like algorithm
    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const inDegree = new Map<string, number>()
    const outEdges = new Map<string, string[]>()

    // Initialize maps
    nodes.forEach((node) => {
      inDegree.set(node.id, 0)
      outEdges.set(node.id, [])
    })

    // Build graph structure
    edges.forEach((edge) => {
      const currentIn = inDegree.get(edge.target) || 0
      inDegree.set(edge.target, currentIn + 1)

      const currentOut = outEdges.get(edge.source) || []
      currentOut.push(edge.target)
      outEdges.set(edge.source, currentOut)
    })

    // Find levels using topological sort
    const levels: string[][] = []
    const queue = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id)
    const tempInDegree = new Map(inDegree)

    // If no root nodes, start with the first node
    if (queue.length === 0 && nodes.length > 0) {
      queue.push(nodes[0].id)
    }

    while (queue.length > 0) {
      const currentLevel: string[] = []
      const nextQueue: string[] = []

      // Process current level
      while (queue.length > 0) {
        const nodeId = queue.shift()!
        currentLevel.push(nodeId)

        // Update neighbors
        const neighbors = outEdges.get(nodeId) || []
        neighbors.forEach((neighborId) => {
          const newInDegree = (tempInDegree.get(neighborId) || 0) - 1
          tempInDegree.set(neighborId, newInDegree)

          if (newInDegree === 0) {
            nextQueue.push(neighborId)
          }
        })
      }

      if (currentLevel.length > 0) {
        levels.push(currentLevel)
      }

      // Move to next level
      queue.push(...nextQueue)
    }

    // Handle any remaining nodes (cycles or disconnected)
    const processedNodes = new Set(levels.flat())
    const remainingNodes = nodes.filter((node) => !processedNodes.has(node.id))
    if (remainingNodes.length > 0) {
      levels.push(remainingNodes.map((node) => node.id))
    }

    // Position nodes with connection point collision detection
    const newPositions = new Map<string, { x: number; y: number }>()
    const allPositions: { x: number; y: number }[] = []

    levels.forEach((level, levelIndex) => {
      const baseY = levelIndex * levelSpacing

      // Split large levels into multiple rows
      const rows: string[][] = []
      for (let i = 0; i < level.length; i += maxNodesPerLevel) {
        rows.push(level.slice(i, i + maxNodesPerLevel))
      }

      rows.forEach((row, rowIndex) => {
        const rowY = baseY + rowIndex * rowOffset
        const totalWidth = (row.length - 1) * nodeSpacing
        const startX = -totalWidth / 2

        row.forEach((nodeId, index) => {
          const desiredPos = {
            x: startX + index * nodeSpacing,
            y: rowY,
          }

          // Find a safe position that doesn't cause connection point overlaps
          const safePos = findSafePosition(desiredPos, allPositions)

          newPositions.set(nodeId, safePos)
          allPositions.push(safePos)
        })
      })
    })

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

  // Keyboard event listener for Delete/Backspace and Undo/Redo
  useEffect(() => {
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
  }, [handleDeleteSelected, selectedElement, handleUndo, handleRedo, handleCopy, handlePaste, toast])

  const handleSave = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()
      const saveData = {
        ...flow,
        canvasTitle: canvasTitle
      }
      localStorage.setItem("intrusionpath-flow", JSON.stringify(saveData))
      alert("IntrusionPath diagram saved!")
    }
  }

  const handleLoad = () => {
    const flowString = localStorage.getItem("intrusionpath-flow")
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

        // Auto-align after loading
        setTimeout(() => {
          handleAutoAlign()
        }, 100)

        alert("IntrusionPath diagram loaded!")
      }
    } else {
      alert("No saved IntrusionPath diagram found!")
    }
  }

  const handleSaveAsJSON = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()
      const jsonData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        canvasTitle: canvasTitle,
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
      link.download = `intrusionpath-diagram-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert("Diagram exported as JSON file!")
    }
  }

  const handleImportJSON = () => {
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
            alert("Failed to import diagram. Please check the file format.")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the diagram? This cannot be undone.")) {
      setNodes([])
      setEdges([])
      setSelectedElement(null)
      // Reset undo/redo history when clearing
      reset({ nodes: [], edges: [] })
    }
  }

  const handleStartFromScratch = () => {
    if (nodes.length > 0 || edges.length > 0) {
      if (window.confirm("Are you sure you want to start from scratch? This will clear the current diagram.")) {
        setNodes([])
        setEdges([])
        setSelectedElement(null)
        setShowTemplatePanel(false)
        // Reset undo/redo history when starting from scratch
        reset({ nodes: [], edges: [] })
      }
    } else {
      // Already empty, just close template panel if open
      setShowTemplatePanel(false)
    }
  }

  // Undo/redo functions are already defined above

  const handleZoomIn = () => {
    reactFlowInstance?.zoomIn()
  }

  const handleZoomOut = () => {
    reactFlowInstance?.zoomOut()
  }

  const handleFitView = () => {
    fitView()
  }

  const handleToggleGrid = () => {
    setSnapToGrid((prev) => !prev)
  }

  const handleLoadTemplate = (template: Template) => {
    if (window.confirm("Loading this template will replace the current diagram. Continue?")) {
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
      setEdges(template.edges)
      setSelectedElement(null)
      setShowTemplatePanel(false) // Close template panel after loading
      // Reset undo/redo history when loading template
      reset({ nodes: nodesWithDisplaySettings, edges: template.edges })

      // Automatically apply auto-align after template loads
      setTimeout(() => {
        handleAutoAlign()
      }, 100) // Small delay to ensure nodes are rendered
    }
  }

  const handleSaveAsTemplate = (name: string, description: string, category: string, tags: string[]) => {
    // This function is called by the TemplatePanel component
    // The actual template creation is handled there
  }

  const handleToggleTemplatePanel = () => {
    setShowTemplatePanel((prev) => !prev)
  }

  const handleCloseTemplatePanel = () => {
    setShowTemplatePanel(false)
  }

  const handleToggleAnimations = () => {
    setAnimationsEnabled((prev) => !prev)
  }

  const handleToggleTimelinePanel = () => {
    setShowTimelinePanel((prev) => !prev)
  }

  const handleCloseTimelinePanel = () => {
    setShowTimelinePanel(false)
  }

  const handleShowDataHandling = () => {
    setShowDataHandlingModal(true)
  }

  const handleCloseDataHandling = () => {
    setShowDataHandlingModal(false)
  }

  const handleHighlightEdge = (edgeId: string) => {
    // Find and highlight the edge
    const edge = edges.find(e => e.id === edgeId)
    if (edge) {
      setSelectedElement(edge)
    }
  }

  const handleSelectEdge = (edgeId: string) => {
    // Find and select the edge
    const edge = edges.find(e => e.id === edgeId)
    if (edge) {
      setSelectedElement(edge)
    }
  }





  // Show mobile warning if on mobile and not dismissed
  if (isMobile && showMobileWarning && !dismissedMobileWarning) {
    return (
      <MobileWarning 
        onDismiss={() => {
          setDismissedMobileWarning(true)
          setShowMobileWarning(false)
        }} 
      />
    )
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-950 text-white">
      <HeaderControls
        onSave={handleSave}
        onLoad={handleLoad}
        onSaveAsJSON={handleSaveAsJSON}
        onImportJSON={handleImportJSON}
        onExportCompromisedHosts={exportCompromisedHosts}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onToggleTemplates={handleToggleTemplatePanel}
        onToggleTimeline={handleToggleTimelinePanel}
        onStartFromScratch={handleStartFromScratch}
        onAutoAlign={handleAutoAlign}
        onClear={handleClear}
        onToggleAnimations={handleToggleAnimations}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onPaste={() => handlePaste()}
        onShowDataHandling={handleShowDataHandling}
        showTemplates={showTemplatePanel}
        showTimeline={showTimelinePanel}
        hasSelection={nodes.length > 0}
        isExporting={isExporting}
        animationsEnabled={animationsEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        canCopy={nodes.some(n => n.selected) || edges.some(e => e.selected) || selectedElement !== null}
        canPaste={hasClipboardData()}
      />
      <div className="flex flex-1 overflow-hidden">
        {showTemplatePanel ? (
          <TemplatePanel
            onLoadTemplate={handleLoadTemplate}
            onSaveAsTemplate={handleSaveAsTemplate}
            currentNodes={nodes}
            currentEdges={edges}
            onClose={handleCloseTemplatePanel}
          />
        ) : (
          <AssetLibrary />
        )}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={setEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2, stroke: '#8B5CF6', strokeDasharray: '5 5' },
              animated: false,
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            snapToGrid={snapToGrid}
            snapGrid={[15, 15]}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            className="bg-gray-900"
            // Performance optimizations for smooth dragging
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            // Enable multi-selection
            multiSelectionKeyCode="Shift"
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            preventScrolling={true}
            nodeOrigin={[0.5, 0.5]}
            // Disable expensive features during interaction
            connectionLineType={'smoothstep' as any}
            connectionLineStyle={{ strokeWidth: 2, stroke: '#8B5CF6' }}
          >
            <Controls />
            <Background variant={"dots" as any} gap={12} size={1} color="#4B5563" />
            <Panel position="top-left" className="p-2 text-sm text-gray-400">
              <CanvasTitle title={canvasTitle} onTitleChange={setCanvasTitle} />
              <div className="mt-2">
                {nodes.length === 0 && edges.length === 0
                  ? "Start by dragging assets from the left panel or open a template."
                  : "Drag assets from the left panel to add nodes."}
              </div>
            </Panel>
            <Panel position="top-right" className="p-2">
              <DownloadButton canvasTitle={canvasTitle} />
            </Panel>
            <Panel position="bottom-right" className="p-2 text-xs text-gray-500">
              Created by SagaLabs - Train as you fight
              <br />
              <span className="text-xs opacity-70">Developed with AI assistance</span>
            </Panel>

          </ReactFlow>
        </div>
        <PropertiesPanel
          selectedElement={selectedElement}
          updateNode={updateNode}
          updateEdge={updateEdge}
          onDelete={handleDeleteSelected}
        />
      </div>
      
      {/* Timeline Modal */}
      <TimelineModal
        isOpen={showTimelinePanel}
        onClose={handleCloseTimelinePanel}
        edges={edges}
        nodes={nodes}
        onHighlightEdge={handleHighlightEdge}
        onSelectEdge={handleSelectEdge}
      />
      
      {/* Data Handling Modal */}
      <DataHandlingModal
        isOpen={showDataHandlingModal}
        onClose={handleCloseDataHandling}
      />
    </div>
  )
}
