import { FiltersBar, type PlayersSortKey, type PlayersViewMode } from '@/components/FiltersBar'
import { PlayerCard } from '@/components/PlayerCard'
import { PlayerModal } from '@/components/PlayerModal'
import { type PlayerRole } from '@/components/RoleBadge'
import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getPlayers } from '@/lib/data'
import type { GlobalPlayer } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Loading skeleton for players table
function PlayersPageSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <Skeleton className="h-12 w-64 mb-2 skeleton-shimmer" />
        <Skeleton className="h-6 w-96 skeleton-shimmer" />
      </section>

      <Skeleton className="h-10 w-full max-w-md rounded-lg skeleton-shimmer" />

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="bg-muted/50 p-4">
          <div className="flex gap-4">
            <Skeleton className="h-6 w-12 skeleton-shimmer" />
            <Skeleton className="h-6 w-32 skeleton-shimmer" />
            <Skeleton className="h-6 w-24 skeleton-shimmer hidden md:block" />
            <Skeleton className="h-6 w-12 skeleton-shimmer hidden sm:block" />
            <Skeleton className="h-6 w-16 skeleton-shimmer" />
          </div>
        </div>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-t border-border/50">
            <Skeleton className="h-6 w-8 skeleton-shimmer" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-1 skeleton-shimmer" />
              <Skeleton className="h-4 w-24 skeleton-shimmer" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer hidden md:block" />
            <Skeleton className="h-8 w-8 rounded-md skeleton-shimmer hidden sm:block" />
            <Skeleton className="h-7 w-12 skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlayersPage() {
  const [players, setPlayers] = useState<GlobalPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<PlayersViewMode>('cards')
  const [selectedClans, setSelectedClans] = useState<string[]>([])
  const [selectedTHs, setSelectedTHs] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<PlayersSortKey>('reliability')
  const [minWars, setMinWars] = useState(0)
  const [minReliability, setMinReliability] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: GlobalPlayer; role: PlayerRole } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    getPlayers().then((data) => {
      setPlayers(data)
      setLoading(false)
    })
  }, [])

  // Extract unique clans and TH levels
  const { clanOptions, thOptions } = useMemo(() => {
    const clans = Array.from(new Set(players.map(p => p.clan))).sort()
    const ths = Array.from(new Set(players.map(p => p.th).filter((th): th is number => th !== null))).sort((a, b) => b - a)
    return { clanOptions: clans, thOptions: ths }
  }, [players])

  // Determine player role based on stats
  function getPlayerRole(player: GlobalPlayer, rank: number): PlayerRole {
    if (rank === 1) return 'mvp'
    if (player.avgStars && player.avgStars >= 2.8 && player.stars >= 18) return 'elite'
    if (player.attacks >= 7 && player.avgStars && player.avgStars >= 2.5) return 'reliable'
    if (player.stars >= 15 && rank <= 10) return 'rising'
    return null
  }

  // Filter, sort, and rank players
  const processedPlayers = useMemo(() => {
    const filtered = players.filter((player) => {
      const matchesSearch =
        searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.clan.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesClan = selectedClans.length === 0 || selectedClans.includes(player.clan)
      const matchesTH = selectedTHs.length === 0 || (player.th !== null && selectedTHs.includes(player.th))
      const matchesMinWars = (player.wars ?? 0) >= minWars
      const matchesMinReliability = minReliability === 0 || (player.reliabilityScore ?? 0) >= minReliability
      return matchesSearch && matchesClan && matchesTH && matchesMinWars && matchesMinReliability
    })

    // Sort based on selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reliability': {
          const relA = a.reliabilityScore ?? 0
          const relB = b.reliabilityScore ?? 0
          if (relB !== relA) return relB - relA
          return b.stars - a.stars
        }
        case 'performance': {
          const perfA = a.reliabilityBreakdown?.performance ?? 0
          const perfB = b.reliabilityBreakdown?.performance ?? 0
          if (perfB !== perfA) return perfB - perfA
          return b.stars - a.stars
        }
        case 'attendance': {
          const attA = a.reliabilityBreakdown?.attendance ?? 0
          const attB = b.reliabilityBreakdown?.attendance ?? 0
          if (attB !== attA) return attB - attA
          return b.stars - a.stars
        }
        case 'leagueAdj': {
          const leagueA = a.reliabilityBreakdown?.leagueAdj ?? 0
          const leagueB = b.reliabilityBreakdown?.leagueAdj ?? 0
          if (leagueB !== leagueA) return leagueB - leagueA
          return b.stars - a.stars
        }
        case 'threeStarRate': {
          const rateA = a.threeStarRate ?? 0
          const rateB = b.threeStarRate ?? 0
          if (rateB !== rateA) return rateB - rateA
          return b.stars - a.stars
        }
        case 'th': {
          const thA = a.th ?? 0
          const thB = b.th ?? 0
          if (thB !== thA) return thB - thA
          return b.stars - a.stars
        }
        case 'wars': {
          const warsA = a.wars ?? 0
          const warsB = b.wars ?? 0
          if (warsB !== warsA) return warsB - warsA
          return b.stars - a.stars
        }
        case 'stars':
          if (b.stars !== a.stars) return b.stars - a.stars
          return a.name.localeCompare(b.name)
        case 'avgStars': {
          const avgA = a.avgStars ?? 0
          const avgB = b.avgStars ?? 0
          if (avgB !== avgA) return avgB - avgA
          return b.stars - a.stars
        }
        case 'attacks':
          if (b.attacks !== a.attacks) return b.attacks - a.attacks
          return b.stars - a.stars
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [players, searchQuery, selectedClans, selectedTHs, sortBy, minWars, minReliability])

  function handlePlayerClick(player: GlobalPlayer, rank: number) {
    const role = getPlayerRole(player, rank)
    setSelectedPlayer({ player, role })
    setModalOpen(true)
  }

  if (loading) {
    return <PlayersPageSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t('players.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('players.subtitle')}</p>
      </section>

      {/* Filters Bar */}
      <FiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedClans={selectedClans}
        onClansChange={setSelectedClans}
        selectedTHs={selectedTHs}
        onTHsChange={setSelectedTHs}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        clanOptions={clanOptions}
        thOptions={thOptions}
        minWars={minWars}
        onMinWarsChange={setMinWars}
        minReliability={minReliability}
        onMinReliabilityChange={setMinReliability}
        className="animate-fade-in-up stagger-1"
      />

      {/* Results */}
      {processedPlayers.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted-foreground">{t('players.no_results', { query: searchQuery })}</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in-up stagger-2">
          {processedPlayers.map((player, index) => (
            <PlayerCard
              key={player.tag}
              player={player}
              rank={index + 1}
              role={getPlayerRole(player, index + 1)}
              onClick={() => handlePlayerClick(player, index + 1)}
              style={{ animationDelay: `${Math.min(index * 0.02, 0.5)}s` }}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-border overflow-hidden bg-card animate-fade-in-up stagger-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold w-12">{t('players.table.rank')}</TableHead>
                <TableHead className="font-bold">{t('players.table.player')}</TableHead>
                <TableHead className="font-bold hidden lg:table-cell">{t('players.table.clan')}</TableHead>
                <TableHead className="font-bold text-center">{t('players.table.th')}</TableHead>
                <TableHead className="font-bold text-right">{t('players.table.reliability', 'Reliability')}</TableHead>
                <TableHead className="font-bold text-right hidden sm:table-cell">{t('players.table.stars')}</TableHead>
                <TableHead className="font-bold text-right hidden md:table-cell">{t('players.table.wars', 'Wars')}</TableHead>
                <TableHead className="font-bold text-right hidden md:table-cell">{t('players.table.threeStarRate', '3★ Rate')}</TableHead>
                <TableHead className="font-bold text-right hidden lg:table-cell">{t('players.table.attacks')}</TableHead>
                <TableHead className="font-bold text-right hidden xl:table-cell">{t('players.table.avg')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPlayers.map((player, index) => (
                <TableRow
                  key={player.tag}
                  className="hover:bg-primary/10 transition-colors cursor-pointer animate-row-in"
                  style={{ animationDelay: `${Math.min(index * 0.02, 0.5)}s` }}
                  onClick={() => handlePlayerClick(player, index + 1)}
                >
                  <TableCell className="font-bold text-muted-foreground tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{player.tag}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="font-medium">
                      {player.clan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {player.th !== null && <THBadge level={player.th} size="sm" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-bold tabular-nums",
                      (player.reliabilityScore ?? 0) >= 90 ? "text-green-500" :
                        (player.reliabilityScore ?? 0) >= 75 ? "text-yellow-500" : "text-red-500"
                    )}>
                      {player.reliabilityScore?.toFixed(0) ?? '—'}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <span className="text-lg font-bold tabular-nums">{player.stars}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {player.wars}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    <span className={cn(
                      "font-medium tabular-nums",
                      (player.threeStarRate ?? 0) >= 80 ? "text-green-500" :
                        (player.threeStarRate ?? 0) >= 60 ? "text-yellow-500" : "text-muted-foreground"
                    )}>
                      {player.threeStarRate?.toFixed(0) ?? '—'}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden lg:table-cell">
                    {player.attacks}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums hidden xl:table-cell">
                    {player.avgStars !== null ? player.avgStars.toFixed(2) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Player Modal */}
      <PlayerModal
        player={selectedPlayer?.player ?? null}
        role={selectedPlayer?.role}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
