import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calculator,
  ChartLine,
  Fire,
  Gear,
  GraduationCap,
  LightbulbFilament,
  Medal,
  ShieldCheck,
  SmileyWink,
  Sparkle,
  Users,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

/**
 * AboutPage Component
 * 
 * A comprehensive documentation page for the CoC Masters PL CWL Roster Builder tool.
 * Provides detailed information about team building strategies, reliability scoring system,
 * weighting mechanisms, and auto-distribution algorithms.
 * 
 * @component
 * @returns {JSX.Element} A multi-tab interface containing:
 *   - **Intro Tab**: Overview of the CWL Roster Builder tool and its core features (analysis, automation, balance)
 *   - **Reliability Tab**: Detailed explanation of the reliability scoring system combining performance (45%), attendance (35%), and league tier (20%)
 *   - **Weights & Scoring Tab**: Documentation of scoring metrics - reliability (45%), star average (35%), and 3-star percentage (20%)
 *   - **Form & Rankings Tab**: Documentation of the Form calculation formula and player ranking system
 *   - **League Projection Tab**: Documentation of league tier adjustments and predicted stars calculation
 *   - **Auto-Distribute Tab**: Step-by-step explanation of the auto-distribution algorithm and TH requirements for each clan
 *   - **Features Tab**: Highlights of advanced functionality including clan locking, player marking, filtering, sorting, and data export
 *   - **Tips Tab**: Best practices for clan leaders and regular players to optimize team composition and improve reliability scores
 *   - **Examples Tab**: Real-world comparison between "Solid" and "Elite" players demonstrating reliability calculation differences
 *   - **FAQ Tab**: Common questions and answers about the tool's functionality and data accuracy
 * 
 * @example
 * return <AboutPage />
 * 
 * @remarks
 * - Supports both Polish (pl) and English (en) via i18next
 * - Uses Phosphor icons for visual hierarchy and engagement
 * - Fully responsive design with mobile-first approach
 * - Implements shadcn/ui components (Card, Tabs, TabsList, TabsTrigger, TabsContent)
 * - Utilizes Tailwind CSS for styling with gradient backgrounds and hover states
 */
