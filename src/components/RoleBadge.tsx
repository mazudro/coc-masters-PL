import { Crown, ShieldCheck, TrendingUp, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PlayerRole = 'mvp' | 'elite' | 'reliable' | 'rising' | null

interface RoleBadgeProps {
  role: PlayerRole
  size?: 'sm' | 'md'
  className?: string
}

export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  if (!role) return null

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  const roleConfig = {
    mvp: {
      icon: Trophy,
      label: 'MVP',
      className: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/40',
    },
    elite: {
      icon: Crown,
      label: 'Elite',
      className: 'bg-violet-500/20 text-violet-400 border border-violet-500/40',
    },
    reliable: {
      icon: ShieldCheck,
      label: 'Reliable',
      className: 'bg-green-500/20 text-green-400 border border-green-500/40',
    },
    rising: {
      icon: TrendingUp,
      label: 'Rising Star',
      className: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    },
  }

  const config = roleConfig[role]
  const Icon = config.icon
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium backdrop-blur-sm',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      <Icon size={iconSize} />
      <span>{config.label}</span>
    </span>
  )
}
