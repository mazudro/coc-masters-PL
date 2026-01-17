/**
 * Chart Colors for Recharts/SVG components
 *
 * CSS variables with oklch() format don't work when used in SVG elements.
 * Use these direct HEX values for all Recharts components (Bar, Line, Area, Pie, etc.)
 *
 * For HTML elements (like Tooltip contentStyle), you can still use hsl(var(--X)).
 */

// Primary chart palette (6 distinct colors)
export const CHART_COLORS = [
  '#6366f1', // indigo (chart-1)
  '#22c55e', // green (chart-2)
  '#fbbf24', // amber (chart-3)
  '#a855f7', // purple (chart-4)
  '#ef4444', // red (chart-5)
  '#06b6d4', // cyan (chart-6)
] as const

// Semantic colors for specific use cases
export const COLORS = {
  // Win/Loss/Tie
  win: '#22c55e',
  loss: '#ef4444',
  tie: '#eab308',

  // Star bucket colors (0-3 stars quality gradient)
  stars0: '#ef4444', // red - worst
  stars1: '#f97316', // orange
  stars2: '#fbbf24', // amber/yellow
  stars3: '#22c55e', // green - best

  // Line chart metrics
  avgStars: '#fbbf24', // amber
  avgDestruction: '#4ade80', // light green
  threeStarRate: '#a855f7', // purple

  // Axis and grid (for dark mode)
  axis: '#e5e5e5',
  grid: 'rgba(255, 255, 255, 0.2)',

  // Text on charts
  labelLight: '#f2f2f2', // for dark backgrounds
  labelDark: '#262626', // for light backgrounds

  // Primary accent
  primary: '#6366f1',
} as const

// Helper to get chart color by index (cycles through palette)
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

// Star bucket colors array for mapping
export const STAR_BUCKET_COLORS = [
  COLORS.stars0,
  COLORS.stars1,
  COLORS.stars2,
  COLORS.stars3,
] as const
