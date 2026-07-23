"use client"

import type React from "react"
import { useRef, useEffect, useMemo, useCallback } from "react"
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import CustomNode from "./custom-node"
import { GroupNode } from "./labeled-group-node"
import AssetLibrary from "./asset-library"
import PropertiesPanel from "./properties-panel"
import HeaderControls from "./header-controls"
import MobileWarning from "./mobile-warning"
import CanvasTitle from "./canvas-title"
import { useMobile } from "@/hooks/use-mobile"
import TemplatePanel from "./template-panel"
import TimelineModal from "./timeline-modal"
import IncidentLogPanel from "./incident-log-panel"
import DataHandlingModal from "./data-handling-modal"
import { createEdgeTypes } from "@/lib/utils/compromise-canvas-utils"
import type { EdgeActionType } from "@/lib/types"
import { FIT_VIEW_OPTIONS } from "@/lib/utils/compromise-canvas-constants"
import { useCompromiseCanvasState } from "@/hooks/use-compromise-canvas-state"
import { useCompromiseCanvasHandlers } from "@/hooks/use-compromise-canvas-handlers"
import { isConnectionAllowed, useReactFlowCallbacks } from "@/hooks/use-reactflow-callbacks"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CanvasActionsProvider } from "./canvas-actions-context"

const nodeTypes = {
  customNode: CustomNode,
  labeledGroupNode: GroupNode,
}

