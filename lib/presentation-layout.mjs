const DEFAULT_NODE_WIDTH = 200
const DEFAULT_NODE_HEIGHT = 120
const DEFAULT_CARD_GAP = 40
const GROUP_NODE_TYPE = "labeledGroupNode"
const POSITION_EPSILON = 0.01

const finitePositive = (value, fallback) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback

const getNodeSize = (node) => ({
  width: finitePositive(
    node.measured?.width,
    finitePositive(node.width, DEFAULT_NODE_WIDTH),
  ),
  height: finitePositive(
    node.measured?.height,
    finitePositive(node.height, DEFAULT_NODE_HEIGHT),
  ),
})

const getLabelSize = (edgeLabelSizes, edgeId) => {
  const size = edgeLabelSizes?.[edgeId]
  return {
    width: finitePositive(size?.width, 0),
    height: finitePositive(size?.height, 0),
  }
}

const moveApart = ({
  first,
  second,
  axis,
  requiredDistance,
  fallbackDirection = 1,
}) => {
  const delta = second[axis] - first[axis]
  const distance = Math.abs(delta)
  const deficit = requiredDistance - distance
  if (deficit <= POSITION_EPSILON) return 0

  const direction =
    distance > POSITION_EPSILON
      ? Math.sign(delta)
      : fallbackDirection
  const movement = deficit / 2
  first[axis] -= direction * movement
  second[axis] += direction * movement
  return movement
}

/**
 * Builds a temporary expanded-details layout without mutating the saved graph.
 *
 * React Flow uses a centered node origin in CompromiseCanvas. Constraints are
 * resolved locally so a crowded route can make room for its expanded card
 * without scaling unrelated, already-spaced parts of the canvas. Each
 * correction is split between the affected pair to preserve its midpoint.
 * Group backdrops follow the average movement of the assets they contain and
 * grow only when those assets would otherwise leave the group.
 */
