import { useTranslation } from 'react-i18next'
import { Star, Trophy, Sword, Target, Users, Flame } from '@phosphor-icons/react'
import type { FamilyStats } from '@/lib/types'

interface KeyMetricsGridProps {
  stats: FamilyStats
}

export function KeyMetricsGrid({ stats }: KeyMetricsGridProps) {
  const { t } = useTranslation()

  const metrics = [
    {
      label: t('home.metric_total_stars'),
      value: stats.totalStars ?? 0,
      icon: <Star size={28} weight="fill" className="text-yellow-400" />,
      color: 'bg-yellow-500/10 border-yellow-500/30'
    },
    {
      label: t('home.metric_avg_stars'),
      value: (stats.avgStarsPerAttack ?? 0).toFixed(2),
      icon: <Trophy size={28} weight="fill" className="text-purple-400" />,
      color: 'bg-purple-500/10 border-purple-500/30'
    },
    {
      label: t('home.metric_total_attacks'),
      value: stats.totalAttacks ?? 0,
      icon: <Sword size={28} weight="fill" className="text-blue-400" />,
      color: 'bg-blue-500/10 border-blue-500/30'
    },
    {
      label: t('home.metric_total_wars'),
      value: stats.totalWars ?? 0,
      icon: <Flame size={28} weight="fill" className="text-red-400" />,
      color: 'bg-red-500/10 border-red-500/30'
    },
    {
      label: t('home.metric_avg_destruction'),
      value: `${(stats.avgDestructionPercent ?? 0).toFixed(1)}%`,
      icon: <Target size={28} weight="fill" className="text-green-400" />,
      color: 'bg-green-500/10 border-green-500/30'
    },
    {
      label: t('home.metric_total_players'),
      value: stats.totalPlayers ?? 0,
      icon: <Users size={28} weight="fill" className="text-cyan-400" />,
      color: 'bg-cyan-500/10 border-cyan-500/30'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{t('home.key_metrics_title')}</h2>
        <p className="text-muted-foreground text-sm">{t('home.key_metrics_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-lg border p-6 transition-all hover:scale-105 hover:shadow-lg ${metric.color}`}
          >
            <div className="flex items-start justify-between mb-4">
              {metric.icon}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{metric.label}</p>
            <p className="text-3xl font-bold tabular-nums">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
