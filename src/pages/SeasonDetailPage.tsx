import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CHART_COLORS, COLORS } from '@/lib/chartColors'
import { getSeasonDetailStats, getSeasonFamily } from '@/lib/data'
import type { SeasonClanSummary, SeasonDetailStats, SeasonFamilyData } from '@/lib/types'
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Crown,
  Crosshair,
  Flame,
  Medal,
  Trophy,
  UsersThree,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Use shared chart colors
const AXIS_COLOR = COLORS.axis
const GRID_COLOR = COLORS.grid

function SeasonDetailSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-32 rounded-2xl skeleton-shimmer" />
        <Skeleton className="h-32 rounded-2xl skeleton-shimmer" />
        <Skeleton className="h-32 rounded-2xl skeleton-shimmer" />
        <Skeleton className="h-32 rounded-2xl skeleton-shimmer" />
      </div>
      <Skeleton className="h-80 w-full rounded-2xl skeleton-shimmer" />
    </div>
  )
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Trophy size={24} weight="fill" className="text-yellow-400" />
  }
  if (rank === 2) {
    return <Medal size={24} weight="fill" className="text-gray-400" />
  }
  if (rank === 3) {
    return <Medal size={24} weight="fill" className="text-amber-600" />
  }
  return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
}

export function SeasonDetailPage() {
  const { t } = useTranslation()
  const { season } = useParams<{ season: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [familyData, setFamilyData] = useState<SeasonFamilyData | null>(null)
  const [stats, setStats] = useState<SeasonDetailStats | null>(null)

  useEffect(() => {
    if (!season) return

    async function loadData() {
      setLoading(true)
      try {
        const [family, seasonStats] = await Promise.all([
          getSeasonFamily(season),
          getSeasonDetailStats(season),
        ])
        setFamilyData(family)
        setStats(seasonStats)
      } catch (err) {
        console.error('Failed to load season details:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [season])

  if (loading) {
    return <SeasonDetailSkeleton />
  }

  if (!familyData || !stats) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/history')}>
          <ArrowLeft className="mr-2" size={16} />
          {t('seasonDetail.backToHistory')}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {t('seasonDetail.noData')}
        </div>
      </div>
    )
  }

  // Sort clans by stars (descending) for rankings
  const sortedClans = [...(familyData.clans || [])].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))

  // Prepare chart data
  const starsChartData = sortedClans.map(clan => {
    const fullName = clan.name ?? 'Unknown'
    // Display full clan name for CoC Masters PL family
    const displayName = fullName

    return {
      name: displayName,
      fullName,
      stars: clan.stars ?? 0,
    }
  })

  const winLossData = [
    { name: t('history.wins'), value: stats.totalWins, color: 'hsl(142 76% 45%)' },
    { name: t('history.losses'), value: stats.totalLosses, color: 'hsl(0 84% 65%)' },
  ]
  if (stats.totalTies > 0) {
    winLossData.push({ name: t('clanSeason.resultTie'), value: stats.totalTies, color: 'hsl(45 93% 47%)' })
  }

  const handleClanClick = (clan: SeasonClanSummary) => {
    if (!season || !clan.tag) return
    const cleanTag = clan.tag.replace('#', '')
    navigate(`/history/${season}/clan/${cleanTag}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 animate-fade-in-up">
        <Button
          variant="ghost"
          onClick={() => navigate('/history')}
          className="w-fit"
        >
          <ArrowLeft className="mr-2" size={16} />
          {t('seasonDetail.backToHistory')}
        </Button>

        <div className="flex items-center gap-4">
          <CalendarBlank size={32} weight="fill" className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{season}</h1>
            <Badge variant="secondary" className="mt-1">
              {t(`history.state_${familyData.state}`, { defaultValue: familyData.state })}
            </Badge>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
        <Card className="card-hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Flame size={24} weight="fill" className="text-orange-400" />
              <Badge variant="outline" className="text-xs">{t('seasonDetail.totalStars')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-yellow-400">{stats.totalStars}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('seasonDetail.clansParticipated')}: {stats.clanCount}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Crosshair size={24} weight="fill" className="text-green-400" />
              <Badge variant="outline" className="text-xs">{t('seasonDetail.winRate')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stats.winRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('seasonDetail.winsLosses', { wins: stats.totalWins, losses: stats.totalLosses })}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <UsersThree size={24} weight="fill" className="text-blue-400" />
              <Badge variant="outline" className="text-xs">{t('seasonDetail.clansParticipated')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stats.clanCount}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('seasonDetail.totalWars')}: {stats.totalWars}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Trophy size={24} weight="fill" className="text-purple-400" />
              <Badge variant="outline" className="text-xs">{t('seasonDetail.avgDestruction')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stats.avgDestruction.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('history.avg_stars_per_season', { value: (stats.totalStars / stats.clanCount).toFixed(0) })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up stagger-2">
        {/* Stars by Clan Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown size={24} className="text-primary" />
              <div>
                <CardTitle>{t('seasonDetail.clanRankings')}</CardTitle>
                <CardDescription>{t('seasonDetail.totalStars')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={starsChartData} margin={{ top: 10, right: 16, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tickMargin={8}
                    style={{ fontSize: '11px' }}
                    stroke={AXIS_COLOR}
                    tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                  />
                  <YAxis stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} ${t('seasonDetail.stars')}`, t('seasonDetail.stars')]}
                    labelFormatter={(label) => starsChartData.find(c => c.name === label)?.fullName ?? label}
                  />
                  <Bar dataKey="stars" radius={[4, 4, 0, 0]}>
                    {starsChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Medal size={24} className="text-primary" />
              <div>
                <CardTitle>{t('history.win_loss_title')}</CardTitle>
                <CardDescription>{t('history.win_loss_description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Clan Rankings Table */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy size={24} className="text-primary" />
            <div>
              <CardTitle>{t('seasonDetail.clanPerformance')}</CardTitle>
              <CardDescription>
                {t('seasonDetail.clansParticipated')}: {sortedClans.length}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedClans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('seasonDetail.noClanData')}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedClans.map((clan, index) => {
                const rank = index + 1
                const wins = clan.rounds?.won ?? 0
                const losses = clan.rounds?.lost ?? 0
                const ties = clan.rounds?.tied ?? 0

                return (
                  <button
                    key={clan.tag}
                    onClick={() => handleClanClick(clan)}
                    className="w-full p-4 rounded-lg border border-border/80 bg-card/50 hover:bg-accent hover:border-primary/30 transition-all duration-200 cursor-pointer text-left"
                    aria-label={t('seasonDetail.viewClanDetails')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10">
                          <RankMedal rank={rank} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{clan.name ?? 'Unknown'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {t('seasonDetail.position')}: #{clan.groupPosition ?? '-'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xl font-bold text-yellow-400">{clan.stars ?? 0}</div>
                          <div className="text-xs text-muted-foreground">{t('seasonDetail.stars')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">{(clan.destruction ?? 0).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">{t('seasonDetail.destruction')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">{wins}-{losses}-{ties}</div>
                          <div className="text-xs text-muted-foreground">{t('seasonDetail.record')}</div>
                        </div>
                        <ArrowRight size={20} className="text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
