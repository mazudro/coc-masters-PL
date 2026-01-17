import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Player } from '@/lib/types'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PlayerStarsTableProps {
  players: Player[]
}

type SortField = 'name' | 'stars' | 'th' | 'avgStars'
type SortDirection = 'asc' | 'desc'

export function PlayerStarsTable({ players }: PlayerStarsTableProps) {
  const [sortField, setSortField] = useState<SortField>('stars')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const { t } = useTranslation()

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'name' ? 'asc' : 'desc')
    }
  }

  const sortedPlayers = [...players].sort((a, b) => {
    let comparison = 0

    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else if (sortField === 'stars') {
      comparison = a.stars - b.stars
    } else if (sortField === 'th') {
      comparison = a.th - b.th
    } else if (sortField === 'avgStars') {
      // Treat null as -Infinity for sorting (nulls go to end when descending, start when ascending)
      const aVal = a.avgStars ?? -Infinity
      const bVal = b.avgStars ?? -Infinity
      comparison = aVal - bVal
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead
              className="font-bold cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                {t('players.table.player')}
                <SortIcon field="name" />
              </div>
            </TableHead>
            <TableHead
              className="font-bold text-center cursor-pointer hover:bg-muted transition-colors hidden sm:table-cell"
              onClick={() => handleSort('th')}
            >
              <div className="flex items-center justify-center gap-1">
                {t('players.table.th')}
                <SortIcon field="th" />
              </div>
            </TableHead>
            <TableHead className="font-bold text-center hidden md:table-cell">
              {t('players.table.attacks')}
            </TableHead>
            <TableHead
              className="font-bold text-right cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSort('stars')}
            >
              <div className="flex items-center justify-end gap-1">
                {t('players.table.stars')}
                <SortIcon field="stars" />
              </div>
            </TableHead>
            <TableHead
              className="font-bold text-right cursor-pointer hover:bg-muted transition-colors hidden lg:table-cell"
              onClick={() => handleSort('avgStars')}
            >
              <div className="flex items-center justify-end gap-1">
                {t('players.table.avg')}
                <SortIcon field="avgStars" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player, idx) => (
            <TableRow
              key={player.tag}
              className="hover:bg-primary/5 transition-colors animate-row-in"
              style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
            >
              <TableCell>
                <div>
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{player.tag}</p>
                </div>
              </TableCell>
              <TableCell className="text-center font-semibold tabular-nums hidden sm:table-cell">
                {player.th}
              </TableCell>
              <TableCell className="text-center tabular-nums hidden md:table-cell">
                {player.attacks}
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xl font-bold tabular-nums text-yellow-400">{player.stars}</span>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums hidden lg:table-cell">
                {player.avgStars !== null ? player.avgStars.toFixed(1) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
