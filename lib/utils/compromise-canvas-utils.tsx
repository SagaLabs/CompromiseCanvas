import type { Node, Edge } from "@xyflow/react"
import CustomEdge from "@/components/custom-edge"
import type { NodeData, EdgeActionType } from "@/lib/types"

/**
 * Create edge types with animation setting and selection state
 * Memoize to prevent unnecessary re-renders during dragging
 */
export const createEdgeTypes = (
  animationsEnabled: boolean,
  selectedElement: Node | Edge | null,
  onDeleteEdge: (id: string) => void,
  onSetEdgeActionType: (id: string, actionType: EdgeActionType) => void,
  onSetEdgeLabelOffset: (id: string, x: number, y: number) => void,
  onToggleEdgeUnlocked: (id: string) => void,
) => ({
  customEdge: (props: any) => (
    <CustomEdge
      {...props}
      animationsEnabled={animationsEnabled}
      selected={selectedElement?.id === props.id && selectedElement?.type === "customEdge"}
      onDeleteEdge={onDeleteEdge}
      onSetEdgeActionType={onSetEdgeActionType}
      onSetEdgeLabelOffset={onSetEdgeLabelOffset}
      onToggleEdgeUnlocked={onToggleEdgeUnlocked}
    />
  ),
})

/**
 * Check if two positions would cause overlapping connection points
 */
export const wouldConnectionPointsOverlap = (
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
) => {
  const minDistance = 120 // Minimum distance between connection points (handles + some buffer)
  const distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
  return distance < minDistance
}

/**
 * Find a safe position that doesn't cause connection point overlaps
 */
export const findSafePosition = (
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

/**
 * Calculate auto-aligned positions for nodes using topological sort
 */
export const calculateAutoAlignedPositions = (
  nodes: Node[],
  edges: Edge[],
): Map<string, { x: number; y: number }> => {
  if (nodes.length === 0) return new Map()

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

  return newPositions
}

/**
 * Export compromised hosts to CSV
 */
export const exportCompromisedHostsToCSV = (nodes: Node[]): string | null => {
  const compromisedNodes = nodes.filter((node) => node.data && (node.data as NodeData).isCompromised)

  if (compromisedNodes.length === 0) {
    return null
  }

  const exportData = compromisedNodes.map((node) => {
    const data = node.data as NodeData
    const exportItem: Record<string, any> = {
      hostname: data.hostname || "",
      ipAddress: data.ipAddress || "",
      description: data.description || "",
      investigationStatus: data.investigationStatus,
    }

    return exportItem
  })

  // Create CSV content
  if (exportData.length === 0) return null

  const headers = Object.keys(exportData[0])
  const csvContent = [
    headers.join(","),
    ...exportData.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === undefined || value === null) return ""
          // Escape commas and quotes in CSV
          const stringValue = String(value)
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(","),
    ),
  ].join("\n")

  return csvContent
}
