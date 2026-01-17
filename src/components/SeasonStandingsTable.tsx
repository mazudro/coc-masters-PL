import { LeagueBadge } from '@/components/LeagueBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { LeagueInfo, SeasonClanSummary } from '@/lib/types'
import { useTranslation } from 'react-i18next'

interface SeasonStandingsTableProps {
  clans: SeasonClanSummary[]
  league: LeagueInfo | null
  onClanClick?: (clanTag: string) => void
}

export function SeasonStandingsTable({ clans, league, onClanClick }: SeasonStandingsTableProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-bold">{t('history.standings.position')}</TableHead>
            <TableHead className="font-bold">{t('standings.clan')}</TableHead>
            <TableHead className="font-bold text-right">{t('standings.stars')}</TableHead>
            <TableHead className="font-bold text-right hidden md:table-cell">{t('standings.destruction')}</TableHead>
            <TableHead className="font-bold text-center hidden sm:table-cell">{t('history.standings.record')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clans.map((clan, idx) => (
            <TableRow
              key={clan.tag}
              className={`${onClanClick ? 'cursor-pointer hover:bg-primary/10' : ''} transition-colors animate-row-in`}
              style={{ animationDelay: `${idx * 0.05}s` }}
              onClick={() => onClanClick?.(clan.tag)}
            >
              <TableCell>
                <LeagueBadge league={league} groupPosition={clan.groupPosition} compact />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-semibold">{clan.name ?? t('history.clan_inactive')}</p>
                  <p className="text-xs text-muted-foreground font-mono">{clan.tag}</p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xl font-bold tabular-nums text-yellow-400">{clan.stars}</span>
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                <span className="font-semibold tabular-nums">{clan.destruction.toFixed(1)}</span>
              </TableCell>
              <TableCell className="text-center font-medium tabular-nums hidden sm:table-cell">
                <span className="text-green-400">{clan.rounds.won}W</span>
                {' - '}
                <span className="text-red-400">{clan.rounds.lost}L</span>
                {clan.rounds.tied > 0 && (
                  <>
                    {' - '}
                    <span className="text-yellow-400">{clan.rounds.tied}T</span>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
