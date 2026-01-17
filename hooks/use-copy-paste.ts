import { useCallback, useRef } from 'react'
import type { Node, Edge } from 'reactflow'

export interface CopyPasteData {
  nodes: Node[]
  edges: Edge[]
  copiedAt: number
}

let nodeIdCounter = 0
const generateId = () => `copied_node_${nodeIdCounter++}_${Date.now()}`

export function useCopyPaste() {
  const clipboardRef = useRef<CopyPasteData | null>(null)

  const copyElements = useCallback((nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0 && edges.length === 0) {
      return false
    }

    // Get selected node IDs for filtering edges
    const selectedNodeIds = new Set(nodes.map(node => node.id))
    
    // Only copy edges that connect selected nodes
    const relevantEdges = edges.filter(edge => 
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )

    clipboardRef.current = {
      nodes: nodes.map(node => ({
        ...node,
        // Store original position for relative positioning
        data: {
          ...node.data,
          _originalPosition: node.position
        }
      })),
      edges: relevantEdges,
      copiedAt: Date.now()
    }

    return true
  }, [])

  const pasteElements = useCallback((
    pastePosition?: { x: number; y: number },
    existingNodes: Node[] = [],
    existingEdges: Edge[] = []
  ): { nodes: Node[], edges: Edge[] } | null => {
    if (!clipboardRef.current) {
      return null
    }

    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current

    if (copiedNodes.length === 0) {
      return null
    }

    // Calculate offset for pasting
    let offsetX = 50
    let offsetY = 50

    if (pastePosition && copiedNodes.length > 0) {
      // Find the bounds of copied nodes
      const bounds = copiedNodes.reduce(
        (acc, node) => {
          const pos = (node.data as any)._originalPosition || node.position
          return {
            minX: Math.min(acc.minX, pos.x),
            minY: Math.min(acc.minY, pos.y),
            maxX: Math.max(acc.maxX, pos.x),
            maxY: Math.max(acc.maxY, pos.y)
          }
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      )

      // Position the center of the copied nodes at the paste position
      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2
      offsetX = pastePosition.x - centerX
      offsetY = pastePosition.y - centerY
    }

    // Create ID mapping for nodes
    const nodeIdMap = new Map<string, string>()
    
    const newNodes: Node[] = copiedNodes.map(node => {
      const newId = generateId()
      nodeIdMap.set(node.id, newId)
      
      const originalPos = (node.data as any)._originalPosition || node.position
      
      return {
        ...node,
        id: newId,
        position: {
          x: originalPos.x + offsetX,
          y: originalPos.y + offsetY
        },
        data: {
          ...node.data,
          // Remove the temporary _originalPosition
          _originalPosition: undefined
        },
        selected: true // Select newly pasted nodes
      }
    })

    // Create new edges with updated node references
    const newEdges: Edge[] = copiedEdges.map(edge => {
      const newSourceId = nodeIdMap.get(edge.source)
      const newTargetId = nodeIdMap.get(edge.target)
      
      if (!newSourceId || !newTargetId) {
        return null // Skip edges that don't have both nodes
      }

      return {
        ...edge,
        id: `${newSourceId}-${newTargetId}-${Date.now()}`,
        source: newSourceId,
        target: newTargetId,
        selected: true // Select newly pasted edges
      }
    }).filter((edge): edge is Edge => edge !== null)

    return {
      nodes: newNodes,
      edges: newEdges
    }
  }, [])

  const hasClipboardData = useCallback(() => {
    return clipboardRef.current !== null && clipboardRef.current.nodes.length > 0
  }, [])

  const clearClipboard = useCallback(() => {
    clipboardRef.current = null
  }, [])

  return {
    copyElements,
    pasteElements,
    hasClipboardData,
    clearClipboard
  }
}