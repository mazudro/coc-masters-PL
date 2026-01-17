# CoC Masters PL CWL Dashboard - Architecture Guide

## Overview

The CoC Masters PL CWL Dashboard is a modern single-page application (SPA) built with **Vite** and **React 19**, deployed on **Vercel**. It aggregates Clan War League statistics for three clans within the CoC Masters PL family and presents them through an intuitive, bilingual interface (Polish/English).

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Router**: React Router v6 (client-side SPA routing)
- **Styling**: Tailwind CSS v4 with custom theme
- **UI Components**: shadcn/ui + Radix UI primitives
- **Icons**: Phosphor React + Lucide React
- **Internationalization**: i18next + react-i18next
- **Data Fetching**: TanStack React Query (optional)
- **Animations**: Framer Motion

### Backend / Data
- **Static Data**: JSON files in `public/data/`
- **Data Pipeline**: TypeScript build script (`scripts/build-data.ts`)
- **Source Format**: Excel workbook (`data-src/cwl-stats.xlsx`)
- **Processing**: ExcelJS library for workbook parsing

### Deployment
- **Hosting**: Vercel (static + SPA rewrite)
- **CLI**: Vercel CLI 50.1.3
- **Configuration**: `vercel.json` (SPA fallback for routing)
- **Analytics**: Vercel Analytics integration

## Project Structure

```
coc-masters-pl/
├── src/
│   ├── main.tsx              # Vite entry point + React Router setup
│   ├── App.tsx               # Root component with Routes
│   ├── index.css             # Tailwind imports + custom utilities
│   ├── main.css              # Global styles
│   ├── i18n.ts               # i18next initialization
│   ├── ErrorFallback.tsx      # Error boundary fallback
│   │
│   ├── pages/                # Route-level components
│   │   ├── HomePage.tsx      # Family standings & clan overview
│   │   ├── PlayersPage.tsx   # Global player leaderboard
│   │   ├── ClanPage.tsx      # Clan detail view with player table
│   │   └── AboutPage.tsx     # About + family info
│   │
│   ├── components/           # Reusable UI components
│   │   ├── Navigation.tsx    # Top navigation bar
│   │   ├── BackgroundLogo.tsx
│   │   ├── ClanCard.tsx
│   │   ├── KpiBar.tsx
│   │   ├── PlayerStarsTable.tsx
│   │   ├── RankBadge.tsx
│   │   ├── StandingsTable.tsx
│   │   ├── WarStatus.tsx
│   │   └── ui/              # shadcn/ui primitives (auto-generated)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── table.tsx
│   │       ├── select.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── data.ts          # Data fetching helpers (JSON loader)
│   │   ├── types.ts         # Shared TypeScript types
│   │   └── utils.ts         # Utility functions (cn, etc.)
│   │
│   ├── locales/             # i18n translation files
│   │   ├── en.json
│   │   └── pl.json
│   │
│   ├── styles/
│   │   └── theme.css        # Tailwind theme customization
│   │
│   ├── assets/              # Static images, logos
│   │   └── Masters-logo.svg
│   │
│   └── hooks/
│       └── use-mobile.ts    # Mobile breakpoint detection
│
├── scripts/
│   └── build-data.ts        # ExcelJS → JSON transformation
│
├── public/
│   ├── data/                # Generated JSON feeds
│   │   ├── family.json      # Family-wide standings
│   │   ├── players.json     # Global player leaderboard
│   │   └── clans/
│   │       ├── P0J2J8GJ.json     # coc masters PL
│   │       ├── JPRPRVUY.json     # Akademia CoC PL
│   │       └── 29RYVJ8C8.json    # Psychole!
│   │
│   └── (static assets served by Vercel)
│
├── data-src/
│   └── cwl-stats.xlsx       # Source of truth for CWL data
│
├── dist/                    # Build output (Vite)
│
├── .vercel/
│   └── project.json        # Vercel project metadata
│
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── vercel.json             # Vercel SPA rewrite config
├── tailwind.config.js      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── package.json
├── package-lock.json
├── README.md               # User-facing overview
├── ARCHITECTURE.md         # This file
├── DEVELOPMENT.md          # Development workflow
├── DEPLOYMENT.md           # Deployment & CI/CD guide
├── COPILOT_INSTRUCTIONS.md # Copilot agent instructions
└── LICENSE

```

## Core Data Flow

### 1. Build-Time Data Pipeline

