const positionChanged = (current, next) => current.x !== next.x || current.y !== next.y

const nodeSize = (node, axis) => {
  const measured = node.measured?.[axis]
  if (typeof measured === "number" && Number.isFinite(measured)) return measured

  const explicit = node[axis]
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit

  const dataSize = node.data[axis]
  if (typeof dataSize === "number" && Number.isFinite(dataSize)) return dataSize

  return axis === "width" ? 200 : 120
}

const nodesOverlapOnAxis = (nodes, axis) => {
  const positionKey = axis === "width" ? "x" : "y"
  const sorted = [...nodes].sort(
    (a, b) => a.position[positionKey] - b.position[positionKey] || a.id.localeCompare(b.id),
  )

  return sorted.some((node, index) => {
    if (index === 0) return false
    const previous = sorted[index - 1]
    const previousEnd = previous.position[positionKey] + nodeSize(previous, axis) / 2
    const currentStart = node.position[positionKey] - nodeSize(node, axis) / 2
    return currentStart < previousEnd
  })
}

const spreadNodesOnAxis = (nodes, axis, nextPositions, gap = 32) => {
  const positionKey = axis === "width" ? "x" : "y"
  const sorted = [...nodes].sort(
    (a, b) => a.position[positionKey] - b.position[positionKey] || a.id.localeCompare(b.id),
  )
  const leadingEdge = Math.min(
    ...sorted.map((node) => node.position[positionKey] - nodeSize(node, axis) / 2),
  )
  const trailingEdge = Math.max(
    ...sorted.map((node) => node.position[positionKey] + nodeSize(node, axis) / 2),
  )
  const center = (leadingEdge + trailingEdge) / 2
  const span = sorted.reduce((total, node) => total + nodeSize(node, axis), 0) + gap * (sorted.length - 1)
  let cursor = center - span / 2

  sorted.forEach((node) => {
    const size = nodeSize(node, axis)
    const position = nextPositions.get(node.id) || node.position
    nextPositions.set(node.id, { ...position, [positionKey]: cursor + size / 2 })
    cursor += size + gap
  })
}

/**
 * Arrange only selected nodes. Positions are node centers because the canvas
 * uses a `[0.5, 0.5]` node origin. Labeled groups are backdrop annotations,
 * so arranging them independently would detach them from their contents.
 */
export const layoutSelectedNodes = (nodes, action) => {
  const selected = nodes.filter((node) => node.selected && node.type !== "labeledGroupNode")
  const minimum = action.startsWith("distribute") ? 3 : 2

  if (selected.length < minimum) return nodes

  const nextPositions = new Map()

  if (action === "align-horizontal") {
    const ys = selected.map((node) => node.position.y)
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2
    selected.forEach((node) => nextPositions.set(node.id, { ...node.position, y: centerY }))
    if (nodesOverlapOnAxis(selected, "width")) {
      spreadNodesOnAxis(selected, "width", nextPositions)
    }
  }

  if (action === "align-vertical") {
    const xs = selected.map((node) => node.position.x)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    selected.forEach((node) => nextPositions.set(node.id, { ...node.position, x: centerX }))
    if (nodesOverlapOnAxis(selected, "height")) {
      spreadNodesOnAxis(selected, "height", nextPositions)
    }
  }

  if (action === "distribute-horizontal") {
    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const innerWidth = sorted.slice(1, -1).reduce((total, node) => total + nodeSize(node, "width"), 0)
    const available =
      last.position.x - nodeSize(last, "width") / 2 -
      (first.position.x + nodeSize(first, "width") / 2) -
      innerWidth
    const gap = available / (sorted.length - 1)
    let cursor = first.position.x + nodeSize(first, "width") / 2 + gap

    nextPositions.set(first.id, first.position)
    sorted.slice(1, -1).forEach((node) => {
      const width = nodeSize(node, "width")
      nextPositions.set(node.id, { ...node.position, x: cursor + width / 2 })
      cursor += width + gap
    })
    nextPositions.set(last.id, last.position)
  }

  if (action === "distribute-vertical") {
    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y || a.id.localeCompare(b.id))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const innerHeight = sorted.slice(1, -1).reduce((total, node) => total + nodeSize(node, "height"), 0)
    const available =
      last.position.y - nodeSize(last, "height") / 2 -
      (first.position.y + nodeSize(first, "height") / 2) -
      innerHeight
    const gap = available / (sorted.length - 1)
    let cursor = first.position.y + nodeSize(first, "height") / 2 + gap

    nextPositions.set(first.id, first.position)
    sorted.slice(1, -1).forEach((node) => {
      const height = nodeSize(node, "height")
      nextPositions.set(node.id, { ...node.position, y: cursor + height / 2 })
      cursor += height + gap
    })
    nextPositions.set(last.id, last.position)
  }

  let changed = false
  const arranged = nodes.map((node) => {
    const position = nextPositions.get(node.id)
    if (!position || !positionChanged(node.position, position)) return node
    changed = true
    return { ...node, position }
  })

  return changed ? arranged : nodes
}
