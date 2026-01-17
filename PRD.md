# CoC Masters PL CWL Results Platform

A modern esports statistics showcase website for the CoC Masters PL family of Clash of Clans clans, displaying Clan War League results with comprehensive family standings, individual clan performance, and player leaderboards.

**Experience Qualities**:
1. **Professional** - Tournament-grade statistics presentation that commands respect and showcases competitive excellence
2. **Energetic** - Dynamic visual hierarchy with electric accents that capture the intensity of esports competition
3. **Scannable** - Information-dense layouts optimized for quick performance comparisons and stat discovery

**Complexity Level**: Light Application (multiple features with basic state)
- Multiple interconnected views with routing, sortable tables, search functionality, and persistent navigation state across clan statistics pages

## Essential Features

### Family Standings Dashboard
- **Functionality**: Displays aggregate statistics for all three CoC Masters PL clans sorted by total stars earned
- **Purpose**: Provides at-a-glance family-wide performance and competitive rankings
- **Trigger**: Landing on home page
- **Progression**: View sorted standings table → See rank badges and star counts → Click clan card → Navigate to detailed clan page
- **Success criteria**: All six clans display with correct stars, ranks, destruction percentages; sorting persists; cards are clickable

### Clan Detail Pages
- **Functionality**: Deep-dive into individual clan performance with KPIs and complete player roster statistics
- **Purpose**: Enables clan leaders and members to analyze attack efficiency and player contributions
- **Trigger**: Clicking clan card from home or navigating via URL
- **Progression**: Select clan → View header with logo/tag → Review KPI metrics → Sort player table by stars → Identify top performers
- **Success criteria**: KPIs calculate correctly from player data; player table sorts by stars descending; all attacks/stars aggregate properly

### Global Players Leaderboard
- **Functionality**: Unified ranking of all players across the CoC Masters PL family by total stars earned
- **Purpose**: Recognizes top individual performers and enables cross-clan talent scouting
- **Trigger**: Clicking "Players" in navigation
- **Progression**: Navigate to leaderboard → View sorted by stars → Use search to filter by name → Identify clan affiliations
- **Success criteria**: Players from all clans appear; search filters in real-time; sorting maintains ties by name alphabetically

### Data Import System
- **Functionality**: Build-time processing of XLSX files into optimized JSON for static hosting
- **Purpose**: Converts complex spreadsheet data into web-friendly format without runtime dependencies
- **Trigger**: Running build script before deployment
- **Progression**: Place XLSX in /data/cwl → Run build script → Parse sheets → Normalize player/clan data → Generate JSON files → Serve statically
- **Success criteria**: Script handles Polish characters; maps clan sheets correctly; generates family.json, players.json, and individual clan JSONs

## Edge Case Handling

- **Missing XLSX files**: Build script generates placeholder data from samples; displays notice banner on site
- **Duplicate player names**: Differentiate by player tag in display (show tag on hover)
- **Zero attacks**: Display "—" instead of 0.0 average; gray out row styling
- **Mobile narrow tables**: Stack rows vertically under 420px with emphasized name/stars
- **Invalid clan tags in URL**: Redirect to home with toast notification
- **Search with no results**: Display "No players found" with clear-search button

## Design Direction

The design should feel like a premium esports tournament dashboard—dark, electric, and unapologetically competitive. Think Valorant's UI meets League of Legends' stat screens: high contrast, aggressive accents, and information density that respects the user's time. Interface should be rich with visual hierarchy but minimal in decoration.

## Color Selection

**Triadic** - Electric Blue, Neon Green, Magenta positioned equally around the color wheel to create vibrant, high-energy contrast suitable for different clan identities

- **Primary Color**: Electric Blue `oklch(0.55 0.25 250)` - Main brand color representing the core CoC Masters PL identity; used for primary CTAs and active states
- **Secondary Colors**: 
  - Neon Green `oklch(0.82 0.24 135)` - Supporting color for success states
  - Magenta `oklch(0.60 0.28 340)` - Accent for emphasis elements
