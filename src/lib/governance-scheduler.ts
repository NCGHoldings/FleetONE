import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, isWeekend, parse, startOfMonth } from 'date-fns';

export interface FrequencyParams {
  weekday?: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  day?: number;
  weekNumber?: number;
  window?: string; // e.g., "12-14"
  fallbackWeekday?: string;
  includeWeekends?: boolean;
  intervalDays?: number;
  startAnchor?: string;
}

export type FrequencyRuleType =
  | 'DAILY'
  | 'WEEKLY_BY_WEEKDAY'
  | 'BIWEEKLY_BY_WEEKDAY'
  | 'MONTHLY_BY_DAY'
  | 'MONTHLY_NTH_WEEKDAY'
  | 'MONTH_END'
  | 'RELATIVE_WINDOW'
  | 'ADHOC';

const WEEKDAY_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export interface Holiday {
  date: Date;
  name: string;
  type: string;
}

/**
 * Check if a date is a holiday or weekend
 */
export function isHolidayOrWeekend(date: Date, holidays: Holiday[]): boolean {
  if (isWeekend(date)) return true;
  return holidays.some(h => isSameDay(h.date, date));
}

/**
 * Roll back a date to the previous working day (Mon-Fri, not holiday)
 */
export function rollBackToWorkingDay(date: Date, holidays: Holiday[]): { date: Date; adjusted: boolean } {
  let adjustedDate = new Date(date);
  let wasAdjusted = false;

  while (isHolidayOrWeekend(adjustedDate, holidays)) {
    adjustedDate = addDays(adjustedDate, -1);
    wasAdjusted = true;
  }

  return { date: adjustedDate, adjusted: wasAdjusted };
}

/**
 * Generate occurrence dates for DAILY frequency
 */
function generateDaily(
  startDate: Date,
  endDate: Date,
  params: FrequencyParams,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  const includeWeekends = params.includeWeekends ?? false;
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  
  return dates
    .filter(date => includeWeekends || !isWeekend(date))
    .map(date => rollBackToWorkingDay(date, holidays));
}

/**
 * Generate occurrence dates for WEEKLY_BY_WEEKDAY frequency
 */
function generateWeeklyByWeekday(
  startDate: Date,
  endDate: Date,
  params: FrequencyParams,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  if (!params.weekday) return [];
  
  const targetDay = WEEKDAY_MAP[params.weekday];
  const dates: Array<{ date: Date; adjusted: boolean }> = [];
  let current = new Date(startDate);

  // Find first occurrence of target weekday
  while (getDay(current) !== targetDay && current <= endDate) {
    current = addDays(current, 1);
  }

  // Generate all occurrences
  while (current <= endDate) {
    dates.push(rollBackToWorkingDay(current, holidays));
    current = addDays(current, 7);
  }

  return dates;
}

/**
 * Generate occurrence dates for BIWEEKLY_BY_WEEKDAY frequency
 */
function generateBiweeklyByWeekday(
  startDate: Date,
  endDate: Date,
  params: FrequencyParams,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  if (!params.weekday || !params.startAnchor) return [];
  
  const targetDay = WEEKDAY_MAP[params.weekday];
  const anchor = parse(params.startAnchor, 'yyyy-MM-dd', new Date());
  const dates: Array<{ date: Date; adjusted: boolean }> = [];
  let current = new Date(anchor);

  // Start from anchor or first occurrence after startDate
  while (current < startDate) {
    current = addDays(current, 14);
  }

  while (current <= endDate) {
    if (getDay(current) === targetDay) {
      dates.push(rollBackToWorkingDay(current, holidays));
    }
    current = addDays(current, 14);
  }

  return dates;
}

/**
 * Generate occurrence dates for MONTHLY_BY_DAY frequency
 */
function generateMonthlyByDay(
  startDate: Date,
  endDate: Date,
  params: FrequencyParams,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  if (!params.day) return [];
  
  const dates: Array<{ date: Date; adjusted: boolean }> = [];
  let current = startOfMonth(startDate);

  while (current <= endDate) {
    const monthEnd = endOfMonth(current);
    const targetDay = Math.min(params.day, monthEnd.getDate());
    const targetDate = new Date(current.getFullYear(), current.getMonth(), targetDay);
    
    if (targetDate >= startDate && targetDate <= endDate) {
      dates.push(rollBackToWorkingDay(targetDate, holidays));
    }
    
    current = addMonths(current, 1);
  }

  return dates;
}

/**
 * Generate occurrence dates for MONTH_END frequency
 */
function generateMonthEnd(
  startDate: Date,
  endDate: Date,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  const dates: Array<{ date: Date; adjusted: boolean }> = [];
  let current = startOfMonth(startDate);

  while (current <= endDate) {
    const monthEndDate = endOfMonth(current);
    
    if (monthEndDate >= startDate && monthEndDate <= endDate) {
      dates.push(rollBackToWorkingDay(monthEndDate, holidays));
    }
    
    current = addMonths(current, 1);
  }

  return dates;
}

/**
 * Generate occurrence dates for MONTHLY_NTH_WEEKDAY frequency
 * e.g., "3rd week Wednesday" = pick Wednesday in week 3 of month
 */
