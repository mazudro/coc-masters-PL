import { KpiBar } from '@/components/KpiBar'
import { MVPBadge } from '@/components/MVPBadge'
import { PlayerStarsTable } from '@/components/PlayerStarsTable'
import { ReliabilityBadge } from '@/components/ReliabilityBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WarStatus } from '@/components/WarStatus'
import { getClanDetail, getClanReliability, getFamilyData } from '@/lib/data'
import type { ClanDetail } from '@/lib/types'
import { ArrowLeft, CircleNotch } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

// Loading skeleton for clan page
function ClanPageSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft size={24} />
        </Button>
        <div className="flex-1">
          <Skeleton className="h-10 w-48 mb-2 skeleton-shimmer" />
          <Skeleton className="h-5 w-32 skeleton-shimmer" />
        </div>
        <Skeleton className="h-12 w-32 rounded-lg skeleton-shimmer" />
      </div>

      <Skeleton className="h-12 w-80 rounded-xl skeleton-shimmer" />

      {/* KPI Bar skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl skeleton-shimmer" />
        ))}
      </div>

      {/* Players table skeleton */}
      <section className="space-y-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2 skeleton-shimmer" />
          <Skeleton className="h-5 w-96 skeleton-shimmer" />
        </div>
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <div className="bg-muted/50 p-4">
            <div className="flex gap-4">
              <Skeleton className="h-6 w-32 skeleton-shimmer" />
              <Skeleton className="h-6 w-16 skeleton-shimmer" />
              <Skeleton className="h-6 w-20 skeleton-shimmer" />
              <Skeleton className="h-6 w-16 skeleton-shimmer" />
            </div>
          </div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-t border-border/50">
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-1 skeleton-shimmer" />
                <Skeleton className="h-4 w-24 skeleton-shimmer" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md skeleton-shimmer" />
              <Skeleton className="h-6 w-12 skeleton-shimmer" />
              <Skeleton className="h-6 w-16 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

interface ClanPageProps {
  onBack: () => void
}

export function ClanPage({ onBack }: ClanPageProps) {
  const { clanTag } = useParams<{ clanTag: string }>()
  const [clan, setClan] = useState<ClanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string>()
  const { t } = useTranslation()

  useEffect(() => {
    if (!clanTag) return
    setLoading(true)

    // Decode the URL parameter and add # prefix if missing
    const decodedTag = decodeURIComponent(clanTag)
    const normalizedTag = decodedTag.startsWith('#') ? decodedTag : `#${decodedTag}`

    Promise.all([
      getClanDetail(normalizedTag),
      getFamilyData()
    ]).then(([clanData, familyData]) => {
      setClan(clanData)
      setGeneratedAt(familyData.generatedAt)
      setLoading(false)
    })
  }, [clanTag])

  // Calculate MVP (player with highest stars)
  // Must be before early returns to maintain hook order
  const mvp = useMemo(() => {
    if (!clan?.players || clan.players.length === 0) return null
    return clan.players.reduce((best, player) =>
      player.stars > best.stars ? player : best
      , clan.players[0])
  }, [clan?.players])

  // Calculate clan reliability from player data
  const reliability = useMemo(() => {
    if (!clan?.players || clan.players.length === 0) return null
    return getClanReliability(clan.players)
  }, [clan?.players])

  if (loading) {
    return <ClanPageSkeleton onBack={onBack} />
  }

  if (!clan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-fade-in">
        <CircleNotch size={48} className="text-muted-foreground animate-spin-slow" />
        <p className="text-muted-foreground">{t('clan.not_found')}</p>
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ArrowLeft />
          {t('clan.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 animate-fade-in-up">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft size={24} />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight">{clan.name}</h1>
          <p className="text-lg text-muted-foreground font-mono">{clan.tag}</p>
        </div>
        <div className="flex items-center gap-3">
          {reliability && (
            <div className="flex flex-col items-end gap-1 animate-scale-in">
              <span className="text-xs text-muted-foreground">{t('clan.reliability')}</span>
              <ReliabilityBadge
                reliability={reliability.average}
                breakdown={reliability}
                size="md"
              />
            </div>
          )}
          {mvp && (
            <div className="animate-scale-in delay-100">
              <MVPBadge
                playerName={mvp.name}
                playerTag={mvp.tag}
                stars={mvp.stars}
              />
            </div>
          )}
        </div>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <WarStatus generatedAt={generatedAt} variant="expanded" />
      </div>

      <div className="animate-fade-in-up stagger-2">
        <KpiBar
          stars={clan.stars}
          rank={clan.rank}
          destruction={clan.destruction}
          attacks={clan.attacks}
          wars={clan.wars}
          warsWon={clan.warsWon}
          warsLost={clan.warsLost}
        />
      </div>

      <section className="space-y-4 animate-fade-in-up stagger-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">{t('clan.player_performance_title')}</h2>
          <p className="text-muted-foreground">{t('clan.player_performance_subtitle')}</p>
        </div>
        <PlayerStarsTable players={clan.players} />
      </section>
    </div>
  )
}
