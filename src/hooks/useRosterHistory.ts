import { useState, useCallback } from 'react'

interface RosterState {
  clanRosters: Map<string, Set<string>>
  lockedClans: Set<string>
  excludedPlayers: Set<string>
}

const MAX_HISTORY_SIZE = 5

/**
 * Hook for managing undo/redo history for roster state changes
 * Keeps track of the last 5 roster states for undo/redo functionality
 */
export function useRosterHistory() {
  const [history, setHistory] = useState<RosterState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  /**
   * Deep clone a roster state to prevent reference issues
   */
  const cloneState = useCallback((state: RosterState): RosterState => {
    return {
      clanRosters: new Map(
        Array.from(state.clanRosters.entries()).map(([tag, players]) => [
          tag,
          new Set(players)
        ])
      ),
      lockedClans: new Set(state.lockedClans),
      excludedPlayers: new Set(state.excludedPlayers)
    }
  }, [])

  /**
   * Push a new state to the history
   * Removes any forward history if we're not at the latest state
   */
  const push = useCallback((state: RosterState) => {
    setHistory(prev => {
      // Remove any forward history
      const newHistory = prev.slice(0, currentIndex + 1)
      
      // Add the new state
      const clonedState = cloneState(state)
      newHistory.push(clonedState)
      
      // Keep only the last MAX_HISTORY_SIZE states
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
        return newHistory
      }
      
      return newHistory
    })
    
    // Update index after history is updated
    setCurrentIndex(prev => {
      const newHistory = history.slice(0, currentIndex + 1)
      newHistory.push(state)
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return MAX_HISTORY_SIZE - 1
      }
      return newHistory.length - 1
    })
  }, [currentIndex, cloneState, history])

  /**
   * Undo to the previous state
   */
  const undo = useCallback((): RosterState | null => {
    if (currentIndex <= 0) return null
    
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return cloneState(history[newIndex])
  }, [currentIndex, history, cloneState])

  /**
   * Redo to the next state
   */
  const redo = useCallback((): RosterState | null => {
    if (currentIndex >= history.length - 1) return null
    
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return cloneState(history[newIndex])
  }, [currentIndex, history, cloneState])

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  return {
    push,
    undo,
    redo,
    canUndo,
    canRedo
  }
}
