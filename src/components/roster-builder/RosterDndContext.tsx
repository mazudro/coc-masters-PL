import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCenter
} from '@dnd-kit/core'
import { useState } from 'react'
import type { RosterPlayerStats } from '@/lib/types'
import { cn } from '@/lib/utils'
import { THBadge } from '@/components/THBadge'

interface CustomClan {
  name: string
  tag: string
  league: string
  minTH: number
  color: string
  bgColor: string
  borderColor: string
  leagueIcon: string
  isCustom: boolean
}

interface RosterDndContextProps {
  children: React.ReactNode
  clanRosters: Map<string, Set<string>>
  lockedClans: Set<string>
  excludedPlayers: Set<string>
  allClans: CustomClan[]
  players: RosterPlayerStats[]
  onAssignPlayer: (playerTag: string, clanTag: string | 'none') => void
  getMaxCapacity: (clanTag: string, includeSubs: boolean) => number
  onValidationMessage?: (message: string) => void
}

/**
 * DnD Context Provider for the roster builder
 * Handles all drag-and-drop events and validations
 */
export function RosterDndContext({
  children,
  clanRosters,
  lockedClans,
  excludedPlayers,
  allClans,
  players,
  onAssignPlayer,
  getMaxCapacity,
  onValidationMessage
}: RosterDndContextProps) {
  const [activePlayer, setActivePlayer] = useState<RosterPlayerStats | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Configure sensors for mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Long-press for 200ms
        tolerance: 5, // Allow 5px of movement during long-press
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const playerData = active.data.current?.player as RosterPlayerStats | undefined
    
    if (playerData) {
      setActivePlayer(playerData)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id as string | null)

    // Validate drop target
    if (over) {
      const dropData = over.data.current
      const dragData = event.active.data.current

      if (dropData?.type === 'clan' && dragData?.player) {
        const player = dragData.player as RosterPlayerStats
        const clanTag = dropData.clanTag as string
        const clan = allClans.find(c => c.tag === clanTag)

        if (!clan) {
          setValidationError(null)
          return
        }

        // Check if clan is locked
        if (lockedClans.has(clanTag)) {
          setValidationError('Clan is locked')
          return
        }

        // Check TH requirement
        const playerTH = player.currentTH || 0
        if (playerTH < clan.minTH) {
          setValidationError(`TH${clan.minTH}+ required`)
          return
        }

        // Check capacity
        const roster = clanRosters.get(clanTag) || new Set()
        const maxCapacity = getMaxCapacity(clanTag, true) // Include subs
        const isFull = roster.size >= maxCapacity && !roster.has(player.playerTag)
        
        if (isFull) {
          setValidationError(`Roster full (${maxCapacity} max)`)
          return
        }

        setValidationError(null)
      }
    } else {
      setValidationError(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActivePlayer(null)
    setOverId(null)
    setValidationError(null)

    if (!over) {
      // Dropped outside any drop zone - remove from roster
      const dragData = active.data.current
      if (dragData?.player) {
        const player = dragData.player as RosterPlayerStats
        onAssignPlayer(player.playerTag, 'none')
      }
      return
    }

    const dropData = over.data.current
    const dragData = active.data.current

    // Handle drop on clan card
    if (dropData?.type === 'clan' && dragData?.player) {
      const player = dragData.player as RosterPlayerStats
      const clanTag = dropData.clanTag as string
      const clan = allClans.find(c => c.tag === clanTag)

      if (!clan) return

      // Validate drop
      if (lockedClans.has(clanTag)) {
        if (onValidationMessage) {
          onValidationMessage('Cannot assign to locked clan')
        }
        return
      }

      const playerTH = player.currentTH || 0
      if (playerTH < clan.minTH) {
        if (onValidationMessage) {
          onValidationMessage(`Player does not meet TH${clan.minTH}+ requirement`)
        }
        return
      }

      const roster = clanRosters.get(clanTag) || new Set()
      const maxCapacity = getMaxCapacity(clanTag, true)
      const isFull = roster.size >= maxCapacity && !roster.has(player.playerTag)

      if (isFull) {
        if (onValidationMessage) {
          onValidationMessage(`Roster is full (${maxCapacity} players maximum)`)
        }
        return
      }

      // Valid drop - assign player
      onAssignPlayer(player.playerTag, clanTag)
    }
  }

  const handleDragCancel = () => {
    setActivePlayer(null)
    setOverId(null)
    setValidationError(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activePlayer ? (
          <div className="bg-card border border-border rounded-lg shadow-2xl p-3 opacity-90 min-w-[250px]">
            <div className="flex items-center gap-2">
              {activePlayer.currentTH && (
                <THBadge level={activePlayer.currentTH} size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{activePlayer.playerName}</p>
                <p className="text-xs text-muted-foreground truncate">{activePlayer.clanName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Avg Stars</p>
                <p className={cn(
                  "font-bold text-sm",
                  activePlayer.avgStars >= 2.5 ? 'text-green-400' :
                    activePlayer.avgStars >= 2.0 ? 'text-yellow-400' :
                      'text-red-400'
                )}>
                  {activePlayer.avgStars.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
