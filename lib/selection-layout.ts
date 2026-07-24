import type { CustomNode } from "@/lib/types"
import { layoutSelectedNodes as layoutSelectedNodesRuntime } from "./selection-layout.mjs"

export type SelectionLayoutAction =
  | "align-horizontal"
  | "align-vertical"
  | "distribute-horizontal"
  | "distribute-vertical"

export const layoutSelectedNodes = (
  nodes: CustomNode[],
  action: SelectionLayoutAction,
): CustomNode[] => layoutSelectedNodesRuntime(nodes, action) as CustomNode[]
