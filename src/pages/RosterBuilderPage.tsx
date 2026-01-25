import { ManualPlayerDialog } from '@/components/ManualPlayerDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLeagueProjections } from '@/hooks/useLeagueProjections'
import { useRosterHistory } from '@/hooks/useRosterHistory'
import { getPlayerHistory, getRecentPlayerPool } from '@/lib/data'
import {
  ATTACKS_PER_SEASON,
  calculatePlayerScore,
  getLeagueAdjustedProjection
} from '@/lib/rosterCalculations'
import type { ManualPlayerEntry, RosterMode, RosterPlayerStats } from '@/lib/types'
import { ArrowDown, ArrowUp, ArrowCounterClockwise, ArrowClockwise, CircleNotch, Download, Image, Info, Plus, Sparkle, Users, Warning, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RosterDndContext } from '@/components/roster-builder/RosterDndContext'
import { DraggablePlayerRow } from '@/components/roster-builder/DraggablePlayerRow'
import { DroppableClanCard } from '@/components/roster-builder/DroppableClanCard'
import { toast } from 'sonner'

// Custom clan type for external/guest clans
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

// CoC Masters PL clan tier configuration for multi-clan distribution
// Ordered from strongest to weakest clan for cascading player assignment
// - coc masters PL (#P0J2J8GJ) - main clan
// - Akademia CoC PL (#JPRPRVUY) - academy
// - Psychole! (#29RYVJ8C8) - training
const CLAN_TIERS = [
  { name: 'coc masters PL', tag: '#P0J2J8GJ', league: 'Master League I', minTH: 16, color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/30', leagueIcon: '/images/leagues/master-1.png', isCustom: false },
  { name: 'Akademia CoC PL', tag: '#JPRPRVUY', league: 'Crystal League I', minTH: 12, color: 'text-green-400', bgColor: 'bg-green-400/10', borderColor: 'border-green-400/30', leagueIcon: '/images/leagues/crystal-1.png', isCustom: false },
  { name: 'Psychole!', tag: '#29RYVJ8C8', league: 'Crystal League II', minTH: 10, color: 'text-orange-400', bgColor: 'bg-orange-400/10', borderColor: 'border-orange-400/30', leagueIcon: '/images/leagues/crystal-2.png', isCustom: false },
] as const satisfies readonly CustomClan[]

type SortField = 'playerName' | 'totalWars' | 'totalAttacks' | 'totalStars' | 'avgStars' | 'threeStarRate' | 'reliabilityScore' | 'currentTH' | 'form'
type SortDirection = 'asc' | 'desc'

// LocalStorage key for persisting roster data
const ROSTER_STORAGE_KEY = 'cwl-roster-builder-state'

// Helper functions for localStorage persistence
const saveRosterState = (data: {
  clanRosters: Map<string, Set<string>>
  lockedClans: Set<string>
  excludedPlayers: Set<string>
  customClans: CustomClan[]
  clanRosterModes: Record<string, RosterMode>
  manualPlayers: Record<string, ManualPlayerEntry[]>
}) => {
  try {
    const serialized = {
      clanRosters: Array.from(data.clanRosters.entries()).map(([tag, players]) => [tag, Array.from(players)]),
      lockedClans: Array.from(data.lockedClans),
      excludedPlayers: Array.from(data.excludedPlayers),
      customClans: data.customClans,
      clanRosterModes: data.clanRosterModes,
      manualPlayers: data.manualPlayers,
    }
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(serialized))
  } catch (err) {
    console.warn('Failed to save roster state to localStorage:', err)
  }
}

const loadRosterState = (): {
  clanRosters: Map<string, Set<string>>
  lockedClans: Set<string>
  excludedPlayers: Set<string>
  customClans: CustomClan[]
  clanRosterModes: Record<string, RosterMode>
  manualPlayers: Record<string, ManualPlayerEntry[]>
} | null => {
  try {
    const stored = localStorage.getItem(ROSTER_STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored)
    return {
      clanRosters: new Map(data.clanRosters.map(([tag, players]: [string, string[]]) => [tag, new Set<string>(players)])),
      lockedClans: new Set<string>(data.lockedClans),
      excludedPlayers: new Set<string>(data.excludedPlayers),
      customClans: data.customClans as CustomClan[],
      clanRosterModes: data.clanRosterModes || {},
      manualPlayers: data.manualPlayers || {},
    }
  } catch (err) {
    console.warn('Failed to load roster state from localStorage:', err)
    return null
  }
}

const clearRosterState = () => {
  try {
    localStorage.removeItem(ROSTER_STORAGE_KEY)
  } catch (err) {
    console.warn('Failed to clear roster state from localStorage:', err)
  }
}

// calculateForm is now imported from @/lib/rosterCalculations

