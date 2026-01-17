import { useCallback, useRef, useState } from 'react'
import type { Node, Edge } from 'reactflow'

export interface FlowState {
  nodes: Node[]
  edges: Edge[]
}

export interface UndoRedoState {
  past: FlowState[]
  present: FlowState
  future: FlowState[]
}

export function useUndoRedo(initialState: FlowState) {
  const [state, setState] = useState<UndoRedoState>({
    past: [],
    present: initialState,
    future: []
  })

  // Track if we should skip the next state save (used for undo/redo operations)
  const skipSave = useRef(false)

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  const takeSnapshot = useCallback((newState: FlowState) => {
    // Don't save state if we're in the middle of an undo/redo operation
    if (skipSave.current) {
      skipSave.current = false
      return
    }

    setState((currentState) => {
      // Don't save if the state hasn't actually changed
      if (
        JSON.stringify(currentState.present.nodes) === JSON.stringify(newState.nodes) &&
        JSON.stringify(currentState.present.edges) === JSON.stringify(newState.edges)
      ) {
        return currentState
      }

      return {
        past: [...currentState.past, currentState.present].slice(-50), // Keep last 50 states
        present: newState,
        future: [] // Clear future when new action is taken
      }
    })
  }, [])

  const undo = useCallback(() => {
    if (!canUndo) return { nodes: state.present.nodes, edges: state.present.edges }

    skipSave.current = true
    
    setState((currentState) => {
      const previous = currentState.past[currentState.past.length - 1]
      const newPast = currentState.past.slice(0, currentState.past.length - 1)

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future]
      }
    })

    // Return the previous state
    const previous = state.past[state.past.length - 1]
    return { nodes: previous.nodes, edges: previous.edges }
  }, [canUndo, state.past, state.present])

  const redo = useCallback(() => {
    if (!canRedo) return { nodes: state.present.nodes, edges: state.present.edges }

    skipSave.current = true

    setState((currentState) => {
      const next = currentState.future[0]
      const newFuture = currentState.future.slice(1)

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture
      }
    })

    // Return the next state
    const next = state.future[0]
    return { nodes: next.nodes, edges: next.edges }
  }, [canRedo, state.future, state.present])

  const reset = useCallback((newState: FlowState) => {
    setState({
      past: [],
      present: newState,
      future: []
    })
  }, [])

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    reset
  }
}