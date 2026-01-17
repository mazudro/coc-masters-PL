import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SeasonRosterPlayer } from '@/lib/types'
import { ArrowDown, ArrowUp, Star } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface RosterStatsTableProps {
  roster: SeasonRosterPlayer[]
  leagueTier?: string // e.g., 'Champion League I'
  /** When true, hides performance columns (all stats are 0) and shows simplified roster view */
  preparationMode?: boolean
}

type SortField = 'name' | 'attacks' | 'stars' | 'avgStars' | 'triples' | 'warsParticipated'
type SortDirection = 'asc' | 'desc'

/**
 * League tier difficulty scores (0-100 scale)
 * Higher leagues get higher scores as a bonus for competing at a harder level
 */
function getLeagueScore(leagueTier?: string): number {
  if (!leagueTier) return 50 // Default for unknown leagues
  const tier = leagueTier.toLowerCase()
  if (tier.includes('champion') && tier.includes('i') && !tier.includes('ii') && !tier.includes('iii')) return 100
  if (tier.includes('champion') && tier.includes('ii') && !tier.includes('iii')) return 90
  if (tier.includes('champion') && tier.includes('iii')) return 80
  if (tier.includes('master') && tier.includes('i') && !tier.includes('ii') && !tier.includes('iii')) return 70
  if (tier.includes('master') && tier.includes('ii') && !tier.includes('iii')) return 60
  if (tier.includes('master') && tier.includes('iii')) return 50
  if (tier.includes('crystal') && tier.includes('i') && !tier.includes('ii') && !tier.includes('iii')) return 40
  if (tier.includes('crystal') && tier.includes('ii') && !tier.includes('iii')) return 35
  if (tier.includes('crystal') && tier.includes('iii')) return 30
  if (tier.includes('gold') && tier.includes('i') && !tier.includes('ii') && !tier.includes('iii')) return 25
  if (tier.includes('gold') && tier.includes('ii') && !tier.includes('iii')) return 20
  if (tier.includes('gold') && tier.includes('iii')) return 15
  return 50
}

/**
 * Comprehensive reliability formula matching aggregate-all-seasons.ts
 * Formula: (Performance × 0.45) + (Attendance × 0.35) + (LeagueAdj × 0.20)
 */
function calculateReliabilityScore(player: SeasonRosterPlayer, leagueTier?: string): number {
  const threeStarRate = player.attacks > 0 ? (player.triples / player.attacks) * 100 : 0
  const performance = ((player.avgStars / 3) * 50) + ((threeStarRate / 100) * 50)
  const maxPossible = player.warsParticipated
  const attendance = maxPossible > 0 ? (player.attacks / maxPossible) * 100 : 0
  const leagueAdj = getLeagueScore(leagueTier)

  return (performance * 0.45) + (attendance * 0.35) + (leagueAdj * 0.20)
}

export function RosterStatsTable({ roster, leagueTier, preparationMode = false }: RosterStatsTableProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>(preparationMode ? 'name' : 'stars')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortField) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'attacks':
          aVal = a.attacks
          bVal = b.attacks
          break
        case 'stars':
          aVal = a.stars
          bVal = b.stars
          break
        case 'avgStars':
          aVal = a.avgStars
          bVal = b.avgStars
          break
        case 'triples':
          aVal = a.triples
          bVal = b.triples
          break
        case 'warsParticipated':
          aVal = a.warsParticipated
          bVal = b.warsParticipated
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
  }, [roster, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getAvgStarsColor = (avgStars: number) => {
    if (avgStars >= 2.5) return 'text-green-400'
    if (avgStars >= 2.0) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Reliability is now calculated using the comprehensive formula above

  const handlePlayerClick = (playerTag: string) => {
    const encodedTag = encodeURIComponent(playerTag.replace('#', ''))
    navigate(`/player/${encodedTag}`)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 overflow-hidden">
      {preparationMode && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-sm text-amber-300">
          {t('preparation.awaiting_first_war')}
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  {t('clanSeason.playerName')}
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead className="text-center">TH</TableHead>
              {!preparationMode && (
                <>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('warsParticipated')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t('clanSeason.warsParticipated')}
                      <SortIcon field="warsParticipated" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('attacks')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t('clanSeason.attacks')}
                      <SortIcon field="attacks" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('stars')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t('standings.stars')}
                      <SortIcon field="stars" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('avgStars')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t('clanSeason.avgStars')}
                      <SortIcon field="avgStars" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort('triples')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t('clanSeason.triples')}
                      <SortIcon field="triples" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{t('clanSeason.starBuckets')}</TableHead>
                  <TableHead className="text-center">{t('clanSeason.reliability')}</TableHead>
                  <TableHead className="text-center">{t('clanSeason.missedAttacks')}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRoster.map((player) => {
              const reliabilityScore = calculateReliabilityScore(player, leagueTier)
              // CWL: 1 attack per war (not 2 like regular wars)
              const maxPossibleAttacks = player.warsParticipated
              const missedAttacks = player.missedAttacks ?? (maxPossibleAttacks - player.attacks)

              return (
                <TableRow
                  key={player.tag}
                  className="border-border/30 cursor-pointer hover:bg-accent/30"
                  onClick={() => handlePlayerClick(player.tag)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.tag}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {player.townHallLevel ? (
                      <THBadge level={player.townHallLevel} size="sm" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {!preparationMode && (
                    <>
                      <TableCell className="text-center font-medium">
                        {player.warsParticipated}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold">{player.attacks}</span>
                          <span className="text-muted-foreground text-sm">/{maxPossibleAttacks}</span>
                          {missedAttacks > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs px-1">
                              -{missedAttacks}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star size={14} weight="fill" className="text-yellow-400" />
                          <span className="font-bold text-yellow-400">{player.stars}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${getAvgStarsColor(player.avgStars)}`}>
                          {player.avgStars.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40">
                          {player.triples}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex items-center gap-0.5 text-xs">
                            <Badge variant="outline" className="h-6 px-1.5 text-xs bg-gray-500/10">
                              0★:{player.zeroStars}
                            </Badge>
                            <Badge variant="outline" className="h-6 px-1.5 text-xs bg-orange-500/10 text-orange-400">
                              1★:{player.oneStars}
                            </Badge>
                            <Badge variant="outline" className="h-6 px-1.5 text-xs bg-blue-500/10 text-blue-400">
                              2★:{player.twoStars}
                            </Badge>
                            <Badge variant="outline" className="h-6 px-1.5 text-xs bg-yellow-500/10 text-yellow-400">
                              3★:{player.triples}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={reliabilityScore >= 90
                            ? 'bg-green-500/15 text-green-400 border-green-500/40'
                            : reliabilityScore >= 75
                              ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40'
                              : 'bg-red-500/15 text-red-400 border-red-500/40'
                          }
                        >
                          {reliabilityScore.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {missedAttacks > 0 ? (
                          <Badge
                            variant="destructive"
                            className={
                              missedAttacks > 2
                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                            }
                          >
                            {missedAttacks}
                          </Badge>
                        ) : (
                          <span className="text-green-400 font-medium">0</span>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
