import {
  formatCompactLocalTimestamp as formatCompactLocalTimestampRuntime,
  getCenteredParallelLaneCenters as getCenteredParallelLaneCentersRuntime,
} from "./self-connection-runtime.mjs"

export const getCenteredParallelLaneCenters = (
  baseStrokeWidths: number[],
): number[] =>
  getCenteredParallelLaneCentersRuntime(baseStrokeWidths) as number[]

export const formatCompactLocalTimestamp = (
  timestamp: unknown,
): string | null =>
  formatCompactLocalTimestampRuntime(timestamp) as string | null
