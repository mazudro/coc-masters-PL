import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CHART_COLORS, COLORS } from '@/lib/chartColors'
import { getSeasons } from '@/lib/data'
import type { SeasonClan, SeasonClanSummary, SeasonIndex } from '@/lib/types'
import {
  ArrowRight,
  CalendarBlank,
  ChartLine,
  Crown,
  Flame,
  Info,
  Medal,
  Target,
  TrendUp,
  Trophy,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type SeasonClanData = SeasonClan | SeasonClanSummary

// Use shared chart colors
const CLAN_COLORS = CHART_COLORS
const AXIS_COLOR = COLORS.axis
const GRID_COLOR = COLORS.grid
const WIN_COLOR = COLORS.win
const LOSS_COLOR = COLORS.loss

// Type guard to check if clan data is SeasonClan (has wins/losses)
function isSeasonClan(clan: SeasonClanData): clan is SeasonClan {
  return 'wins' in clan || 'losses' in clan || 'clanTag' in clan
}

// Loading skeleton for history page
function HistoryPageSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl skeleton-shimmer" />
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-2xl skeleton-shimmer" />
        <Skeleton className="h-40 rounded-2xl skeleton-shimmer" />
        <Skeleton className="h-40 rounded-2xl skeleton-shimmer" />
      </div>
      <Skeleton className="h-80 w-full rounded-2xl skeleton-shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-2xl skeleton-shimmer" />
        <Skeleton className="h-80 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="animate-fade-in">
      <Info size={20} />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function getClanStarsValue(clan: SeasonClanData): number {
  return clan?.stars ?? 0
}

function getClanWinsValue(clan: SeasonClanData): number {
  if (isSeasonClan(clan)) {
    return clan.wins ?? 0
  }
  // SeasonClanSummary uses rounds.won
  return clan.rounds?.won ?? 0
}

function getClanLossesValue(clan: SeasonClanData): number {
  if (isSeasonClan(clan)) {
    return clan.losses ?? 0
  }
  // SeasonClanSummary uses rounds.lost
  return clan.rounds?.lost ?? 0
}

const getClanStars = (clans: SeasonClanData[] | undefined) =>
  clans?.reduce((sum, clan) => sum + getClanStarsValue(clan), 0) ?? 0
const getClanWins = (clans: SeasonClanData[] | undefined) =>
  clans?.reduce((sum, clan) => sum + getClanWinsValue(clan), 0) ?? 0
const getClanLosses = (clans: SeasonClanData[] | undefined) =>
  clans?.reduce((sum, clan) => sum + getClanLossesValue(clan), 0) ?? 0

export function HistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { season: seasonParam } = useParams<{ season?: string }>()
  const [index, setIndex] = useState<SeasonIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [highlightedSeason, setHighlightedSeason] = useState<string | null>(seasonParam || null)


  useEffect(() => {
    async function loadIndex() {
      try {
        setError(null)
        const data = await getSeasons()
        setIndex(data)
      } catch (err) {
        console.error('Failed to load seasons index', err)
        setError('history.load_error')
      }
    }
    loadIndex()
  }, [])

  useEffect(() => {
    // Update highlighted season when URL param changes
    if (seasonParam) {
      setHighlightedSeason(seasonParam)
      // Scroll season card into view if it exists
      setTimeout(() => {
        const seasonElement = document.querySelector(`[data-season="${seasonParam}"]`)
        if (seasonElement) {
          seasonElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    }
  }, [seasonParam])

  // Calculate historical stats
  const stats = useMemo(() => {
    if (!index || !index.seasons.length) return null

    const totalSeasons = index.seasons.length
    const totalStars = index.seasons.reduce((sum, s) => sum + getClanStars(s.clans), 0)
    const totalWins = index.seasons.reduce((sum, s) => sum + getClanWins(s.clans), 0)
    const totalLosses = index.seasons.reduce((sum, s) => sum + getClanLosses(s.clans), 0)

    const bestSeasonStars = Math.max(...index.seasons.map(s => getClanStars(s.clans)))

    const avgStarsPerSeason = totalStars / totalSeasons
    const avgStarsPerSeasonRounded = Number(avgStarsPerSeason.toFixed(1))

    // Get unique clan participation
    const clanParticipation = new Map<string, number>()
    index.seasons.forEach(s => {
      s.clans?.forEach(c => {
        const tag = isSeasonClan(c) ? (c.clanTag ?? c.tag) : c.tag
        if (tag) {
          clanParticipation.set(tag, (clanParticipation.get(tag) || 0) + 1)
        }
      })
    })

    return {
      totalSeasons,
      totalStars,
      totalWins,
      totalLosses,
      bestSeasonStars,
      avgStarsPerSeason: avgStarsPerSeasonRounded,
      uniqueClans: clanParticipation.size,
      winRate: totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0,
    }
  }, [index])

  // Timeline data for stars per season
  const timelineData = useMemo(() => {
    if (!index) return []
    return index.seasons.map(s => ({
      season: s.season,
      stars: getClanStars(s.clans),
      wins: getClanWins(s.clans),
      losses: getClanLosses(s.clans),
    }))
  }, [index])

  // Clan progression data (league positions over time)
  const clanProgressionData = useMemo(() => {
    if (!index) return []
    return index.seasons.map(s => {
      const entry: Record<string, string | number | null> = { season: s.season }
      s.clans?.forEach(c => {
        const name = isSeasonClan(c) ? (c.clanName ?? c.name) : c.name
        const pos = isSeasonClan(c) ? (c.position ?? c.groupPosition) : c.groupPosition
        if (name) {
          entry[name] = pos ?? null
        }
      })
      return entry
    })
  }, [index])

  // Get all unique clan names for progression chart
  const clanNames = useMemo(() => {
    if (!index) return []
    const names = new Set<string>()
    index.seasons.forEach(s => {
      s.clans?.forEach(c => {
        const name = isSeasonClan(c) ? (c.clanName ?? c.name) : c.name
        if (name) names.add(name)
      })
    })
    return Array.from(names)
  }, [index])

  // League distribution
  const leagueDistribution = useMemo(() => {
    if (!index) return []
    const distribution = new Map<string, number>()
    index.seasons.forEach(s => {
      // Use season-level league info, or clan-level leagueName for SeasonClan types
      const seasonLeague = s.league?.tier
      s.clans?.forEach(c => {
        const league = isSeasonClan(c) ? c.leagueName : seasonLeague
        if (league) {
          distribution.set(league, (distribution.get(league) || 0) + 1)
        }
      })
    })
    return Array.from(distribution.entries())
      .map(([league, count]) => ({ league, count }))
      .sort((a, b) => b.count - a.count)
  }, [index])

  const winLossData = useMemo(() => {
    if (!index) return []
    return index.seasons.map(s => ({
      season: s.season,
      wins: getClanWins(s.clans),
      losses: getClanLosses(s.clans),
    }))
  }, [index])

  const handleSeasonClick = (season: string, hasClanData: boolean) => {
    if (!hasClanData) return
    setHighlightedSeason(season)
    navigate(`/history/${season}`)
  }

  if (error) {
    return <ErrorState message={t(error, { defaultValue: error })} />
  }

  if (!index) {
    return <HistoryPageSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative rounded-2xl border border-border/80 bg-linear-to-br from-primary/10 via-card to-card/70 p-8 overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <Crown size={32} weight="fill" className="text-primary animate-pulse-glow" />
            <h1 className="text-4xl font-bold tracking-tight">{t('history.title')}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">{t('history.subtitle')}</p>
          {seasonParam && (
            <Badge variant="secondary" className="gap-2">
              <Info size={16} />
              {t('history.season_label', { defaultValue: 'Viewing Season' })}: {seasonParam}
            </Badge>
          )}
        </div>
      </section>

      {/* Key Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
          <Card className="card-hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Trophy size={24} weight="fill" className="text-yellow-400" />
                <Badge variant="outline" className="text-xs">{t('history.legacy.seasons_completed')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stats.totalSeasons}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('history.unique_clans', { count: stats.uniqueClans })}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Flame size={24} weight="fill" className="text-orange-400" />
                <Badge variant="outline" className="text-xs">{t('history.legacy.total_stars_all_time')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stats.totalStars}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('history.avg_stars_per_season', { value: stats.avgStarsPerSeason.toFixed(1) })}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Target size={24} weight="fill" className="text-green-400" />
                <Badge variant="outline" className="text-xs">{t('history.legacy.best_season_stars')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stats.bestSeasonStars}</div>
              <p className="text-sm text-muted-foreground mt-1">Peak performance</p>
            </CardContent>
          </Card>

          <Card className="card-hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Medal size={24} weight="fill" className="text-blue-400" />
                <Badge variant="outline" className="text-xs">Win Rate</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stats.winRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.totalWins}W - {stats.totalLosses}L
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stars Timeline */}
      <Card className="animate-fade-in-up stagger-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartLine size={24} className="text-primary" />
            <div>
              <CardTitle>{t('history.stars_performance_title', { defaultValue: 'Stars Performance Over Time' })}</CardTitle>
              <CardDescription>{t('history.stars_performance_description', { defaultValue: 'Total stars earned per season across all clans' })}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="starsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="season"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickMargin={8}
                  style={{ fontSize: '12px' }}
                  stroke={AXIS_COLOR}
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                />
                <YAxis style={{ fontSize: '12px' }} stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value ?? 0} stars`, 'Total']}
                />
                <Area
                  type="monotone"
                  dataKey="stars"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#starsGradient)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Win/Loss Trend */}
        <Card className="animate-fade-in-up stagger-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Medal size={24} className="text-primary" />
              <div>
                <CardTitle>{t('history.win_loss_title', { defaultValue: 'Win/Loss Trend' })}</CardTitle>
                <CardDescription>{t('history.win_loss_description', { defaultValue: 'War victories and defeats over time' })}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {winLossData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={winLossData} margin={{ top: 10, right: 16, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke={GRID_COLOR} />
                    <XAxis
                      dataKey="season"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickMargin={8}
                      style={{ fontSize: '11px' }}
                      stroke={AXIS_COLOR}
                      tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} style={{ fontSize: '12px' }} stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="wins" fill={WIN_COLOR} radius={[4, 4, 0, 0]} name={t('history.wins')} />
                    <Bar dataKey="losses" fill={LOSS_COLOR} radius={[4, 4, 0, 0]} name={t('history.losses')} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t('history.no_win_loss_data', { defaultValue: 'No win/loss data available' })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clan Progression */}
        <Card className="animate-fade-in-up stagger-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendUp size={24} className="text-primary" />
              <div>
                <CardTitle>{t('history.clan_progression_title', { defaultValue: 'Clan League Progression' })}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="mr-2 text-xs">{t('history.position_best_badge', { defaultValue: '#1 = Best' })}</Badge>
                  {t('history.clan_progression_description', { defaultValue: 'Final group positions over time' })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {clanNames.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clanProgressionData} margin={{ top: 10, right: 16, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke={GRID_COLOR} />
                    <XAxis
                      dataKey="season"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickMargin={8}
                      style={{ fontSize: '11px' }}
                      stroke={AXIS_COLOR}
                      tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[8, 1]}
                      reversed
                      tickFormatter={(v) => `#${v}`}
                      style={{ fontSize: '12px' }}
                      stroke={AXIS_COLOR}
                      tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => {
                        if (value == null) return ['-', '']
                        return [`#${value as number}`, '']
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    {clanNames.map((name, idx) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={CLAN_COLORS[idx % CLAN_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No progression data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* League Distribution */}
        <Card className="animate-fade-in-up stagger-5 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy size={24} className="text-primary" />
              <div>
                <CardTitle>{t('history.league_distribution_title', { defaultValue: 'League Distribution' })}</CardTitle>
                <CardDescription>{t('history.league_distribution_description', { defaultValue: 'Total seasons participated in each league tier' })}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {leagueDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leagueDistribution} margin={{ top: 10, right: 16, left: 0, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke={GRID_COLOR} />
                    <XAxis
                      dataKey="league"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tickMargin={8}
                      style={{ fontSize: '11px' }}
                      stroke={AXIS_COLOR}
                      tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} style={{ fontSize: '12px' }} stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value ?? 0} seasons`, 'Count']}
                    />
                    <Bar
                      dataKey="count"
                      fill="#6366f1"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No league data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Season List */}
      <Card className="animate-fade-in-up stagger-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarBlank size={24} className="text-primary" />
            <div>
              <CardTitle>{t('history.all_seasons_title', { defaultValue: 'All Seasons' })}</CardTitle>
              <CardDescription>
                {t('history.season_card_hint', { count: index.seasons.length, defaultValue: 'Click any season card to highlight it. {{count}} total seasons recorded.' })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {index.seasons.map((season) => {
              const totalStars = getClanStars(season.clans)
              const clanCount = season.clans?.length || 0
              const hasClanData = clanCount > 0
              const isHighlighted = highlightedSeason === season.season
              return (
                <button
                  key={season.season}
                  type="button"
                  data-season={season.season}
                  onClick={() => handleSeasonClick(season.season, hasClanData)}
                  disabled={!hasClanData}
                  aria-disabled={!hasClanData ? 'true' : undefined}
                  aria-pressed={isHighlighted ? 'true' : 'false'}
                  aria-describedby={!hasClanData ? `no-data-${season.season}` : undefined}
                  title={!hasClanData ? t('history.no_clan_data_tooltip', { defaultValue: 'No clan data available for this season' }) : undefined}
                  className={`text-left p-5 rounded-xl border-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${!hasClanData
                    ? 'opacity-50 cursor-not-allowed bg-card/50'
                    : 'card-hover-lift cursor-pointer'
                    } ${isHighlighted
                      ? 'border-primary bg-primary/15 ring-2 ring-primary/30 shadow-md'
                      : 'border-border bg-card hover:bg-accent/80 hover:border-primary/40'
                    }`}
                  aria-label={t('history.view_season_aria', { season: season.season, defaultValue: `Select ${season.season} season` })}
                >
                  {!hasClanData && (
                    <span id={`no-data-${season.season}`} className="sr-only">
                      {t('history.no_clan_data_tooltip', { defaultValue: 'No clan data available for this season' })}
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-base font-bold text-foreground">{season.season}</div>
                    {hasClanData && <ArrowRight size={20} weight="bold" className="text-foreground/70" aria-hidden="true" />}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70 font-medium">{t('history.total_stars', { defaultValue: 'Total Stars' })}:</span>
                      <span className="font-bold text-primary text-base">{totalStars}</span>
                    </div>
                    {season.league && (
                      <div className="flex items-center justify-between">
                        <span className="text-foreground/70 font-medium">{t('history.league', { defaultValue: 'League' })}:</span>
                        <span className="font-semibold text-foreground">{season.league.tier}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70 font-medium">{t('history.clans', { defaultValue: 'Clans' })}:</span>
                      <span className="font-semibold text-foreground">{clanCount}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
