import { COLORS } from '@/lib/chartColors'
import type { PlayerSeasonStats } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface PlayerSeasonChartProps {
  seasons: PlayerSeasonStats[]
}

export function PlayerSeasonChart({ seasons }: PlayerSeasonChartProps) {
  const { t } = useTranslation()

  // Sort seasons chronologically for chart
  const sortedSeasons = [...seasons].sort((a, b) => a.season.localeCompare(b.season))

  const chartData = sortedSeasons.map((season) => ({
    season: season.season,
    avgStars: parseFloat(season.avgStars.toFixed(2)),
    avgDestruction: parseFloat(season.avgDestruction.toFixed(1)),
    threeStarRate: parseFloat(season.threeStarRate.toFixed(1)),
  }))

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-border/80 bg-card/50 p-8 text-center text-muted-foreground">
        {t('playerHistory.noChartData')}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 p-4">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="season"
              angle={-20}
              textAnchor="end"
              height={60}
              tickMargin={8}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 3]}
              ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3]}
              label={{
                value: t('playerHistory.avgStarsLabel'),
                angle: -90,
                position: 'insideLeft',
                offset: 10,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              label={{
                value: t('playerHistory.destructionLabel'),
                angle: 90,
                position: 'insideRight',
                offset: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'avgStars') return [value.toFixed(2), t('playerHistory.avgStars')]
                if (name === 'avgDestruction') return [`${value.toFixed(1)}%`, t('playerHistory.avgDestruction')]
                if (name === 'threeStarRate') return [`${value.toFixed(1)}%`, t('playerHistory.threeStarRate')]
                return [value, name]
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === 'avgStars') return t('playerHistory.avgStars')
                if (value === 'avgDestruction') return t('playerHistory.avgDestruction')
                if (value === 'threeStarRate') return t('playerHistory.threeStarRate')
                return value
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgStars"
              stroke={COLORS.avgStars}
              strokeWidth={3}
              dot={{ r: 4, fill: COLORS.avgStars }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgDestruction"
              stroke={COLORS.avgDestruction}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.avgDestruction }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="threeStarRate"
              stroke={COLORS.threeStarRate}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: COLORS.threeStarRate }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
