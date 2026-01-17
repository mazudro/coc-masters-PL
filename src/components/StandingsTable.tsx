import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ClanSummary } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { LeagueBadge } from './LeagueBadge'
import { RankBadge } from './RankBadge'

interface StandingsTableProps {
  clans: ClanSummary[]
  onClanClick?: (clanTag: string) => void
}

export function StandingsTable({ clans, onClanClick }: StandingsTableProps) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-bold">{t('standings.rank')}</TableHead>
            <TableHead className="font-bold">{t('standings.clan')}</TableHead>
            <TableHead className="font-bold hidden lg:table-cell">{t('standings.league') || 'League'}</TableHead>
            <TableHead className="font-bold text-right">{t('standings.stars')}</TableHead>
            <TableHead className="font-bold text-right hidden md:table-cell">{t('standings.destruction')}</TableHead>
            <TableHead className="font-bold text-right hidden sm:table-cell">{t('standings.attacks')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clans.map((clan, idx) => {
            const destructionPercent = clan.attacks > 0
              ? ((clan.destruction / (clan.attacks * 100)) * 100).toFixed(1)
              : '—'

            return (
              <TableRow
                key={clan.tag}
                className="cursor-pointer hover:bg-primary/10 transition-colors animate-row-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => onClanClick?.(clan.tag)}
              >
                <TableCell>
                  <RankBadge rank={clan.rank} />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold">{clan.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{clan.tag}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {clan.league ? (
                    <LeagueBadge league={clan.league} compact showIcon size="sm" />
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xl font-bold tabular-nums text-yellow-400">{clan.stars}</span>
                </TableCell>
                <TableCell className="text-right hidden md:table-cell">
                  <span className="font-semibold tabular-nums">
                    {typeof destructionPercent === 'string' ? destructionPercent : `${destructionPercent}%`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">({clan.destruction.toLocaleString()})</span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums hidden sm:table-cell">
                  {clan.attacks}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
