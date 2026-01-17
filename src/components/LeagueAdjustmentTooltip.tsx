import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import type { LeagueProjection } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MinusCircleIcon, QuestionMarkIcon, ShieldCheckIcon, ShieldWarningIcon, TrendDownIcon, TrendUpIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

interface LeagueAdjustmentTooltipProps {
  projection: LeagueProjection
  baseStars: number
  targetLeague: string
  children: React.ReactNode
  className?: string
}

/**
 * Displays league adjustment information in a tooltip
 * Shows: historical league, target league, adjustment %, confidence level
 */
export function LeagueAdjustmentTooltip({
  projection,
  baseStars,
  targetLeague,
  children,
  className
}: LeagueAdjustmentTooltipProps) {
  const { t } = useTranslation()

  const { adjustment, confidence, historicalLeague, projectedStars } = projection

  // Adjustment indicator
  const getAdjustmentDisplay = () => {
    if (adjustment === 0) {
      return {
        icon: <MinusCircleIcon size={14} className="text-slate-400" />,
        text: '0%',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20'
      }
    } else if (adjustment > 0) {
      return {
        icon: <TrendUpIcon size={14} className="text-emerald-400" />,
        text: `+${adjustment}%`,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20'
      }
    } else {
      return {
        icon: <TrendDownIcon size={14} className="text-red-400" />,
        text: `${adjustment}%`,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20'
      }
    }
  }

  // Confidence indicator
  const getConfidenceDisplay = () => {
    switch (confidence) {
      case 'high':
        return {
          icon: <ShieldCheckIcon size={14} className="text-emerald-400" />,
          text: t('roster.confidence_high', 'High'),
          color: 'text-emerald-400'
        }
      case 'medium':
        return {
          icon: <ShieldWarningIcon size={14} className="text-amber-400" />,
          text: t('roster.confidence_medium', 'Medium'),
          color: 'text-amber-400'
        }
      case 'low':
      default:
        return {
          icon: <WarningCircleIcon size={14} className="text-red-400" />,
          text: t('roster.confidence_low', 'Low'),
          color: 'text-red-400'
        }
    }
  }

  const adjustmentDisplay = getAdjustmentDisplay()
  const confidenceDisplay = getConfidenceDisplay()
  const isMobile = useIsMobile()

  // Shared content for both tooltip and popover
  const content = (
    <div className="space-y-2">
      {/* Title */}
      <p className="text-xs font-semibold border-b border-slate-600 pb-1 mb-2">
        {t('roster.league_adjustment_title', 'League Projection')}
      </p>

      {/* Historical → Target League */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">{t('roster.from_league', 'From')}:</span>
        {historicalLeague ? (
          <span className="font-medium text-slate-200">{historicalLeague}</span>
        ) : (
          <span className="flex items-center gap-1 text-slate-500">
            <QuestionMarkIcon size={12} />
            {t('roster.unknown_league', 'Unknown')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">{t('roster.to_league', 'To')}:</span>
        <span className="font-medium text-slate-200">{targetLeague}</span>
      </div>

      {/* Adjustment Indicator */}
      <div className={cn(
        "flex items-center justify-between rounded px-2 py-1 mt-2",
        adjustmentDisplay.bgColor
      )}>
        <span className="flex items-center gap-1.5 text-xs">
          {adjustmentDisplay.icon}
          <span className={cn("font-bold", adjustmentDisplay.color)}>
            {adjustmentDisplay.text}
          </span>
        </span>
        <span className="text-xs text-slate-400">
          {adjustment > 0
            ? t('roster.easier_league', 'Easier league')
            : adjustment < 0
              ? t('roster.harder_league', 'Harder league')
              : t('roster.same_league', 'Same league')
          }
        </span>
      </div>

      {/* Stars Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-slate-600">
        <div>
          <span className="text-slate-400">{t('roster.base_projection', 'Base')}:</span>
          <span className="ml-1 text-yellow-400 font-medium">{baseStars.toFixed(1)}★</span>
        </div>
        <div>
          <span className="text-slate-400">{t('roster.adjusted_projection', 'Adjusted')}:</span>
          <span className={cn("ml-1 font-bold", adjustmentDisplay.color)}>
            {projectedStars.toFixed(1)}★
          </span>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-600">
        <span className="text-slate-400">{t('roster.confidence', 'Confidence')}:</span>
        <span className={cn("flex items-center gap-1", confidenceDisplay.color)}>
          {confidenceDisplay.icon}
          {confidenceDisplay.text}
        </span>
      </div>
    </div>
  )

  // Mobile: use Popover (tap to open), Desktop: use Tooltip (hover)
  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild className={className}>
          {children}
        </PopoverTrigger>
        <PopoverContent
          side="top"
          className="max-w-xs bg-slate-800 text-slate-100 border-slate-700 p-3 z-50"
        >
          {content}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild className={className}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs bg-slate-800 text-slate-100 border-slate-700 p-3"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Compact badge showing league adjustment
 * Use in player rows for quick visual indicator
 */
export function LeagueAdjustmentBadge({
  adjustment,
  confidence,
  size = 'sm'
}: {
  adjustment: number
  confidence: 'high' | 'medium' | 'low'
  size?: 'sm' | 'md'
}) {
  if (adjustment === 0) return null

  const isPositive = adjustment > 0
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded font-medium",
      sizeClasses,
      isPositive
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-red-500/20 text-red-400",
      confidence === 'low' && "opacity-60"
    )}>
      {isPositive ? <TrendUpIcon size={10} /> : <TrendDownIcon size={10} />}
      {isPositive ? '+' : ''}{adjustment}%
    </span>
  )
}

/**
 * Aggregate stats for a clan roster's league adjustments
 */
export interface ClanLeagueStats {
  avgAdjustment: number
  lowConfidenceCount: number
  totalPlayers: number
}

export function ClanLeagueStatsBadge({ stats }: { stats: ClanLeagueStats }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  if (stats.totalPlayers === 0) return null

  const avgAdj = stats.avgAdjustment
  const hasLowConfidence = stats.lowConfidenceCount > 0

  const trigger = (
    <div className={cn(
      "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-help",
      avgAdj > 0
        ? "bg-emerald-500/20 text-emerald-400"
        : avgAdj < 0
          ? "bg-red-500/20 text-red-400"
          : "bg-slate-500/20 text-slate-400"
    )}>
      {avgAdj > 0 ? <TrendUpIcon size={10} /> : avgAdj < 0 ? <TrendDownIcon size={10} /> : <MinusCircleIcon size={10} />}
      <span className="font-medium">
        {avgAdj > 0 ? '+' : ''}{avgAdj.toFixed(0)}%
      </span>
      {hasLowConfidence && (
        <ShieldWarningIcon size={10} className="text-amber-400 ml-0.5" />
      )}
    </div>
  )

  const content = (
    <div className="text-xs space-y-1">
      <p>
        <span className="text-slate-400">{t('roster.avg_league_adjustment', 'Avg League Adjustment')}:</span>
        <span className={cn(
          "ml-1 font-bold",
          avgAdj > 0 ? "text-emerald-400" : avgAdj < 0 ? "text-red-400" : "text-slate-400"
        )}>
          {avgAdj > 0 ? '+' : ''}{avgAdj.toFixed(1)}%
        </span>
      </p>
      {hasLowConfidence && (
        <p className="text-amber-400">
          ⚠️ {stats.lowConfidenceCount} {t('roster.low_confidence_players', 'player(s) with low confidence')}
        </p>
      )}
    </div>
  )

  // Mobile: use Popover (tap to open), Desktop: use Tooltip (hover)
  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent side="top" className="bg-slate-800 text-slate-100 border-slate-700 z-50">
          {content}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {trigger}
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-slate-800 text-slate-100 border-slate-700">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
