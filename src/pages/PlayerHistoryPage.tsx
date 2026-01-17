import { PlayerSeasonChart } from '@/components/PlayerSeasonChart'
import { PlayerSeasonHistoryTable } from '@/components/PlayerSeasonHistoryTable'
import { StarBucketsChart } from '@/components/StarBucketsChart'
import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getPlayerHistory } from '@/lib/data'
import type { PlayerCareerStats } from '@/lib/types'
import { ArrowLeft, Star, Sword, Target, Trophy } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

// Loading skeleton for player history
function PlayerHistorySkeleton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2" size={16} />
        {t('playerHistory.back')}
      </Button>

      {/* Header skeleton */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-12 w-64 mb-2 skeleton-shimmer" />
          <Skeleton className="h-6 w-40 skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg skeleton-shimmer" />
          <Skeleton className="h-8 w-32 rounded-full skeleton-shimmer" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg skeleton-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      {/* Average stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-lg skeleton-shimmer" />
        <Skeleton className="h-32 rounded-lg skeleton-shimmer" />
      </div>

      {/* Chart skeleton */}
      <Skeleton className="h-80 rounded-2xl skeleton-shimmer" />

      {/* Table skeleton */}
      <Skeleton className="h-64 rounded-2xl skeleton-shimmer" />
    </div>
  )
}

export function PlayerHistoryPage() {
  const { t } = useTranslation()
  const { playerTag } = useParams<{ playerTag: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PlayerCareerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerTag) return

    async function loadData() {
      setLoading(true)
      try {
        const result = await getPlayerHistory(`#${playerTag}`)
        setData(result)
      } catch (err) {
        console.error('Failed to load player history:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [playerTag])

  if (loading) {
    return <PlayerHistorySkeleton onBack={() => navigate(-1)} />
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" size={16} />
          {t('clan.back')}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {t('playerHistory.noData')}
        </div>
      </div>
    )
  }

  const threeStarRate = data.totalAttacks > 0
    ? ((data.totalTriples / data.totalAttacks) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" size={16} />
          {t('playerHistory.back')}
        </Button>
      </div>

      {/* Title & Info */}
      <div className="space-y-4 animate-fade-in-up stagger-1">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{data.playerName}</h1>
          <p className="text-lg text-muted-foreground">
            {data.playerTag}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {data.currentTH && (
            <div className="animate-scale-in">
              <THBadge level={data.currentTH} size="lg" />
            </div>
          )}
          <Badge variant="outline" className="gap-2 px-3 py-1.5 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-muted-foreground">{t('playerHistory.seasonsPlayed')}:</span>
            <span className="font-bold">{data.seasons.length}</span>
          </Badge>
        </div>
      </div>

      {/* Career Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in-up stagger-2">
        <div className="rounded-lg border border-border/80 bg-card/70 p-4 card-hover-lift animate-scale-in delay-100">
          <div className="flex items-center gap-2 mb-1">
            <Sword size={16} className="text-primary" />
            <p className="text-sm text-muted-foreground">{t('playerHistory.totalWars')}</p>
          </div>
          <p className="text-2xl font-bold">{data.totalWars}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4 card-hover-lift animate-scale-in delay-150">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('playerHistory.totalAttacks')}</p>
          </div>
          <p className="text-2xl font-bold">{data.totalAttacks}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4 card-hover-lift animate-scale-in delay-200">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} weight="fill" className="text-yellow-400" />
            <p className="text-sm text-muted-foreground">{t('playerHistory.totalStars')}</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400 animate-pulse-glow">{data.totalStars}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4 card-hover-lift animate-scale-in delay-[250ms]">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} weight="fill" className="text-purple-400" />
            <p className="text-sm text-muted-foreground">{t('playerHistory.totalTriples')}</p>
          </div>
          <p className="text-2xl font-bold text-purple-400">{data.totalTriples}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4 card-hover-lift animate-scale-in delay-300">
          <p className="text-sm text-muted-foreground mb-1">{t('playerHistory.threeStarRate')}</p>
          <p className="text-2xl font-bold text-primary">{threeStarRate}%</p>
        </div>
      </div>

      {/* Average Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up stagger-3">
        <div className="rounded-lg border border-border/80 bg-card/70 p-6 card-hover-lift">
          <h3 className="text-lg font-semibold mb-2">{t('playerHistory.careerAvgStars')}</h3>
          <p className="text-4xl font-bold text-yellow-400 animate-pulse-glow">{data.careerAvgStars.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('playerHistory.perAttack')}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-6 card-hover-lift">
          <h3 className="text-lg font-semibold mb-2">{t('playerHistory.careerAvgDestruction')}</h3>
          <p className="text-4xl font-bold text-primary">{data.careerAvgDestruction.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground mt-1">{t('playerHistory.perAttack')}</p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="space-y-3 animate-fade-in-up stagger-4">
        <h2 className="text-2xl font-bold">{t('playerHistory.performanceTrend')}</h2>
        <div className="animate-scale-in">
          <PlayerSeasonChart seasons={data.seasons} />
        </div>
      </div>

      {/* Star Buckets Distribution Chart */}
      {data.seasons.length > 0 && (
        <div className="space-y-3 animate-fade-in-up stagger-5">
          <StarBucketsChart
            player={{
              name: data.playerName,
              tag: data.playerTag,
              th: data.currentTH || 0,
              wars: data.totalWars,
              attacks: data.totalAttacks,
              stars: data.totalStars,
              avgStars: data.careerAvgStars,
              starBuckets: {
                zeroStars: data.seasons.reduce((sum, s) => sum + s.zeroStars, 0),
                oneStars: data.seasons.reduce((sum, s) => sum + s.oneStars, 0),
                twoStars: data.seasons.reduce((sum, s) => sum + s.twoStars, 0),
                threeStars: data.totalTriples,
              },
            }}
          />
        </div>
      )}

      {/* Season by Season Table */}
      <div className="space-y-3 animate-fade-in-up stagger-6">
        <h2 className="text-2xl font-bold">{t('playerHistory.seasonHistory')}</h2>
        <PlayerSeasonHistoryTable seasons={data.seasons} />
      </div>
    </div>
  )
}
