import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { LayoutGrid, Rows, Search, SlidersHorizontal, X } from 'lucide-react'
import * as React from 'react'

export type PlayersSortKey = 'stars' | 'avgStars' | 'attacks' | 'name' | 'reliability' | 'performance' | 'attendance' | 'leagueAdj' | 'threeStarRate' | 'th' | 'wars'
export type PlayersViewMode = 'table' | 'cards'

interface FiltersBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedClans: string[]
  onClansChange: (clans: string[]) => void
  selectedTHs: number[]
  onTHsChange: (ths: number[]) => void
  sortBy: PlayersSortKey
  onSortChange: (sort: PlayersSortKey) => void
  viewMode: PlayersViewMode
  onViewModeChange: (mode: PlayersViewMode) => void
  clanOptions: string[]
  thOptions: number[]
  minWars: number
  onMinWarsChange: (min: number) => void
  minReliability: number
  onMinReliabilityChange: (min: number) => void
  className?: string
}

export function FiltersBar({
  searchQuery,
  onSearchChange,
  selectedClans,
  onClansChange,
  selectedTHs,
  onTHsChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  clanOptions,
  thOptions,
  minWars,
  onMinWarsChange,
  minReliability,
  onMinReliabilityChange,
  className,
}: FiltersBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const activeFilterCount =
    (selectedClans.length ? 1 : 0) + (selectedTHs.length ? 1 : 0) + (minWars > 0 ? 1 : 0) + (minReliability > 0 ? 1 : 0)

  function toggleClan(clan: string) {
    if (selectedClans.includes(clan)) {
      onClansChange(selectedClans.filter((c) => c !== clan))
    } else {
      onClansChange([...selectedClans, clan])
    }
  }

  function toggleTH(th: number) {
    if (selectedTHs.includes(th)) {
      onTHsChange(selectedTHs.filter((t) => t !== th))
    } else {
      onTHsChange([...selectedTHs, th])
    }
  }

  function clearAllFilters() {
    onClansChange([])
    onTHsChange([])
    onSearchChange('')
    onMinWarsChange(0)
    onMinReliabilityChange(0)
  }

  const hasActiveFilters = selectedClans.length > 0 || selectedTHs.length > 0 || searchQuery.length > 0 || minWars > 0 || minReliability > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top Row: Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by player name or clan..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-lg">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="flex-1 sm:flex-none"
          >
            <Rows className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Table</span>
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('cards')}
            className="flex-1 sm:flex-none"
          >
            <LayoutGrid className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Cards</span>
          </Button>
        </div>
      </div>

      {/* Bottom Row: Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Filters Popover */}
        <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Filter by Clan</h4>
                <div className="space-y-2">
                  {clanOptions.map((clan) => (
                    <div key={clan} className="flex items-center space-x-2">
                      <Checkbox
                        id={`clan-${clan}`}
                        checked={selectedClans.includes(clan)}
                        onCheckedChange={() => toggleClan(clan)}
                      />
                      <Label
                        htmlFor={`clan-${clan}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {clan}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Filter by Town Hall</h4>
                <div className="grid grid-cols-3 gap-2">
                  {thOptions.map((th) => (
                    <div key={th} className="flex items-center space-x-2">
                      <Checkbox
                        id={`th-${th}`}
                        checked={selectedTHs.includes(th)}
                        onCheckedChange={() => toggleTH(th)}
                      />
                      <Label
                        htmlFor={`th-${th}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        TH{th}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Minimum Wars</h4>
                <div className="space-y-3">
                  <Slider
                    value={[minWars]}
                    onValueChange={(v) => onMinWarsChange(v[0])}
                    max={49}
                    step={7}
                  />
                  <p className="text-sm text-muted-foreground">
                    {minWars > 0 ? `≥ ${minWars} wars (~${Math.ceil(minWars / 7)} seasons)` : 'Any'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Minimum Reliability</h4>
                <div className="space-y-3">
                  <Slider
                    value={[minReliability]}
                    onValueChange={(v) => onMinReliabilityChange(v[0])}
                    max={100}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground">
                    {minReliability > 0 ? `≥ ${minReliability}%` : 'Any'}
                  </p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as PlayersSortKey)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reliability">Best Reliability</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
            <SelectItem value="threeStarRate">3-Star Rate</SelectItem>
            <SelectItem value="stars">Most Stars</SelectItem>
            <SelectItem value="avgStars">Highest Avg</SelectItem>
            <SelectItem value="attacks">Most Attacks</SelectItem>
            <SelectItem value="wars">Most Wars</SelectItem>
            <SelectItem value="th">Town Hall</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        )}

        {/* Active Filter Badges */}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {selectedClans.map((clan) => (
            <Badge
              key={clan}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleClan(clan)}
            >
              {clan}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {selectedTHs.map((th) => (
            <Badge
              key={th}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleTH(th)}
            >
              TH{th}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
