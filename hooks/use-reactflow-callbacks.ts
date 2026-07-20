import { useCallback } from "react"
import { addEdge, type Connection } from "@xyflow/react"
import type { NodeData, EdgeData, AssetType, CustomNode, CustomEdge } from "@/lib/types"
import { defaultDisplaySettings, defaultEdgeDisplaySettings, getId, LAYER_Z_INDEX } from "@/lib/utils/compromise-canvas-constants"
import { toast } from "@/components/ui/use-toast"

interface UseReactFlowCallbacksProps {
  reactFlowInstance: any
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>
  nodes: CustomNode[]
  edges: CustomEdge[]
  selectedElement: CustomNode | CustomEdge | null
  updateNodes: (nodesOrUpdater: CustomNode[] | ((nodes: CustomNode[]) => CustomNode[])) => void
  updateEdges: (edgesOrUpdater: CustomEdge[] | ((edges: CustomEdge[]) => CustomEdge[])) => void
  setSelectedElement: (element: CustomNode | CustomEdge | null) => void
  setNodes: (nodes: CustomNode[]) => void
  setEdges: (edges: CustomEdge[]) => void
  takeSnapshot: (state: { nodes: CustomNode[]; edges: CustomEdge[] }) => void
  hasClipboardData: () => boolean
  handlePaste: (pastePosition?: { x: number; y: number }) => void
}

export const useReactFlowCallbacks = ({
  reactFlowInstance,
  reactFlowWrapper,
  nodes,
  edges,
  selectedElement,
  updateNodes,
  updateEdges,
  setSelectedElement,
  setNodes,
  setEdges,
  takeSnapshot,
  hasClipboardData,
  handlePaste,
}: UseReactFlowCallbacksProps) => {
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
          const newNode: CustomNode = {
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
              investigationStatus: "No Status",
              color: "blue",
              transparency: 0.2,
            },
            width: 600,
            height: 400,
            zIndex: LAYER_Z_INDEX.GROUP,
          }
          updateNodes((nds) => nds.concat(newNode))
          return
        }

        const newNode: CustomNode = {
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
            investigationStatus: "No Status",
          },
          zIndex: LAYER_Z_INDEX.NODE,
        }

        updateNodes((nds) => nds.concat(newNode))
      }
    },
    [reactFlowInstance, updateNodes],
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: CustomNode) => {
    setSelectedElement(node)
  }, [setSelectedElement])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: CustomEdge) => {
    setSelectedElement(edge)
  }, [setSelectedElement])

  const onPaneClick = useCallback(() => {
    setSelectedElement(null)
  }, [setSelectedElement])

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
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
    },
    [hasClipboardData, reactFlowInstance, handlePaste],
  )

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
        eds.map((edge): CustomEdge =>
          edge.id === id
            ? {
              ...edge,
              data: { ...edge.data, ...data } as EdgeData,
            }
            : edge,
        ),
      )
    },
    [updateEdges],
  )

  const handleDeleteSelected = useCallback(() => {
    if (selectedElement) {
      if (selectedElement.id && (selectedElement as any).type !== "customEdge") {
        // It's a node - delete node and connected edges in one operation
        const newNodes = nodes.filter((node) => node.id !== selectedElement.id)
        const newEdges = edges.filter((edge) => edge.source !== selectedElement.id && edge.target !== selectedElement.id)
        setNodes(newNodes)
        setEdges(newEdges)
        // Take snapshot after both updates
        takeSnapshot({ nodes: newNodes, edges: newEdges })
      } else {
        // It's an edge
        updateEdges((eds) => eds.filter((edge) => edge.id !== selectedElement.id))
      }

      toast({
        title: "Element Deleted",
        description: `Removed selected ${selectedElement.type === "customEdge" ? "edge" : "node"}. You can undo with Ctrl+Z.`,
        variant: "default",
      })

      setSelectedElement(null) // Deselect after deletion
    }
  }, [selectedElement, nodes, edges, updateEdges, takeSnapshot, setNodes, setEdges, setSelectedElement])

  const deleteEdgeById = useCallback(
    (edgeId: string) => {
      updateEdges((eds) => eds.filter((e) => e.id !== edgeId))

      toast({
        title: "Element Deleted",
        description: "Removed selected edge. You can undo with Ctrl+Z.",
        variant: "default",
      })

      if (selectedElement?.id === edgeId) {
        setSelectedElement(null)
      }
    },
    [updateEdges, selectedElement, setSelectedElement],
  )

  return {
    onConnect,
    onDragOver,
    onDrop,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onPaneContextMenu,
    updateNode,
    updateEdge,
    handleDeleteSelected,
    deleteEdgeById,
  }
}
