import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Sword, 
  Star, 
  TrendUp,
  Shield
} from '@phosphor-icons/react'
import type { FamilyStats } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface FamilyStatsCardProps {
  stats: FamilyStats
  className?: string
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  highlight?: boolean
}

function StatItem({ icon, label, value, subValue, highlight }: StatItemProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-2 p-4">
      <div className={cn(
        "p-3 rounded-full",
        highlight 
          ? "bg-primary/20 text-primary" 
          : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className={cn(
          "text-2xl md:text-3xl font-bold tabular-nums",
          highlight && "text-primary"
        )}>
          {value}
        </p>
        <p className="text-xs md:text-sm text-muted-foreground font-medium">
          {label}
        </p>
        {subValue && (
          <p className="text-xs text-muted-foreground/70">
            {subValue}
          </p>
        )}
      </div>
    </div>
  )
}

export function FamilyStatsCard({ stats, className }: FamilyStatsCardProps) {
  const { t } = useTranslation()

  return (
    <Card className={cn(
      "border-primary/30 bg-gradient-to-br from-card to-primary/5",
      className
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield size={24} weight="fill" className="text-primary" />
          <h3 className="text-lg font-bold tracking-tight">
            {t('family_stats.title')}
          </h3>
          <Badge variant="outline" className="ml-2">
            {stats.activeClans} / {stats.totalClans} {t('family_stats.clans_active')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          <StatItem
            icon={<Shield size={24} weight="fill" />}
            label={t('family_stats.clans')}
            value={stats.activeClans ?? 0}
            subValue={t('family_stats.active')}
          />
          
          <StatItem
            icon={<Users size={24} weight="fill" />}
            label={t('family_stats.players')}
            value={stats.totalPlayers ?? 0}
            subValue={t('family_stats.total')}
          />
          
          <StatItem
            icon={<Star size={24} weight="fill" />}
            label={t('family_stats.stars')}
            value={(stats.totalStars ?? 0).toLocaleString()}
            subValue={`${stats.avgStarsPerAttack ?? 0} ${t('family_stats.per_attack')}`}
            highlight
          />
          
          <StatItem
            icon={<Sword size={24} weight="fill" />}
            label={t('family_stats.attacks')}
            value={(stats.totalAttacks ?? 0).toLocaleString()}
            subValue={`${stats.totalWars ?? 0} ${t('family_stats.wars')}`}
          />
          
          <StatItem
            icon={<TrendUp size={24} weight="fill" />}
            label={t('family_stats.destruction')}
            value={`${stats.avgDestructionPercent ?? 0}%`}
            subValue={t('family_stats.average')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
