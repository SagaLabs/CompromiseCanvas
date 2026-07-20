"use client"

import type React from "react"
import { useRef, useEffect, useMemo } from "react"
import ReactFlow, {
  Controls,
  Background,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  MiniMap,
  ConnectionMode,
} from "reactflow"
import "reactflow/dist/style.css"
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
import { useCompromiseCanvasState } from "@/hooks/use-compromise-canvas-state"
import { useCompromiseCanvasHandlers } from "@/hooks/use-compromise-canvas-handlers"
import { useReactFlowCallbacks } from "@/hooks/use-reactflow-callbacks"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { isConnectionAllowed } from "@/lib/utils/flexible-connections"

const nodeTypes = {
  customNode: CustomNode,
  labeledGroupNode: GroupNode,
}

// Loose connection mode makes every handle bidirectional, so explicitly reject self-connections.
const isValidConnection = (connection: Connection) =>
  isConnectionAllowed(connection)

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

  // Memoize edge types to prevent recreation on every render during dragging.
  const edgeTypes = useMemo(
    () => createEdgeTypes(animationsEnabled, selectedElement, updateEdge),
    [animationsEnabled, selectedElement, updateEdge],
  )

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
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={setEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
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
            fitViewOptions={{ padding: 0.2 }}
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
            multiSelectionKeyCode="Shift"
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
            connectionMode={ConnectionMode.Loose}
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