export function RosterBuilderPage() {
  const { t } = useTranslation()
  const [players, setPlayers] = useState<RosterPlayerStats[]>([])
  const [loading, setLoading] = useState(true)

  // Multi-clan state - load from localStorage if available
  const [clanRosters, setClanRosters] = useState<Map<string, Set<string>>>(() => {
    const savedState = loadRosterState()
    return savedState?.clanRosters || new Map()
  })
  const [lockedClans, setLockedClans] = useState<Set<string>>(() => {
    const savedState = loadRosterState()
    return (savedState?.lockedClans || new Set<string>()) as Set<string>
  })
  const [excludedPlayers, setExcludedPlayers] = useState<Set<string>>(() => {
    const savedState = loadRosterState()
    return (savedState?.excludedPlayers || new Set<string>()) as Set<string>
  }) // Players marked as "Out"
  const [customClans, setCustomClans] = useState<CustomClan[]>(() => {
    const savedState = loadRosterState()
    return savedState?.customClans || []
  })
  const [showAddClan, setShowAddClan] = useState(false)
  const [newClanName, setNewClanName] = useState('')
  const [newClanTag, setNewClanTag] = useState('')

  // Roster modes (15v15 or 30v30) - per clan
  const [clanRosterModes, setClanRosterModes] = useState<Record<string, RosterMode>>(() => {
    const savedState = loadRosterState()
    return savedState?.clanRosterModes || {}
  })

  // Manual players - per clan
  const [manualPlayers, setManualPlayers] = useState<Record<string, ManualPlayerEntry[]>>(() => {
    const savedState = loadRosterState()
    return savedState?.manualPlayers || {}
  })

  // Manual player dialog state
  const [showManualPlayerDialog, setShowManualPlayerDialog] = useState(false)
  const [selectedClanForManual, setSelectedClanForManual] = useState<string | null>(null)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('avgStars')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filters
  const [lastNSeasons, setLastNSeasons] = useState(3)
  const [filterClan, setFilterClan] = useState<string>('all')
  const [filterTH, setFilterTH] = useState<string>('all')
  const [minWars, setMinWars] = useState(0)
  const [minAvgStars, setMinAvgStars] = useState(0)

  // Image export state
  const [isExportingImage, setIsExportingImage] = useState(false)

  // League projections hook for player tooltips
  const { getProjection, prefetchPlayer } = useLeagueProjections()

  // Undo/Redo history hook
  const rosterHistory = useRosterHistory()

  // All clans (built-in + custom)
  const allClans = useMemo(() => [...CLAN_TIERS, ...customClans], [customClans])

  // Add custom clan
  const handleAddCustomClan = () => {
    if (!newClanName.trim()) return
    const tag = newClanTag.trim() || `#CUSTOM${Date.now()}`
    const newClan: CustomClan = {
      name: newClanName.trim(),
      tag: tag.startsWith('#') ? tag : `#${tag}`,
      league: 'Custom',
      minTH: 1,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      borderColor: 'border-orange-400/30',
      leagueIcon: '/images/leagues/unranked.png',
      isCustom: true,
    }
    setCustomClans([...customClans, newClan])
    setNewClanName('')
    setNewClanTag('')
    setShowAddClan(false)
  }

  // Remove custom clan
  const handleRemoveCustomClan = (tag: string) => {
    setCustomClans(customClans.filter(c => c.tag !== tag))
    // Also remove its roster
    const newRosters = new Map(clanRosters)
    newRosters.delete(tag)
    setClanRosters(newRosters)
  }

  // Toggle player exclusion (Out)
  const togglePlayerExcluded = (playerTag: string) => {
    const newSet = new Set(excludedPlayers)
    if (newSet.has(playerTag)) {
      newSet.delete(playerTag)
    } else {
      newSet.add(playerTag)
      // Also remove from any clan roster
      const newRosters = new Map(clanRosters)
      newRosters.forEach((roster, clanTag) => {
        if (roster.has(playerTag)) {
          const updated = new Set(roster)
          updated.delete(playerTag)
          newRosters.set(clanTag, updated)
        }
      })
      setClanRosters(newRosters)
    }
    setExcludedPlayers(newSet)
  }

  // Toggle clan lock
  const toggleClanLock = (clanTag: string) => {
    const newSet = new Set(lockedClans)
    if (newSet.has(clanTag)) {
      newSet.delete(clanTag)
    } else {
      newSet.add(clanTag)
    }
    setLockedClans(newSet)
  }

  // Get max capacity for a clan (15 or 30 + 2 subs)
  const getMaxCapacity = (clanTag: string, includeSubs: boolean = false): number => {
    const mode = clanRosterModes[clanTag] || '15v15'
    const baseSize = mode === '30v30' ? 30 : 15
    return includeSubs ? baseSize + 2 : baseSize
  }

  // Remove unused variable
  const toggleRosterMode = (clanTag: string) => {
    const currentMode = clanRosterModes[clanTag] || '15v15'
    const newMode: RosterMode = currentMode === '30v30' ? '15v15' : '30v30'

    // If switching to 15v15 and roster has more than 17 players, warn user and prevent switch
    const roster = clanRosters.get(clanTag) || new Set()
    const manualCount = manualPlayers[clanTag]?.length || 0
    const totalPlayers = roster.size + manualCount

    if (newMode === '15v15' && totalPlayers > 17) {
      const toRemove = totalPlayers - 17
      window.alert(
        `You have ${totalPlayers} assigned players. Switching to 15v15 requires at most 17 players. Please manually remove ${toRemove} player(s) before switching modes.`
      )
      return // Prevent mode switch
    }

    setClanRosterModes({
      ...clanRosterModes,
      [clanTag]: newMode
    })
  }

  // Add manual player to clan with capacity check
  const addManualPlayer = (player: ManualPlayerEntry) => {
    if (!selectedClanForManual) return

    const existing = manualPlayers[selectedClanForManual] || []
    const roster = clanRosters.get(selectedClanForManual) || new Set()
    const totalPlayers = roster.size + existing.length
    const maxCapacity = getMaxCapacity(selectedClanForManual, true) // Include subs

    // Check if adding would exceed capacity
    if (totalPlayers >= maxCapacity) {
      window.alert(
        `Cannot add player: roster is at maximum capacity (${maxCapacity} players including substitutes).`
      )
      return
    }

    setManualPlayers({
      ...manualPlayers,
      [selectedClanForManual]: [...existing, player]
    })
  }

  // Remove manual player from clan by addedAt timestamp (unique identifier)
  const removeManualPlayer = (clanTag: string, addedAt: string) => {
    const existing = manualPlayers[clanTag] || []
    setManualPlayers({
      ...manualPlayers,
      [clanTag]: existing.filter(p => p.addedAt !== addedAt)
    })
  }

  // Open manual player dialog for specific clan
  const openManualPlayerDialog = (clanTag: string) => {
    setSelectedClanForManual(clanTag)
    setShowManualPlayerDialog(true)
  }

  // Save roster state to localStorage whenever it changes
  useEffect(() => {
    saveRosterState({
      clanRosters,
      lockedClans,
      excludedPlayers,
      customClans,
      clanRosterModes,
      manualPlayers,
    })
  }, [clanRosters, lockedClans, excludedPlayers, customClans, clanRosterModes, manualPlayers])

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true)
      try {
        const data = await getRecentPlayerPool(lastNSeasons)
        setPlayers(data)
      } catch (err) {
        console.error('Failed to load player pool:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [lastNSeasons])

  const availableClans = useMemo(() => {
    const clans = new Set<string>()
    players.forEach(p => clans.add(p.clanName))
    return ['all', ...Array.from(clans).sort()]
  }, [players])

  const availableTHs = useMemo(() => {
    const ths = new Set<number>()
    players.forEach(p => {
      if (p.currentTH) ths.add(p.currentTH)
    })
    return ['all', ...Array.from(ths).sort((a, b) => (b as number) - (a as number))]
  }, [players])

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      if (filterClan !== 'all' && p.clanName !== filterClan) return false
      if (filterTH !== 'all' && p.currentTH !== parseInt(filterTH)) return false
      if (p.totalWars < minWars) return false
      if (p.avgStars < minAvgStars) return false
      return true
    })
  }, [players, filterClan, filterTH, minWars, minAvgStars])

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortField) {
        case 'playerName':
          aVal = a.playerName
          bVal = b.playerName
          break
        case 'totalWars':
          aVal = a.totalWars
          bVal = b.totalWars
          break
        case 'totalAttacks':
          aVal = a.totalAttacks
          bVal = b.totalAttacks
          break
        case 'totalStars':
          aVal = a.totalStars
          bVal = b.totalStars
          break
        case 'avgStars':
          aVal = a.avgStars
          bVal = b.avgStars
          break
        case 'threeStarRate':
          aVal = a.threeStarRate
          bVal = b.threeStarRate
          break
        case 'reliabilityScore':
          aVal = a.reliabilityScore
          bVal = b.reliabilityScore
          break
        case 'currentTH':
          aVal = a.currentTH || 0
          bVal = b.currentTH || 0
          break
        case 'form':
          aVal = calculateForm(a)
          bVal = calculateForm(b)
          break
        default:
          aVal = 0
          bVal = 0
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [filteredPlayers, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Multi-clan mode: auto distribute players across all clans
  // Respects locked clans, excluded players, manual players, and roster modes
  const handleAutoDistribute = () => {
    // Collect all manually added player tags
    const manualPlayerTags = new Set<string>()
    Object.values(manualPlayers).forEach(players => {
      players.forEach(p => {
        if (p.tag) manualPlayerTags.add(p.tag)
      })
    })

    // Score all players for ranking (exclude "Out" players and manually added players)
    // Uses calculatePlayerScore from rosterCalculations for consistent scoring
    const scored = filteredPlayers
      .filter(p => !excludedPlayers.has(p.playerTag) && !manualPlayerTags.has(p.playerTag))
      .map(p => ({
        player: p,
        score: calculatePlayerScore(p)
      }))
    scored.sort((a, b) => b.score - a.score)

    const newRosters = new Map<string, Set<string>>(clanRosters)
    const usedPlayers = new Set<string>()

    // First, mark all players in locked clans as used
    lockedClans.forEach(clanTag => {
      const roster = clanRosters.get(clanTag)
      if (roster) {
        roster.forEach(playerTag => usedPlayers.add(playerTag))
      }
    })

    // Iterate through all clans (built-in + custom) from strongest to weakest
    // Skip locked clans, assign top performers who meet TH requirements
    allClans.forEach(clan => {
      // Skip locked clans - keep their existing roster
      if (lockedClans.has(clan.tag)) {
        return
      }

      const roster = new Set<string>()

      // Calculate available slots (accounting for manual players)
      const manualCount = manualPlayers[clan.tag]?.length || 0
      const maxCapacity = getMaxCapacity(clan.tag, true) // Include subs
      const availableSlots = maxCapacity - manualCount

      // Filter eligible players: meet TH requirement and not already assigned
      const eligiblePlayers = scored.filter(s =>
        !usedPlayers.has(s.player.playerTag) &&
        (s.player.currentTH || 0) >= clan.minTH
      )

      // Take top N players based on available slots
      eligiblePlayers.slice(0, availableSlots).forEach(s => {
        roster.add(s.player.playerTag)
        usedPlayers.add(s.player.playerTag)
      })

      newRosters.set(clan.tag, roster)
    })

    setClanRosters(newRosters)
  }

  // Multi-clan mode: assign player to specific clan
  const assignPlayerToClan = (playerTag: string, clanTag: string | 'none') => {
    // Push current state to history before making changes
    rosterHistory.push({
      clanRosters: new Map(clanRosters),
      lockedClans: new Set(lockedClans),
      excludedPlayers: new Set(excludedPlayers)
    })

    const newRosters = new Map(clanRosters)

    // Remove from any current assignment
    newRosters.forEach((roster, tag) => {
      if (roster.has(playerTag)) {
        const updated = new Set(roster)
        updated.delete(playerTag)
        newRosters.set(tag, updated)
      }
    })

    // Add to new clan if not "none"
    if (clanTag !== 'none') {
      const existingRoster = newRosters.get(clanTag) || new Set<string>()
      const manualCount = manualPlayers[clanTag]?.length || 0
      const maxCapacity = getMaxCapacity(clanTag, true) // Include subs

      // Check if there's room (accounting for manual players)
      if (existingRoster.size + manualCount < maxCapacity) {
        const updated = new Set(existingRoster)
        updated.add(playerTag)
        newRosters.set(clanTag, updated)
      }
    }

    setClanRosters(newRosters)
  }

  // Remove player from a specific clan roster
  const removePlayerFromClan = (playerTag: string, clanTag: string) => {
    const newRosters = new Map(clanRosters)
    const roster = newRosters.get(clanTag)
    if (roster) {
      const updated = new Set(roster)
      updated.delete(playerTag)
      newRosters.set(clanTag, updated)
      setClanRosters(newRosters)
    }
  }

  // Find which clan a player is assigned to
  const getPlayerAssignment = (playerTag: string): string | null => {
    for (const [clanTag, roster] of clanRosters.entries()) {
      if (roster.has(playerTag)) return clanTag
    }
    return null
  }

  // Undo/Redo handlers
  const handleUndo = () => {
    const previousState = rosterHistory.undo()
    if (previousState) {
      setClanRosters(previousState.clanRosters)
      setLockedClans(previousState.lockedClans)
      setExcludedPlayers(previousState.excludedPlayers)
    }
  }

  const handleRedo = () => {
    const nextState = rosterHistory.redo()
    if (nextState) {
      setClanRosters(nextState.clanRosters)
      setLockedClans(nextState.lockedClans)
      setExcludedPlayers(nextState.excludedPlayers)
    }
  }

  // Validation message handler for DnD
  const handleValidationMessage = (message: string) => {
    toast.error(message)
  }

  // Clear all rosters
  const handleClearAllRosters = () => {
    setClanRosters(new Map())
    setLockedClans(new Set())
    setExcludedPlayers(new Set())
    setClanRosterModes({})
    setManualPlayers({})
    clearRosterState() // Clear localStorage
  }

  const csvEscape = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    const needsQuoting = str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')
    const escaped = str.replace(/"/g, '""')
    return needsQuoting ? `"${escaped}"` : escaped
  }

  // Multi-clan export with enhanced columns
  const handleExportMultiClan = async () => {
    const header = [
      'Assigned Clan',
      'League',
      'Name',
      'Tag',
      'Current Clan',
      'TH',
      'Type',                          // NEW: "DB Player" or "Manual"
      'Substitute',                    // NEW: "Yes" or "No"
      'Seasons',
      'Wars',
      'Attacks',
      'Missed Attacks',
      'Stars',
      'Avg Stars',
      '3★ Rate',
      'Reliability',
      'Form',
      'Historical League',             // NEW: Player's typical league
      'Target League',                 // NEW: Assigned clan's league
      'League Adjustment %',           // NEW: -15% to +10%
      'Projected Stars (Base)',        // NEW: avgStars × 7
      'Projected Stars (Adjusted)'     // NEW: League-adjusted projection
    ]
    const rows: string[][] = [header]

    // Process all clans (built-in + custom)
    for (const clan of allClans) {
      const roster = clanRosters.get(clan.tag) || new Set()
      const rosterPlayers = filteredPlayers.filter(p => roster.has(p.playerTag))
      const clanManualPlayers = manualPlayers[clan.tag] || []
      const maxCapacity = getMaxCapacity(clan.tag, false)

      // Sort all players by avgStars for consistent ordering
      const sortedRosterPlayers = [...rosterPlayers].sort((a, b) => b.avgStars - a.avgStars)

      let playerIndex = 0

      // Process database players
      for (const p of sortedRosterPlayers) {
        const isSubstitute = playerIndex >= maxCapacity

        // Fetch player season data for league adjustments
        let historicalLeague = 'N/A'
        let leagueAdjustment = 0
        let adjustedProjection = p.avgStars * ATTACKS_PER_SEASON

        try {
          const playerHistory = await getPlayerHistory(p.playerTag)
          if (playerHistory && playerHistory.seasons && playerHistory.seasons.length > 0) {
            const projection = getLeagueAdjustedProjection(p, clan.league, playerHistory.seasons)
            historicalLeague = projection.historicalLeague || 'N/A'
            leagueAdjustment = projection.adjustment
            adjustedProjection = projection.projectedStars
          }
        } catch (err) {
          console.warn(`Failed to get league adjustment for ${p.playerTag}:`, err)
        }

        rows.push([
          clan.name,
          clan.league,
          p.playerName,
          p.playerTag,
          p.clanName,
          String(p.currentTH || '-'),
          'DB Player',                                          // Type
          isSubstitute ? 'Yes' : 'No',                          // Substitute
          String(p.seasonsPlayed),
          String(p.totalWars),
          String(p.totalAttacks),
          String(p.missedAttacks ?? 0),
          String(p.totalStars),
          p.avgStars.toFixed(2),
          p.threeStarRate.toFixed(1) + '%',
          p.reliabilityScore.toFixed(0) + '%',
          calculateForm(p).toFixed(2),
          historicalLeague,                                     // Historical League
          clan.league,                                          // Target League
          leagueAdjustment !== 0 ? `${leagueAdjustment > 0 ? '+' : ''}${leagueAdjustment.toFixed(0)}%` : '0%', // League Adjustment %
          (p.avgStars * ATTACKS_PER_SEASON).toFixed(1),       // Projected Stars (Base)
          adjustedProjection.toFixed(1)                        // Projected Stars (Adjusted)
        ])

        playerIndex++
      }

      // Process manual players
      for (const mp of clanManualPlayers) {
        const isSubstitute = playerIndex >= maxCapacity
        const baseProjection = mp.estimatedAvgStars * ATTACKS_PER_SEASON

        rows.push([
          clan.name,
          clan.league,
          mp.name,
          mp.tag || 'N/A',
          'Manual Entry',
          String(mp.th || '-'),
          'Manual',                                             // Type
          isSubstitute ? 'Yes' : 'No',                          // Substitute
          '-',                                                  // Seasons
          '-',                                                  // Wars
          '-',                                                  // Attacks
          '-',                                                  // Missed Attacks
          '-',                                                  // Stars
          mp.estimatedAvgStars.toFixed(2),                     // Avg Stars
          '-',                                                  // 3★ Rate
          '-',                                                  // Reliability
          '-',                                                  // Form
          'N/A',                                                // Historical League
          clan.league,                                          // Target League
          'N/A',                                                // League Adjustment %
          baseProjection.toFixed(1),                           // Projected Stars (Base)
          baseProjection.toFixed(1)                            // Projected Stars (Adjusted)
        ])

        playerIndex++
      }
    }

    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cwl-multi-clan-rosters.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Poster/Image export function using iframe isolation (avoids oklch CSS issues)


  // Multi-clan poster export with enhanced display
  const handleExportMultiClanPoster = async () => {
    setIsExportingImage(true)

    try {
      const html2canvas = (await import('html2canvas')).default

      // Create isolated iframe
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.left = '-9999px'
      iframe.style.top = '0'
      iframe.style.width = '1200px'
      iframe.style.height = '2000px'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) throw new Error('Could not access iframe document')

      // Build clan cards HTML
      const clanCards = allClans.map(clan => {
        const roster = clanRosters.get(clan.tag) || new Set()
        const rosterPlayers = filteredPlayers
          .filter(p => roster.has(p.playerTag))
          .sort((a, b) => b.avgStars - a.avgStars)

        const clanManualPlayers = manualPlayers[clan.tag] || []
        const maxCapacity = getMaxCapacity(clan.tag, false)

        // Combine DB players and manual players
        const allRosterMembers = [
          ...rosterPlayers.map(p => ({ type: 'db' as const, player: p })),
          ...clanManualPlayers.map(p => ({ type: 'manual' as const, player: p }))
        ]

        // Calculate projected stars
        const dbProjected = rosterPlayers.reduce((sum, p) => sum + (p.avgStars * ATTACKS_PER_SEASON), 0)
        const manualProjected = clanManualPlayers.reduce((sum, p) => sum + (p.estimatedAvgStars * ATTACKS_PER_SEASON), 0)
        const projectedStars = dbProjected + manualProjected

        const colorMap: Record<string, string> = {
          'text-yellow-400': '#facc15',
          'text-purple-400': '#a855f7',
          'text-blue-400': '#3b82f6',
          'text-cyan-400': '#22d3ee',
          'text-green-400': '#4ade80',
          'text-emerald-400': '#34d399',
          'text-orange-400': '#fb923c',
        }
        const accentColor = colorMap[clan.color] || '#888'

        const playerList = allRosterMembers.map((member, idx) => {
          const isSubstitute = idx >= maxCapacity
          const isManual = member.type === 'manual'

          // Manual player styling
          const playerColor = isManual ? '#fbbf24' : 'white'
          const manualBadge = isManual
            ? '<span style="font-size:9px;background:#fb923c;padding:1px 4px;border-radius:3px;margin-left:4px;">MANUAL</span>'
            : ''

          // Substitute badge
          const subBadge = isSubstitute
            ? '<span style="font-size:9px;background:#f59e0b;padding:1px 4px;border-radius:3px;margin-right:4px;">SUB</span>'
            : ''

          // Get player projected stars
          const projectedStars = member.type === 'manual'
            ? (member.player.estimatedAvgStars * 7).toFixed(1)
            : (member.player.avgStars * 7).toFixed(1)

          const th = member.type === 'manual'
            ? (member.player.th || '?')
            : (member.player.currentTH || '?')

          const name = member.type === 'manual'
            ? member.player.name
            : member.player.playerName

          return `
            <div style="display: flex; align-items: center; padding: 4px 8px; font-size: 11px; background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};">
              ${subBadge}
              ${isManual ? '<span style="color:#fb923c;margin-right:4px;">🔧</span>' : ''}
              <span style="color: ${accentColor}; font-weight: 600; width: 24px;">TH${th}</span>
              <span style="flex: 1; color: ${playerColor}; padding-left: 8px;">${name}${manualBadge}</span>
              <span style="color: #facc15; font-weight: 600;">${projectedStars}★ (7 wars)</span>
            </div>
          `
        }).join('')

        const rosterMode = clanRosterModes[clan.tag] || '15v15'

        return `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; width: 360px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="flex: 1;">
                <h3 style="color: ${accentColor}; font-size: 16px; font-weight: 700;">${clan.name}</h3>
                <p style="color: #888; font-size: 11px;">${clan.league} • Min TH${clan.minTH}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; color: #888; margin-bottom: 4px;">
                  ${rosterMode}
                </div>
                <div style="font-size: 20px; font-weight: 800; color: ${accentColor};">
                  ${roster.size + clanManualPlayers.length}/${getMaxCapacity(clan.tag, false)}
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; text-align: center;">
              <div>
                <div style="color: #facc15; font-weight: 700; font-size: 18px;">⭐${projectedStars.toFixed(0)}</div>
                <div style="color: #888; font-size: 10px;">PROJECTED</div>
              </div>
            </div>
            <div style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
              ${playerList || '<div style="padding: 20px; text-align: center; color: #888;">No players assigned</div>'}
            </div>
          </div>
        `
      }).join('')

      // Calculate totals
      let totalPlayers = 0
      let totalProjected = 0
      allClans.forEach(clan => {
        const roster = clanRosters.get(clan.tag) || new Set()
        const rosterPlayers = filteredPlayers.filter(p => roster.has(p.playerTag))
        const clanManualPlayers = manualPlayers[clan.tag] || []

        totalPlayers += roster.size + clanManualPlayers.length

        const dbProjected = rosterPlayers.reduce((sum, p) => sum + (p.avgStars * ATTACKS_PER_SEASON), 0)
        const manualProjected = clanManualPlayers.reduce((sum, p) => sum + (p.estimatedAvgStars * ATTACKS_PER_SEASON), 0)
        totalProjected += dbProjected + manualProjected
      })

      iframeDoc.open()
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          </style>
        </head>
        <body>
          <div id="poster" style="width: 1200px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); padding: 32px; color: white;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid rgba(255,255,255,0.1);">
              <h1 style="font-size: 36px; font-weight: 800; margin-bottom: 8px; background: linear-gradient(90deg, #f59e0b, #fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">⚔️ CWL MULTI-CLAN ROSTER</h1>
              <p style="color: #94a3b8; font-size: 16px;">CoC Masters PL Family • ${new Date().toLocaleDateString()}</p>
              <div style="display: flex; justify-content: center; gap: 48px; margin-top: 20px;">
                <div>
                  <span style="font-size: 28px; font-weight: 800; color: #f59e0b;">${totalPlayers}</span>
                  <span style="color: #888; margin-left: 8px;">Total Players</span>
                </div>
                <div>
                  <span style="font-size: 28px; font-weight: 800; color: #facc15;">⭐ ${totalProjected.toFixed(0)}</span>
                  <span style="color: #888; margin-left: 8px;">Total Projected Stars</span>
                </div>
              </div>
            </div>

            <!-- Clan Cards Grid -->
            <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;">
              ${clanCards}
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #64748b; font-size: 12px;">🏆 Generated by CoC Masters PL CWL Dashboard</p>
            </div>
          </div>
        </body>
        </html>
      `)
      iframeDoc.close()

      await new Promise(resolve => setTimeout(resolve, 300))

      const poster = iframeDoc.getElementById('poster')
      if (!poster) throw new Error('Poster element not found')

      const canvas = await html2canvas(poster, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `cwl-multi-clan-roster-${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      document.body.removeChild(iframe)
    } catch (err) {
      console.error('Failed to export multi-clan poster:', err)
    } finally {
      setIsExportingImage(false)
    }
  }

  // Multi-clan stats for each clan
  const multiClanStats = useMemo(() => {
    return allClans.map(clan => {
      const roster = clanRosters.get(clan.tag) || new Set()
      const rosterPlayers = filteredPlayers.filter(p => roster.has(p.playerTag))
      const clanManualPlayers = manualPlayers[clan.tag] || []

      const totalCount = roster.size + clanManualPlayers.length

      if (totalCount === 0) {
        return {
          clan,
          count: 0,
          projectedStars: '0',
          avgTH: '0',
          avgReliability: '0',
          players: [],
          manualPlayers: []
        }
      }

      // Calculate projected stars including manual players
      const dbPlayerProjected = rosterPlayers.reduce((sum, p) => sum + (p.avgStars * ATTACKS_PER_SEASON), 0)
      const manualPlayerProjected = clanManualPlayers.reduce((sum, p) => sum + (p.estimatedAvgStars * ATTACKS_PER_SEASON), 0)
      const totalProjectedStars = dbPlayerProjected + manualPlayerProjected

      // Calculate average TH including manual players
      const dbPlayerTH = rosterPlayers.reduce((sum, p) => sum + (p.currentTH || 0), 0)
      const manualPlayerTH = clanManualPlayers.reduce((sum, p) => sum + p.th, 0)
      const avgTH = (dbPlayerTH + manualPlayerTH) / totalCount

      // Calculate average reliability (manual players don't have reliability)
      const avgReliability = rosterPlayers.length > 0
        ? rosterPlayers.reduce((sum, p) => sum + p.reliabilityScore, 0) / rosterPlayers.length
        : 0

      return {
        clan,
        count: totalCount,
        projectedStars: totalProjectedStars.toFixed(0),
        avgTH: avgTH.toFixed(1),
        avgReliability: avgReliability.toFixed(0),
        players: rosterPlayers,
        manualPlayers: clanManualPlayers
      }
    })
  }, [allClans, clanRosters, filteredPlayers, manualPlayers])

  // Total players assigned across all clans (including manual players)
  const totalAssigned = useMemo(() => {
    let total = 0
    clanRosters.forEach(roster => total += roster.size)
    Object.values(manualPlayers).forEach(players => total += players.length)
    return total
  }, [clanRosters, manualPlayers])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">{t('rosterBuilder.title')}</h1>
        <div className="text-center py-12 text-muted-foreground">
          {t('clan.loading')}
        </div>
      </div>
    )
  }

  return (
    <RosterDndContext
      clanRosters={clanRosters}
      lockedClans={lockedClans}
      excludedPlayers={excludedPlayers}
      allClans={allClans}
      players={sortedPlayers}
      onAssignPlayer={assignPlayerToClan}
      getMaxCapacity={getMaxCapacity}
      onValidationMessage={handleValidationMessage}
    >
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t('rosterBuilder.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('rosterBuilder.subtitle')}</p>
      </div>

      {/* Fun Welcome Banner */}
      <div className="rounded-lg border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 p-4">
        <p className="text-amber-200 text-sm">
          {t('rosterBuilder.guide.welcome')}
        </p>
        {/* Collapsible Pro Tips */}
        <details className="mt-3">
          <summary className="text-amber-300 font-medium cursor-pointer hover:text-amber-200 text-sm flex items-center gap-1">
            {t('rosterBuilder.guide.proTips')}
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-amber-200/80 list-disc list-inside pl-2">
            <li>{t('rosterBuilder.guide.proTip1')}</li>
            <li>{t('rosterBuilder.guide.proTip2')}</li>
            <li>{t('rosterBuilder.guide.proTip3')}</li>
            <li>{t('rosterBuilder.guide.proTip4')}</li>
          </ul>
        </details>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card/70 p-4 space-y-4 mt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users size={20} className="text-primary" />
          {t('rosterBuilder.filters')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              {t('rosterBuilder.lastNSeasons')}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Question size={14} className="text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                  <p className="text-xs">{t('rosterBuilder.guide.seasonsTip')}</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={lastNSeasons.toString()} onValueChange={(v) => setLastNSeasons(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('rosterBuilder.any')}</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="12">12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t('rosterBuilder.filterClan')}
            </label>
            <Select value={filterClan} onValueChange={setFilterClan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableClans.map(clan => (
                  <SelectItem key={clan} value={clan}>
                    {clan === 'all' ? t('rosterBuilder.allClans') : clan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t('rosterBuilder.filterTH')}
            </label>
            <Select value={filterTH} onValueChange={setFilterTH}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTHs.map(th => (
                  <SelectItem key={th} value={th.toString()}>
                    {th === 'all' ? t('rosterBuilder.allTH') : `TH ${th}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              {t('rosterBuilder.minWars')}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Question size={14} className="text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                  <p className="text-xs">{t('rosterBuilder.guide.minWarsTip')}</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={minWars.toString()} onValueChange={(v) => setMinWars(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('rosterBuilder.any')}</SelectItem>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="10">10+</SelectItem>
                <SelectItem value="15">15+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t('rosterBuilder.minAvgStars')}
            </label>
            <Select value={minAvgStars.toString()} onValueChange={(v) => setMinAvgStars(parseFloat(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('rosterBuilder.any')}</SelectItem>
                <SelectItem value="1.5">1.5+</SelectItem>
                <SelectItem value="2.0">2.0+</SelectItem>
                <SelectItem value="2.5">2.5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CWL Info Banner */}
        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/30 text-sm">
          <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-blue-200">
            {t('rosterBuilder.cwlInfo')}
          </p>
        </div>

        {/* Ghost Warning Banner - shows when analyzing many seasons */}
        {lastNSeasons === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm">
            <Warning size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-200">
              {t('rosterBuilder.guide.seasonsGhostWarning')}
            </p>
          </div>
        )}
      </div>

      {/* Multi-Clan Distribution Mode */}
      <div className="space-y-6 mt-4">
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleAutoDistribute} variant="default" className="gap-2">
                <Sparkle size={16} />
                {t('rosterBuilder.autoDistribute')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
              <p className="text-xs font-semibold mb-1">{t('rosterBuilder.guide.autoDistributeTitle')}</p>
              <p className="text-xs">{t('rosterBuilder.guide.autoDistributeTip')}</p>
              <p className="text-xs mt-1 text-amber-300">{t('rosterBuilder.guide.autoDistributeWarning')}</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Undo/Redo Buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleUndo}
                variant="outline"
                size="icon"
                disabled={!rosterHistory.canUndo}
              >
                <ArrowCounterClockwise size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Undo (last 5 actions)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleRedo}
                variant="outline"
                size="icon"
                disabled={!rosterHistory.canRedo}
              >
                <ArrowClockwise size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Redo</p>
            </TooltipContent>
          </Tooltip>

          <Button
            onClick={handleClearAllRosters}
            variant="outline"
            disabled={totalAssigned === 0}
          >
            {t('rosterBuilder.clearAllRosters')}
          </Button>
          <Button
            onClick={handleExportMultiClan}
            variant="secondary"
            className="gap-2"
            disabled={totalAssigned === 0}
          >
            <Download size={16} />
            {t('rosterBuilder.exportCSV')}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleExportMultiClanPoster}
                variant="secondary"
                className="gap-2"
                disabled={totalAssigned === 0 || isExportingImage}
              >
                {isExportingImage ? (
                  <CircleNotch size={16} className="animate-spin" />
                ) : (
                  <Image size={16} />
                )}
                {t('rosterBuilder.exportPoster')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
              <p className="text-xs text-muted-foreground italic">{t('rosterBuilder.guide.annotations.exportJoke')}</p>
            </TooltipContent>
          </Tooltip>
          <div className="ml-auto text-sm text-muted-foreground">
            {t('rosterBuilder.totalAssigned')}: <span className="font-bold text-primary">{totalAssigned}</span> / {filteredPlayers.length}
          </div>
        </div>

        {/* Add Custom Clan Section */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {t('rosterBuilder.customClans')}:
              <Tooltip>
                <TooltipTrigger asChild>
                  <Question size={14} className="text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                  <p className="text-xs font-semibold mb-1">{t('rosterBuilder.guide.guestClansTitle')}</p>
                  <p className="text-xs">{t('rosterBuilder.guide.guestClansTip')}</p>
                </TooltipContent>
              </Tooltip>
            </span>

            {customClans.map(clan => (
              <div
                key={clan.tag}
                className="flex items-center gap-2 bg-violet-500/20 border border-violet-500/40 text-violet-300 px-2 py-1 rounded text-sm"
              >
                <span className="font-medium">{clan.name}</span>
                <span className="text-xs opacity-70">{clan.tag}</span>
                <button
                  onClick={() => handleRemoveCustomClan(clan.tag)}
                  className="text-red-400 hover:text-red-300"
                  aria-label={t('rosterBuilder.removeCustomClan', { name: clan.name })}
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {!showAddClan ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddClan(true)}
                className="gap-1 text-violet-400 border-violet-500/40 hover:bg-violet-500/20"
              >
                <Plus size={14} />
                {t('rosterBuilder.addCustomClan')}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t('rosterBuilder.clanName')}
                  value={newClanName}
                  onChange={(e) => setNewClanName(e.target.value)}
                  className="h-8 w-32 text-sm"
                />
                <Input
                  placeholder={t('rosterBuilder.clanTag')}
                  value={newClanTag}
                  onChange={(e) => setNewClanTag(e.target.value)}
                  className="h-8 w-28 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddCustomClan}
                  disabled={!newClanName.trim() || !newClanTag.trim()}
                  className="h-8"
                >
                  {t('rosterBuilder.add')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddClan(false)
                    setNewClanName('')
                    setNewClanTag('')
                  }}
                  className="h-8"
                >
                  <X size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Clan Roster Cards Grid - 1 column on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {multiClanStats.map(({ clan, count, projectedStars, avgTH, avgReliability, players, manualPlayers: clanManualPlayers }) => {
            const isLocked = lockedClans.has(clan.tag)
            const rosterMode = clanRosterModes[clan.tag] || '15v15'
            const maxCapacity = getMaxCapacity(clan.tag, false)
            const numSubs = Math.max(0, count - maxCapacity)

            return (
              <DroppableClanCard
                key={clan.tag}
                clan={clan}
                isLocked={isLocked}
                count={count}
                projectedStars={projectedStars}
                avgTH={avgTH}
                avgReliability={avgReliability}
                players={players}
                manualPlayers={clanManualPlayers}
                rosterMode={rosterMode}
                maxCapacity={maxCapacity}
                numSubs={numSubs}
                onToggleLock={toggleClanLock}
                onToggleMode={toggleRosterMode}
                onRemovePlayer={removePlayerFromClan}
                onRemoveManualPlayer={removeManualPlayer}
                onAddManualPlayer={openManualPlayerDialog}
                getProjection={getProjection}
                prefetchPlayer={prefetchPlayer}
              />
            )
          })}
        </div>

        {/* Available Players Table */}
        <div className="rounded-lg border border-border/80 bg-card/50 overflow-hidden">
          <div className="p-3 border-b border-border/50 bg-card/30">
            <h3 className="font-semibold">{t('rosterBuilder.availablePlayers')}</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-8">{/* Drag handle */}</TableHead>
                  <TableHead className="text-center w-12">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center justify-center gap-1 cursor-help">
                          {t('rosterBuilder.out')}
                          <Question size={12} className="text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                        <p className="text-xs font-semibold mb-1">{t('rosterBuilder.guide.outColumnTitle')}</p>
                        <p className="text-xs">{t('rosterBuilder.guide.outColumnTip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('playerName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('rosterBuilder.name')}
                      <SortIcon field="playerName" />
                    </div>
                  </TableHead>
                  <TableHead>{t('rosterBuilder.clan')}</TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('currentTH')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      TH
                      <SortIcon field="currentTH" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('avgStars')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help">
                            {t('rosterBuilder.avgStars')}
                            <Question size={12} className="text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                          <p className="text-xs">{t('rosterBuilder.guide.avgStarsExplain')}</p>
                          <p className="text-xs mt-1">{t('rosterBuilder.guide.avgStarsColors')}</p>
                        </TooltipContent>
                      </Tooltip>
                      <SortIcon field="avgStars" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('form')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help">
                            {t('rosterBuilder.form')}
                            <Question size={12} className="text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                          <p className="text-xs">{t('rosterBuilder.guide.formTip')}</p>
                        </TooltipContent>
                      </Tooltip>
                      <SortIcon field="form" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('reliabilityScore')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help">
                            {t('rosterBuilder.reliability')}
                            <Question size={12} className="text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                          <p className="text-xs">{t('rosterBuilder.guide.reliabilityTip')}</p>
                          <p className="text-xs mt-1">{t('rosterBuilder.guide.reliabilityColors')}</p>
                        </TooltipContent>
                      </Tooltip>
                      <SortIcon field="reliabilityScore" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{t('rosterBuilder.assignTo')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlayers.map((player) => {
                  const assignedClan = getPlayerAssignment(player.playerTag)
                  const assignedClanInfo = allClans.find(c => c.tag === assignedClan)
                  const isExcluded = excludedPlayers.has(player.playerTag)

                  return (
                    <DraggablePlayerRow
                      key={player.playerTag}
                      player={player}
                      isExcluded={isExcluded}
                      assignedClan={assignedClan}
                      assignedClanInfo={assignedClanInfo}
                      allClans={allClans}
                      clanRosters={clanRosters}
                      onToggleExcluded={togglePlayerExcluded}
                      onAssignToClan={assignPlayerToClan}
                      getMaxCapacity={getMaxCapacity}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {
        sortedPlayers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t('rosterBuilder.noPlayers')}
          </div>
        )
      }

      {/* Fun Footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground/60 border-t border-border/30 pt-4">
        <p>🐺 {t('rosterBuilder.guide.welcomeShort')} 🐺</p>
      </div>

      {/* Manual Player Dialog */}
      <ManualPlayerDialog
        open={showManualPlayerDialog}
        onOpenChange={setShowManualPlayerDialog}
        onAdd={addManualPlayer}
        existingTags={new Set(
          Object.values(manualPlayers)
            .flat()
            .map(p => p.tag)
            .filter((tag): tag is string => tag !== null)
        )}
      />
    </div>
    </RosterDndContext>
  )
}
