export interface ConnectionEndpoints {
  source?: string | null
  target?: string | null
}

export interface PointOffset {
  x: number
  y: number
}

export interface EdgePositionData {
  routeOffset?: PointOffset
  labelOffset?: PointOffset
  labelLocked?: boolean
  [key: string]: unknown
}

const ZERO_OFFSET: PointOffset = { x: 0, y: 0 }

export const isConnectionAllowed = ({ source, target }: ConnectionEndpoints) =>
  Boolean(source && target && source !== target)

export const readOffset = (value: unknown): PointOffset => {
  if (!value || typeof value !== "object") return ZERO_OFFSET

  const candidate = value as Partial<PointOffset>
  return {
    x: typeof candidate.x === "number" && Number.isFinite(candidate.x) ? candidate.x : 0,
    y: typeof candidate.y === "number" && Number.isFinite(candidate.y) ? candidate.y : 0,
  }
}

export const hasOffset = ({ x, y }: PointOffset) => x !== 0 || y !== 0

export const calculateDragOffset = (
  startOffset: PointOffset,
  startPointer: PointOffset,
  currentPointer: PointOffset,
  zoom: number,
): PointOffset => {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  return {
    x: startOffset.x + (currentPointer.x - startPointer.x) / safeZoom,
    y: startOffset.y + (currentPointer.y - startPointer.y) / safeZoom,
  }
}

export const resetEdgePosition = <T extends EdgePositionData>(data: T) => {
  const { routeOffset: _routeOffset, labelOffset: _labelOffset, ...dataWithoutOffsets } = data
  return dataWithoutOffsets
}

export const updateLabelLock = <T extends EdgePositionData>(data: T, locked: boolean) => {
  if (locked) {
    const { labelOffset: _labelOffset, ...dataWithoutLabelOffset } = data
    return { ...dataWithoutLabelOffset, labelLocked: true }
  }

  return { ...data, labelLocked: false }
}
