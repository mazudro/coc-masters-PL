import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Warning, WarningCircle } from '@phosphor-icons/react'
import { getReliabilityColor } from '@/lib/data'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface ReliabilityBadgeProps {
  reliability: number
  /** Show detailed breakdown in tooltip */
  breakdown?: {
    highCount: number
    mediumCount: number
    lowCount: number
  }
  size?: 'sm' | 'md'
  showIcon?: boolean
  className?: string
}

const colorClasses = {
  green: 'bg-green-500/15 text-green-400 border-green-500/40',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  red: 'bg-red-500/15 text-red-400 border-red-500/40',
}

const iconColors = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
}

export function ReliabilityBadge({ 
  reliability, 
  breakdown,
  size = 'md',
  showIcon = true,
  className 
}: ReliabilityBadgeProps) {
  const { t } = useTranslation()
  const color = getReliabilityColor(reliability)
  const iconSize = size === 'sm' ? 12 : 14

  const Icon = color === 'green' 
    ? ShieldCheck 
    : color === 'yellow' 
    ? Warning 
    : WarningCircle

  // Build tooltip content
  const tooltipContent = breakdown 
    ? t('reliability.tooltip_with_breakdown', {
        percentage: reliability.toFixed(0),
        high: breakdown.highCount,
        medium: breakdown.mediumCount,
        low: breakdown.lowCount
      })
    : t('reliability.tooltip', { percentage: reliability.toFixed(0) })

  return (
    <Badge 
      variant="outline" 
      className={cn(
        colorClasses[color],
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        'cursor-help',
        className
      )}
      title={tooltipContent}
    >
      <span className="flex items-center gap-1">
        {showIcon && <Icon size={iconSize} weight="fill" className={iconColors[color]} />}
        <span className="font-medium">{reliability.toFixed(0)}%</span>
      </span>
    </Badge>
  )
}
