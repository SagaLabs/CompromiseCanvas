"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { NodeData } from "@/lib/types"

interface CanvasActions {
  updateNode: (id: string, data: Partial<NodeData>) => void
  multiSelectionActive: boolean
}

const CanvasActionsContext = createContext<CanvasActions | null>(null)

interface CanvasActionsProviderProps extends CanvasActions {
  children: ReactNode
}

export function CanvasActionsProvider({ updateNode, multiSelectionActive, children }: CanvasActionsProviderProps) {
  const actions = useMemo(() => ({ updateNode, multiSelectionActive }), [updateNode, multiSelectionActive])

  return <CanvasActionsContext.Provider value={actions}>{children}</CanvasActionsContext.Provider>
}

export function useCanvasActions() {
  const actions = useContext(CanvasActionsContext)

  if (!actions) {
    throw new Error("useCanvasActions must be used within CanvasActionsProvider")
  }

  return actions
}