export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 pb-12">
      {/* Hero Section */}
      <section className="relative py-12 px-4 mb-12 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-primary/5" />
        <div className="relative max-w-5xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-8 h-8 text-primary" weight="fill" />
            <h1 className="text-5xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t('aboutRoster.title')}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('aboutRoster.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4">
        <Tabs defaultValue="intro" className="w-full">
          {/* Tabs Navigation */}
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 bg-muted/50 p-3 rounded-lg h-auto">
              <TabsTrigger value="intro" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><Sparkle weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.intro')}</span>
              </TabsTrigger>
              <TabsTrigger value="reliability" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><ShieldCheck weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.reliability')}</span>
              </TabsTrigger>
              <TabsTrigger value="weights" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><Calculator weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.weights')}</span>
              </TabsTrigger>
              <TabsTrigger value="form" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><Fire weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.form')}</span>
              </TabsTrigger>
              <TabsTrigger value="league" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><Medal weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.league')}</span>
              </TabsTrigger>
              <TabsTrigger value="autodistribute" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><Gear weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.autodistribute')}</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><Sparkle weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.features')}</span>
              </TabsTrigger>
              <TabsTrigger value="tips" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><LightbulbFilament weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.tips')}</span>
              </TabsTrigger>
              <TabsTrigger value="examples" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><ChartLine weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.examples')}</span>
              </TabsTrigger>
              <TabsTrigger value="faq" className="text-sm sm:text-base flex items-center gap-2 px-4 py-4 h-14">
                <span className="hidden sm:inline"><SmileyWink weight="fill" /></span>
                <span className="truncate">{t('aboutRoster.tabs.faq')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Intro Tab */}
          <TabsContent value="intro" className="space-y-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkle weight="fill" className="text-primary" />
                  {t('aboutRoster.intro.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {t('aboutRoster.intro.description')}
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="font-bold text-primary mb-2">📊 {t('aboutRoster.intro.analysis')}</div>
                    <p className="text-sm text-muted-foreground">{t('aboutRoster.intro.analysisDesc')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="font-bold text-primary mb-2">🤖 {t('aboutRoster.intro.automation')}</div>
                    <p className="text-sm text-muted-foreground">{t('aboutRoster.intro.automationDesc')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="font-bold text-primary mb-2">⚖️ {t('aboutRoster.intro.balance')}</div>
                    <p className="text-sm text-muted-foreground">{t('aboutRoster.intro.balanceDesc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reliability Tab */}
          <TabsContent value="reliability" className="space-y-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <ShieldCheck weight="fill" className="text-blue-500" />
                  {t('aboutRoster.reliability.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {t('aboutRoster.reliability.description')}
                  </p>

                  {/* Three Factors */}
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
                      <div className="font-bold text-primary mb-2">⚔️ {t('aboutRoster.reliability.performance')} (45%)</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.reliability.performanceDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        {t('aboutRoster.reliability.performanceFormula')}
                      </code>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
                      <div className="font-bold text-primary mb-2">✅ {t('aboutRoster.reliability.attendance')} (35%)</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.reliability.attendanceDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        {t('aboutRoster.reliability.attendanceFormula')}
                      </code>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
                      <div className="font-bold text-primary mb-2">🏆 {t('aboutRoster.reliability.league')} (20%)</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.reliability.leagueDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        {t('aboutRoster.reliability.leagueFormula')}
                      </code>
                    </div>
                  </div>

                  {/* Formula */}
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-6">
                    <p className="text-sm font-mono text-foreground mb-2">{t('aboutRoster.formula')}:</p>
                    <code className="text-lg font-bold text-primary block">
                      {t('aboutRoster.reliability.formula')}
                    </code>
                  </div>

                  {/* Interpretation */}
                  <div className="space-y-2 mt-6">
                    <p className="font-semibold">{t('aboutRoster.reliability.interpretation')}:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                        <span className="text-lg">⭐</span>
                        <span className="text-sm"><strong>90-100%:</strong> {t('aboutRoster.reliability.elite')}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <span className="text-lg">⭐⭐</span>
                        <span className="text-sm"><strong>75-89%:</strong> {t('aboutRoster.reliability.solid')}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <span className="text-lg">⭐⭐⭐</span>
                        <span className="text-sm"><strong>60-74%:</strong> {t('aboutRoster.reliability.average')}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm"><strong>{t('aboutRoster.reliability.below60')}:</strong> {t('aboutRoster.reliability.needsImprovement')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weights Tab */}
          <TabsContent value="weights" className="space-y-6">
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Calculator weight="fill" className="text-amber-500" />
                  {t('aboutRoster.weights.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    {t('aboutRoster.weights.description')}
                  </p>

                  {/* Weights Table */}
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 font-semibold">{t('aboutRoster.weights.metric')}</th>
                          <th className="text-center py-3 px-3 font-semibold">{t('aboutRoster.weights.weight')}</th>
                          <th className="text-left py-3 px-3 font-semibold">{t('aboutRoster.weights.descriptionCol')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-3">{t('aboutRoster.weights.reliability')}</td>
                          <td className="text-center py-3 px-3">
                            <span className="bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">45%</span>
                          </td>
                          <td className="py-3 px-3">{t('aboutRoster.weights.reliabilityDesc')}</td>
                        </tr>
                        <tr className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-3">{t('aboutRoster.weights.avgStars')}</td>
                          <td className="text-center py-3 px-3">
                            <span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded-full font-bold">35%</span>
                          </td>
                          <td className="py-3 px-3">{t('aboutRoster.weights.avgStarsDesc')}</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="py-3 px-3">{t('aboutRoster.weights.threeStarRate')}</td>
                          <td className="text-center py-3 px-3">
                            <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-bold">20%</span>
                          </td>
                          <td className="py-3 px-3">{t('aboutRoster.weights.threeStarRateDesc')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Example Calculation */}
                  <Card className="bg-muted/30 border-dashed mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">{t('aboutRoster.weights.exampleTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold text-primary mb-2">{t('aboutRoster.weights.examplePlayer')}:</p>
                        <ul className="space-y-1 text-muted-foreground ml-4">
                          <li>• {t('aboutRoster.weights.reliability')}: 85</li>
                          <li>• {t('aboutRoster.weights.avgStars')}: 2.4 (0.80 {t('aboutRoster.weights.afterScaling')})</li>
                          <li>• {t('aboutRoster.weights.threeStarRate')}: 35% (0.35 {t('aboutRoster.weights.afterScaling')})</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-background rounded border border-border">
                        <code className="text-xs text-foreground">
                          {t('aboutRoster.weights.score')} = (0.85 × 0.45) + (0.80 × 0.35) + (0.35 × 0.20)<br />
                          = 0.3825 + 0.28 + 0.07 = 73.25 {t('aboutRoster.weights.outOf100')}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Form & Rankings Tab */}
          <TabsContent value="form" className="space-y-6">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Fire weight="fill" className="text-orange-500" />
                  {t('aboutRoster.form.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {t('aboutRoster.form.description')}
                  </p>

                  {/* Form Components */}
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
                      <div className="font-bold text-orange-500 mb-2">⭐ {t('aboutRoster.form.avgStars')} (70%)</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.form.avgStarsDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        avgStars × 0.7 → max 2.1
                      </code>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
                      <div className="font-bold text-orange-500 mb-2">🎯 {t('aboutRoster.form.threeStarRate')} (20%)</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.form.threeStarRateDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        threeStarRate × 0.003 → max 0.3
                      </code>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
                      <div className="font-bold text-orange-500 mb-2">🛡️ {t('aboutRoster.form.reliability')} (10%)</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.form.reliabilityDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        reliability × 0.002 → max 0.2
                      </code>
                    </div>
                  </div>

                  {/* Main Formula */}
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 mt-6">
                    <p className="text-sm font-mono text-foreground mb-2">{t('aboutRoster.formula')}:</p>
                    <code className="text-lg font-bold text-orange-500 block">
                      Form = [(avgStars × 0.7) + (3★% × 0.003) + (reliability × 0.002)] × warsFactor
                    </code>
                  </div>

                  {/* Wars Factor Explanation */}
                  <Card className="bg-muted/30 border-dashed mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">{t('aboutRoster.form.warsFactorTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">
                        {t('aboutRoster.form.warsFactorDesc')}
                      </p>
                      <div className="p-3 bg-background rounded border border-border">
                        <code className="text-xs text-foreground">
                          {t('aboutRoster.form.minWars')}: 7 ({t('aboutRoster.form.oneSeason')})<br />
                          warsFactor = totalWars ≥ 7 ? 1.0 : (totalWars / 7) × 0.8
                        </code>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                          <span className="text-lg">✅</span>
                          <span className="text-sm"><strong>7+ {t('aboutRoster.form.wars')}:</strong> {t('aboutRoster.form.fullWeight')}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                          <span className="text-lg">⚠️</span>
                          <span className="text-sm"><strong>3-6 {t('aboutRoster.form.wars')}:</strong> {t('aboutRoster.form.partialWeight')}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                          <span className="text-lg">❌</span>
                          <span className="text-sm"><strong>1-2 {t('aboutRoster.form.wars')}:</strong> {t('aboutRoster.form.lowWeight')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* League Projection Tab */}
          <TabsContent value="league" className="space-y-6">
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Medal weight="fill" className="text-indigo-500" />
                  {t('aboutRoster.league.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {t('aboutRoster.league.description')}
                  </p>

                  {/* League Tiers */}
                  <Card className="bg-muted/30 border-dashed mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">{t('aboutRoster.league.tiersTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Gold III', 'Gold II', 'Gold I', 'Crystal III', 'Crystal II', 'Crystal I', 'Master III', 'Master II', 'Master I', 'Champion III', 'Champion II', 'Champion I'].map((tier, idx) => (
                          <div key={tier} className={`p-2 rounded text-center text-xs font-medium ${idx >= 9 ? 'bg-yellow-500/20 text-yellow-600' :
                              idx >= 6 ? 'bg-purple-500/20 text-purple-600' :
                                idx >= 3 ? 'bg-blue-500/20 text-blue-600' :
                                  'bg-orange-500/20 text-orange-600'
                            }`}>
                            {tier} ({idx})
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Adjustment Rules */}
                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                      <div className="font-bold text-red-500 mb-2">📉 {t('aboutRoster.league.harderLeague')}</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.league.harderLeagueDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        +1 tier = -5%, +2 tiers = -10%, +3 tiers = -15% (max)
                      </code>
                    </div>
                    <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                      <div className="font-bold text-green-500 mb-2">📈 {t('aboutRoster.league.easierLeague')}</div>
                      <p className="text-sm text-muted-foreground mb-3">{t('aboutRoster.league.easierLeagueDesc')}</p>
                      <code className="text-xs bg-muted p-2 rounded block text-foreground">
                        -1 tier = +4%, -2 tiers = +8%, -3+ tiers = +10% (max)
                      </code>
                    </div>
                  </div>

                  {/* Projected Stars Formula */}
                  <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mt-6">
                    <p className="text-sm font-mono text-foreground mb-2">{t('aboutRoster.league.projectedStarsFormula')}:</p>
                    <code className="text-lg font-bold text-indigo-500 block">
                      {t('aboutRoster.league.projectedStars')} = avgStars × (1 + adjustment%) × 7
                    </code>
                  </div>

                  {/* Confidence Levels */}
                  <div className="space-y-2 mt-6">
                    <p className="font-semibold">{t('aboutRoster.league.confidenceTitle')}:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                        <span className="text-lg">🎯</span>
                        <span className="text-sm"><strong>{t('aboutRoster.league.high')}:</strong> {t('aboutRoster.league.highDesc')}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <span className="text-lg">📊</span>
                        <span className="text-sm"><strong>{t('aboutRoster.league.medium')}:</strong> {t('aboutRoster.league.mediumDesc')}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <span className="text-lg">❓</span>
                        <span className="text-sm"><strong>{t('aboutRoster.league.low')}:</strong> {t('aboutRoster.league.lowDesc')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Distribute Tab */}
          <TabsContent value="autodistribute" className="space-y-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Gear weight="fill" className="text-purple-500" />
                  {t('aboutRoster.autodistribute.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    {t('aboutRoster.autodistribute.description')}
                  </p>

                  {/* Steps */}
                  <div className="space-y-4 mt-6">
                    {[
                      {
                        num: 1,
                        title: t('aboutRoster.autodistribute.step1Title'),
                        desc: t('aboutRoster.autodistribute.step1Desc'),
                      },
                      {
                        num: 2,
                        title: t('aboutRoster.autodistribute.step2Title'),
                        desc: t('aboutRoster.autodistribute.step2Desc'),
                      },
                      {
                        num: 3,
                        title: t('aboutRoster.autodistribute.step3Title'),
                        desc: t('aboutRoster.autodistribute.step3Desc'),
                      },
                      {
                        num: 4,
                        title: t('aboutRoster.autodistribute.step4Title'),
                        desc: t('aboutRoster.autodistribute.step4Desc'),
                      },
                    ].map((step) => (
                      <div key={step.num} className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center">
                          {step.num}
                        </div>
                        <div>
                          <p className="font-semibold">{step.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TH Requirements */}
                  <Card className="bg-muted/30 border-dashed mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">{t('aboutRoster.autodistribute.thRequirementsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {[
                        ['coc masters PL', '#P0J2J8GJ', 'TH16+', 'Master League I'],
                        ['Akademia CoC PL', '#JPRPRVUY', 'TH12+', 'Crystal League I'],
                        ['Psychole!', '#29RYVJ8C8', 'TH10+', 'Crystal League II'],
                      ].map((clan) => (
                        <div key={clan[0]} className="grid grid-cols-4 gap-2 p-2 rounded border border-border/50">
                          <span className="font-semibold">{clan[0]}</span>
                          <span className="text-muted-foreground">{clan[1]}</span>
                          <span className="text-primary font-bold">{clan[2]}</span>
                          <span className="text-muted-foreground">{clan[3]}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkle weight="fill" className="text-cyan-500" />
                  {t('aboutRoster.features.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: `🔒 ${t('aboutRoster.features.lockTitle')}`,
                    desc: t('aboutRoster.features.lockDesc'),
                  },
                  {
                    title: `❌ ${t('aboutRoster.features.outTitle')}`,
                    desc: t('aboutRoster.features.outDesc'),
                  },
                  {
                    title: `🔍 ${t('aboutRoster.features.filterTitle')}`,
                    desc: t('aboutRoster.features.filterDesc'),
                  },
                  {
                    title: `↑↓ ${t('aboutRoster.features.sortTitle')}`,
                    desc: t('aboutRoster.features.sortDesc'),
                  },
                  {
                    title: `📊 ${t('aboutRoster.features.exportTitle')}`,
                    desc: t('aboutRoster.features.exportDesc'),
                  },
                ].map((feature, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition">
                    <p className="font-semibold text-primary mb-2">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* For Leaders */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users weight="fill" className="text-orange-500" />
                    {t('aboutRoster.tips.forLeaders')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ol className="space-y-3 list-decimal list-inside">
                    <li>
                      <strong>{t('aboutRoster.tips.beforeAuto')}:</strong>
                      <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                        <li>• {t('aboutRoster.tips.decideLock')}</li>
                        <li>• {t('aboutRoster.tips.markOut')}</li>
                        <li>• {t('aboutRoster.tips.setFilter')}</li>
                      </ul>
                    </li>
                    <li>
                      <strong>{t('aboutRoster.tips.interpretResults')}:</strong>
                      <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                        <li>• {t('aboutRoster.tips.topReliability')}</li>
                        <li>• {t('aboutRoster.tips.lookConsistency')}</li>
                      </ul>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* For Players */}
              <Card className="border-l-4 border-l-pink-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap weight="fill" className="text-pink-500" />
                    {t('aboutRoster.tips.forPlayers')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <strong>{t('aboutRoster.tips.improveReliability')}:</strong>
                    <ul className="ml-4 mt-2 space-y-1 text-muted-foreground">
                      <li>✅ {t('aboutRoster.tips.playAllWars')}</li>
                      <li>✅ {t('aboutRoster.tips.trainTriples')}</li>
                      <li>✅ {t('aboutRoster.tips.playHigherLeagues')}</li>
                      <li>❌ {t('aboutRoster.tips.dontSkip')}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ChartLine weight="fill" className="text-green-500" />
                  {t('aboutRoster.examples.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Player A */}
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <p className="font-bold text-lg mb-3">{t('aboutRoster.examples.playerA')}</p>
                    <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                      <li>{t('aboutRoster.examples.seasons')}: 8</li>
                      <li>{t('aboutRoster.examples.avgStars')}: 2.4</li>
                      <li>{t('aboutRoster.examples.threeStarPercent')}: 30%</li>
                      <li>{t('aboutRoster.examples.attendance')}: 95%</li>
                    </ul>
                    <div className="p-3 bg-background rounded border border-border/50 text-xs font-mono">
                      <p>{t('aboutRoster.examples.performance')} = 55</p>
                      <p className="mt-2">
                        {t('aboutRoster.reliability.title')} = (55×0.45) + (95×0.35) + (50×0.20) = <strong>68%</strong>
                      </p>
                    </div>
                  </div>

                  {/* Player B */}
                  <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                    <p className="font-bold text-lg mb-3 text-green-600">{t('aboutRoster.examples.playerB')} ⭐</p>
                    <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                      <li>{t('aboutRoster.examples.seasons')}: 7</li>
                      <li>{t('aboutRoster.examples.avgStars')}: 2.8</li>
                      <li>{t('aboutRoster.examples.threeStarPercent')}: 61%</li>
                      <li>{t('aboutRoster.examples.attendance')}: 100%</li>
                    </ul>
                    <div className="p-3 bg-background rounded border border-green-500/20 text-xs font-mono">
                      <p>{t('aboutRoster.examples.performance')} = 77.17</p>
                      <p className="mt-2">
                        {t('aboutRoster.reliability.title')} = (77.17×0.45) + (100×0.35) + (100×0.20) = <strong>89.73%</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                  <p>
                    ✅ <strong>{t('aboutRoster.examples.playerB')}</strong> {t('aboutRoster.examples.assignedTo')} coc masters PL ({t('aboutRoster.examples.betterClan')})
                    <br />
                    <strong>{t('aboutRoster.examples.playerA')}</strong> {t('aboutRoster.examples.mayBeAssigned')} Akademia CoC PL {t('aboutRoster.examples.or')} Psychole!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            {[
              {
                q: t('aboutRoster.faq.q1'),
                a: t('aboutRoster.faq.a1'),
              },
              {
                q: t('aboutRoster.faq.q2'),
                a: t('aboutRoster.faq.a2'),
              },
              {
                q: t('aboutRoster.faq.q3'),
                a: t('aboutRoster.faq.a3'),
              },
              {
                q: t('aboutRoster.faq.q4'),
                a: t('aboutRoster.faq.a4'),
              },
              {
                q: t('aboutRoster.faq.q5'),
                a: t('aboutRoster.faq.a5'),
              },
            ].map((item, i) => (
              <Card key={i} className="hover:border-primary/50 transition">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-primary">{item.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-border">
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            📧 <strong>{t('aboutRoster.footer.questions')}</strong> {t('aboutRoster.footer.contactLeader')}
          </p>
          <p className="text-xs">{t('aboutRoster.footer.version')}</p>
        </div>
      </div>
    </div>
  )
}
