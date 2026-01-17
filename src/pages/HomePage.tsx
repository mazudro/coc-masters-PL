import { ClanCard } from '@/components/ClanCard'
import { FamilyStatsCard } from '@/components/FamilyStatsCard'
import { KeyMetricsGrid } from '@/components/KeyMetricsGrid'
import { StandingsTable } from '@/components/StandingsTable'
import { TopPerformersCard } from '@/components/TopPerformersCard'
import { WarStatus } from '@/components/WarStatus'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FAMILY_CLAN_TAGS, getClanDetail, getFamilyData, getFamilyStats, getLatestSeasonId, getSeasonClanDetail } from '@/lib/data'
import type { ClanDetail, FamilyData, FamilyStats, Player, SeasonClanDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CircleNotch, MagnifyingGlass, Star, Sword, Trophy, Users } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Loading skeleton components
function HomePageSkeleton() {
  return (
    <div className="space-y-12 animate-fade-in">
      {/* War Status skeleton */}
      <section className="flex justify-center">
        <Skeleton className="h-12 w-64 rounded-xl skeleton-shimmer" />
      </section>

      {/* Total Stars skeleton */}
      <section className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full skeleton-shimmer" />
          <Skeleton className="h-16 w-32 skeleton-shimmer" />
        </div>
        <Skeleton className="h-6 w-48 mx-auto skeleton-shimmer" />
      </section>

      {/* Family Stats skeleton */}
      <section>
        <Skeleton className="h-48 w-full rounded-2xl skeleton-shimmer" />
      </section>

      {/* Key Metrics skeleton */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl skeleton-shimmer" />
        ))}
      </section>

      {/* Top Performers skeleton */}
      <section>
        <Skeleton className="h-64 w-full rounded-2xl skeleton-shimmer" />
      </section>

      {/* MVPs skeleton */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-10 w-48 mx-auto skeleton-shimmer" />
          <Skeleton className="h-5 w-64 mx-auto skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </section>

      {/* Standings skeleton */}
      <section className="space-y-6">
        <Skeleton className="h-8 w-64 skeleton-shimmer" />
        <Skeleton className="h-10 w-80 rounded-lg skeleton-shimmer" />
        <Skeleton className="h-96 w-full rounded-2xl skeleton-shimmer" />
      </section>

      {/* Clan Cards skeleton */}
      <section className="space-y-6">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </section>
    </div>
  )
}

interface HomePageProps {
  onNavigateToClan: (clanTag: string) => void
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

export function HomePage({ onNavigateToClan }: HomePageProps) {
  const [familyData, setFamilyData] = useState<FamilyData | null>(null)
  const [familyStats, setFamilyStats] = useState<FamilyStats | null>(null)
  const [clanDetailsMap, setClanDetailsMap] = useState<Map<string, ClanDetail>>(new Map())
  const [seasonClanDetailsMap, setSeasonClanDetailsMap] = useState<Map<string, SeasonClanDetail>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filterQuery, setFilterQuery] = useState('')
  const { t } = useTranslation()

