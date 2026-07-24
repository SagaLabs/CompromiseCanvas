"use client"

import type React from "react"
import { useRef, useEffect, useMemo, useCallback } from "react"
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useReactFlow,
  useStoreApi,
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
import type { CustomEdge as CanvasEdge, CustomNode as CanvasNode, EdgeActionType } from "@/lib/types"
import { FIT_VIEW_OPTIONS } from "@/lib/utils/compromise-canvas-constants"
import { useCompromiseCanvasState } from "@/hooks/use-compromise-canvas-state"
import { useCompromiseCanvasHandlers } from "@/hooks/use-compromise-canvas-handlers"
import { useReactFlowCallbacks } from "@/hooks/use-reactflow-callbacks"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CanvasActionsProvider } from "./canvas-actions-context"
import SelectionContextMenu from "./selection-context-menu"
import SelectionToolbar from "./selection-toolbar"

const nodeTypes = {
  customNode: CustomNode,
  labeledGroupNode: GroupNode,
}

export default function CompromiseCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()
  const reactFlowStore = useStoreApi()

  // Mobile detection
  const isMobile = useMobile()
  const [showMobileWarning, setShowMobileWarning] = useState(true)
  const [dismissedMobileWarning, setDismissedMobileWarning] = useState(false)
  const [selectionContextMenuPoint, setSelectionContextMenuPoint] = useState<{ x: number; y: number } | null>(null)

  // Use centralized state management hook
  const {
    nodes,
    edges,
    reactFlowInstance,
    selectedElement,
    selectedNodeCount,
    selectedEdgeCount,
    arrangeableNodeCount,
    bulkStatusNodeCount,
    allBulkStatusNodesCompromised,
    bulkInvestigationStatus,
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
    handleSelectionLayout,
    handleToggleSelectedCompromised,
    handleSetSelectedInvestigationStatus,
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
    onSelectionChange,
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

  const selectedElementCount = selectedNodeCount + selectedEdgeCount
  const multiSelectionActive = selectedElementCount > 1
  const renderedNodes = useMemo(
    () => nodes.map((node) => ({
      ...node,
      className: [node.className, "nokey"].filter(Boolean).join(" "),
    })),
    [nodes],
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: CanvasNode) => {
      event.preventDefault()
      event.stopPropagation()

      if (!node.selected) {
        setNodes((current) => current.map((item) => ({ ...item, selected: item.id === node.id })))
        setEdges((current) => current.map((item) => item.selected ? { ...item, selected: false } : item))
        setSelectedElement(node)
      }

      setSelectionContextMenuPoint({ x: event.clientX, y: event.clientY })
    },
    [setNodes, setEdges, setSelectedElement],
  )

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: CanvasEdge) => {
      event.preventDefault()
      event.stopPropagation()

      if (!edge.selected) {
        setNodes((current) => current.map((item) => item.selected ? { ...item, selected: false } : item))
        setEdges((current) => current.map((item) => ({ ...item, selected: item.id === edge.id })))
        setSelectedElement(edge)
      }

      setSelectionContextMenuPoint({ x: event.clientX, y: event.clientY })
    },
    [setNodes, setEdges, setSelectedElement],
  )

  const handleSelectionContextMenuOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectionContextMenuPoint(null)
  }, [])

  const handleSelectionPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return

      // React Flow updates its modifier state in an effect. A fast modified
      // click can reach node selection first and replace the existing selection.
      // Synchronize the real pointer modifier before React Flow handles it.
      reactFlowStore.setState({
        multiSelectionActive: event.shiftKey || event.ctrlKey,
      })
    },
    [reactFlowStore],
  )

  useEffect(() => {
    if (selectedElementCount === 0) setSelectionContextMenuPoint(null)
  }, [selectedElementCount])

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

  const copySelection = useCallback(() => {
    if (!handleCopy()) return
    toast({
      title: "Copied",
      description: "Selected nodes and their internal connections were copied.",
      variant: "default",
    })
  }, [handleCopy, toast])

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
          <CanvasActionsProvider updateNode={updateNode} multiSelectionActive={multiSelectionActive}>
            <ReactFlow
              nodes={renderedNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={setEdgesChange}
              onConnect={onConnect}
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
              nodeClickDistance={5}
              snapToGrid={snapToGrid}
              snapGrid={[15, 15]}
              onNodeClick={onNodeClick}
              onNodeContextMenu={handleNodeContextMenu}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={handleEdgeContextMenu}
              onPaneClick={onPaneClick}
              onPaneContextMenu={onPaneContextMenu}
              onSelectionChange={onSelectionChange}
              onPointerDownCapture={handleSelectionPointerDownCapture}
              className="ip-canvas"
              // Performance optimizations for smooth dragging
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              selectNodesOnDrag={false}
              // Preserve the existing canvas controls: plain drag pans and
              // Shift-drag on empty canvas starts the selection marquee.
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
              deleteKeyCode={null}
            >
              {multiSelectionActive && (
                <Panel position="top-right" className="z-30 m-3">
                  <SelectionToolbar
                    selectedNodeCount={selectedNodeCount}
                    selectedEdgeCount={selectedEdgeCount}
                    arrangeableNodeCount={arrangeableNodeCount}
                    bulkStatusNodeCount={bulkStatusNodeCount}
                    allBulkStatusNodesCompromised={allBulkStatusNodesCompromised}
                    bulkInvestigationStatus={bulkInvestigationStatus}
                    onCopy={copySelection}
                    onDelete={handleDeleteSelected}
                    onLayout={handleSelectionLayout}
                    onToggleCompromised={handleToggleSelectedCompromised}
                    onSetInvestigationStatus={handleSetSelectedInvestigationStatus}
                  />
                </Panel>
              )}
              <Controls />
              <Background variant={"dots" as any} gap={12} size={1} color="#4B5563" />
              <Panel position="top-left" className="z-10 p-2 text-sm text-gray-400">
                <CanvasTitle title={canvasTitle} onTitleChange={setCanvasTitle} />
                <div className="mt-2">
                  {nodes.length === 0 && edges.length === 0
                    ? "Start by dragging assets from the left panel or open a template."
                    : "Drag to pan. Hold Shift and drag to select."}
                </div>
              </Panel>
              <Panel position="bottom-right" className="p-2 text-xs text-gray-500">
                Created by SagaLabs - Train as you fight
                <br />
                <span className="text-xs opacity-70">Developed with AI assistance</span>
              </Panel>
            </ReactFlow>
            <SelectionContextMenu
              open={selectionContextMenuPoint !== null}
              point={selectionContextMenuPoint}
              onOpenChange={handleSelectionContextMenuOpenChange}
              selectedNodeCount={selectedNodeCount}
              selectedEdgeCount={selectedEdgeCount}
              arrangeableNodeCount={arrangeableNodeCount}
              bulkStatusNodeCount={bulkStatusNodeCount}
              allBulkStatusNodesCompromised={allBulkStatusNodesCompromised}
              bulkInvestigationStatus={bulkInvestigationStatus}
              onCopy={copySelection}
              onDelete={handleDeleteSelected}
              onLayout={handleSelectionLayout}
              onToggleCompromised={handleToggleSelectedCompromised}
              onSetInvestigationStatus={handleSetSelectedInvestigationStatus}
            />
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
        <PropertiesPanel
          selectedElement={selectedElement}
          selectedNodeCount={selectedNodeCount}
          selectedEdgeCount={selectedEdgeCount}
          updateNode={updateNode}
          updateEdge={updateEdge}
          onDelete={handleDeleteSelected}
        />
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
