import type { Player } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Sword, Target, Trophy } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

interface TopPerformer extends Player {
  clanName: string
}

interface TopPerformersCardProps {
  topByStars: TopPerformer[]
  topByWars: TopPerformer[]
  topByDestruction: TopPerformer[]
}

const PODIUM_COLORS = {
  1: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/40',
  2: 'from-gray-400/20 to-gray-500/20 border-gray-400/40',
  3: 'from-orange-600/20 to-orange-700/20 border-orange-600/40'
} as const

const PODIUM_TEXT_COLORS = {
  1: 'text-yellow-400',
  2: 'text-gray-400',
  3: 'text-orange-500'
} as const

export function TopPerformersCard({
  topByStars,
  topByWars,
  topByDestruction
}: TopPerformersCardProps) {
  const { t } = useTranslation()

  const renderPodium = (
    performers: TopPerformer[],
    icon: React.ReactNode,
    metric: string,
    getMetricValue: (p: TopPerformer) => number | string
  ) => {
    if (performers.length === 0) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="font-semibold">{metric}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {performers.map((performer, index) => {
            const position = (index + 1) as 1 | 2 | 3
            return (
              <div
                key={performer.tag}
                className={cn(
                  'relative rounded-lg border p-4 transition-all',
                  'bg-linear-to-br',
                  PODIUM_COLORS[position]
                )}
              >
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-linear-to-br from-background to-card border-2 border-border flex items-center justify-center">
                  <span className={cn(
                    'text-sm font-bold',
                    PODIUM_TEXT_COLORS[position]
                  )}>
                    {position}
                  </span>
                </div>
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div>
                    <h4 className="font-bold text-sm">{performer.name}</h4>
                    <p className="text-xs text-muted-foreground">{performer.clanName}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-2xl font-bold tabular-nums',
                      PODIUM_TEXT_COLORS[position]
                    )}>
                      {getMetricValue(performer)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{t('home.top_performers_title')}</h2>
        <p className="text-muted-foreground text-sm">{t('home.top_performers_subtitle')}</p>
      </div>

      <div className="space-y-8">
        {renderPodium(
          topByStars,
          <Trophy size={20} weight="fill" className="text-yellow-400" />,
          t('home.top_by_stars'),
          (p) => p.stars
        )}

        {renderPodium(
          topByWars,
          <Sword size={20} weight="fill" className="text-blue-400" />,
          t('home.top_by_wars'),
          (p) => p.wars
        )}

        {renderPodium(
          topByDestruction,
          <Target size={20} weight="fill" className="text-green-400" />,
          t('home.top_by_destruction'),
          (p) => {
            const avgDest = p.attacks > 0
              ? (p.attacks > 0 ? ((p.stars / p.attacks) * 33.33).toFixed(0) : 0)
              : 0
            return `${avgDest}%`
          }
        )}
      </div>
    </div>
  )
}
