import { Medal } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RankBadgeProps {
  rank: number
  className?: string
}

export function RankBadge({ rank, className }: RankBadgeProps) {
  const getRankColor = () => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
    if (rank === 2) return 'bg-slate-400/20 text-slate-300 border-slate-400/50'
    if (rank === 3) return 'bg-amber-700/20 text-amber-400 border-amber-700/50'
    return 'bg-muted text-muted-foreground border-border'
  }

  return (
    <Badge variant="outline" className={cn('gap-1 font-semibold', getRankColor(), className)}>
      <Medal weight="fill" size={14} />
      {rank > 0 ? `#${rank}` : 'N/A'}
    </Badge>
  )
}
