import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { RosterPlayerStats } from '@/lib/types'
import { TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { THBadge } from '@/components/THBadge'
import { cn } from '@/lib/utils'
import { calculateForm } from '@/lib/rosterCalculations'
import { TrendUp, Question } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface CustomClan {
  name: string
  tag: string
  league: string
  minTH: number
  color: string
  bgColor: string
  borderColor: string
  leagueIcon: string
  isCustom: boolean
}

interface DraggablePlayerRowProps {
  player: RosterPlayerStats
  isExcluded: boolean
  assignedClan: string | null
  assignedClanInfo: CustomClan | undefined
  allClans: CustomClan[]
  clanRosters: Map<string, Set<string>>
  onToggleExcluded: (playerTag: string) => void
  onAssignToClan: (playerTag: string, clanTag: string) => void
  getMaxCapacity: (clanTag: string, includeSubs: boolean) => number
}

/**
 * Draggable player row component for the roster builder table
 * Uses @dnd-kit/core for drag-and-drop functionality
 */
export function DraggablePlayerRow({
  player,
  isExcluded,
  assignedClan,
  assignedClanInfo,
  allClans,
  clanRosters,
  onToggleExcluded,
  onAssignToClan,
  getMaxCapacity
}: DraggablePlayerRowProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const form = calculateForm(player)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `player-${player.playerTag}`,
    disabled: isExcluded,
    data: {
      type: 'player',
      player,
      sourceType: 'pool'
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : undefined,
    cursor: isExcluded ? 'not-allowed' : 'grab'
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border/30 transition-all",
        isExcluded && "opacity-40 bg-red-900/10",
        !isExcluded && assignedClan && "opacity-60",
        isDragging && "ring-2 ring-primary scale-105 shadow-lg z-50"
      )}
    >
      {/* Drag Handle */}
      <TableCell className="w-8 p-0 text-center">
        {!isExcluded && (
          <button
            {...listeners}
            {...attributes}
            className="p-2 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
            aria-label={`Drag ${player.playerName}`}
          >
            <GripVertical size={16} className="text-muted-foreground" />
          </button>
        )}
      </TableCell>

      {/* Out Checkbox */}
      <TableCell className="text-center">
        <Checkbox
          checked={isExcluded}
          onCheckedChange={() => onToggleExcluded(player.playerTag)}
          className={cn(isExcluded && "border-red-400 data-[state=checked]:bg-red-500")}
        />
      </TableCell>

      {/* Player Name */}
      <TableCell
        className="cursor-pointer hover:text-primary"
        onClick={() => navigate(`/player/${encodeURIComponent(player.playerTag.replace('#', ''))}`)}
      >
        <div>
          <p className={cn("font-medium", isExcluded && "line-through")}>{player.playerName}</p>
          <p className="text-xs text-muted-foreground">{player.clanName}</p>
        </div>
      </TableCell>

      {/* Clan */}
      <TableCell>
        <p className="text-sm text-muted-foreground">{player.clanName}</p>
      </TableCell>

      {/* TH */}
      <TableCell className="text-center">
        {player.currentTH ? (
          <THBadge level={player.currentTH} size="sm" />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Avg Stars */}
      <TableCell className="text-center">
        <span className={cn(
          'font-bold',
          player.avgStars >= 2.5 ? 'text-green-400' :
            player.avgStars >= 2.0 ? 'text-yellow-400' :
              'text-red-400'
        )}>
          {player.avgStars.toFixed(2)}
        </span>
      </TableCell>

      {/* Form */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <TrendUp size={14} className={cn(
            form >= 2.0 ? 'text-green-400' :
              form >= 1.5 ? 'text-yellow-400' :
                'text-red-400'
          )} />
          <span className={cn(
            'font-semibold',
            form >= 2.0 ? 'text-green-400' :
              form >= 1.5 ? 'text-yellow-400' :
                'text-red-400'
          )}>
            {form.toFixed(2)}
          </span>
        </div>
      </TableCell>

      {/* Reliability */}
      <TableCell className="text-center">
        <span className={cn(
          "text-sm font-medium",
          player.reliabilityScore >= 90 ? "text-green-400" :
            player.reliabilityScore >= 75 ? "text-yellow-400" :
              "text-red-400"
        )}>
          {player.reliabilityScore.toFixed(0)}%
        </span>
      </TableCell>

      {/* Assign To Dropdown */}
      <TableCell className="text-center">
        <Select
          value={assignedClan || 'none'}
          onValueChange={(value) => onAssignToClan(player.playerTag, value as string)}
          disabled={isExcluded}
        >
          <SelectTrigger className={cn(
            "h-8 text-xs w-40",
            assignedClanInfo && assignedClanInfo.color
          )}>
            <SelectValue placeholder={t('rosterBuilder.selectClan')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {allClans.map(clan => {
              const roster = clanRosters.get(clan.tag) || new Set()
              const maxCapacity = getMaxCapacity(clan.tag, true)
              const isFull = roster.size >= maxCapacity && !roster.has(player.playerTag)
              const meetsMinTH = (player.currentTH || 0) >= clan.minTH
              return (
                <SelectItem
                  key={clan.tag}
                  value={clan.tag}
                  disabled={isFull || !meetsMinTH}
                  className={cn(!meetsMinTH && 'opacity-50')}
                >
                  <span className={clan.color}>{clan.name}</span>
                  {clan.isCustom && <span className="text-xs text-muted-foreground ml-1">(guest)</span>}
                  {!meetsMinTH && <span className="text-xs text-muted-foreground ml-1">(TH{clan.minTH}+)</span>}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  )
}
