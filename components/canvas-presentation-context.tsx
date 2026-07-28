"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"

interface CanvasPresentationContextValue {
  presentationMode: boolean
  showAllDetails: boolean
  expandedNodeIds: ReadonlySet<string>
  expandedEdgeIds: ReadonlySet<string>
  playbackActive: boolean
  currentPlaybackEdgeId: string | null
  inspectedPlaybackEdgeId: string | null
  reachedPlaybackNodeIds: ReadonlySet<string>
  reachedPlaybackEdgeIds: ReadonlySet<string>
  currentPlaybackNodeIds: ReadonlySet<string>
  inspectedPlaybackNodeIds: ReadonlySet<string>
  toggleNodeDetails: (id: string) => void
  toggleEdgeDetails: (id: string) => void
}

const CanvasPresentationContext = createContext<CanvasPresentationContextValue | null>(null)

interface CanvasPresentationProviderProps extends CanvasPresentationContextValue {
  children: ReactNode
}

export function CanvasPresentationProvider({
  presentationMode,
  showAllDetails,
  expandedNodeIds,
  expandedEdgeIds,
  playbackActive,
  currentPlaybackEdgeId,
  inspectedPlaybackEdgeId,
  reachedPlaybackNodeIds,
  reachedPlaybackEdgeIds,
  currentPlaybackNodeIds,
  inspectedPlaybackNodeIds,
  toggleNodeDetails,
  toggleEdgeDetails,
  children,
}: CanvasPresentationProviderProps) {
  const value = useMemo(
    () => ({
      presentationMode,
      showAllDetails,
      expandedNodeIds,
      expandedEdgeIds,
      playbackActive,
      currentPlaybackEdgeId,
      inspectedPlaybackEdgeId,
      reachedPlaybackNodeIds,
      reachedPlaybackEdgeIds,
      currentPlaybackNodeIds,
      inspectedPlaybackNodeIds,
      toggleNodeDetails,
      toggleEdgeDetails,
    }),
    [
      presentationMode,
      showAllDetails,
      expandedNodeIds,
      expandedEdgeIds,
      playbackActive,
      currentPlaybackEdgeId,
      inspectedPlaybackEdgeId,
      reachedPlaybackNodeIds,
      reachedPlaybackEdgeIds,
      currentPlaybackNodeIds,
      inspectedPlaybackNodeIds,
      toggleNodeDetails,
      toggleEdgeDetails,
    ],
  )

  return (
    <CanvasPresentationContext.Provider value={value}>
      {children}
    </CanvasPresentationContext.Provider>
  )
}

export function useCanvasPresentation() {
  const presentation = useContext(CanvasPresentationContext)

  if (!presentation) {
    throw new Error("useCanvasPresentation must be used within CanvasPresentationProvider")
  }

  return presentation
}