export default function CompromiseCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()

  // Mobile detection
  const isMobile = useMobile()
  const [showMobileWarning, setShowMobileWarning] = useState(true)
  const [dismissedMobileWarning, setDismissedMobileWarning] = useState(false)

  // Use centralized state management hook
  const {
    nodes,
    edges,
    reactFlowInstance,
    selectedElement,
    snapToGrid,
    showTemplatePanel,
    showTimelinePanel,
    showDataHandlingModal,
    isExporting,
    animationsEnabled,
    canvasTitle,
    autosaveEnabled,
    autosaveStatus,
    lastAutosavedAt,
    incidentLog,
    setNodes,
    setEdges,
    setReactFlowInstance,
    setSelectedElement,
    setSnapToGrid,
    setShowTemplatePanel,
    setShowTimelinePanel,
    setShowDataHandlingModal,
    setAnimationsEnabled,
    setCanvasTitle,
    handleToggleAutosave,
    setIncidentLog,
    onNodesChange,
    setEdgesChange,
    updateNodes,
    updateEdges,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    reset,
    takeSnapshot,
    handleCopy,
    handlePaste,
    hasClipboardData,
    setupKeyboardHandlers,
    toast,
    showIncidentLogPanel,
    setShowIncidentLogPanel,
  } = useCompromiseCanvasState()

  // Use ReactFlow callbacks hook
  const {
    onConnect,
    onDragOver,
    onDrop,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onPaneContextMenu,
    updateNode,
    updateEdge,
    handleDeleteSelected,
    deleteEdgeById,
  } = useReactFlowCallbacks({
    reactFlowInstance,
    reactFlowWrapper,
    nodes,
    edges,
    selectedElement,
    updateNodes,
    updateEdges,
    setSelectedElement,
    setNodes,
    setEdges,
    takeSnapshot,
    hasClipboardData,
    handlePaste,
  })

  // Use handlers hook
  const {
    handleSave,
    handleLoad,
    handleSaveAsJSON,
    handleImportJSON,
    handleClear,
    handleStartFromScratch,
    handleFitView,
    handleToggleGrid,
    handleLoadTemplate,
    handleSaveAsTemplate,
    handleToggleTemplatePanel,
    handleCloseTemplatePanel,
    handleToggleAnimations,
    handleToggleTimelinePanel,
    handleCloseTimelinePanel,
    handleShowDataHandling,
    handleCloseDataHandling,
    handleHighlightEdge,
    handleSelectEdge,
    handleAutoAlign,

  } = useCompromiseCanvasHandlers({
    reactFlowInstance,
    nodes,
    edges,
    canvasTitle,
    incidentLog,
    setNodes,
    setEdges,
    updateNodes,
    setSelectedElement,
    setShowTemplatePanel,
    setShowTimelinePanel,
    setShowDataHandlingModal,
    setAnimationsEnabled,
    setSnapToGrid,
    setCanvasTitle,
    setIncidentLog,
    reset,
    fitView,
    toast,
  })

  // Change an edge's action type (updates its color/icon), undo-safe via updateEdge
  const handleSetEdgeActionType = useCallback(
    (id: string, actionType: EdgeActionType) => updateEdge(id, { actionType }),
    [updateEdge],
  )

  // Reposition an edge's control point (dropped after a drag), undo-safe via updateEdge
  const handleSetEdgeLabelOffset = useCallback(
    (id: string, x: number, y: number) => updateEdge(id, { labelOffsetX: x, labelOffsetY: y }),
    [updateEdge],
  )

  // Toggle whether an edge is unlocked for manual routing, undo-safe via updateEdge
  const handleToggleEdgeUnlocked = useCallback(
    (id: string) => {
      const edge = edges.find((e) => e.id === id)
      updateEdge(id, { unlocked: !edge?.data?.unlocked })
    },
    [edges, updateEdge],
  )

  // Memoize edge types to prevent recreation on every render during dragging
  const edgeTypes = useMemo(
    () => createEdgeTypes(animationsEnabled, selectedElement, deleteEdgeById, handleSetEdgeActionType, handleSelectEdge, handleSetEdgeLabelOffset, handleToggleEdgeUnlocked),
    [animationsEnabled, selectedElement, deleteEdgeById, handleSetEdgeActionType, handleSelectEdge, handleSetEdgeLabelOffset, handleToggleEdgeUnlocked],
  )

  // Keyboard event listener for Delete/Backspace and Undo/Redo
  useEffect(() => {
    return setupKeyboardHandlers(handleDeleteSelected)
  }, [setupKeyboardHandlers, handleDeleteSelected])

  // Show mobile warning if on mobile and not dismissed
  if (isMobile && showMobileWarning && !dismissedMobileWarning) {
    return (
      <MobileWarning
        onDismiss={() => {
          setDismissedMobileWarning(true)
          setShowMobileWarning(false)
        }}
      />
    )
  }

  return (
    <div className="ip-app flex h-screen w-screen flex-col">
      <HeaderControls
        onSave={handleSave}
        onLoad={handleLoad}
        onSaveAsJSON={handleSaveAsJSON}
        onImportJSON={handleImportJSON}

        onFitView={handleFitView}
        onToggleTemplates={handleToggleTemplatePanel}
        onToggleTimeline={handleToggleTimelinePanel}
        onToggleIncidentLog={() => setShowIncidentLogPanel(!showIncidentLogPanel)}
        onStartFromScratch={handleStartFromScratch}
        onAutoAlign={handleAutoAlign}
        onClear={handleClear}
        onToggleAnimations={handleToggleAnimations}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onPaste={() => handlePaste()}
        onShowDataHandling={handleShowDataHandling}
        showTemplates={showTemplatePanel}
        showTimeline={showTimelinePanel}
        showIncidentLog={showIncidentLogPanel}
        hasSelection={nodes.length > 0}
        isExporting={isExporting}
        animationsEnabled={animationsEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        canCopy={nodes.some((n) => n.selected) || edges.some((e) => e.selected) || selectedElement !== null}
        canPaste={hasClipboardData()}
        autosaveEnabled={autosaveEnabled}
        autosaveStatus={autosaveStatus}
        lastAutosavedAt={lastAutosavedAt}
        onToggleAutosave={handleToggleAutosave}
      />
      <div className="flex flex-1 overflow-hidden">
        {showTemplatePanel ? (
          <TemplatePanel
            onLoadTemplate={handleLoadTemplate}
            onSaveAsTemplate={handleSaveAsTemplate}
            currentNodes={nodes}
            currentEdges={edges}
            onClose={handleCloseTemplatePanel}
          />
        ) : (
          <AssetLibrary />
        )}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <CanvasActionsProvider updateNode={updateNode}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={setEdgesChange}
              onConnect={onConnect}
              isValidConnection={isConnectionAllowed}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{
                type: "smoothstep",
                style: { strokeWidth: 2, stroke: "#8B5CF6", strokeDasharray: "5 5" },
                animated: false,
              }}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
              colorMode="dark"
              connectionDragThreshold={8}
              snapToGrid={snapToGrid}
              snapGrid={[15, 15]}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              onPaneContextMenu={onPaneContextMenu}
              className="ip-canvas"
              // Performance optimizations for smooth dragging
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              selectNodesOnDrag={false}
              // Enable multi-selection
              multiSelectionKeyCode={["Shift", "Control"]}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              zoomOnDoubleClick={false}
              elevateNodesOnSelect={false}
              preventScrolling={true}
              nodeOrigin={[0.5, 0.5]}
              // Disable expensive features during interaction
              connectionLineType={"smoothstep" as any}
              connectionLineStyle={{ strokeWidth: 2, stroke: "#8B5CF6" }}
            >
              <Controls />
              <Background variant={"dots" as any} gap={12} size={1} color="#4B5563" />
              <Panel position="top-left" className="p-2 text-sm text-gray-400">
                <CanvasTitle title={canvasTitle} onTitleChange={setCanvasTitle} />
                <div className="mt-2">
                  {nodes.length === 0 && edges.length === 0
                    ? "Start by dragging assets from the left panel or open a template."
                    : "Drag assets from the left panel to add nodes."}
                </div>
              </Panel>
              <Panel position="bottom-right" className="p-2 text-xs text-gray-500">
                Created by SagaLabs - Train as you fight
                <br />
                <span className="text-xs opacity-70">Developed with AI assistance</span>
              </Panel>
            </ReactFlow>
          </CanvasActionsProvider>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
          <Button
            type="button"
            size="sm"
            className="pointer-events-auto rounded-full border border-blue-500/40 bg-gray-900/80 px-4 py-2 text-blue-300 shadow-lg backdrop-blur hover:bg-blue-600 hover:text-white"
            onClick={handleToggleTimelinePanel}
          >
            Open Timeline
          </Button>
        </div>
        <PropertiesPanel selectedElement={selectedElement} updateNode={updateNode} updateEdge={updateEdge} onDelete={handleDeleteSelected} />
      </div>

      {/* Timeline Modal */}
      <TimelineModal
        isOpen={showTimelinePanel}
        onClose={handleCloseTimelinePanel}
        edges={edges}
        nodes={nodes}
        incidentLog={incidentLog}
        onHighlightEdge={handleHighlightEdge}
        onSelectEdge={handleSelectEdge}
        onUpdateEdge={updateEdge}
      />

      <IncidentLogPanel
        isOpen={showIncidentLogPanel}
        onClose={() => setShowIncidentLogPanel(false)}
        incidentLog={incidentLog}
        setIncidentLog={setIncidentLog}
      />

      {/* Data Handling Modal */}
      <DataHandlingModal isOpen={showDataHandlingModal} onClose={handleCloseDataHandling} />
    </div>
  )
}
