import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Page } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CaretDown, CaretUp, Clock, House, Info, Trophy, Users, UsersThree } from '@phosphor-icons/react'
import { memo, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'

interface NavigationProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

interface LanguageSelectorProps {
  currentLanguage: string
  onLanguageChange: (language: string) => void
  compact: boolean
  ariaLabel: string
}

// Memoized language selector component for code-splitting
const LanguageSelector = memo(
  ({ currentLanguage, onLanguageChange, compact, ariaLabel }: LanguageSelectorProps) => (
    <Select value={currentLanguage} onValueChange={onLanguageChange}>
      <SelectTrigger
        className={cn(
          'rounded-full border-primary/40 bg-primary/15 text-xs sm:text-sm font-semibold uppercase text-primary-foreground/90 hover:bg-primary/25',
          compact ? 'w-12 py-1 px-1' : 'w-16 sm:w-28'
        )}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={currentLanguage.toUpperCase()} />
      </SelectTrigger>
      <SelectContent className="bg-card/95 backdrop-blur">
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="pl">PL</SelectItem>
      </SelectContent>
    </Select>
  )
)

LanguageSelector.displayName = 'LanguageSelector'

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { t, i18n } = useTranslation()
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const navRef = useRef<HTMLElement>(null)
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wog_compact_header') === '1'
    }
    return false
  })
  const [isHidden, setIsHidden] = useState(false)
  const lastScrollY = useRef(0)
  const [, startTransition] = useTransition()

  // Auto-hide header on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY.current
      const scrolledPastThreshold = currentScrollY > 60

      // Only hide if scrolling down AND past threshold
      if (scrollingDown && scrolledPastThreshold) {
        setIsHidden(true)
      } else if (!scrollingDown) {
        setIsHidden(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const applyCompactMode = () => {
      const isLandscape = window.innerWidth > window.innerHeight
      const isSmallScreen = window.innerHeight < 500

      if (isLandscape && isSmallScreen && !isCompact) {
        document.body.classList.add('auto-compact-landscape')
      } else {
        document.body.classList.remove('auto-compact-landscape')
      }
    }

    window.addEventListener('resize', applyCompactMode)
    window.addEventListener('orientationchange', applyCompactMode)
    applyCompactMode()

    return () => {
      window.removeEventListener('resize', applyCompactMode)
      window.removeEventListener('orientationchange', applyCompactMode)
    }
  }, [isCompact])

  useEffect(() => {
    if (navRef.current) {
      if (isCompact) {
        navRef.current.classList.add('compact')
        document.body.classList.add('compact-header-enabled')
      } else {
        navRef.current.classList.remove('compact')
        document.body.classList.remove('compact-header-enabled')
      }
      localStorage.setItem('wog_compact_header', isCompact ? '1' : '0')
    }
  }, [isCompact])

  // Memoized callback to prevent unnecessary re-renders of buttons
  const handleCompactToggle = useCallback(() => {
    startTransition(() => {
      setIsCompact((prev) => !prev)
    })
  }, [])

  // Memoized callback for language change
  const handleLanguageChange = useCallback(
    (value: string) => {
      startTransition(() => {
        i18n.changeLanguage(value)
      })
    },
    [i18n]
  )

  // Memoized callback for navigation
  const handleNavigate = useCallback(
    (page: Page) => {
      startTransition(() => {
        onNavigate(page)
      })
    },
    [onNavigate]
  )

  const links: Array<{ id: Page; label: string; icon: typeof House }> = [
    { id: 'home', label: t('nav.links.home'), icon: House },
    { id: 'history', label: t('nav.links.history'), icon: Clock },
    { id: 'players', label: t('nav.links.players'), icon: Users },
    { id: 'roster-builder', label: t('nav.links.roster-builder'), icon: UsersThree },
    { id: 'about', label: t('nav.links.about'), icon: Info },
  ]

  return (
    <nav
      ref={navRef}
      className={cn(
        "border-b border-border/60 bg-card/65 backdrop-blur-md sticky top-0 z-50 transition-all duration-300",
        isHidden && "-translate-y-full"
      )}
    >
      <div className="container mx-auto px-3 sm:px-6 md:px-12">
        <div className={cn(
          "flex flex-col items-center justify-between gap-2 sm:gap-4 transition-all duration-200",
          isCompact ? "py-1.5 sm:py-2" : "py-3 sm:py-6"
        )}>
          {/* Header with title and compact toggle */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 sm:gap-3 text-center flex-1">
              <Trophy className="text-primary drop-shadow size-8 sm:size-10 shrink-0" weight="fill" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-primary-foreground line-clamp-1">
                  {t('nav.title')}
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground/90 tracking-wide uppercase line-clamp-1">
                  {t('nav.subtitle')}
                </p>
              </div>
            </div>

            {/* Compact toggle button */}
            <Button
              onClick={handleCompactToggle}
              variant="outline"
              size="sm"
              aria-label={isCompact ? 'Expand header' : 'Collapse header'}
              aria-expanded={!isCompact}
              title={isCompact ? 'Expand header' : 'Collapse header'}
              className="ml-2 shrink-0 rounded-full border-primary/40 bg-primary/15 text-primary-foreground/80 hover:bg-primary/25 transition-colors"
            >
              {isCompact ? (
                <CaretUp size={16} weight="bold" />
              ) : (
                <CaretDown size={16} weight="bold" />
              )}
            </Button>
          </div>

          {/* Navigation buttons - hidden in compact mode */}
          {!isCompact && (
            <div className="header-nav-buttons flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = currentPage === link.id
                return (
                  <Button
                    key={link.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleNavigate(link.id)}
                    className={cn(
                      'sm:min-w-[160px] justify-center gap-1 sm:gap-2 rounded-full px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-base font-semibold tracking-wide shadow-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-primary/40 hover:scale-[1.03]'
                        : 'bg-primary/20 border border-primary/40 text-primary-foreground hover:bg-primary/35 hover:border-primary/60 backdrop-blur'
                    )}
                    title={link.label}
                  >
                    <Icon size={18} className="sm:size-[22px]" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </Button>
                )
              })}

              <LanguageSelector
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
                compact={false}
                ariaLabel={t('nav.language')}
              />
            </div>
          )}

          {/* Compact mode - only show icons and language selector */}
          {isCompact && (
            <div className="header-nav-buttons flex flex-wrap items-center justify-center gap-1 w-full">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = currentPage === link.id
                return (
                  <Button
                    key={link.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleNavigate(link.id)}
                    className={cn(
                      'justify-center rounded-full px-1.5 py-1.5 shadow-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-primary/40 hover:scale-[1.05]'
                        : 'bg-primary/20 border border-primary/40 text-primary-foreground hover:bg-primary/35 hover:border-primary/60 backdrop-blur'
                    )}
                    title={link.label}
                  >
                    <Icon size={16} />
                  </Button>
                )
              })}

              <LanguageSelector
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
                compact={true}
                ariaLabel={t('nav.language')}
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default memo(Navigation)

