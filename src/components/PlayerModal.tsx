import { RoleBadge, type PlayerRole } from '@/components/RoleBadge'
import { THBadge } from '@/components/THBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GlobalPlayer } from '@/lib/types'
import { Clock, Star, Target } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface PlayerModalProps {
  player: GlobalPlayer | null
  role?: PlayerRole
  open: boolean
  onClose: () => void
}

export function PlayerModal({ player, role, open, onClose }: PlayerModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!player) return null

  // Detect preparation mode - player has no stats yet
  const isPreparationMode = player.attacks === 0 && player.wars === 0

  // Generate initials from player name
  const initials = player.name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleViewFullHistory = () => {
    const encodedTag = encodeURIComponent(player.tag.replace('#', ''))
    navigate(`/player/${encodedTag}`)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{player.name} Stats</DialogTitle>
        </DialogHeader>

        {/* Player Header */}
        <div className="flex items-start gap-4 pb-4 border-b border-border">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ring-2 ring-accent bg-accent/10 shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-2xl truncate">{player.name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{player.tag}</p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{player.clan}</Badge>
              {player.th && <THBadge level={player.th} size="sm" />}
              {role && <RoleBadge role={role} size="sm" />}
            </div>
          </div>
        </div>

        {/* Preparation Mode Message */}
        {isPreparationMode ? (
          <div className="py-8 text-center">
            <Clock size={48} className="mx-auto text-amber-400 mb-4" />
            <p className="text-lg font-medium text-amber-200">
              {t('preparation.awaiting_first_war')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('preparation.wars_begin_soon')}
            </p>
            {player.th && (
              <div className="mt-4 flex justify-center">
                <THBadge level={player.th} size="lg" />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Star size={24} weight="fill" className="text-yellow-400" />
                </div>
                <p className="text-3xl font-bold tabular-nums">{player.stars}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Stars</p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Target size={24} weight="fill" className="text-primary" />
                </div>
                <p className="text-3xl font-bold tabular-nums">{player.attacks}</p>
                <p className="text-xs text-muted-foreground mt-1">Attacks</p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Star size={24} className="text-accent" />
                </div>
                <p className="text-3xl font-bold tabular-nums">
                  {player.avgStars !== null ? player.avgStars.toFixed(2) : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Avg Stars</p>
              </div>
            </div>

            {/* Star Buckets Visualization */}
            {player.starBuckets && (
              <div className="py-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-3">Attack Distribution</h3>
                <div className="space-y-2">
                  {[
                    { stars: 3, count: player.starBuckets.threeStars, color: 'bg-green-500' },
                    { stars: 2, count: player.starBuckets.twoStars, color: 'bg-blue-500' },
                    { stars: 1, count: player.starBuckets.oneStars, color: 'bg-yellow-500' },
                    { stars: 0, count: player.starBuckets.zeroStars, color: 'bg-gray-500' },
                  ].map(({ stars, count, color }) => {
                    const percentage = player.attacks > 0 ? (count / player.attacks) * 100 : 0
                    return (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-xs w-12 text-muted-foreground">{stars}★ ({count})</span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                          <div
                            className={`h-full ${color} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs w-12 text-right tabular-nums">{percentage.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-border">
          <Button onClick={handleViewFullHistory} className="w-full">
            View Full History
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
