import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { THBadge } from '@/components/THBadge'
import { LeagueAdjustmentTooltip } from '@/components/LeagueAdjustmentTooltip'
import { Lock, LockOpen, Users, Plus, X, Wrench } from '@phosphor-icons/react'
import { ATTACKS_PER_SEASON } from '@/lib/rosterCalculations'
import type { RosterPlayerStats, ManualPlayerEntry, RosterMode, CustomClan } from '@/lib/types'
import type { LeagueProjection } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface DroppableClanCardProps {
  clan: CustomClan
  isLocked: boolean
  count: number
  projectedStars: string
  avgTH: string
  avgReliability: string
  players: RosterPlayerStats[]
  manualPlayers: ManualPlayerEntry[]
  rosterMode: RosterMode
  maxCapacity: number
  numSubs: number
  onToggleLock: (clanTag: string) => void
  onToggleMode: (clanTag: string) => void
  onRemovePlayer: (playerTag: string, clanTag: string) => void
  onRemoveManualPlayer: (clanTag: string, addedAt: string) => void
  onAddManualPlayer: (clanTag: string) => void
  getProjection: (playerTag: string, league: string) => LeagueProjection | null
  prefetchPlayer: (player: RosterPlayerStats, league: string) => void
}

/**
 * Droppable clan card component for the roster builder
 * Uses @dnd-kit/core for drop zone functionality
 */
