import type { SeasonRosterPlayer } from '@/lib/types'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface THDistributionChartProps {
  roster: SeasonRosterPlayer[]
}

export function THDistributionChart({ roster }: THDistributionChartProps) {
  const { t } = useTranslation()

  const distribution = useMemo(() => {
    const counts: Record<number, number> = {}
    let maxCount = 0

    for (const player of roster) {
      const th = player.townHallLevel ?? 0
      counts[th] = (counts[th] || 0) + 1
      maxCount = Math.max(maxCount, counts[th])
    }

    // Get sorted TH levels (descending, highest first)
    const thLevels = Object.keys(counts)
      .map(Number)
      .filter(th => th > 0)
      .sort((a, b) => b - a)

    return { counts, maxCount, thLevels }
  }, [roster])

  if (roster.length === 0 || distribution.thLevels.length === 0) {
    return null
  }

  const { counts, maxCount, thLevels } = distribution

  return (
    <div className="bg-card/30 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        {t('preparation.th_distribution')}
      </h4>
      <div className="flex items-end gap-2 h-16">
        {thLevels.map(th => {
          const count = counts[th]
          const heightPercent = (count / maxCount) * 100
          const isMaxTH = th === Math.max(...thLevels)

          return (
            <div
              key={th}
              className="flex-1 flex flex-col items-center min-w-[2rem]"
            >
              <div
                className="w-full relative group"
                style={{ height: '48px' }}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${isMaxTH
                    ? 'bg-linear-to-t from-primary to-primary/60'
                    : 'bg-linear-to-t from-muted-foreground/60 to-muted-foreground/30'
                    }`}
                  style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                >
                  {/* Count tooltip on hover */}
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs mt-1 font-medium ${isMaxTH ? 'text-primary' : 'text-muted-foreground'
                  }`}
              >
                {th}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>TH {Math.max(...thLevels)}</span>
        <span>{roster.length} players</span>
      </div>
    </div>
  )
}
