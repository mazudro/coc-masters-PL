export interface ClanSummary {
  name: string
  tag: string
  rank: number
  stars: number
  destruction: number
  attacks: number
  wars?: number
  warsWon?: number
  warsLost?: number
  warsTied?: number
  playerCount?: number
  winRate?: number
  league?: LeagueInfo | null
}

// Custom clan type for roster builder (external/guest clans)
export interface CustomClan {
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

// App-level navigation pages
export type Page = 'home' | 'clan' | 'players' | 'about' | 'history' | 'roster-builder'

// Family-wide aggregated statistics
export interface FamilyStats {
  totalClans: number
  activeClans: number
  totalPlayers: number
  totalWars: number
  totalAttacks: number
  totalStars: number
  avgStarsPerAttack: number
  avgDestructionPercent: number
  totalDestruction: number
}

export interface StandingRound {
  won: number
  tied: number
  lost: number
}

export interface FamilyData {
  generatedAt: string
  /** Current season in YYYY-MM format */
  currentSeason?: string
  totalPlayers: number
  totalWars: number
  totalStars: number
  totalAttacks: number
  clans: ClanSummary[]
}

/** Clan detail file with ongoing season support */
export interface ClanDetailFile {
  generatedAt: string
  currentSeason?: string
  clan: {
    name: string
    tag: string
  }
  stats: {
    wars: number
    warsWon: number
    warsLost: number
    warsTied: number
    stars: number
    destruction: number
    attacks: number
    winRate: number
  }
  players: Player[]
}

/**
 * Reliability Score Breakdown for weighted reliability calculation
 * Formula: reliabilityScore = (Performance × 0.45) + (Attendance × 0.35) + (LeagueAdj × 0.20)
 */
export interface ReliabilityBreakdown {
  performance: number    // Combined offensive performance score from average stars and triple-star rate: (avgStars/3)*50 + (threeStarRate/100)*50
  attendance: number     // Attack participation rate: percentage of possible attacks completed, calculated as (attacks/wars)*100
  leagueAdj: number      // League difficulty adjustment: weighted average of CWL league difficulty based on seasons spent in each league (higher leagues contribute more)
  weighted: number       // Final weighted score
}

export interface Player {
  name: string
  tag: string
  th: number
  wars: number
  attacks: number
  stars: number
  avgStars: number | null
  triples?: number
  starBuckets?: StarBuckets
  threeStarRate?: number
  reliabilityScore?: number
  reliabilityBreakdown?: ReliabilityBreakdown
  missedAttacks?: number
  timesAttacked?: number
  starsAllowed?: number
  avgStarsAllowed?: number
  triplesAllowed?: number
  defenseQuality?: number
}

export interface StarBuckets {
  zeroStars: number
  oneStars: number
  twoStars: number
  threeStars: number
}

export interface ClanDetail extends ClanSummary {
  players: Player[]
}

export interface GlobalPlayer {
  name: string
  tag: string
  clan: string
  clanTag: string
  th: number | null
  wars: number
  stars: number
  attacks: number
  avgStars: number | null
  destruction?: number
  avgDestruction?: number
  triples?: number
  starBuckets?: StarBuckets
  threeStarRate?: number
  reliabilityScore?: number
  reliabilityBreakdown?: ReliabilityBreakdown
  missedAttacks?: number
  bestSeason?: {
    season: string
    stars: number
    avgStars: number
  }
  performanceTrend?: 'improving' | 'stable' | 'declining'
  timesAttacked?: number
  starsAllowed?: number
  avgStarsAllowed?: number
  triplesAllowed?: number
  defenseQuality?: number
}

// Season history
export interface LeagueInfo {
  tier: string
  group: number | null
}

export interface SeasonClan {
  clanName?: string
  name?: string
  clanTag?: string
  tag?: string
  stars?: number
  wins?: number
  losses?: number
  draws?: number
  position?: number
  groupPosition?: number
  leagueName?: string
}

export interface SeasonData {
  season: string
  state?: string | null
  league?: {
    tier: string
  }
  clans?: SeasonClan[]
}

export interface SeasonClanSummary {
  name: string | null
  tag: string
  rank: number
  stars: number
  destruction: number
  rounds: StandingRound
  groupPosition: number | null
}

export interface SeasonFamilyData {
  generatedAt: string
  season: string
  state: string | null
  league: LeagueInfo | null
  clans: SeasonClanSummary[]
}

export interface SeasonIndex {
  generatedAt: string
  seasons: Array<SeasonFamilyData | SeasonData>
}

/** Aggregated statistics for a specific season across all family clans */
export interface SeasonDetailStats {
  totalStars: number
  totalWins: number
  totalLosses: number
  totalTies: number
  winRate: number
  clanCount: number
  avgDestruction: number
  totalWars: number
}

// Clan season detail types
export interface SeasonWarOpponent {
  tag: string
  name: string
  clanLevel?: number
}

export interface SeasonWar {
  warTag: string
  startTime: string
  endTime: string
  teamSize: number
  result: 'win' | 'loss' | 'tie'
  starsFor: number
  starsAgainst: number
  destructionFor: number
  destructionAgainst: number
  opponent: SeasonWarOpponent
}

export interface BestAttack {
  stars: number
  destruction: number
  duration?: number
}

export interface SeasonRosterPlayer {
  tag: string
  name: string
  townHallLevel: number | null
  attacks: number
  stars: number
  destruction: number
  triples: number
  bestDestruction: number
  avgStars: number
  avgDestruction: number
  warsParticipated: number
  missedAttacks?: number
  zeroStars: number
  oneStars: number
  twoStars: number
  durationTotal?: number
  durationSamples?: number
  avgDuration?: number
  bestAttack: BestAttack
  threeStarRate?: number
  reliabilityScore?: number
  timesAttacked?: number
  starsAllowed?: number
  avgStarsAllowed?: number
  triplesAllowed?: number
  defenseQuality?: number
}

export interface SeasonClanStats {
  warsPlayed: number
  warsWon: number
  warsLost: number
  warsTied: number
  stars: number
  destruction: number
  attacks: number
  winRate?: number
  avgDefenseQuality?: number
  hardestToThreeCount?: number
}

export interface SeasonClanInfo {
  tag: string
  name: string
  clanLevel: number
}

/** CWL Group clan standings (all 8 clans in the group) */
export interface CWLGroupClan {
  tag: string
  name: string
  stars: number
  destruction: number
  wins: number
  losses: number
  ties: number
}

export interface SeasonClanDetail {
  generatedAt: string
  season: string
  clan: SeasonClanInfo
  league: LeagueInfo
  groupPosition: number
  state: string
  stats: SeasonClanStats
  wars: SeasonWar[]
  roster: SeasonRosterPlayer[]
  /** Full CWL group standings (all 8 clans) - available during ongoing seasons */
  cwlGroup?: CWLGroupClan[]
}

// Player history types
export interface PlayerSeasonStats {
  season: string
  clanTag: string
  clanName: string
  townHallLevel: number | null
  warsParticipated: number
  attacks: number
  stars: number
  triples: number
  avgStars: number
  avgDestruction: number
  zeroStars: number
  oneStars: number
  twoStars: number
  threeStarRate: number
  // Optional: enriched
  leagueTier?: string | null
}

export interface PlayerCareerStats {
  playerTag: string
  playerName: string
  currentTH: number | null
  totalWars: number
  totalAttacks: number
  totalStars: number
  totalTriples: number
  careerAvgStars: number
  careerAvgDestruction: number
  seasons: PlayerSeasonStats[]
  threeStarRate?: number
  reliabilityScore?: number
  reliabilityBreakdown?: ReliabilityBreakdown
  missedAttacks?: number
  bestSeason?: {
    season: string
    stars: number
    avgStars: number
  }
  performanceTrend?: 'improving' | 'stable' | 'declining'
  totalTimesAttacked?: number
  totalStarsAllowed?: number
  careerAvgStarsAllowed?: number
  totalTriplesAllowed?: number
  careerDefenseQuality?: number
}

// Roster builder types
export interface RosterPlayerStats {
  playerTag: string
  playerName: string
  clanTag: string
  clanName: string
  currentTH: number | null
  seasonsPlayed: number
  totalWars: number
  totalAttacks: number
  totalStars: number
  avgStars: number
  threeStarRate: number
  reliabilityScore: number
  missedAttacks?: number
}

export interface RosterBuildConfig {
  lastNSeasons: number
  filterClan: string | null
  filterTH: number | null
  minWars: number
  minAvgStars: number
}

// Roster mode for 15v15 or 30v30 wars
export type RosterMode = '15v15' | '30v30'

// Manual player entry for emergency additions
export interface ManualPlayerEntry {
  name: string
  tag: string | null
  th: number
  estimatedAvgStars: number
  notes?: string
  manualEntry: true  // Flag to distinguish from DB players
  addedAt: string    // ISO timestamp
}

// League-adjusted projection result
export interface LeagueProjection {
  projectedStars: number
  adjustment: number  // -15 to +10 (percentage)
  confidence: 'high' | 'medium' | 'low'
  historicalLeague: string | null
}

// War timeline types
export interface WarAttack {
  attackerTag: string
  attackerName: string
  attackerTH: number
  attackerMapPosition: number
  defenderTag: string
  defenderName: string
  defenderTH: number
  defenderMapPosition: number
  stars: number
  destructionPercentage: number
  duration: number
  order: number
  side: 'clan' | 'opponent'
}

export interface WarMemberSummary {
  tag: string
  name: string
  townhallLevel: number
  mapPosition: number
  attacks: WarAttack[]
  stars: number
  destruction: number
  opponentAttacks: number
  bestOpponentAttack?: {
    stars: number
    destructionPercentage: number
    attackerName: string
  }
}

export interface WarTimeline {
  generatedAt: string
  season: string
  warTag: string
  startTime: string
  endTime: string
  teamSize: number
  result: 'win' | 'loss' | 'tie'
  clan: {
    tag: string
    name: string
    clanLevel: number
    stars: number
    destructionPercentage: number
    attacks: number
    members: WarMemberSummary[]
  }
  opponent: {
    tag: string
    name: string
    clanLevel: number
    stars: number
    destructionPercentage: number
    attacks: number
    members: WarMemberSummary[]
  }
  attackTimeline: WarAttack[]
}