export const buildExpandedPresentationLayout = ({
  nodes,
  edges,
  edgeLabelSizes = {},
  gap = DEFAULT_CARD_GAP,
}) => {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new TypeError("nodes and edges must be arrays")
  }

  const contentNodes = nodes.filter(
    (node) => node.type !== GROUP_NODE_TYPE,
  )
  if (contentNodes.length === 0) {
    return {
      positions: {},
      groupSizes: {},
      hasChanges: false,
    }
  }

  const safeGap = finitePositive(gap, DEFAULT_CARD_GAP)
  const nodesById = new Map(
    contentNodes.map((node) => [node.id, node]),
  )
  const sizesById = new Map(
    contentNodes.map((node) => [node.id, getNodeSize(node)]),
  )
  const workingPositions = new Map(
    contentNodes.map((node) => [
      node.id,
      { x: node.position.x, y: node.position.y },
    ]),
  )
  const originalPositions = new Map(
    contentNodes.map((node) => [
      node.id,
      { x: node.position.x, y: node.position.y },
    ]),
  )
  const collisionAxes = new Map()
  const maximumPasses = Math.min(
    2000,
    Math.max(
      24,
      contentNodes.length * contentNodes.length * 4,
    ),
  )

  for (let pass = 0; pass < maximumPasses; pass += 1) {
    let largestMovement = 0

    // A route card sits between its endpoints. If either axis already has
    // enough clearance, leave the route alone. Otherwise resolve the axis
    // that needs the smaller correction.
    edges.forEach((edge) => {
      if (edge.source === edge.target) return

      const source = nodesById.get(edge.source)
      const target = nodesById.get(edge.target)
      const sourcePosition = workingPositions.get(edge.source)
      const targetPosition = workingPositions.get(edge.target)
      if (!source || !target || !sourcePosition || !targetPosition) return

      const originalSource = originalPositions.get(edge.source)
      const originalTarget = originalPositions.get(edge.target)
      const sourceSize = sizesById.get(source.id)
      const targetSize = sizesById.get(target.id)
      const labelSize = getLabelSize(edgeLabelSizes, edge.id)
      const originalDeltaX =
        originalTarget.x - originalSource.x
      const originalDeltaY =
        originalTarget.y - originalSource.y
      const requiredX =
        sourceSize.width / 2 +
        targetSize.width / 2 +
        labelSize.width +
        safeGap * 2
      const requiredY =
        sourceSize.height / 2 +
        targetSize.height / 2 +
        labelSize.height +
        safeGap * 2
      const distanceX = Math.abs(
        targetPosition.x - sourcePosition.x,
      )
      const distanceY = Math.abs(
        targetPosition.y - sourcePosition.y,
      )

      if (
        distanceX + POSITION_EPSILON >= requiredX ||
        distanceY + POSITION_EPSILON >= requiredY
      ) {
        return
      }

      const axis =
        requiredX - distanceX <= requiredY - distanceY
          ? "x"
          : "y"
      const requiredDistance = axis === "x" ? requiredX : requiredY
      const originalDelta =
        axis === "x" ? originalDeltaX : originalDeltaY

      largestMovement = Math.max(
        largestMovement,
        moveApart({
          first: sourcePosition,
          second: targetPosition,
          axis,
          requiredDistance,
          fallbackDirection:
            Math.abs(originalDelta) > POSITION_EPSILON
              ? Math.sign(originalDelta)
              : 1,
        }),
      )
    })

    // Resolve only node cards that still overlap. Prefer the axis needing the
    // least correction, while keeping clearly horizontal or vertical layouts
    // on their established axis.
    for (let index = 0; index < contentNodes.length; index += 1) {
      const first = contentNodes[index]
      const firstSize = sizesById.get(first.id)
      const firstPosition = workingPositions.get(first.id)

      for (
        let otherIndex = index + 1;
        otherIndex < contentNodes.length;
        otherIndex += 1
      ) {
        const second = contentNodes[otherIndex]
        const secondSize = sizesById.get(second.id)
        const secondPosition = workingPositions.get(second.id)
        const deltaX = secondPosition.x - firstPosition.x
        const deltaY = secondPosition.y - firstPosition.y
        const requiredX =
          firstSize.width / 2 + secondSize.width / 2 + safeGap
        const requiredY =
          firstSize.height / 2 + secondSize.height / 2 + safeGap
        const deficitX = requiredX - Math.abs(deltaX)
        const deficitY = requiredY - Math.abs(deltaY)

        if (
          deficitX <= POSITION_EPSILON ||
          deficitY <= POSITION_EPSILON
        ) {
          continue
        }

        const collisionKey = `${first.id}\u0000${second.id}`
        let axis = collisionAxes.get(collisionKey)
        if (!axis) {
          if (Math.abs(deltaX) <= POSITION_EPSILON) {
            axis = "y"
          } else if (Math.abs(deltaY) <= POSITION_EPSILON) {
            axis = "x"
          } else {
            axis = deficitX <= deficitY ? "x" : "y"
          }
          collisionAxes.set(collisionKey, axis)
        }

        largestMovement = Math.max(
          largestMovement,
          moveApart({
            first: firstPosition,
            second: secondPosition,
            axis,
            requiredDistance: axis === "x" ? requiredX : requiredY,
            fallbackDirection: 1,
          }),
        )
      }
    }

    if (largestMovement <= POSITION_EPSILON) break
  }

  const positions = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      workingPositions.get(node.id) ?? {
        x: node.position.x,
        y: node.position.y,
      },
    ]),
  )
  const groupSizes = {}

  nodes
    .filter((node) => node.type === GROUP_NODE_TYPE)
    .forEach((group) => {
      const groupSize = getNodeSize(group)
      const groupLeft = group.position.x - groupSize.width / 2
      const groupRight = group.position.x + groupSize.width / 2
      const groupTop = group.position.y - groupSize.height / 2
      const groupBottom = group.position.y + groupSize.height / 2
      // Asset groups do not store explicit membership. Match their visual
      // meaning in the editor by treating centers inside the original
      // backdrop as temporary presentation members.
      const members = contentNodes.filter(
        (node) =>
          node.position.x >= groupLeft &&
          node.position.x <= groupRight &&
          node.position.y >= groupTop &&
          node.position.y <= groupBottom,
      )

      if (members.length === 0) {
        groupSizes[group.id] = groupSize
        return
      }

      const averageMovement = members.reduce(
        (total, node) => {
          const position = workingPositions.get(node.id)
          return {
            x:
              total.x +
              (position.x - node.position.x) / members.length,
            y:
              total.y +
              (position.y - node.position.y) / members.length,
          }
        },
        { x: 0, y: 0 },
      )
      let left =
        group.position.x + averageMovement.x - groupSize.width / 2
      let right =
        group.position.x + averageMovement.x + groupSize.width / 2
      let top =
        group.position.y + averageMovement.y - groupSize.height / 2
      let bottom =
        group.position.y + averageMovement.y + groupSize.height / 2

      members.forEach((node) => {
        const position = workingPositions.get(node.id)
        const size = sizesById.get(node.id)
        left = Math.min(left, position.x - size.width / 2 - safeGap)
        right = Math.max(right, position.x + size.width / 2 + safeGap)
        top = Math.min(top, position.y - size.height / 2 - safeGap)
        bottom = Math.max(bottom, position.y + size.height / 2 + safeGap)
      })

      positions[group.id] = {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
      }
      groupSizes[group.id] = {
        width: right - left,
        height: bottom - top,
      }
    })

  const hasPositionChanges = nodes.some((node) => {
    const position = positions[node.id]
    return (
      Math.abs(position.x - node.position.x) > POSITION_EPSILON ||
      Math.abs(position.y - node.position.y) > POSITION_EPSILON
    )
  })
  const hasGroupSizeChanges = nodes
    .filter((node) => node.type === GROUP_NODE_TYPE)
    .some((node) => {
      const originalSize = getNodeSize(node)
      const size = groupSizes[node.id]
      return (
        Math.abs(size.width - originalSize.width) >
          POSITION_EPSILON ||
        Math.abs(size.height - originalSize.height) >
          POSITION_EPSILON
      )
    })

  return {
    positions,
    groupSizes,
    hasChanges: hasPositionChanges || hasGroupSizeChanges,
  }
}
