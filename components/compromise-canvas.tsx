"use client"

import type React from "react"
import { useRef, useEffect, useMemo, useCallback, useState } from "react"
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
import {
  createEdgeActionTypeUpdate,
  getEdgeActionTypes,
} from "@/lib/edge-action-types"
import { FIT_VIEW_OPTIONS } from "@/lib/utils/compromise-canvas-constants"
import { useCompromiseCanvasState } from "@/hooks/use-compromise-canvas-state"
import { useCompromiseCanvasHandlers } from "@/hooks/use-compromise-canvas-handlers"
import { useReactFlowCallbacks } from "@/hooks/use-reactflow-callbacks"
import { Button } from "@/components/ui/button"
import { CanvasActionsProvider } from "./canvas-actions-context"
import { CanvasPresentationProvider } from "./canvas-presentation-context"
import SelectionContextMenu from "./selection-context-menu"
import SelectionToolbar from "./selection-toolbar"
import PresentationControls from "./presentation-controls"
import HostPathDrilldown from "./host-path-drilldown"
import { useCanvasPresentation } from "@/hooks/use-canvas-presentation"

const nodeTypes = {
  customNode: CustomNode,
  labeledGroupNode: GroupNode,
}

export default function CompromiseCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()
  const reactFlowStore = useStoreApi()

  // Drill-down: which asset's ordered attack path is open, if any.
  const [drilldownNodeId, setDrilldownNodeId] = useState<string | null>(null)

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      // Group boxes are backdrops, and legacy action lists are not ordered paths.
      if (
        node.type === "labeledGroupNode" ||
        node.data.actionMode !== "ordered-path" ||
        node.data.actions.length === 0
      ) return
      setDrilldownNodeId(node.id)
    },
    [],
  )

  // Mobile detection
  const isMobile = useMobile()
  const [showMobileWarning, setShowMobileWarning] = useState(true)
  const [dismissedMobileWarning, setDismissedMobileWarning] = useState(false)
  const [selectionContextMenuPoint, setSelectionContextMenuPoint] = useState<{ x: number; y: number } | null>(null)
  const [expandedSelfConnectionIds, setExpandedSelfConnectionIds] =
    useState<Set<string>>(() => new Set())
  const {
    presentationMode,
    autosavePaused: presentationAutosavePaused,
    showAllDetails: showAllPresentationDetails,
    playbackActive: presentationPlaybackActive,
    playbackTimeline: presentationPlaybackTimeline,
    playbackIndex: presentationPlaybackIndex,
    inspectedPlaybackEdgeId: inspectedPresentationPlaybackEdgeId,
    expandedNodeIds: expandedPresentationNodeIds,
    expandedEdgeIds: expandedPresentationEdgeIds,
    playbackFrame: presentationPlaybackFrame,
    inspectedPlaybackNodeIds: inspectedPresentationPlaybackNodeIds,
    expandedLayout: expandedPresentationLayout,
    enterPresentation,
    exitPresentation: handleExitPresentation,
    toggleAllDetails: toggleAllPresentationDetails,
    toggleNodeDetails: togglePresentationNodeDetails,
    toggleEdgeDetails: togglePresentationEdgeDetails,
    togglePlayback: handleTogglePresentationPlayback,
    setPlaybackIndex: setPresentationPlaybackIndex,
    focusCurrentPlaybackStep: handleFocusCurrentPlaybackStep,
    inspectPlaybackIssue: handleInspectPresentationPlaybackIssue,
  } = useCanvasPresentation()

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
    flushAutosave,
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
  } = useCompromiseCanvasState({ autosavePaused: presentationAutosavePaused })

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
  const handleEnterPresentation = useCallback(() => {
    enterPresentation({
      reactFlowInstance,
      nodes,
      edges,
      flushAutosave,
      onBeforeEnter: () => setSelectionContextMenuPoint(null),
    })
  }, [
    edges,
    enterPresentation,
    flushAutosave,
    nodes,
    reactFlowInstance,
  ])
  const renderedNodes = useMemo(
    () => nodes.map((node) => {
      const presentationPosition =
        presentationMode
          ? expandedPresentationLayout?.positions[node.id]
          : undefined
      const presentationGroupSize =
        presentationMode && node.type === "labeledGroupNode"
          ? expandedPresentationLayout?.groupSizes[node.id]
          : undefined

      return {
        ...node,
        position: presentationPosition ?? node.position,
        width: presentationGroupSize?.width ?? node.width,
        height: presentationGroupSize?.height ?? node.height,
        style: presentationGroupSize
          ? {
              ...node.style,
              width: presentationGroupSize.width,
              height: presentationGroupSize.height,
            }
          : node.style,
        selected: presentationMode ? false : node.selected,
        className: [
          node.className,
          "nokey",
          presentationMode && "presentation-layout-transition",
        ].filter(Boolean).join(" "),
        connectable: node.type !== "labeledGroupNode",
      }
    }),
    [expandedPresentationLayout, nodes, presentationMode],
  )
  const renderedEdges = useMemo(
    () => presentationMode
      ? edges.map((edge) => ({ ...edge, selected: false }))
      : edges,
    [edges, presentationMode],
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

  const resetCanvasState = useCallback(
    (state: Parameters<typeof reset>[0]) => {
      setExpandedSelfConnectionIds(new Set())
      reset(state)
    },
    [reset],
  )

  const handlePresentationNodeClick = useCallback(
    (event: React.MouseEvent, node: CanvasNode) => {
      event.stopPropagation()
      if (node.type === "customNode") togglePresentationNodeDetails(node.id)
    },
    [togglePresentationNodeDetails],
  )

  const handlePresentationEdgeClick = useCallback(
    (event: React.MouseEvent, edge: CanvasEdge) => {
      event.stopPropagation()
      togglePresentationEdgeDetails(edge.id)
    },
    [togglePresentationEdgeDetails],
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
    reset: resetCanvasState,
    fitView,
    toast,
  })

  // Change an edge's action types (updates its routes/labels), undo-safe via updateEdge.
  const handleSetEdgeActionTypes = useCallback(
    (id: string, actionTypes: EdgeActionType[]) => {
      updateEdge(id, createEdgeActionTypeUpdate(actionTypes))
      if (actionTypes.length < 2) {
        setExpandedSelfConnectionIds((current) => {
          if (!current.has(id)) return current
          const next = new Set(current)
          next.delete(id)
          return next
        })
      }
    },
    [updateEdge],
  )

  // Expanded cards are editor view state. Keep them out of saved canvas data
  // and undo history so an eye-button click never displaces a content edit.
  const handleSetEdgeActionTypesExpanded = useCallback(
    (id: string, expanded: boolean) => {
      setExpandedSelfConnectionIds((current) => {
        const alreadyExpanded = current.has(id)
        if (alreadyExpanded === expanded) return current

        const next = new Set(current)
        if (expanded) next.add(id)
        else next.delete(id)
        return next
      })
    },
    [],
  )

  useEffect(() => {
    const expandableIds = new Set(
      edges
        .filter(
          (edge) =>
            edge.source === edge.target &&
            getEdgeActionTypes(edge.data).length > 1,
        )
        .map((edge) => edge.id),
    )

    setExpandedSelfConnectionIds((current) => {
      const next = new Set(
        [...current].filter((id) => expandableIds.has(id)),
      )
      return next.size === current.size ? current : next
    })
  }, [edges])

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
    () =>
      createEdgeTypes(
        animationsEnabled,
        presentationMode ? null : selectedElement,
        expandedSelfConnectionIds,
        deleteEdgeById,
        handleSetEdgeActionTypes,
        handleSetEdgeActionTypesExpanded,
        handleSelectEdge,
        handleSetEdgeLabelOffset,
        handleToggleEdgeUnlocked,
      ),
    [
      animationsEnabled,
      presentationMode,
      selectedElement,
      expandedSelfConnectionIds,
      deleteEdgeById,
      handleSetEdgeActionTypes,
      handleSetEdgeActionTypesExpanded,
      handleSelectEdge,
      handleSetEdgeLabelOffset,
      handleToggleEdgeUnlocked,
    ],
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
    if (presentationMode) return
    return setupKeyboardHandlers(handleDeleteSelected)
  }, [presentationMode, setupKeyboardHandlers, handleDeleteSelected])

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
      {!presentationMode && (
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
          onEnterPresentation={handleEnterPresentation}
          canPresent={
            !presentationAutosavePaused &&
            (nodes.length > 0 || edges.length > 0)
          }
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {!presentationMode && (
          showTemplatePanel ? (
            <TemplatePanel
              onLoadTemplate={handleLoadTemplate}
              onSaveAsTemplate={handleSaveAsTemplate}
              currentNodes={nodes}
              currentEdges={edges}
              onClose={handleCloseTemplatePanel}
            />
          ) : (
            <AssetLibrary />
          )
        )}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <CanvasPresentationProvider
            presentationMode={presentationMode}
            showAllDetails={showAllPresentationDetails}
            expandedNodeIds={expandedPresentationNodeIds}
            expandedEdgeIds={expandedPresentationEdgeIds}
            playbackActive={presentationMode && presentationPlaybackActive}
            currentPlaybackEdgeId={
              presentationPlaybackFrame.currentEvent?.edgeId ?? null
            }
            inspectedPlaybackEdgeId={
              inspectedPresentationPlaybackEdgeId
            }
            reachedPlaybackNodeIds={presentationPlaybackFrame.reachedNodeIds}
            reachedPlaybackEdgeIds={presentationPlaybackFrame.reachedEdgeIds}
            currentPlaybackNodeIds={presentationPlaybackFrame.currentNodeIds}
            inspectedPlaybackNodeIds={
              inspectedPresentationPlaybackNodeIds
            }
            toggleNodeDetails={togglePresentationNodeDetails}
            toggleEdgeDetails={togglePresentationEdgeDetails}
          >
            <CanvasActionsProvider
              updateNode={updateNode}
              multiSelectionActive={presentationMode ? false : multiSelectionActive}
            >
              <ReactFlow
              nodes={renderedNodes}
              edges={renderedEdges}
              onNodesChange={presentationMode ? undefined : onNodesChange}
              onEdgesChange={presentationMode ? undefined : setEdgesChange}
              onConnect={presentationMode ? undefined : onConnect}
              onInit={setReactFlowInstance}
              onDrop={presentationMode ? undefined : onDrop}
              onDragOver={presentationMode ? undefined : onDragOver}
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
              onNodeClick={presentationMode ? handlePresentationNodeClick : onNodeClick}
              onNodeDoubleClick={presentationMode ? undefined : handleNodeDoubleClick}
              onNodeContextMenu={presentationMode ? undefined : handleNodeContextMenu}
              onEdgeClick={presentationMode ? handlePresentationEdgeClick : onEdgeClick}
              onEdgeContextMenu={presentationMode ? undefined : handleEdgeContextMenu}
              onPaneClick={presentationMode ? undefined : onPaneClick}
              onPaneContextMenu={presentationMode ? undefined : onPaneContextMenu}
              onSelectionChange={presentationMode ? undefined : onSelectionChange}
              onPointerDownCapture={presentationMode ? undefined : handleSelectionPointerDownCapture}
              className="ip-canvas"
              // Performance optimizations for smooth dragging
              nodesDraggable={!presentationMode}
              nodesConnectable={!presentationMode}
              nodesFocusable={!presentationMode}
              edgesFocusable={!presentationMode}
              elementsSelectable={!presentationMode}
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
              {!presentationMode && multiSelectionActive && (
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
              {!presentationMode && <Controls />}
              <Background variant={"dots" as any} gap={12} size={1} color="#4B5563" />
              {!presentationMode && (
                <>
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
                </>
              )}
              </ReactFlow>
              {!presentationMode && (
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
              )}
            </CanvasActionsProvider>
          </CanvasPresentationProvider>
          <HostPathDrilldown
            node={nodes.find((n) => n.id === drilldownNodeId) ?? null}
            isOpen={drilldownNodeId !== null}
            onClose={() => setDrilldownNodeId(null)}
          />
          {presentationMode && (
            <PresentationControls
              showAllDetails={showAllPresentationDetails}
              playbackActive={presentationPlaybackActive}
              playbackEvents={presentationPlaybackTimeline.events}
              playbackCoverage={presentationPlaybackTimeline.coverage}
              playbackIssues={presentationPlaybackTimeline.issues}
              playbackIndex={presentationPlaybackIndex}
              inspectedPlaybackEdgeId={
                inspectedPresentationPlaybackEdgeId
              }
              onToggleAllDetails={toggleAllPresentationDetails}
              onTogglePlayback={handleTogglePresentationPlayback}
              onPlaybackIndexChange={setPresentationPlaybackIndex}
              onFocusCurrentPlaybackStep={
                handleFocusCurrentPlaybackStep
              }
              onInspectPlaybackIssue={
                handleInspectPresentationPlaybackIssue
              }
              onExit={handleExitPresentation}
            />
          )}
        </div>
        {!presentationMode && (
          <>
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
          </>
        )}
      </div>

      {/* Timeline Modal */}
      <TimelineModal
        isOpen={!presentationMode && showTimelinePanel}
        onClose={handleCloseTimelinePanel}
        edges={edges}
        nodes={nodes}
        incidentLog={incidentLog}
        onHighlightEdge={handleHighlightEdge}
        onSelectEdge={handleSelectEdge}
        onUpdateEdge={updateEdge}
      />

      <IncidentLogPanel
        isOpen={!presentationMode && showIncidentLogPanel}
        onClose={() => setShowIncidentLogPanel(false)}
        incidentLog={incidentLog}
        setIncidentLog={setIncidentLog}
      />

      {/* Data Handling Modal */}
      <DataHandlingModal
        isOpen={!presentationMode && showDataHandlingModal}
        onClose={handleCloseDataHandling}
      />
    </div>
  )
}
