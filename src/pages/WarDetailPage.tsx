import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getWarTimeline } from '@/lib/data'
import type { WarMemberSummary, WarTimeline } from '@/lib/types'
import {
  ArrowLeft,
  Clock,
  Download,
  Funnel,
  Shield,
  Star,
  Sword,
  Target,
  Trophy,
  Users,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

// Filter types
interface TimelineFilters {
  minStars: number | null
  attackerTH: number | null
  side: 'all' | 'clan' | 'opponent'
}

export function WarDetailPage() {
  const { t } = useTranslation()
  const { season, tag, endTime } = useParams<{ season: string; tag: string; endTime: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<WarTimeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'timeline' | 'clan' | 'opponent'>('timeline')
  const [filters, setFilters] = useState<TimelineFilters>({
    minStars: null,
    attackerTH: null,
    side: 'all',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!season || !tag || !endTime) return

    async function loadData() {
      setLoading(true)
      try {
        const decodedTag = decodeURIComponent(tag!)
        const normalizedTag = decodedTag.startsWith('#') ? decodedTag : `#${decodedTag}`
        // Restore the dots in endTime for lookup
        const decodedEndTime = decodeURIComponent(endTime!)

        const result = await getWarTimeline(season!, normalizedTag, decodedEndTime)
        setData(result)
      } catch (err) {
        console.error('Failed to load war timeline:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [season, tag, endTime])

  const handleBack = () => {
    if (season && tag) {
      navigate(`/history/${season}/clan/${tag}`)
    } else {
      navigate('/history')
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getResultBadge = (result: string) => {
    const normalized = result.toLowerCase()
    if (normalized === 'win') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-lg px-4 py-1">{t('warDetail.resultWin')}</Badge>
    }
    if (normalized === 'loss') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-lg px-4 py-1">{t('warDetail.resultLoss')}</Badge>
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-lg px-4 py-1">{t('warDetail.resultTie')}</Badge>
  }

  const getStarDisplay = (stars: number) => {
    return (
      <span className="text-yellow-400">
        {'★'.repeat(stars)}
        <span className="text-muted-foreground/30">{'★'.repeat(3 - stars)}</span>
      </span>
    )
  }

  // Calculate MVP from clan members
  const mvp = useMemo(() => {
    if (!data?.clan.members) return null
    return data.clan.members.reduce((best, player) =>
      player.stars > best.stars ? player : best
      , data.clan.members[0])
  }, [data?.clan.members])

  // Get unique TH levels for filter dropdown
  const availableTHs = useMemo(() => {
    if (!data?.attackTimeline) return []
    const ths = new Set<number>()
    data.attackTimeline.forEach(a => {
      ths.add(a.attackerTH)
    })
    return Array.from(ths).sort((a, b) => b - a)
  }, [data?.attackTimeline])

  // Filter timeline attacks
  const filteredTimeline = useMemo(() => {
    if (!data?.attackTimeline) return []
    return data.attackTimeline.filter(attack => {
      if (filters.minStars !== null && attack.stars < filters.minStars) return false
      if (filters.attackerTH !== null && attack.attackerTH !== filters.attackerTH) return false
      if (filters.side !== 'all' && attack.side !== filters.side) return false
      return true
    })
  }, [data?.attackTimeline, filters])

  // Export war poster as PNG using iframe to isolate from oklch() CSS
  const handleExport = useCallback(async () => {
    if (!data) return

    setExporting(true)
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default

      // Create an iframe to isolate from page CSS (avoids oklch() color parsing issues)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.left = '-9999px'
      iframe.style.top = '0'
      iframe.style.width = '900px'
      iframe.style.height = '1200px'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) throw new Error('Failed to access iframe document')

      // Build poster HTML with all colors in hex/rgb (no oklch)
      const resultColor = data.result === 'win' ? '#22c55e' : data.result === 'loss' ? '#ef4444' : '#eab308'
      const resultText = data.result === 'win' ? t('warDetail.resultWin') : data.result === 'loss' ? t('warDetail.resultLoss') : t('warDetail.resultTie')

      const posterHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              background: #0a0a0f; 
              font-family: system-ui, -apple-system, sans-serif; 
              color: #ffffff;
              padding: 32px;
            }
          </style>
        </head>
        <body>
          <div id="poster" style="width: 800px; background: #0a0a0f; padding: 32px; border-radius: 16px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: #a855f7;">CWL WAR REPORT</h1>
              <p style="color: #888888; font-size: 14px; margin: 0;">Season ${data.season}</p>
            </div>
            
            <!-- Main matchup -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 24px; background: linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 100%); border-radius: 12px; border: 1px solid rgba(168,85,247,0.2);">
              <div style="text-align: center; flex: 1;">
                <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #a855f7;">${data.clan.name}</h2>
                <div style="font-size: 48px; font-weight: bold; color: #a855f7;">${data.clan.stars}</div>
                <div style="color: #888888; font-size: 14px;">${data.clan.destructionPercentage.toFixed(1)}%</div>
              </div>
              <div style="text-align: center; padding: 0 24px;">
                <div style="font-size: 14px; color: ${resultColor}; font-weight: bold; padding: 4px 16px; background: ${resultColor}20; border-radius: 8px; border: 1px solid ${resultColor}40;">${resultText}</div>
                <div style="margin-top: 8px; color: #666666; font-size: 12px;">${data.teamSize}v${data.teamSize}</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #888888;">${data.opponent.name}</h2>
                <div style="font-size: 48px; font-weight: bold; color: #888888;">${data.opponent.stars}</div>
                <div style="color: #888888; font-size: 14px;">${data.opponent.destructionPercentage.toFixed(1)}%</div>
              </div>
            </div>
            
            <!-- Stats -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
              <div style="flex: 1; text-align: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="color: #888888; font-size: 12px; margin-bottom: 4px;">${t('warDetail.attacks')}</div>
                <div style="font-weight: bold; color: #ffffff;">${data.clan.attacks}/${data.teamSize}</div>
              </div>
              <div style="flex: 1; text-align: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="color: #888888; font-size: 12px; margin-bottom: 4px;">${t('warDetail.defenses')}</div>
                <div style="font-weight: bold; color: #ffffff;">${data.opponent.attacks}/${data.teamSize}</div>
              </div>
              <div style="flex: 1; text-align: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="color: #888888; font-size: 12px; margin-bottom: 4px;">MVP</div>
                <div style="font-weight: bold; color: #eab308;">${mvp?.name || '-'}</div>
              </div>
              <div style="flex: 1; text-align: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="color: #888888; font-size: 12px; margin-bottom: 4px;">3★ ${t('warDetail.attacks')}</div>
                <div style="font-weight: bold; color: #22c55e;">${data.attackTimeline.filter(a => a.side === 'clan' && a.stars === 3).length}</div>
              </div>
            </div>
            
            <!-- Clan Member Attacks -->
            <div style="margin-bottom: 16px;">
              <h3 style="font-size: 14px; color: #888888; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">${t('warDetail.clanAttacks')}</h3>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                ${data.clan.members
          .sort((a, b) => a.mapPosition - b.mapPosition)
          .map(m => {
            const attack = m.attacks?.[0]
            const starColor = attack ? (attack.stars === 3 ? '#22c55e' : attack.stars >= 2 ? '#eab308' : '#ef4444') : '#666666'
            return `
                    <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(168,85,247,0.03); border-radius: 4px; font-size: 12px;">
                      <span style="color: #666666; width: 20px; text-align: right;">#${m.mapPosition}</span>
                      <span style="color: #3b82f6; font-weight: 600; width: 32px;">TH${m.townhallLevel}</span>
                      <span style="color: #a855f7; font-weight: 500; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</span>
                      ${attack ? `
                        <span style="color: #666666;">→</span>
                        <span style="color: ${starColor}; font-weight: 600;">${'★'.repeat(attack.stars)}${'☆'.repeat(3 - attack.stars)}</span>
                        <span style="color: #888888; width: 36px; text-align: right;">${attack.destructionPercentage}%</span>
                      ` : `
                        <span style="color: #ef4444; font-style: italic;">No attack</span>
                      `}
                    </div>
                  `
          }).join('')}
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #666666; font-size: 12px; margin: 0;">CoC Masters PL • coc-masters-pl.vercel.app</p>
            </div>
          </div>
        </body>
        </html>
      `

      iframeDoc.open()
      iframeDoc.write(posterHTML)
      iframeDoc.close()

      // Wait for iframe to render
      await new Promise(resolve => setTimeout(resolve, 100))

      const posterElement = iframeDoc.getElementById('poster')
      if (!posterElement) throw new Error('Poster element not found')

      // Render to canvas
      const canvas = await html2canvas(posterElement, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      // Remove iframe
      document.body.removeChild(iframe)

      // Download
      const link = document.createElement('a')
      link.download = `war-${data.clan.name.replace(/[^a-zA-Z0-9]/g, '-')}-vs-${data.opponent.name.replace(/[^a-zA-Z0-9]/g, '-')}-${data.season}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Failed to export poster:', err)
    } finally {
      setExporting(false)
    }
  }, [data, mvp, t])

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2" size={16} />
          {t('warDetail.back')}
        </Button>

        {/* Hero skeleton */}
        <div className="rounded-2xl border border-border/80 bg-card/70 p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>

          <div className="grid grid-cols-3 gap-4 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-12 w-16 mx-auto" />
                <Skeleton className="h-4 w-12 mx-auto" />
                <Skeleton className="h-6 w-16 mx-auto" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-lg border border-border/50 bg-background/30 p-3">
                <Skeleton className="h-4 w-20 mx-auto mb-2" />
                <Skeleton className="h-6 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <div className="rounded-lg border border-border/80 bg-card/50 p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-4" style={{ animationDelay: `${i * 50}ms` }}>
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-5 w-6" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2" size={16} />
          {t('warDetail.back')}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {t('warDetail.noData')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} className="transition-transform hover:translate-x-[-4px]">
          <ArrowLeft className="mr-2" size={16} />
          {t('warDetail.back')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="transition-all hover:bg-primary hover:text-primary-foreground"
        >
          <Download size={16} className={`mr-2 ${exporting ? 'animate-bounce' : ''}`} />
          {exporting ? t('warDetail.exporting') : t('warDetail.exportPoster')}
        </Button>
      </div>

      {/* War Summary Hero */}
      <div className="rounded-2xl border border-border/80 bg-card/70 p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">{data.clan.name}</h1>
            <p className="text-muted-foreground">vs {data.opponent.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('warDetail.seasonLabel')}: {data.season}</p>
          </div>
          <div className="animate-in zoom-in duration-500 delay-200">
            {getResultBadge(data.result)}
          </div>
        </div>

        {/* Score Comparison */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center animate-in slide-in-from-left duration-500 delay-100">
            <p className="text-4xl font-bold text-primary">{data.clan.stars}</p>
            <p className="text-sm text-muted-foreground">{t('warDetail.stars')}</p>
            <p className="text-lg font-semibold">{data.clan.destructionPercentage.toFixed(1)}%</p>
          </div>
          <div className="text-center flex flex-col items-center justify-center animate-in zoom-in duration-500 delay-200">
            <Sword size={32} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{data.teamSize}v{data.teamSize}</p>
          </div>
          <div className="text-center animate-in slide-in-from-right duration-500 delay-100">
            <p className="text-4xl font-bold text-muted-foreground">{data.opponent.stars}</p>
            <p className="text-sm text-muted-foreground">{t('warDetail.stars')}</p>
            <p className="text-lg font-semibold text-muted-foreground">{data.opponent.destructionPercentage.toFixed(1)}%</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Sword, iconClass: 'text-primary', label: t('warDetail.attacks'), value: `${data.clan.attacks} / ${data.teamSize}` },
            { icon: Shield, iconClass: 'text-muted-foreground', label: t('warDetail.defenses'), value: `${data.opponent.attacks} / ${data.teamSize}` },
            { icon: Trophy, iconClass: 'text-yellow-400', label: 'MVP', value: mvp?.name || '-' },
            { icon: Users, iconClass: 'text-muted-foreground', label: t('warDetail.teamSize'), value: data.teamSize },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border/50 bg-background/30 p-3 text-center transition-all hover:bg-background/50 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${300 + idx * 75}ms` }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <stat.icon size={16} className={stat.iconClass} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="font-bold truncate">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-2 animate-in fade-in duration-300 delay-300">
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          onClick={() => setViewMode('timeline')}
          size="sm"
          className="transition-all"
        >
          <Clock size={16} className="mr-2" />
          {t('warDetail.viewTimeline')}
        </Button>
        <Button
          variant={viewMode === 'clan' ? 'default' : 'outline'}
          onClick={() => setViewMode('clan')}
          size="sm"
          className="transition-all"
        >
          <Target size={16} className="mr-2" />
          {t('warDetail.viewClanAttacks')}
        </Button>
        <Button
          variant={viewMode === 'opponent' ? 'default' : 'outline'}
          onClick={() => setViewMode('opponent')}
          size="sm"
          className="transition-all"
        >
          <Shield size={16} className="mr-2" />
          {t('warDetail.viewDefenses')}
        </Button>

        {/* Filter toggle */}
        {viewMode === 'timeline' && (
          <Button
            variant={showFilters ? 'secondary' : 'ghost'}
            onClick={() => setShowFilters(!showFilters)}
            size="sm"
            className="ml-auto transition-all"
          >
            <Funnel size={16} className="mr-2" />
            {t('warDetail.filters')}
            {(filters.minStars !== null || filters.attackerTH !== null || filters.side !== 'all') && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {[filters.minStars !== null, filters.attackerTH !== null, filters.side !== 'all'].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {viewMode === 'timeline' && showFilters && (
        <div className="rounded-lg border border-border/80 bg-card/50 p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Min Stars Filter */}
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-400" />
              <span className="text-sm text-muted-foreground">{t('warDetail.filterMinStars')}:</span>
              <Select
                value={filters.minStars?.toString() ?? 'all'}
                onValueChange={(v) => setFilters(f => ({ ...f, minStars: v === 'all' ? null : Number(v) }))}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('warDetail.filterAll')}</SelectItem>
                  <SelectItem value="1">1+ ★</SelectItem>
                  <SelectItem value="2">2+ ★</SelectItem>
                  <SelectItem value="3">3 ★</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TH Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('warDetail.filterTH')}:</span>
              <Select
                value={filters.attackerTH?.toString() ?? 'all'}
                onValueChange={(v) => setFilters(f => ({ ...f, attackerTH: v === 'all' ? null : Number(v) }))}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('warDetail.filterAll')}</SelectItem>
                  {availableTHs.map(th => (
                    <SelectItem key={th} value={th.toString()}>TH{th}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Side Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('warDetail.filterSide')}:</span>
              <Select
                value={filters.side}
                onValueChange={(v) => setFilters(f => ({ ...f, side: v as 'all' | 'clan' | 'opponent' }))}
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('warDetail.filterAll')}</SelectItem>
                  <SelectItem value="clan">{t('warDetail.filterClanOnly')}</SelectItem>
                  <SelectItem value="opponent">{t('warDetail.filterOpponentOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(filters.minStars !== null || filters.attackerTH !== null || filters.side !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ minStars: null, attackerTH: null, side: 'all' })}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('warDetail.clearFilters')}
              </Button>
            )}
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground mt-3">
            {t('warDetail.showingAttacks', { count: filteredTimeline.length, total: data.attackTimeline.length })}
          </p>
        </div>
      )}

      {/* Attack Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold">{t('warDetail.attackTimeline')}</h2>
          <div className="rounded-lg border border-border/80 bg-card/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{t('warDetail.attacker')}</TableHead>
                  <TableHead className="text-center">{t('warDetail.vs')}</TableHead>
                  <TableHead>{t('warDetail.defender')}</TableHead>
                  <TableHead className="text-center">{t('warDetail.stars')}</TableHead>
                  <TableHead className="text-center">{t('warDetail.destruction')}</TableHead>
                  <TableHead className="text-center">{t('warDetail.duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimeline.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('warDetail.noMatchingAttacks')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTimeline.map((attack, idx) => (
                    <TableRow
                      key={`${attack.order}-${attack.attackerTag}`}
                      className={`border-border/30 transition-colors ${attack.side === 'clan' ? 'bg-primary/5 hover:bg-primary/10' : 'bg-red-500/5 hover:bg-red-500/10'} animate-in fade-in slide-in-from-left-2 duration-300`}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <TableCell className="font-mono text-muted-foreground">{attack.order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <THBadge level={attack.attackerTH} size="sm" />
                          <div>
                            <p className={`font-medium ${attack.side === 'clan' ? 'text-primary' : 'text-red-400'}`}>
                              {attack.attackerName}
                            </p>
                            <p className="text-xs text-muted-foreground">#{attack.attackerMapPosition}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">→</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <THBadge level={attack.defenderTH} size="sm" />
                          <div>
                            <p className={`font-medium ${attack.side === 'opponent' ? 'text-primary' : 'text-red-400'}`}>
                              {attack.defenderName}
                            </p>
                            <p className="text-xs text-muted-foreground">#{attack.defenderMapPosition}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStarDisplay(attack.stars)}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {attack.destructionPercentage}%
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {formatDuration(attack.duration)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Clan Member Attacks View */}
      {viewMode === 'clan' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold">{t('warDetail.clanAttacks')}</h2>
          <MemberAttacksTable members={data.clan.members} t={t} />
        </div>
      )}

      {/* Opponent Attacks / Defenses View */}
      {viewMode === 'opponent' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold">{t('warDetail.opponentAttacks')}</h2>
          <MemberAttacksTable members={data.opponent.members} t={t} />
        </div>
      )}
    </div>
  )
}

interface MemberAttacksTableProps {
  members: WarMemberSummary[]
  t: (key: string) => string
}

function MemberAttacksTable({ members, t }: MemberAttacksTableProps) {
  const getStarDisplay = (stars: number) => (
    <span className="text-yellow-400">
      {'★'.repeat(stars)}
      <span className="text-muted-foreground/30">{'★'.repeat(3 - stars)}</span>
    </span>
  )

  return (
    <div className="rounded-lg border border-border/80 bg-card/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="w-16">#</TableHead>
            <TableHead>{t('warDetail.player')}</TableHead>
            <TableHead className="text-center">{t('warDetail.attack')}</TableHead>
            <TableHead className="text-center">{t('warDetail.stars')}</TableHead>
            <TableHead className="text-center">{t('warDetail.destruction')}</TableHead>
            <TableHead className="text-center">{t('warDetail.defendedBy')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, idx) => (
            <TableRow
              key={member.tag}
              className="border-border/30 transition-colors hover:bg-muted/50 animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <TableCell className="font-mono text-muted-foreground">{member.mapPosition}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <THBadge level={member.townhallLevel} size="sm" />
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{member.tag}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {member.attacks.length > 0 ? (
                  <div className="space-y-1">
                    {member.attacks.map((attack, atkIdx) => (
                      <div key={atkIdx} className="text-sm">
                        <span className="text-muted-foreground">vs </span>
                        <span className="font-medium">{attack.defenderName}</span>
                        <span className="text-muted-foreground"> #{attack.defenderMapPosition}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{t('warDetail.noAttack')}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {member.attacks.length > 0 ? getStarDisplay(member.stars) : '-'}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {member.attacks.length > 0 ? `${member.destruction}%` : '-'}
              </TableCell>
              <TableCell className="text-center">
                {member.bestOpponentAttack ? (
                  <div className="text-sm">
                    <span className="font-medium">{member.bestOpponentAttack.attackerName}</span>
                    <div className="text-muted-foreground">
                      {getStarDisplay(member.bestOpponentAttack.stars)} {member.bestOpponentAttack.destructionPercentage}%
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
