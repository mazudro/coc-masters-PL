import { FAMILY_CLAN_TAGS } from '@/lib/data'
import type { CWLGroupClan } from '@/lib/types'
import { Trophy, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CWLGroupStandingsProps {
  cwlGroup: CWLGroupClan[]
}

export function CWLGroupStandings({ cwlGroup }: CWLGroupStandingsProps) {
  const { t } = useTranslation()

  if (!cwlGroup || cwlGroup.length === 0) {
    return null
  }

  // Normalize family tags for comparison (without #)
  const familyTags = new Set(
    FAMILY_CLAN_TAGS.map(tag => tag.replace('#', '').toUpperCase())
  )

  const isFamilyClan = (tag: string) => {
    const normalizedTag = tag.replace('#', '').toUpperCase()
    return familyTags.has(normalizedTag)
  }

  // Sort by stars (desc), then destruction (desc)
  const sortedClans = [...cwlGroup].sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars
    return b.destruction - a.destruction
  })

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t('clanSeason.warsTitle')}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border/50">
              <th className="text-left py-2 px-2 w-10">#</th>
              <th className="text-left py-2 px-2">{t('standings.clan')}</th>
              <th className="text-right py-2 px-2">{t('standings.stars')}</th>
              <th className="text-right py-2 px-2">{t('standings.destruction')}</th>
              <th className="text-right py-2 px-2 hidden sm:table-cell">W-L-T</th>
            </tr>
          </thead>
          <tbody>
            {sortedClans.map((clan, index) => {
              const isFamily = isFamilyClan(clan.tag)
              return (
                <tr
                  key={clan.tag}
                  className={`border-b border-border/30 transition-colors ${isFamily
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-card/30'
                    }`}
                >
                  <td className="py-2 px-2 font-bold text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${isFamily ? 'text-primary' : ''}`}>
                        {clan.name}
                      </span>
                      {isFamily && (
                        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded shrink-0">
                          <Users className="w-3 h-3 inline mr-0.5" />
                          {t('preparation.family_clan')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    <span className="text-yellow-400">★ {clan.stars}</span>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                    {clan.destruction.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    {clan.wins}-{clan.losses}-{clan.ties}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
