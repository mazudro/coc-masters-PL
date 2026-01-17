import { Trophy } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface MVPBadgeProps {
  playerName: string
  playerTag: string
  stars: number
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: {
    container: 'px-2 py-1.5 gap-1.5',
    icon: 16,
    label: 'text-[10px]',
    name: 'text-xs',
    badge: 'text-xs px-1.5 py-0.5'
  },
  md: {
    container: 'px-3 py-2 gap-2',
    icon: 20,
    label: 'text-xs',
    name: 'text-sm',
    badge: 'text-sm px-2 py-1'
  },
  lg: {
    container: 'px-4 py-2.5 gap-2.5',
    icon: 24,
    label: 'text-sm',
    name: 'text-base',
    badge: 'text-base px-2.5 py-1'
  }
} as const

export function MVPBadge({ playerName, playerTag, stars, onClick, size = 'md' }: MVPBadgeProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      const encodedTag = encodeURIComponent(playerTag.replace('#', ''))
      navigate(`/player/${encodedTag}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const currentSize = SIZE_CLASSES[size]

  return (
    <div 
      role="button"
      tabIndex={0}
      className={`inline-flex items-center rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 cursor-pointer hover:from-yellow-500/30 hover:to-amber-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${currentSize.container}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${t('standings.mvp')}: ${playerName} with ${stars} stars`}
    >
      <Trophy size={currentSize.icon} weight="fill" className="text-yellow-400" />
      <div className="flex flex-col">
        <span className={`text-yellow-400 font-semibold uppercase ${currentSize.label}`}>{t('standings.mvp')}</span>
        <span className={`font-bold ${currentSize.name}`}>{playerName}</span>
      </div>
      <Badge className={`bg-yellow-500/30 text-yellow-400 border-yellow-500/50 ${currentSize.badge}`}>
        {stars}★
      </Badge>
    </div>
  )
}
