import type { XYPosition } from "@xyflow/react"

import {
  buildExpandedPresentationLayout as buildExpandedPresentationLayoutRuntime,
} from "./presentation-layout.mjs"
import type { CustomEdge, CustomNode } from "@/lib/types"

export interface PresentationLayoutSize {
  width: number
  height: number
}

export interface ExpandedPresentationLayout {
  positions: Record<string, XYPosition>
  groupSizes: Record<string, PresentationLayoutSize>
  hasChanges: boolean
}

export const buildExpandedPresentationLayout = ({
  nodes,
  edges,
  edgeLabelSizes,
  gap,
}: {
  nodes: CustomNode[]
  edges: CustomEdge[]
  edgeLabelSizes?: Record<string, PresentationLayoutSize>
  gap?: number
}): ExpandedPresentationLayout =>
  buildExpandedPresentationLayoutRuntime({
    nodes,
    edges,
    edgeLabelSizes,
    gap,
  }) as ExpandedPresentationLayout
