import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface THBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function THBadge({ level, size = 'md', className }: THBadgeProps) {
  const { t } = useTranslation()
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40 font-semibold',
        sizeClasses[size],
        className
      )}
    >
      {t('players.table.th')} {level}
    </Badge>
  )
}