function generateMonthlyNthWeekday(
  startDate: Date,
  endDate: Date,
  params: FrequencyParams,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  if (!params.weekNumber || !params.weekday) return [];
  
  const targetDay = WEEKDAY_MAP[params.weekday];
  const dates: Array<{ date: Date; adjusted: boolean }> = [];
  let current = startOfMonth(startDate);

  while (current <= endDate) {
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Find all occurrences of target weekday in month
    const weekdayOccurrences = daysInMonth.filter(d => getDay(d) === targetDay);
    
    // Pick the nth occurrence (1-indexed)
    if (weekdayOccurrences.length >= params.weekNumber) {
      const targetDate = weekdayOccurrences[params.weekNumber - 1];
      
      if (targetDate >= startDate && targetDate <= endDate) {
        dates.push(rollBackToWorkingDay(targetDate, holidays));
      }
    }
    
    current = addMonths(current, 1);
  }

  return dates;
}

/**
 * Generate occurrence dates for RELATIVE_WINDOW frequency
 * e.g., "between 12th-14th" = pick first non-holiday in that range
 */
function generateRelativeWindow(
  startDate: Date,
  endDate: Date,
  params: FrequencyParams,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean }> {
  if (!params.window) return [];
  
  const [startDay, endDay] = params.window.split('-').map(Number);
  const dates: Array<{ date: Date; adjusted: boolean }> = [];
  let current = startOfMonth(startDate);

  while (current <= endDate) {
    const monthEnd = endOfMonth(current);
    const windowStart = Math.min(startDay, monthEnd.getDate());
    const windowEnd = Math.min(endDay, monthEnd.getDate());
    
    let found = false;
    
    // Try to find first non-holiday working day in window
    for (let day = windowStart; day <= windowEnd; day++) {
      const candidateDate = new Date(current.getFullYear(), current.getMonth(), day);
      
      if (candidateDate >= startDate && candidateDate <= endDate) {
        if (!isHolidayOrWeekend(candidateDate, holidays)) {
          dates.push({ date: candidateDate, adjusted: false });
          found = true;
          break;
        }
      }
    }
    
    // If all days in window are holidays, roll back from window end
    if (!found) {
      const windowEndDate = new Date(current.getFullYear(), current.getMonth(), windowEnd);
      if (windowEndDate >= startDate && windowEndDate <= endDate) {
        dates.push(rollBackToWorkingDay(windowEndDate, holidays));
      }
    }
    
    current = addMonths(current, 1);
  }

  return dates;
}

/**
 * Main function to generate occurrence dates based on frequency rule
 */
export function generateOccurrences(
  ruleType: FrequencyRuleType,
  params: FrequencyParams,
  startDate: Date,
  endDate: Date,
  holidays: Holiday[]
): Array<{ date: Date; adjusted: boolean; originalRuleText: string }> {
  let occurrences: Array<{ date: Date; adjusted: boolean }> = [];

  switch (ruleType) {
    case 'DAILY':
      occurrences = generateDaily(startDate, endDate, params, holidays);
      break;
    case 'WEEKLY_BY_WEEKDAY':
      occurrences = generateWeeklyByWeekday(startDate, endDate, params, holidays);
      break;
    case 'BIWEEKLY_BY_WEEKDAY':
      occurrences = generateBiweeklyByWeekday(startDate, endDate, params, holidays);
      break;
    case 'MONTHLY_BY_DAY':
      occurrences = generateMonthlyByDay(startDate, endDate, params, holidays);
      break;
    case 'MONTH_END':
      occurrences = generateMonthEnd(startDate, endDate, holidays);
      break;
    case 'MONTHLY_NTH_WEEKDAY':
      occurrences = generateMonthlyNthWeekday(startDate, endDate, params, holidays);
      break;
    case 'RELATIVE_WINDOW':
      occurrences = generateRelativeWindow(startDate, endDate, params, holidays);
      break;
    case 'ADHOC':
      // No auto-generation for adhoc items
      return [];
    default:
      return [];
  }

  return occurrences.map(({ date, adjusted }) => ({
    date,
    adjusted,
    originalRuleText: `Generated ${ruleType} rule with params: ${JSON.stringify(params)}`,
  }));
}

/**
 * Format frequency rule as human-readable text
 */
export function formatFrequencyRule(ruleType: FrequencyRuleType, params: FrequencyParams): string {
  switch (ruleType) {
    case 'DAILY':
      return params.includeWeekends ? 'Every day' : 'Every weekday';
    case 'WEEKLY_BY_WEEKDAY':
      return `Every ${params.weekday}`;
    case 'BIWEEKLY_BY_WEEKDAY':
      return `Every two weeks on ${params.weekday}`;
    case 'MONTHLY_BY_DAY':
      return `${params.day}${getOrdinalSuffix(params.day!)} of each month`;
    case 'MONTH_END':
      return 'Last day of each month';
    case 'MONTHLY_NTH_WEEKDAY':
      return `${getWeekNumberText(params.weekNumber!)} ${params.weekday} of every month`;
    case 'RELATIVE_WINDOW':
      return `Between ${params.window} of each month`;
    case 'ADHOC':
      return 'As needed';
    default:
      return 'Unknown frequency';
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getWeekNumberText(n: number): string {
  const words = ['', '1st', '2nd', '3rd', '4th', '5th'];
  return words[n] || `${n}th`;
}
