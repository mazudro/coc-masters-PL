import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import type { ManualPlayerEntry } from '@/lib/types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ManualPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (player: ManualPlayerEntry) => void
  existingTags?: Set<string>
}

export function ManualPlayerDialog({ 
  open, 
  onOpenChange, 
  onAdd,
  existingTags = new Set()
}: ManualPlayerDialogProps) {
  const { t } = useTranslation()
  
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [th, setTh] = useState<number>(16)
  const [estimatedAvgStars, setEstimatedAvgStars] = useState<number>(2.0)
  const [notes, setNotes] = useState('')
  const [tagWarning, setTagWarning] = useState(false)

  const handleReset = () => {
    setName('')
    setTag('')
    setTh(16)
    setEstimatedAvgStars(2.0)
    setNotes('')
    setTagWarning(false)
  }

  const handleTagChange = (value: string) => {
    setTag(value)
    // Normalize tag before checking for duplicates (add # if missing)
    const normalizedValue = value.trim() 
      ? (value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`)
      : ''
    
    // Check for duplicate tag
    if (normalizedValue && existingTags.has(normalizedValue)) {
      setTagWarning(true)
    } else {
      setTagWarning(false)
    }
  }

  const handleAdd = () => {
    if (!name.trim()) return

    const normalizedTag = tag.trim() 
      ? (tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`)
      : null

    const player: ManualPlayerEntry = {
      name: name.trim(),
      tag: normalizedTag,
      th,
      estimatedAvgStars,
      notes: notes.trim() || undefined,
      manualEntry: true,
      addedAt: new Date().toISOString()
    }

    onAdd(player)
    handleReset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) handleReset()
      onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('roster.manual_player_title')}</DialogTitle>
          <DialogDescription>
            {t('roster.manual_player_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Player Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {t('roster.player_name')} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t('roster.player_name_placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Player Tag */}
          <div className="space-y-2">
            <Label htmlFor="tag" className="text-sm font-medium">
              {t('roster.player_tag')} {t('roster.optional')}
            </Label>
            <Input
              id="tag"
              placeholder="#ABC123"
              value={tag}
              onChange={(e) => handleTagChange(e.target.value)}
              className="w-full"
            />
            {tagWarning && (
              <p className="text-xs text-amber-400">
                ⚠️ {t('roster.duplicate_tag_warning')}
              </p>
            )}
          </div>

          {/* Town Hall Level */}
          <div className="space-y-2">
            <Label htmlFor="th" className="text-sm font-medium">
              {t('roster.th_level')}
            </Label>
            <Select value={th.toString()} onValueChange={(v) => setTh(parseInt(v))}>
              <SelectTrigger id="th">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="13">TH13</SelectItem>
                <SelectItem value="14">TH14</SelectItem>
                <SelectItem value="15">TH15</SelectItem>
                <SelectItem value="16">TH16</SelectItem>
                <SelectItem value="17">TH17</SelectItem>
                <SelectItem value="18">TH18</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Avg Stars */}
          <div className="space-y-2">
            <Label htmlFor="stars" className="text-sm font-medium">
              {t('roster.estimated_avg_stars')}: <span className="text-yellow-400 font-bold">{estimatedAvgStars.toFixed(1)}★</span>
            </Label>
            <Slider
              id="stars"
              min={0}
              max={3}
              step={0.1}
              value={[estimatedAvgStars]}
              onValueChange={(values) => setEstimatedAvgStars(values[0])}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('roster.estimated_stars_help')}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              {t('roster.notes')} {t('roster.optional')}
            </Label>
            <Textarea
              id="notes"
              placeholder={t('roster.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!name.trim()}
          >
            {t('roster.add_player')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
