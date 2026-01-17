import { Star, Target, TrendUp, Trophy } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

interface KpiBarProps {
  stars: number
  rank?: number
  destruction: number
  attacks: number
  wars?: number
  warsWon?: number
  warsLost?: number
}

export function KpiBar({ stars, rank, destruction, attacks, wars, warsWon, warsLost }: KpiBarProps) {
  // For all-time stats (wars provided), destruction is sum of war destruction percentages - divide by wars
  // For season stats (no wars), destruction is total - divide by attacks
  const showWinRecord = wars !== undefined && warsWon !== undefined && warsLost !== undefined

  const avgDestruction = showWinRecord
    ? (wars > 0 ? (destruction / wars).toFixed(1) : '—')
    : (attacks > 0 ? (destruction / attacks).toFixed(1) : '—')
  const { t } = useTranslation()

  const winRecord = showWinRecord ? `${warsWon}W-${warsLost}L` : null

  const kpis = [
    {
      label: t('clan.kpis.total_stars'),
      value: stars.toLocaleString(),
      icon: Star,
      color: 'text-primary',
    },
    {
      label: showWinRecord ? t('clan.kpis.record', 'Record') : t('clan.kpis.rank'),
      value: showWinRecord ? winRecord : (rank ? `#${rank}` : '—'),
      icon: Trophy,
      color: 'text-secondary',
    },
    {
      label: t('clan.kpis.destruction'),
      value: typeof avgDestruction === 'string' && avgDestruction !== '—' ? `${avgDestruction}%` : avgDestruction,
      icon: TrendUp,
      color: 'text-accent',
    },
    {
      label: showWinRecord ? t('clan.kpis.wars', 'Wars') : t('clan.kpis.attacks'),
      value: showWinRecord ? (wars ?? 0).toLocaleString() : attacks.toLocaleString(),
      icon: Target,
      color: 'text-muted-foreground',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl p-6 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Icon className={kpi.color} size={20} weight="fill" />
              <span className="text-sm text-muted-foreground font-medium">{kpi.label}</span>
            </div>
            <p className="text-4xl font-bold tabular-nums">{kpi.value}</p>
          </div>
        )
      })}
    </div>
  )
}
