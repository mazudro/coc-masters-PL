import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SeasonWar } from '@/lib/types'
import { CaretRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

interface WarsTableProps {
  wars: SeasonWar[]
  onWarClick?: (war: SeasonWar) => void
}

export function WarsTable({ wars, onWarClick }: WarsTableProps) {
  const { t } = useTranslation()
  const isClickable = !!onWarClick

  const getResultBadge = (result: string) => {
    const normalized = result.toLowerCase()
    if (normalized === 'win' || normalized === 'victory') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/40">{t('clanSeason.resultWin')}</Badge>
    }
    if (normalized === 'loss' || normalized === 'defeat') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/40">{t('clanSeason.resultLoss')}</Badge>
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">{t('clanSeason.resultTie')}</Badge>
  }

  // Sort wars by startTime to get proper round numbering
  const sortedWars = [...wars].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const handleRowClick = (war: SeasonWar) => {
    if (onWarClick) {
      onWarClick(war)
    }
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="w-20">{t('clanSeason.round')}</TableHead>
            <TableHead>{t('clanSeason.opponent')}</TableHead>
            <TableHead className="text-center">{t('clanSeason.result')}</TableHead>
            <TableHead className="text-center">{t('clanSeason.stars')}</TableHead>
            <TableHead className="text-center">{t('clanSeason.destruction')}</TableHead>
            {isClickable && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedWars.map((war, index) => (
            <TableRow
              key={war.warTag}
              className={`border-border/30 ${isClickable ? 'cursor-pointer hover:bg-primary/10 transition-colors' : ''}`}
              onClick={() => handleRowClick(war)}
            >
              <TableCell className="font-medium">
                {t('clanSeason.roundNumber', { number: index + 1 })}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{war.opponent.name}</p>
                  <p className="text-xs text-muted-foreground">{war.opponent.tag}</p>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {getResultBadge(war.result)}
              </TableCell>
              <TableCell className="text-center">
                <span className="font-semibold text-yellow-400">{war.starsFor}</span>
                <span className="text-muted-foreground mx-1">vs</span>
                <span className="font-semibold text-muted-foreground">{war.starsAgainst}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-semibold">{war.destructionFor.toFixed(1)}%</span>
                <span className="text-muted-foreground mx-1">vs</span>
                <span className="font-semibold text-muted-foreground">{war.destructionAgainst.toFixed(1)}%</span>
              </TableCell>
              {isClickable && (
                <TableCell className="text-right">
                  <CaretRight size={16} className="text-muted-foreground" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
