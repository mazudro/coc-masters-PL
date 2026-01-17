import { Shield, CalendarCheck } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow, parseISO, format } from 'date-fns'

interface WarStatusProps {
  generatedAt?: string
  variant?: 'compact' | 'expanded'
}

export function WarStatus({ generatedAt, variant = 'compact' }: WarStatusProps) {
  const { t } = useTranslation()
  
  const parsedDate = generatedAt ? parseISO(generatedAt) : null
  const relativeTime = parsedDate ? formatDistanceToNow(parsedDate, { addSuffix: true }) : null
  const seasonMonth = parsedDate ? format(parsedDate, 'MMMM yyyy') : null
  
  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-2">
        <Badge variant="outline" className="gap-2 px-3 py-1.5 bg-primary/10 border-primary/30">
          <Shield size={16} weight="fill" className="text-primary" />
          <span className="font-medium">{t('war_status.cwl_season')}</span>
        </Badge>
        {relativeTime && (
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <CalendarCheck size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">{t('war_status.updated', { time: relativeTime })}</span>
          </Badge>
        )}
      </div>
    )
  }
  
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/15 p-2.5">
          <Shield size={24} weight="fill" className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t('war_status.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('war_status.subtitle')}</p>
        </div>
      </div>
      
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('war_status.season_label')}</span>
          <span className="font-semibold">{seasonMonth || t('war_status.unknown_season')}</span>
        </div>
        {relativeTime && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('war_status.last_updated_label')}</span>
            <span className="font-medium">{relativeTime}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('war_status.status_label')}</span>
          <Badge variant="default" className="bg-primary">
            {t('war_status.active')}
          </Badge>
        </div>
      </div>
    </div>
  )
}
