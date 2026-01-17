import { COLORS, STAR_BUCKET_COLORS } from '@/lib/chartColors'
import type { Player } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface StarBucketsChartProps {
  player: Player
}

export function StarBucketsChart({ player }: StarBucketsChartProps) {
  const { t } = useTranslation()

  if (!player.starBuckets) {
    return (
      <div className="rounded-lg border border-border/80 bg-card/50 p-8 text-center text-muted-foreground">
        {t('clanSeason.noData')}
      </div>
    )
  }

  // Prepare chart data
  const chartData = [
    {
      name: t('starBucketsChart.zeroStars'),
      value: player.starBuckets.zeroStars,
      displayName: '0★',
    },
    {
      name: t('starBucketsChart.oneStars'),
      value: player.starBuckets.oneStars,
      displayName: '1★',
    },
    {
      name: t('starBucketsChart.twoStars'),
      value: player.starBuckets.twoStars,
      displayName: '2★',
    },
    {
      name: t('starBucketsChart.threeStars'),
      value: player.starBuckets.threeStars,
      displayName: '3★',
    },
  ]

  // Use shared star bucket colors from chartColors
  const colors = STAR_BUCKET_COLORS

  const totalAttacks = Object.values(player.starBuckets).reduce((sum, val) => sum + val, 0)

  if (totalAttacks === 0) {
    return (
      <div className="rounded-lg border border-border/80 bg-card/50 p-8 text-center text-muted-foreground">
        {t('clanSeason.noData')}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 p-4">
      <h3 className="text-lg font-semibold mb-4">{t('clanSeason.starBuckets')}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="displayName"
              angle={0}
              textAnchor="middle"
              height={50}
            />
            <YAxis
              label={{
                value: t('starBucketsChart.attackCount'),
                angle: -90,
                position: 'insideLeft',
                offset: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => {
                const percentage = totalAttacks > 0 ? ((value / totalAttacks) * 100).toFixed(1) : '0.0'
                return [`${value} attacks (${percentage}%)`, 'Count']
              }}
              labelFormatter={(label) => label}
            />
            <Legend
              formatter={(value) => {
                const item = chartData.find((d) => d.displayName === value)
                return item ? item.name : value
              }}
              wrapperStyle={{ paddingTop: '20px' }}
            />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              label={{
                position: 'top',
                fill: COLORS.labelLight,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats below chart */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {chartData.map((item, index) => {
          const percentage = totalAttacks > 0 ? ((item.value / totalAttacks) * 100).toFixed(1) : '0.0'
          return (
            <div key={item.displayName} className="rounded-lg border border-border/50 p-3 text-center">
              <div
                className="h-3 w-full rounded-sm mb-2"
                style={{ backgroundColor: colors[index] }}
              />
              <p className="text-sm font-semibold">{item.displayName}</p>
              <p className="text-lg font-bold mt-1">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
            </div>
          )
        })}
      </div>

      {/* Total attacks info */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {t('starBucketsChart.totalAttacks', { count: totalAttacks })}
      </div>
    </div>
  )
}
