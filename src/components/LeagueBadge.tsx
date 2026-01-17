import { Badge } from '@/components/ui/badge'
import { leagueBadgeVariant, positionBadgeClass } from '@/lib/data'
import type { LeagueInfo } from '@/lib/types'
import { Trophy } from '@phosphor-icons/react'

// Map league tier names to icon filenames
const LEAGUE_ICONS: Record<string, string> = {
  'Champion League I': '/images/leagues/champion-1.png',
  'Champion League II': '/images/leagues/champion-2.png',
  'Champion League III': '/images/leagues/champion-3.png',
  'Master League I': '/images/leagues/master-1.png',
  'Master League II': '/images/leagues/master-2.png',
  'Master League III': '/images/leagues/master-3.png',
  'Crystal League I': '/images/leagues/crystal-1.png',
  'Crystal League II': '/images/leagues/crystal-2.png',
  'Crystal League III': '/images/leagues/crystal-3.png',
  'Gold League I': '/images/leagues/gold-1.png',
  'Gold League II': '/images/leagues/gold-1.png', // fallback to gold-1
  'Gold League III': '/images/leagues/gold-1.png', // fallback to gold-1
}

// Get short league name for display
const getShortLeagueName = (tier: string): string => {
  return tier
    .replace('League ', '')
    .replace('Champion ', 'Champ ')
}

interface LeagueBadgeProps {
  league: LeagueInfo | null
  groupPosition?: number | null
  compact?: boolean
  showIcon?: boolean
  iconOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LeagueBadge({
  league,
  groupPosition,
  compact = false,
  showIcon = true,
  iconOnly = false,
  size = 'md'
}: LeagueBadgeProps) {
  // Return null if no league or no tier (e.g., preparation phase)
  if (!league || !league.tier) return null

  const variant = leagueBadgeVariant(league.tier)
  const positionClass = positionBadgeClass(groupPosition ?? null)
  const iconUrl = LEAGUE_ICONS[league.tier]

  // Tailwind size classes (size-* sets both width and height)
  const iconSizeClasses = {
    sm: 'size-4',   // 16px
    md: 'size-5',   // 20px
    lg: 'size-7'    // 28px
  }
  const sizeClass = iconSizeClasses[size]

  // Icon-only mode for roster cards
  if (iconOnly) {
    return iconUrl ? (
      <img
        src={iconUrl}
        alt={league.tier}
        className={`inline-block ${sizeClass}`}
      />
    ) : (
      <Trophy weight="fill" className={`text-yellow-400 ${sizeClass}`} />
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={variant} className="gap-1">
          {showIcon && iconUrl ? (
            <img src={iconUrl} alt="" className="w-4 h-4" />
          ) : (
            <Trophy size={14} weight="fill" />
          )}
          <span className="font-semibold">{getShortLeagueName(league.tier)}</span>
        </Badge>
        {groupPosition !== undefined && (
          <Badge variant="outline" className={`gap-1 ${positionClass}`}>
            <span className="text-xs font-bold">#{groupPosition ?? '–'}</span>
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="gap-1.5">
        {showIcon && iconUrl ? (
          <img src={iconUrl} alt="" className="w-5 h-5" />
        ) : (
          <Trophy size={16} weight="fill" />
        )}
        <span className="font-semibold">{league.tier}</span>
      </Badge>
      {groupPosition !== undefined && (
        <Badge variant="outline" className={`gap-1 ${positionClass}`}>
          <span className="text-xs font-bold">#{groupPosition ?? '–'}</span>
        </Badge>
      )}
    </div>
  )
}