```
data-src/cwl-stats.xlsx
         ↓
[scripts/build-data.ts runs via npm run prebuild]
         ↓
Parses Excel sheets:
  - "Ranking - <ClanName>" sheets → clan standings
  - "<ClanName> (...)" sheets → player data per clan
         ↓
Generates & writes JSON:
  - public/data/family.json (family standings, total stars)
  - public/data/players.json (global leaderboard)
  - public/data/clans/{clanTag}.json (per-clan detail + players)
         ↓
npm run build completes
```

### 2. Runtime Data Loading

```
Browser loads https://coc-masters-pl.vercel.app/
         ↓
React app initializes with BrowserRouter
         ↓
HomePage component fetches from public/data/:
  - getFamilyData() → family.json
  - getClanDetail(tag) → clans/{tag}.json
  - getPlayersList() → players.json
         ↓
React state manages current page & clan selection
         ↓
Navigation buttons trigger useNavigate() → /players, /about, /clan/:tag
         ↓
SPA routing handled client-side by React Router
```

## Routing Architecture

### URL Structure

| Route | Component | Data Source | Purpose |
|-------|-----------|-------------|---------|
| `/` | HomePage | `family.json` | Family standings, clan cards |
| `/players` | PlayersPage | `players.json` | Global leaderboard with search |
| `/about` | AboutPage | Static (hardcoded) | Family info, clan list, stats explanation |
| `/clan/:clanTag` | ClanPage | `clans/{clanTag}.json` | Clan KPIs, player table, details |

### Client-Side Routing (React Router)

```tsx
<BrowserRouter>
  <App>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/players" element={<PlayersPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/clan/:clanTag" element={<ClanPage />} />
    </Routes>
  </App>
</BrowserRouter>
```

### SPA Rewrite (Vercel)

File: `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Purpose**: All requests (except static files) return `index.html`, allowing React Router to handle routing on the client.

## Internationalization (i18n)

### Setup
- **Library**: i18next + react-i18next
- **Language Detector**: Browser language detection + localStorage persistence
- **Default**: Polish (pl)
- **Fallback**: English (en)

### Files
- `src/locales/en.json` – English translations
- `src/locales/pl.json` – Polish translations
- `src/i18n.ts` – i18next configuration

### Usage
```tsx
import { useTranslation } from 'react-i18next'

export function MyComponent() {
  const { t, i18n } = useTranslation()
  return <h1>{t('nav.title')}</h1>
}
```

### Adding New Keys
1. Add key to both `src/locales/en.json` and `src/locales/pl.json`
2. Use `t('path.to.key')` in components
3. Optional: Update storage with `i18n.changeLanguage(lang)`

## Styling Architecture

### Tailwind CSS v4
- **Base Theme**: `src/styles/theme.css` & `src/index.css`
- **Color Palette**: Dark theme with custom oklch colors
- **Spacing**: Default Tailwind scale + custom vars
- **Radius**: `--radius` var (1rem, customizable)

### Theme Variables (index.css)
```css
:root {
  --background: oklch(0.12 0.015 250);      /* Dark navy */
  --foreground: oklch(0.95 0 0);             /* Off-white */
  --primary: oklch(0.55 0.25 250);           /* Blue */
  --secondary: oklch(0.82 0.24 135);         /* Lime green */
  --accent: oklch(0.60 0.28 340);            /* Red/magenta */
  --destructive: oklch(0.55 0.25 25);        /* Orange-red */
  /* ... other colors ... */
}
```

### Components
- **shadcn/ui**: Unstyled Radix primitives (fully customizable)
- **Custom Utilities**:
  - `.glow-primary`, `.glow-secondary`, `.glow-accent` – Box shadows
  - `.brand-bg-logo` – Background logo with transparency

## Type System

### Core Types (`src/lib/types.ts`)

```typescript
interface ClanRow {
  name: string
  tag: string
  rank: number
  stars: number
  destruction: number
  attacks: number
}

interface PlayerRow {
  name: string
  playerTag: string
  th: number | null          // Town Hall level
  wars: number | null        // Wars participated
  attacks: number | null     // Attacks made
  stars: number              // Total stars earned
  avgStars: number | null    // Average stars per attack
}

interface ClanDetail extends ClanRow {
  players: PlayerRow[]
}

