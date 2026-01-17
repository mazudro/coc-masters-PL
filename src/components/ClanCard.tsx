import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getClanAccentColor, getClanReliability } from '@/lib/data'
import type { ClanSummary, Player, SeasonRosterPlayer } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ArrowRight, Star, Target, TrendUp } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LeagueBadge } from './LeagueBadge'
import { MVPBadge } from './MVPBadge'
import { RankBadge } from './RankBadge'
import { ReliabilityBadge } from './ReliabilityBadge'

interface ClanCardProps {
  clan: ClanSummary & { players?: Player[] }
  seasonRoster?: SeasonRosterPlayer[] // Optional: roster from latest season for MVP
  onViewDetails: () => void
}

export function ClanCard({ clan, seasonRoster, onViewDetails }: ClanCardProps) {
  const accentColor = getClanAccentColor(clan.name)
  // Use wars for destruction % calculation (each war = 100% max destruction)
  const warsCount = clan.wars ?? 0
  const destructionPercent = warsCount > 0
    ? (clan.destruction / warsCount).toFixed(1)
    : '—'
  const { t } = useTranslation()

  // Calculate MVP from season roster (if available) or fall back to all-time players
  const mvp = useMemo(() => {
    // Prefer season roster for MVP (last season's best player)
    if (seasonRoster && seasonRoster.length > 0) {
      return seasonRoster.reduce((best, player) =>
        player.stars > best.stars ? player : best
        , seasonRoster[0])
    }
    // Fall back to all-time players if no season roster
    if (!clan.players || clan.players.length === 0) return null
    return clan.players.reduce((best, player) =>
      player.stars > best.stars ? player : best
      , clan.players[0])
  }, [seasonRoster, clan.players])

  // Calculate clan reliability from player data
  const reliability = useMemo(() => {
    if (!clan.players || clan.players.length === 0) return null
    return getClanReliability(clan.players)
  }, [clan.players])

  const glowClass = accentColor === 'secondary'
    ? 'glow-secondary'
    : accentColor === 'accent'
      ? 'glow-accent'
      : 'glow-primary'

  return (
    <Card className={cn(
      'transition-all duration-300 hover:scale-[1.02] card-hover-lift',
      'border-border/50 group',
      `hover:${glowClass}`
    )}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl tracking-tight group-hover:text-primary transition-colors duration-200">{clan.name}</CardTitle>
            <p className="text-sm text-muted-foreground font-mono">{clan.tag}</p>
            {clan.league && (
              <div className="mt-2">
                <LeagueBadge league={clan.league} compact showIcon size="sm" />
              </div>
            )}
          </div>
          <div className="animate-scale-in">
            <RankBadge rank={clan.rank} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Star size={16} />
              <span>{t('clan_card.stars')}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-yellow-400">{clan.stars}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendUp size={16} />
              <span>{t('clan_card.destruction')}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{typeof destructionPercent === 'string' ? destructionPercent : `${destructionPercent}%`}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <span>{t('clan_card.reliability')}</span>
            </div>
            {reliability ? (
              <ReliabilityBadge
                reliability={reliability.average}
                breakdown={reliability}
                size="md"
              />
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {mvp && (
          <div className="pt-2">
            <MVPBadge
              playerName={mvp.name}
              playerTag={mvp.tag}
              stars={mvp.stars}
              size="sm"
            />
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target size={14} />
              <span>{t('clan_card.attacks_label', { count: clan.attacks })}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="gap-2 group-hover:bg-primary/10 transition-colors duration-200"
            >
              {t('clan_card.view_details')}
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
