"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { NodeData } from "@/lib/types"

interface CanvasActions {
  updateNode: (id: string, data: Partial<NodeData>) => void
  multiSelectionActive: boolean
  editingEdgeLabelId: string | null
}

const CanvasActionsContext = createContext<CanvasActions | null>(null)

interface CanvasActionsProviderProps extends CanvasActions {
  children: ReactNode
}

export function CanvasActionsProvider({ updateNode, multiSelectionActive, editingEdgeLabelId, children }: CanvasActionsProviderProps) {
  const actions = useMemo(() => ({ updateNode, multiSelectionActive, editingEdgeLabelId }), [updateNode, multiSelectionActive, editingEdgeLabelId])

  return <CanvasActionsContext.Provider value={actions}>{children}</CanvasActionsContext.Provider>
}

export function useCanvasActions() {
  const actions = useContext(CanvasActionsContext)

  if (!actions) {
    throw new Error("useCanvasActions must be used within CanvasActionsProvider")
  }

  return actions
}