interface FamilyData {
  generatedAt: string        // ISO timestamp
  totalFamilyStars: number
  clans: ClanRow[]
}
```

## Build & Deployment Workflow

### Local Development
```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Full build (prebuild + tsc + vite build)
npm run preview          # Preview production build locally
```

### Production Build Process
```
$ npm run build
  ↓
  1. npm run prebuild (scripts/build-data.ts)
     → Regenerates JSON in public/data/
  ↓
  2. tsc -b --noCheck
     → Type-check TypeScript
  ↓
  3. vite build
     → Bundles React + assets → dist/
     → Outputs: index.html, assets/*.js, assets/*.css, assets/*.svg
  ↓
  dist/ ready for deployment
```

### Vercel Deployment
```bash
$ vercel --prod --yes
  ↓
  Detects Vite project
  ↓
  Runs build command (npm run build)
  ↓
  Uploads dist/ to Vercel CDN
  ↓
  Applies vercel.json rewrite rules
  ↓
  Live at https://coc-masters-pl.vercel.app/
```

## Key Features & Patterns

### 1. Error Handling
- **Error Boundary**: `ErrorFallback` component wraps app
- **Graceful Degradation**: Data fetch failures show fallback UI
- **Clan Not Found**: ClanPage displays message + back button

### 2. Data Fetching
- **No Runtime API Calls**: All data pre-built as static JSON
- **Async Data**: Fetched lazily on route/component mount
- **Caching**: Browser cache + localStorage for preferences

### 3. Performance Optimizations
- **Static Output**: No server computation (edge-friendly)
- **Code Splitting**: Vite auto-chunks by route (lazy load)
- **CSS**: Single optimized bundle (Tailwind v4 purges unused)
- **Image**: SVG logos, minimal external assets

### 4. Mobile Responsiveness
- **Tailwind Breakpoints**: md (768px) primary breakpoint
- **Mobile Hook**: `use-mobile.ts` for responsive logic
- **Layouts**: Responsive grid + flex with Tailwind utilities

## Environment Variables

**No required environment variables** for the core app. Optional:
- `VITE_*` – Exposed to browser via Vite (define in .env.local)
- `VERCEL_*` – Auto-injected by Vercel (build metadata)

If analytics or external APIs are added:
1. Add to Vercel Environment Variables panel
2. Reference via `import.meta.env.VITE_KEY`
3. Update `.env.local` for local dev

## Common Tasks

### Update CWL Data
1. Replace `data-src/cwl-stats.xlsx` with latest
2. Run `npm run prebuild` → regenerates `public/data/`
3. Commit changes
4. Deploy via `vercel --prod`

### Add New i18n Keys
1. Add to `src/locales/en.json` & `src/locales/pl.json`
2. Use `t('key.path')` in components
3. No rebuild needed (loaded at runtime)

### Add New Route
1. Create page component in `src/pages/`
2. Add `<Route path="/path" element={<Component />} />` to App.tsx
3. Add nav button to Navigation.tsx
4. Test routing with React Router

### Customize Theme
1. Edit `src/index.css` CSS variables
2. Or update `tailwind.config.js` for Tailwind-specific settings
3. Changes hot-reload in dev mode

## Known Limitations & Future Improvements

### Current Limitations
- Excel-based data workflow (manual upload)
- No real-time updates (rebuild required)
- Single-family scope (hardcoded clan tags)
- Polish/English only

### Potential Enhancements
- API integration for live data
- Admin dashboard for data management
- More languages (i18n)
- Advanced filtering/search
- Export functionality (CSV, PDF)
- Dark/light mode toggle
- Mobile app (React Native)

## Debugging & Troubleshooting

### Routes return 404
- Check `vercel.json` is deployed
- Ensure React Router is wrapping app in `main.tsx`
- Verify `BrowserRouter` initialization

### Data not updating
- Ensure `data-src/cwl-stats.xlsx` exists
- Run `npm run prebuild` manually
- Check `public/data/` for JSON files
- Verify build includes `public/` folder

### Styling issues
- Clear `dist/` and rebuild (`npm run build`)
- Check Tailwind config is correct
- Verify CSS variables in `index.css`
- Use browser DevTools to inspect class names

### i18n not switching
- Check localStorage for `i18n.language` key
- Verify translation keys exist in both locale files
- Check console for i18next warnings
- Reload page after language change

## Contact & Maintenance

- **Repository**: https://github.com/mazudro/coc-masters-pl
- **Deployed**: https://coc-masters-pl.vercel.app
- **Owner**: CoC Masters PL family
- **Last Updated**: January 2025
