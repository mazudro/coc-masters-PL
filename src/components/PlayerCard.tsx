import { RoleBadge, type PlayerRole } from '@/components/RoleBadge'
import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import type { GlobalPlayer } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Star, Target } from '@phosphor-icons/react'

interface PlayerCardProps {
  player: GlobalPlayer
  rank: number
  role?: PlayerRole
  onClick: () => void
  className?: string
  style?: React.CSSProperties
}

export function PlayerCard({ player, rank, role, onClick, className, style }: PlayerCardProps) {
  // Generate initials from player name
  const initials = player.name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      style={style}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`View ${player.name}'s stats`}
      className={cn(
        'group relative bg-card/65 backdrop-blur-md rounded-xl p-4 cursor-pointer transition-all',
        'hover:shadow-lg hover:scale-105 hover:border-primary/50 border border-border',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        'animate-scale-in',
        className
      )}
    >
      {/* Rank Badge for Top 3 */}
      {rank <= 3 && (
        <div
          className={cn(
            'absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
            rank === 1 && 'bg-yellow-400/20 border-yellow-400 text-yellow-400',
            rank === 2 && 'bg-gray-400/20 border-gray-400 text-gray-400',
            rank === 3 && 'bg-orange-500/20 border-orange-500 text-orange-500'
          )}
        >
          {rank}
        </div>
      )}

      {/* Role Badge */}
      {role && (
        <div className="absolute top-2 left-2">
          <RoleBadge role={role} size="sm" />
        </div>
      )}

      <div className="space-y-3">
        {/* Player Avatar and Info */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ring-2 ring-accent bg-accent/10"
              aria-hidden="true"
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                {player.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono truncate">{player.tag}</p>
            </div>
          </div>

          {player.th && <THBadge level={player.th} size="sm" />}
        </div>

        {/* Clan Badge */}
        <Badge variant="outline" className="w-full justify-center">
          {player.clan}
        </Badge>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Star size={20} weight="fill" className="text-yellow-400" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{player.stars}</p>
              <p className="text-xs text-muted-foreground">Stars</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target size={20} weight="fill" className="text-primary" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{player.attacks}</p>
              <p className="text-xs text-muted-foreground">Attacks</p>
            </div>
          </div>
        </div>

        {/* Avg Stars */}
        <div className="text-center pt-2 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Avg per Attack</p>
          <p className="text-xl font-bold tabular-nums">
            {player.avgStars !== null ? player.avgStars.toFixed(2) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
