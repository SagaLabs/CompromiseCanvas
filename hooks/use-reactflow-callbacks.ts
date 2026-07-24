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

const assetLabelOverrides: Partial<Record<AssetType, string>> = {
  "vpn-gateway": "VPN Gateway",
}

const getDefaultAssetLabel = (type: AssetType) =>
  assetLabelOverrides[type] ??
  type
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")

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
        const type = event.dataTransfer.getData("application/reactflow") as AssetType

        // check if the dropped element is valid
        if (typeof type === "undefined" || !type) {
          return
        }

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
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
            label: getDefaultAssetLabel(type),
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
    if (!event.shiftKey && !event.ctrlKey) setSelectedElement(node)
  }, [setSelectedElement])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: CustomEdge) => {
    if (!event.shiftKey && !event.ctrlKey) setSelectedElement(edge)
  }, [setSelectedElement])

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: CustomNode[]; edges: CustomEdge[] }) => {
      const selection = [...selectedNodes, ...selectedEdges]
      setSelectedElement(selection.length === 1 ? selection[0] : null)
    },
    [setSelectedElement],
  )

  const onPaneClick = useCallback(() => {
    setSelectedElement(null)
  }, [setSelectedElement])

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()

      // A multiselection owns right-click for its bulk action menu. Never let
      // the pane's legacy paste-at-cursor gesture fire underneath it.
      const selectedCount = nodes.filter((node) => node.selected).length + edges.filter((edge) => edge.selected).length
      if (selectedCount > 1) return

      if (hasClipboardData()) {
        if (reactFlowInstance) {
          const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
          handlePaste(position)
        }
      }
    },
    [nodes, edges, hasClipboardData, reactFlowInstance, handlePaste],
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
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id))

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0 && selectedElement) {
      if (selectedElement.type === "customEdge") selectedEdgeIds.add(selectedElement.id)
      else selectedNodeIds.add(selectedElement.id)
    }

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return false

    const newNodes = nodes.filter((node) => !selectedNodeIds.has(node.id))
    const newEdges = edges.filter(
      (edge) =>
        !selectedEdgeIds.has(edge.id) &&
        !selectedNodeIds.has(edge.source) &&
        !selectedNodeIds.has(edge.target),
    )
    const removedEdgeCount = edges.length - newEdges.length

    setNodes(newNodes)
    setEdges(newEdges)
    takeSnapshot({ nodes: newNodes, edges: newEdges })
    setSelectedElement(null)

    const removed = [
      selectedNodeIds.size > 0 && `${selectedNodeIds.size} node${selectedNodeIds.size === 1 ? "" : "s"}`,
      removedEdgeCount > 0 && `${removedEdgeCount} edge${removedEdgeCount === 1 ? "" : "s"}`,
    ].filter(Boolean).join(" and ")

    toast({
      title: "Selection Deleted",
      description: `Removed ${removed}. You can undo with Ctrl+Z.`,
      variant: "default",
    })

    return true
  }, [selectedElement, nodes, edges, takeSnapshot, setNodes, setEdges, setSelectedElement])

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
    onSelectionChange,
    onPaneClick,
    onPaneContextMenu,
    updateNode,
    updateEdge,
    handleDeleteSelected,
    deleteEdgeById,
  }
}
