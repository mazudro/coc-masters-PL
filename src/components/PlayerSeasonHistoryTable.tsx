import { LeagueBadge } from '@/components/LeagueBadge'
import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PlayerSeasonStats } from '@/lib/types'
import { ArrowDown, ArrowUp, Star } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface PlayerSeasonHistoryTableProps {
  seasons: PlayerSeasonStats[]
}

type SortField = 'season' | 'league' | 'warsParticipated' | 'attacks' | 'stars' | 'avgStars' | 'triples' | 'threeStarRate'
type SortDirection = 'asc' | 'desc'

export function PlayerSeasonHistoryTable({ seasons }: PlayerSeasonHistoryTableProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>('season')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortField) {
        case 'season':
          aVal = a.season
          bVal = b.season
          break
        case 'league':
          aVal = a.leagueTier || ''
          bVal = b.leagueTier || ''
          break
        case 'warsParticipated':
          aVal = a.warsParticipated
          bVal = b.warsParticipated
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
        case 'threeStarRate':
          aVal = a.threeStarRate
          bVal = b.threeStarRate
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
  }, [seasons, sortField, sortDirection])

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

  const handleSeasonClick = (season: PlayerSeasonStats) => {
    const cleanTag = season.clanTag.replace('#', '')
    navigate(`/history/${season.season}/clan/${cleanTag}`)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => handleSort('season')}
              >
                <div className="flex items-center gap-1">
                  {t('playerHistory.season')}
                  <SortIcon field="season" />
                </div>
              </TableHead>
              <TableHead>{t('playerHistory.clan')}</TableHead>
              <TableHead>{t('playerHistory.league') || 'League'}</TableHead>
              <TableHead className="text-center">TH</TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-accent/50"
                onClick={() => handleSort('warsParticipated')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('playerHistory.wars')}
                  <SortIcon field="warsParticipated" />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-accent/50"
                onClick={() => handleSort('attacks')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('playerHistory.attacks')}
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
                  {t('playerHistory.avgStars')}
                  <SortIcon field="avgStars" />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-accent/50"
                onClick={() => handleSort('triples')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('playerHistory.triples')}
                  <SortIcon field="triples" />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-accent/50"
                onClick={() => handleSort('threeStarRate')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('playerHistory.threeStarRate')}
                  <SortIcon field="threeStarRate" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSeasons.map((season) => (
              <TableRow
                key={season.season}
                className="border-border/30 cursor-pointer hover:bg-accent/30"
                onClick={() => handleSeasonClick(season)}
              >
                <TableCell className="font-medium">{season.season}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{season.clanName}</p>
                    <p className="text-xs text-muted-foreground">{season.clanTag}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {season.leagueTier ? (
                    <LeagueBadge
                      league={{ tier: season.leagueTier, group: null }}
                      compact
                      showIcon
                      size="sm"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {season.townHallLevel ? (
                    <THBadge level={season.townHallLevel} size="sm" />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {season.warsParticipated}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {season.attacks}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star size={14} weight="fill" className="text-yellow-400" />
                    <span className="font-bold text-yellow-400">{season.stars}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-bold ${getAvgStarsColor(season.avgStars)}`}>
                    {season.avgStars.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40">
                    {season.triples}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-primary">
                    {season.threeStarRate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