export function DroppableClanCard({
  clan,
  isLocked,
  count,
  projectedStars,
  avgTH,
  avgReliability,
  players,
  manualPlayers: clanManualPlayers,
  rosterMode,
  maxCapacity,
  numSubs,
  onToggleLock,
  onToggleMode,
  onRemovePlayer,
  onRemoveManualPlayer,
  onAddManualPlayer,
  getProjection,
  prefetchPlayer
}: DroppableClanCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { setNodeRef, isOver } = useDroppable({
    id: `clan-${clan.tag}`,
    disabled: isLocked,
    data: {
      type: 'clan',
      clanTag: clan.tag,
      minTH: clan.minTH,
      maxCapacity: maxCapacity + numSubs, // Include actual subs count
      currentCount: count
    }
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border p-4 transition-all duration-200",
        clan.borderColor,
        clan.bgColor,
        isLocked && "ring-2 ring-amber-500/50",
        isOver && "ring-4 ring-blue-500/50 bg-blue-500/10 scale-[1.02]"
      )}
    >
      {/* Clan Header */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src={clan.leagueIcon}
          alt={clan.league}
          className="w-6 h-6"
        />
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-bold truncate", clan.color)}>{clan.name}</h3>
          <p className="text-xs text-muted-foreground">{clan.league} • Min TH{clan.minTH}</p>
        </div>

        {/* Lock Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 shrink-0",
                isLocked ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onToggleLock(clan.tag)}
            >
              {isLocked ? <Lock size={14} /> : <LockOpen size={14} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
            <p className="text-xs font-semibold mb-1">{t('rosterBuilder.guide.lockRosterTitle')}</p>
            <p className="text-xs">{isLocked ? t('rosterBuilder.unlockRoster') : t('rosterBuilder.lockRoster')}</p>
            <p className="text-xs mt-1 text-muted-foreground">{t('rosterBuilder.guide.lockRosterShort')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Combined Mode Toggle & Capacity */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleMode(clan.tag)}
              className={cn(
                "gap-2 text-xs px-2 h-7 shrink-0",
                count >= maxCapacity ? "border-green-500/50 bg-green-500/10 hover:bg-green-500/20" : ""
              )}
            >
              <span className="flex items-center gap-1">
                <Users size={14} />
                {rosterMode}
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-sm text-[10px] font-bold flex items-center gap-1",
                count >= maxCapacity ? "bg-green-500/20 text-green-400" :
                  count > 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"
              )}>
                {count}/{maxCapacity}
                {numSubs > 0 && <span className="opacity-70">+{numSubs}</span>}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
            <p className="text-xs">{t('roster.toggle_mode')}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Clan Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div>
          <p className="text-muted-foreground text-xs">{t('rosterBuilder.projectedStars')}</p>
          <p className="font-bold text-yellow-400">{projectedStars}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t('rosterBuilder.avgTH')}</p>
          <p className="font-bold">{avgTH}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t('rosterBuilder.reliability')}</p>
          <p className="font-bold">{avgReliability}%</p>
        </div>
      </div>

      {/* Player List */}
      <div className="space-y-1">
        {count === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('rosterBuilder.noPlayersAssigned')}
          </p>
        ) : (
          <>
            {/* Database Players */}
            {players.map((p, index) => {
              const isSubstitute = index >= maxCapacity
              return (
                <div
                  key={p.playerTag}
                  className={cn(
                    "flex items-center gap-2 text-sm py-1 px-2 rounded group",
                    isSubstitute
                      ? "bg-amber-900/20 border border-dashed border-amber-500/30"
                      : "bg-background/40 hover:bg-background/60"
                  )}
                >
                  {isSubstitute && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] font-bold bg-amber-500/30 text-amber-300 px-1 rounded cursor-help">SUB</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                        <p className="text-xs font-semibold mb-1">{t('rosterBuilder.guide.subsTitle')}</p>
                        <p className="text-xs">{t('rosterBuilder.guide.subsTip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {p.currentTH && <THBadge level={p.currentTH} size="sm" className="hidden sm:inline-flex shrink-0" />}
                  <span
                    className="flex-1 truncate cursor-pointer hover:text-primary min-w-0"
                    onClick={() => navigate(`/player/${encodeURIComponent(p.playerTag.replace('#', ''))}`)}
                  >
                    {p.playerName}
                  </span>
                  {(() => {
                    const projection = getProjection(p.playerTag, clan.league)
                    // Trigger prefetch on render if not cached
                    if (!projection) {
                      prefetchPlayer(p, clan.league)
                    }
                    if (projection) {
                      return (
                        <LeagueAdjustmentTooltip
                          projection={projection}
                          baseStars={p.avgStars * ATTACKS_PER_SEASON}
                          targetLeague={clan.league}
                        >
                          <span className="text-yellow-400 font-semibold text-xs shrink-0 hidden sm:inline cursor-help">
                            {projection.projectedStars.toFixed(1)}★
                          </span>
                        </LeagueAdjustmentTooltip>
                      )
                    }
                    // Fallback while loading
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-yellow-400 font-semibold text-xs shrink-0 hidden sm:inline cursor-help">{p.avgStars.toFixed(1)}★</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                          <p className="text-xs">
                            {t('rosterBuilder.projectedStarsTooltip', {
                              stars: (p.avgStars * ATTACKS_PER_SEASON).toFixed(1),
                              wars: ATTACKS_PER_SEASON
                            })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })()}
                  <button
                    onClick={() => onRemovePlayer(p.playerTag, clan.tag)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    aria-label={t('rosterBuilder.removePlayer', { name: p.playerName })}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}

            {/* Manual Players */}
            {clanManualPlayers?.map((p, index) => {
              const globalIndex = players.length + index
              const isSubstitute = globalIndex >= maxCapacity
              return (
                <div
                  key={`${p.tag ?? 'manual'}-${p.addedAt}`}
                  className={cn(
                    "flex items-center gap-2 text-sm py-1 px-2 rounded group",
                    isSubstitute
                      ? "bg-amber-900/20 border border-dashed border-amber-500/30"
                      : "bg-background/40 hover:bg-background/60"
                  )}
                >
                  {isSubstitute && (
                    <span className="text-[10px] font-bold bg-amber-500/30 text-amber-300 px-1 rounded">SUB</span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Wrench size={14} />
                        <THBadge level={p.th} size="sm" className="hidden sm:inline-flex shrink-0" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                      <p className="text-xs font-semibold">{t('rosterBuilder.manual_entry_badge')}</p>
                      <p className="text-xs">{t('rosterBuilder.estimated_avg_stars')}: {p.estimatedAvgStars}★</p>
                      {p.notes && <p className="text-xs mt-1 text-muted-foreground">{p.notes}</p>}
                    </TooltipContent>
                  </Tooltip>
                  <span className="flex-1 truncate font-medium min-w-0">
                    {p.name}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-amber-400 font-semibold text-xs shrink-0 hidden sm:inline cursor-help">{p.estimatedAvgStars.toFixed(1)}★</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs bg-slate-800 text-slate-100 border-slate-700">
                      <p className="text-xs">
                        {t('rosterBuilder.projectedStarsTooltip', {
                          stars: (p.estimatedAvgStars * ATTACKS_PER_SEASON).toFixed(1),
                          wars: ATTACKS_PER_SEASON
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <button
                    onClick={() => onRemoveManualPlayer(clan.tag, p.addedAt)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    aria-label={`Remove ${p.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Add Manual Player Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 gap-2 text-xs"
        onClick={() => onAddManualPlayer(clan.tag)}
      >
        <Plus size={14} />
        {t('rosterBuilder.add_manual_player')}
      </Button>
    </div>
  )
}
