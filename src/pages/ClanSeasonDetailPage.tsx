import { CWLGroupStandings } from '@/components/CWLGroupStandings'
import { LeagueBadge } from '@/components/LeagueBadge'
import { MVPBadge } from '@/components/MVPBadge'
import { RosterStatsTable } from '@/components/RosterStatsTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WarsTable } from '@/components/WarsTable'
import { getSeasonClanDetail } from '@/lib/data'
import type { SeasonClanDetail, SeasonWar } from '@/lib/types'
import { ArrowLeft, Sword, Trophy, Users } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

export function ClanSeasonDetailPage() {
  const { t } = useTranslation()
  const { season, tag } = useParams<{ season: string; tag: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<SeasonClanDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!season || !tag) return

    const currentSeason = season
    const currentTag = tag

    async function loadData() {
      setLoading(true)
      try {
        // Decode the URL parameter and add # prefix if missing
        const decodedTag = decodeURIComponent(currentTag)
        const normalizedTag = decodedTag.startsWith('#') ? decodedTag : `#${decodedTag}`

        const result = await getSeasonClanDetail(currentSeason, normalizedTag)
        setData(result)
      } catch (err) {
        console.error('Failed to load clan season detail:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [season, tag])

  // Calculate MVP (player with highest stars)
  // Must be before early returns to maintain hook order
  const mvp = useMemo(() => {
    if (!data?.roster || data.roster.length === 0) return null
    return data.roster.reduce((best, player) =>
      player.stars > best.stars ? player : best
      , data.roster[0])
  }, [data?.roster])

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/history')}>
          <ArrowLeft className="mr-2" size={16} />
          {t('clan.back')}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {t('clan.loading')}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/history')}>
          <ArrowLeft className="mr-2" size={16} />
          {t('clan.back')}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {t('history.no_data')}
        </div>
      </div>
    )
  }

  const winRate = data.stats.warsPlayed > 0
    ? ((data.stats.warsWon / data.stats.warsPlayed) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/history')}>
          <ArrowLeft className="mr-2" size={16} />
          {t('clanSeason.backToHistory')}
        </Button>
      </div>

      {/* Title & League Info */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{data.clan.name}</h1>
          <p className="text-lg text-muted-foreground">
            {t('clanSeason.seasonLabel')}: {data.season}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LeagueBadge league={data.league} groupPosition={data.groupPosition} />
          <Badge variant="secondary">
            {t('history.state_ended')}
          </Badge>
          {mvp && (
            <MVPBadge
              playerName={mvp.name}
              playerTag={mvp.tag}
              stars={mvp.stars}
            />
          )}
        </div>
      </div>

      {/* CWL Group Standings */}
      {data.cwlGroup && data.cwlGroup.length > 0 && (
        <CWLGroupStandings cwlGroup={data.cwlGroup} />
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sword size={16} className="text-primary" />
            <p className="text-sm text-muted-foreground">{t('clanSeason.warsPlayed')}</p>
          </div>
          <p className="text-2xl font-bold">{data.stats.warsPlayed}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <p className="text-sm text-muted-foreground mb-1">{t('clanSeason.record')}</p>
          <p className="text-2xl font-bold">
            {data.stats.warsWon}-{data.stats.warsLost}-{data.stats.warsTied}
          </p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <p className="text-sm text-muted-foreground mb-1">{t('clanSeason.winRate')}</p>
          <p className="text-2xl font-bold text-primary">{winRate}%</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-yellow-400" />
            <p className="text-sm text-muted-foreground">{t('standings.stars')}</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{data.stats.stars}</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <p className="text-sm text-muted-foreground mb-1">{t('standings.destruction')}</p>
          <p className="text-2xl font-bold">{data.stats.destruction.toFixed(1)}%</p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('standings.attacks')}</p>
          </div>
          <p className="text-2xl font-bold">{data.stats.attacks}</p>
        </div>
      </div>

      {/* Wars Table */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">{t('clanSeason.warsTitle')}</h2>
        <WarsTable
          wars={data.wars}
          onWarClick={(war: SeasonWar) => {
            // Use endTime as unique identifier, encode for URL safety
            const warEndTime = encodeURIComponent(war.endTime.replace(/[:.]/g, ''))
            navigate(`/history/${season}/clan/${tag}/war/${warEndTime}`)
          }}
        />
      </div>

      {/* Roster Table */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">
          {t('clanSeason.rosterTitle')}
        </h2>
        <RosterStatsTable
          roster={data.roster}
          leagueTier={data.league?.tier}
        />
      </div>
    </div>
  )
}
