import { getPlayerHistory } from '@/lib/data'
import { getLeagueAdjustedProjection } from '@/lib/rosterCalculations'
import type { LeagueProjection, RosterPlayerStats } from '@/lib/types'
import { useCallback, useRef, useState } from 'react'

interface PlayerProjectionCache {
  [playerTag: string]: {
    [targetLeague: string]: LeagueProjection
  }
}

interface UseLeagueProjectionsResult {
  getProjection: (playerTag: string, targetLeague: string) => LeagueProjection | null
  isLoading: (playerTag: string) => boolean
  prefetchPlayer: (player: RosterPlayerStats, targetLeague: string) => void
  prefetchPlayers: (players: RosterPlayerStats[], targetLeague: string) => void
}

/**
 * Hook to manage league-adjusted projections with caching
 * Fetches player history on-demand and caches results
 */
export function useLeagueProjections(): UseLeagueProjectionsResult {
  const [cache, setCache] = useState<PlayerProjectionCache>({})
  const [loadingPlayers, setLoadingPlayers] = useState<Set<string>>(new Set())
  const fetchingRef = useRef<Set<string>>(new Set())

  // Get cached projection for a player
  const getProjection = useCallback((playerTag: string, targetLeague: string): LeagueProjection | null => {
    return cache[playerTag]?.[targetLeague] ?? null
  }, [cache])

  // Check if a player is currently being fetched
  const isLoading = useCallback((playerTag: string): boolean => {
    return loadingPlayers.has(playerTag)
  }, [loadingPlayers])

  // Fetch projection for a single player
  const prefetchPlayer = useCallback(async (player: RosterPlayerStats, targetLeague: string) => {
    const cacheKey = `${player.playerTag}:${targetLeague}`

    // Already cached for this league
    if (cache[player.playerTag]?.[targetLeague]) return

    // Already fetching
    if (fetchingRef.current.has(cacheKey)) return

    fetchingRef.current.add(cacheKey)
    setLoadingPlayers(prev => new Set(prev).add(player.playerTag))

    try {
      const playerHistory = await getPlayerHistory(player.playerTag)
      const projection = getLeagueAdjustedProjection(
        player,
        targetLeague,
        playerHistory?.seasons
      )

      setCache(prev => ({
        ...prev,
        [player.playerTag]: {
          ...prev[player.playerTag],
          [targetLeague]: projection
        }
      }))
    } catch (err) {
      console.warn(`Failed to fetch projection for ${player.playerTag}:`, err)
      // Cache a fallback low-confidence projection
      const fallbackProjection: LeagueProjection = {
        projectedStars: player.avgStars * 7,
        adjustment: 0,
        confidence: 'low',
        historicalLeague: null
      }
      setCache(prev => ({
        ...prev,
        [player.playerTag]: {
          ...prev[player.playerTag],
          [targetLeague]: fallbackProjection
        }
      }))
    } finally {
      fetchingRef.current.delete(cacheKey)
      setLoadingPlayers(prev => {
        const next = new Set(prev)
        next.delete(player.playerTag)
        return next
      })
    }
  }, [cache])

  // Batch prefetch for multiple players
  const prefetchPlayers = useCallback((players: RosterPlayerStats[], targetLeague: string) => {
    // Limit concurrent fetches to avoid overwhelming the browser
    const uncached = players.filter(p => !cache[p.playerTag]?.[targetLeague])
    const batch = uncached.slice(0, 10) // Fetch first 10, rest will be fetched on scroll/demand

    batch.forEach(player => {
      prefetchPlayer(player, targetLeague)
    })
  }, [cache, prefetchPlayer])

  return {
    getProjection,
    isLoading,
    prefetchPlayer,
    prefetchPlayers
  }
}

/**
 * Calculate aggregate league stats for a clan roster
 */
export function calculateClanLeagueStats(
  projections: (LeagueProjection | null)[]
): {
  avgAdjustment: number
  lowConfidenceCount: number
  totalPlayers: number
} {
  const validProjections = projections.filter((p): p is LeagueProjection => p !== null)

  if (validProjections.length === 0) {
    return {
      avgAdjustment: 0,
      lowConfidenceCount: 0,
      totalPlayers: 0
    }
  }

  const totalAdjustment = validProjections.reduce((sum, p) => sum + p.adjustment, 0)
  const lowConfidenceCount = validProjections.filter(p => p.confidence === 'low').length

  return {
    avgAdjustment: totalAdjustment / validProjections.length,
    lowConfidenceCount,
    totalPlayers: validProjections.length
  }
}