- **Accent Color**: Electric Blue (same as primary) `oklch(0.55 0.25 250)` - Highlights for table headers, rank badges, and interactive elements
- **Foreground/Background Pairings**:
  - Background (Deep Space `oklch(0.12 0.015 250)`): Light text `oklch(0.95 0 0)` - Ratio 14.2:1 ✓
  - Card (Dark Surface `oklch(0.16 0.015 250)`): Light text `oklch(0.95 0 0)` - Ratio 11.8:1 ✓
  - Primary (Electric Blue `oklch(0.55 0.25 250)`): White text `oklch(1 0 0)` - Ratio 5.2:1 ✓
  - Muted (Border Gray `oklch(0.25 0.01 250)`): Muted text `oklch(0.60 0.01 250)` - Ratio 4.7:1 ✓
  - Accent (Electric Blue `oklch(0.55 0.25 250)`): White text `oklch(1 0 0)` - Ratio 5.2:1 ✓

## Font Selection

Typography should be bold, authoritative, and optimized for scanning numerical data—choose **Inter** for its exceptional clarity at all sizes and superior tabular figure rendering.

- **Typographic Hierarchy**:
  - H1 (Page Title): Inter Bold/36px/tight letter-spacing (-0.02em) - Main page headers
  - H2 (Section Header): Inter SemiBold/24px/tight letter-spacing (-0.01em) - Clan names, table headers
  - H3 (Card Title): Inter SemiBold/18px/normal - KPI labels, card headers
  - Body (Data): Inter Medium/16px/tabular-nums - Player names, numerical stats
  - Caption (Meta): Inter Regular/14px/normal - Tags, secondary info
  - Stat Display (Large Numbers): Inter Bold/48px/tight/tabular-nums - Total family stars

## Animations

Animations should feel snappy and competitive—quick transitions that guide attention without slowing navigation, like UI feedback in a tactical shooter.

- **Purposeful Meaning**: Table row hover animations subtly elevate the row with a glow effect (150ms), reinforcing interactivity; rank badges pulse briefly on load to draw attention to achievements
- **Hierarchy of Movement**: Primary focus on table sorting transitions (200ms) and page navigation fades (250ms); secondary micro-interactions on hover states (100ms); page load reveals stagger individual rows (50ms offset per row)

## Component Selection

- **Components**: 
  - Table (shadcn) - Modified with sticky header, custom hover states, and sortable columns for standings and player rosters
  - Card (shadcn) - Clan stat cards with custom gradient overlays and glass morphism effects
  - Badge (shadcn) - Rank indicators with dynamic color coding (gold/silver/bronze for top 3)
  - Input (shadcn) - Search field for player leaderboard with icon prefix
  - Button (shadcn) - Navigation and action buttons with electric glow on hover
  - Tabs (shadcn) - Future season selector with animated indicator
  
- **Customizations**: 
  - GradientCard component - Extends Card with clan-specific accent gradients
  - RankBadge component - Custom badge with medal icons and dynamic coloring
  - StatDisplay component - Large numerical displays with animated counting
  - SortableTableHeader component - Table header cells with sort indicators
  
- **States**: 
  - Buttons: Default (subtle border), Hover (accent glow + lift), Active (pressed inset), Focus (ring in accent color)
  - Table rows: Default (transparent), Hover (elevated with accent glow), Active (accent background at 10% opacity)
  - Search input: Default (muted border), Focus (accent border + glow), Filled (border remains accented)
  
- **Icon Selection**: 
  - Trophy (rank/achievement), Star (stars metric), Target (attacks), TrendingUp (destruction), Search (player search), ChevronUp/Down (table sorting), ArrowRight (navigation)
  
- **Spacing**: 
  - Page padding: px-6 md:px-12 (24px/48px)
  - Section gaps: space-y-8 (32px vertical rhythm)
  - Card padding: p-6 (24px internal)
  - Table cell padding: px-4 py-3 (16px/12px)
  - Component gaps: gap-4 (16px between related elements)
  
- **Mobile**: 
  - Tables transform to stacked cards showing Name (prominent), Stars (large), and TH/Attacks (secondary) on <420px
  - Navigation becomes bottom-fixed tab bar on mobile
  - KPI bar stacks 2x2 grid instead of horizontal on <768px
  - Clan cards go single column on mobile with full-width CTAs