  // Load family data, family stats, and all clan details
  useEffect(() => {
    async function loadData() {
      try {
        const [family, stats, seasonId] = await Promise.all([
          getFamilyData(),
          getFamilyStats(),
          getLatestSeasonId()
        ])
        setFamilyData(family)
        setFamilyStats(stats)

        // Load all clan details in parallel (all-time data)
        const clanPromises = FAMILY_CLAN_TAGS.map(tag => getClanDetail(`#${tag}`))
        const clanDetails = await Promise.all(clanPromises)

        const detailsMap = new Map()
        FAMILY_CLAN_TAGS.forEach((tag, index) => {
          if (clanDetails[index]) {
            detailsMap.set(tag, clanDetails[index])
          }
        })
        setClanDetailsMap(detailsMap)

        // Load latest season clan details for MVP (season-specific data)
        if (seasonId) {
          const seasonClanPromises = FAMILY_CLAN_TAGS.map(tag => getSeasonClanDetail(seasonId, `#${tag}`))
          const seasonClanDetails = await Promise.all(seasonClanPromises)

          const seasonDetailsMap = new Map<string, SeasonClanDetail>()
          FAMILY_CLAN_TAGS.forEach((tag, index) => {
            if (seasonClanDetails[index]) {
              seasonDetailsMap.set(tag, seasonClanDetails[index]!)
            }
          })
          setSeasonClanDetailsMap(seasonDetailsMap)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate top 3 MVPs across all clans from loaded clan details
  const topMVPs = useMemo(() => {
    if (!familyData || clanDetailsMap.size === 0) return []

    interface PlayerWithClan extends Player {
      clanName: string
    }
    const allPlayers: PlayerWithClan[] = []

    familyData.clans.forEach(clan => {
      const cleanTag = clan.tag.replace('#', '')
      const clanDetail = clanDetailsMap.get(cleanTag)

      if (clanDetail && clanDetail.players && Array.isArray(clanDetail.players)) {
        clanDetail.players.forEach((player: Player) => {
          allPlayers.push({
            ...player,
            clanName: clan.name
          })
        })
      }
    })

    return allPlayers
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 3)
  }, [familyData, clanDetailsMap])

  // Calculate top 3 by different categories
  const topPerformersData = useMemo(() => {
    if (!familyData || clanDetailsMap.size === 0) return { topByStars: [], topByWars: [], topByDestruction: [] }

    interface PlayerWithClan extends Player {
      clanName: string
    }
    const allPlayers: PlayerWithClan[] = []

    familyData.clans.forEach(clan => {
      const cleanTag = clan.tag.replace('#', '')
      const clanDetail = clanDetailsMap.get(cleanTag)

      if (clanDetail && clanDetail.players && Array.isArray(clanDetail.players)) {
        clanDetail.players.forEach((player: Player) => {
          allPlayers.push({
            ...player,
            clanName: clan.name
          })
        })
      }
    })

    return {
      topByStars: allPlayers.sort((a, b) => b.stars - a.stars).slice(0, 3),
      topByWars: allPlayers.sort((a, b) => b.wars - a.wars).slice(0, 3),
      topByDestruction: allPlayers
        .filter(p => p.attacks > 0)
        .sort((a, b) => {
          const aDestruction = (a.stars / a.attacks) * 33.33
          const bDestruction = (b.stars / b.attacks) * 33.33
          return bDestruction - aDestruction
        })
        .slice(0, 3)
    }
  }, [familyData, clanDetailsMap])

  if (loading) {
    return <HomePageSkeleton />
  }

  if (!familyData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
        <CircleNotch size={48} className="text-muted-foreground animate-spin-slow" />
        <p className="text-muted-foreground">{t('home.error')}</p>
      </div>
    )
  }

  const displayedTotalStars = familyStats
    ? (familyStats.totalStars ?? 0).toLocaleString()
    : (familyData.totalStars ?? 0).toLocaleString()

  const topPlayerStars = topMVPs.length > 0 ? topMVPs[0].stars : 0

  const sortedClans = [...familyData.clans].sort((a, b) => b.stars - a.stars)

  // Filter clans based on search query and enrich with player data for reliability
  const filteredClans = sortedClans
    .filter(clan => {
      if (!filterQuery.trim()) return true
      const query = filterQuery.toLowerCase()
      return (
        clan.name.toLowerCase().includes(query) ||
        clan.tag.toLowerCase().includes(query)
      )
    })
    .map(clan => {
      // Enrich clan summary with players from clan details
      const cleanTag = clan.tag.replace('#', '')
      const clanDetail = clanDetailsMap.get(cleanTag)
      const seasonClanDetail = seasonClanDetailsMap.get(cleanTag)
      return {
        ...clan,
        players: clanDetail?.players,
        seasonRoster: seasonClanDetail?.roster
      }
    })

  return (
    <div className="space-y-12">
      {/* Hero Banner Section */}
      <section className="relative rounded-2xl border border-border/80 bg-linear-to-br from-primary/20 via-card to-card/70 p-8 md:p-12 overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="absolute top-4 right-4 opacity-20">
          <Sword size={120} weight="fill" className="text-primary" />
        </div>
        <div className="relative space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <Trophy size={40} weight="fill" className="text-yellow-400" />
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                {t('nav.title')}
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              {t('home.hero_subtitle')}
            </p>
          </div>

          {/* Quick Stats in Hero */}
          {familyData && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
                <Star size={24} weight="fill" className="text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{displayedTotalStars}</p>
                  <p className="text-sm text-muted-foreground">{t('home.hero.total_stars')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
                <Users size={24} weight="fill" className="text-blue-400" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{familyData.clans.length}</p>
                  <p className="text-sm text-muted-foreground">{t('home.hero.active_clans')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm col-span-2 md:col-span-1">
                <Trophy size={24} weight="fill" className="text-green-400" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{topPlayerStars}</p>
                  <p className="text-sm text-muted-foreground">{t('home.hero.top_performance')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* War Status Section */}
      <section className="flex justify-center animate-fade-in-up stagger-1">
        <WarStatus generatedAt={familyData.generatedAt} variant="compact" />
      </section>

      {/* Family Statistics Summary */}
      {familyStats && (
        <section className="animate-fade-in-up stagger-2">
          <FamilyStatsCard stats={familyStats} />
        </section>
      )}

      {/* Key Metrics Dashboard */}
      {familyStats && (
        <section className="animate-fade-in-up stagger-3">
          <KeyMetricsGrid stats={familyStats} />
        </section>
      )}

      {/* Top Performers by Category */}
      {(topPerformersData.topByStars.length > 0 || topPerformersData.topByWars.length > 0 || topPerformersData.topByDestruction.length > 0) && (
        <section className="animate-fade-in-up stagger-4">
          <TopPerformersCard
            topByStars={topPerformersData.topByStars}
            topByWars={topPerformersData.topByWars}
            topByDestruction={topPerformersData.topByDestruction}
          />
        </section>
      )}

      {/* Top 3 Family MVPs Section */}
      {topMVPs.length > 0 && (
        <section className="space-y-6 animate-fade-in-up stagger-5">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Trophy size={32} weight="fill" className="text-yellow-400" />
              <h2 className="text-3xl font-bold tracking-tight">{t('home.top_mvps')}</h2>
            </div>
            <p className="text-muted-foreground">{t('home.top_mvps_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {topMVPs.map((mvp, index) => {
              const position = (index + 1) as 1 | 2 | 3

              return (
                <div
                  key={mvp.tag}
                  className={cn(
                    'relative rounded-lg border p-6 transition-all card-hover-lift',
                    'bg-linear-to-br animate-scale-in',
                    PODIUM_COLORS[position]
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-linear-to-br from-background to-card border-2 border-border flex items-center justify-center">
                    <span className={cn(
                      'text-xl font-bold',
                      PODIUM_TEXT_COLORS[position]
                    )}>
                      {position}
                    </span>
                  </div>
                  <div className="flex flex-col items-center space-y-3 text-center">
                    <Trophy
                      size={40}
                      weight="fill"
                      className={PODIUM_TEXT_COLORS[position]}
                    />
                    <div>
                      <h3 className="text-lg font-bold">{mvp.name}</h3>
                      <p className="text-sm text-muted-foreground">{mvp.clanName}</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        'text-4xl font-bold tabular-nums',
                        PODIUM_TEXT_COLORS[position]
                      )}>
                        {mvp.stars}
                      </span>
                      <Star size={24} weight="fill" className={PODIUM_TEXT_COLORS[position]} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="space-y-6 animate-fade-in-up stagger-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">{t('home.family_standings_title')}</h2>
          <p className="text-muted-foreground">{t('home.family_standings_subtitle')}</p>
        </div>

        {/* Filter Input */}
        <div className="relative max-w-md">
          <MagnifyingGlass
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder={t('home.filter_placeholder')}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <StandingsTable clans={filteredClans} onClanClick={onNavigateToClan} />

        {filteredClans.length === 0 && filterQuery && (
          <p className="text-center text-muted-foreground py-8">
            {t('home.no_results', { query: filterQuery })}
          </p>
        )}
      </section>

      <section className="space-y-6 animate-fade-in-up stagger-7">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">{t('home.clan_overview_title')}</h2>
          <p className="text-muted-foreground">{t('home.clan_overview_subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClans.map((clan, index) => (
            <div
              key={clan.tag}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ClanCard
                clan={clan}
                seasonRoster={clan.seasonRoster}
                onViewDetails={() => onNavigateToClan(clan.tag)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
