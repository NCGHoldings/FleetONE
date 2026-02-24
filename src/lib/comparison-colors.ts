/**
 * Consistent color palette for comparison visualizations
 * Uses vibrant blue and purple theme for clear distinction
 */
export const COMPARISON_COLORS = {
  entity1: {
    primary: '#3b82f6',    // blue-500
    dark: '#2563eb',       // blue-600
    darker: '#1d4ed8',     // blue-700
    light: '#93c5fd',      // blue-300
    bg: 'bg-blue-500',
    bgDark: 'bg-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500 to-blue-600',
  },
  entity2: {
    primary: '#a855f7',    // purple-500
    dark: '#9333ea',       // purple-600
    darker: '#7e22ce',     // purple-700
    light: '#d8b4fe',      // purple-300
    bg: 'bg-purple-500',
    bgDark: 'bg-purple-600',
    text: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
  },
  winner: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/20',
  },
  positive: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  negative: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
  neutral: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
  },
  card: {
    bg: 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
} as const;

// Financial visualization colors for Sankey and other charts
export const FINANCIAL_COLORS = {
  income: {
    primary: '#3b82f6',
    dark: '#2563eb',
    gradient: ['#3b82f6', '#60a5fa'],
  },
  expenses: {
    primary: '#a855f7',
    dark: '#9333ea',
    gradient: ['#a855f7', '#c084fc'],
  },
  profit: {
    primary: '#10b981',
    dark: '#059669',
    gradient: ['#10b981', '#34d399'],
  },
  categories: {
    fuel: '#f59e0b',
    highway: '#ef4444',
    repair: '#8b5cf6',
    salary: '#06b6d4',
    permits: '#ec4899',
    other: '#6b7280',
  }
} as const;
