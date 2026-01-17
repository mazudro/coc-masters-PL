import { BackgroundLogo } from '@/components/BackgroundLogo'
import { Navigation } from '@/components/Navigation'
import { Toaster } from '@/components/ui/sonner'
import { Page } from '@/lib/types'
import { CircleNotch } from '@phosphor-icons/react'
import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

// Lazy load all page components for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const ClanPage = lazy(() => import('@/pages/ClanPage').then(m => ({ default: m.ClanPage })))
const PlayersPage = lazy(() => import('@/pages/PlayersPage').then(m => ({ default: m.PlayersPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const SeasonDetailPage = lazy(() => import('@/pages/SeasonDetailPage').then(m => ({ default: m.SeasonDetailPage })))
const ClanSeasonDetailPage = lazy(() => import('@/pages/ClanSeasonDetailPage').then(m => ({ default: m.ClanSeasonDetailPage })))
const WarDetailPage = lazy(() => import('@/pages/WarDetailPage').then(m => ({ default: m.WarDetailPage })))
const PlayerHistoryPage = lazy(() => import('@/pages/PlayerHistoryPage').then(m => ({ default: m.PlayerHistoryPage })))
const RosterBuilderPage = lazy(() => import('@/pages/RosterBuilderPage').then(m => ({ default: m.RosterBuilderPage })))

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
      <CircleNotch size={48} className="text-primary animate-spin" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // Determine current page from URL pathname
  const getCurrentPage = (): Page => {
    if (location.pathname.startsWith('/clan')) return 'clan'
    if (location.pathname === '/players') return 'players'
    if (location.pathname === '/about') return 'about'
    if (location.pathname === '/history' || location.pathname.startsWith('/history/')) return 'history'
    if (location.pathname === '/roster-builder') return 'roster-builder'
    if (location.pathname.startsWith('/player/')) return 'players'
    return 'home'
  }

  const navigateTo = (page: Page) => {
    switch (page) {
      case 'clan':
        navigate('/')
        break
      case 'players':
        navigate('/players')
        break
      case 'about':
        navigate('/about')
        break
      case 'history':
        navigate('/history')
        break
      case 'roster-builder':
        navigate('/roster-builder')
        break
      case 'home':
      default:
        navigate('/')
    }
  }

  const navigateToClan = (clanTag: string) => {
    const encodedTag = encodeURIComponent(clanTag.replace('#', ''))
    navigate(`/clan/${encodedTag}`)
  }

  const handleClanBack = () => {
    navigate('/')
  }

  const currentPage = getCurrentPage()

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <BackgroundLogo />

      <div className="relative z-10">
        <Navigation
          currentPage={currentPage}
          onNavigate={navigateTo}
        />

        <main className="container mx-auto px-6 md:px-12 py-12">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route
                path="/"
                element={<HomePage onNavigateToClan={navigateToClan} />}
              />
              <Route
                path="/clan/:clanTag"
                element={<ClanPage onBack={handleClanBack} />}
              />
              <Route
                path="/players"
                element={<PlayersPage />}
              />
              <Route
                path="/about"
                element={<AboutPage />}
              />
              <Route
                path="/history"
                element={<HistoryPage />}
              />
              <Route
                path="/history/:season"
                element={<SeasonDetailPage />}
              />
              <Route
                path="/history/:season/clan/:tag"
                element={<ClanSeasonDetailPage />}
              />
              <Route
                path="/history/:season/clan/:tag/war/:endTime"
                element={<WarDetailPage />}
              />
              <Route
                path="/player/:playerTag"
                element={<PlayerHistoryPage />}
              />
              <Route
                path="/roster-builder"
                element={<RosterBuilderPage />}
              />
            </Routes>
          </Suspense>
        </main>
      </div>

      <Toaster />
    </div>
  )
}

export default App
