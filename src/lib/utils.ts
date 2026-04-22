import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse JSON with fallback - prevents "Unexpected end of JSON input" errors
 * Handles null, undefined, empty strings, already-parsed objects, and malformed JSON
 */
export function safeParseJSON<T>(value: any, fallback: T): T {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value === 'object') {
    return value as T;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    console.warn('safeParseJSON: Failed to parse:', value, e);
    return fallback;
  }
}

/**
 * Format YYYY-MM-DD or timestamp to DD/MM/YYYY for display
 * Uses UTC methods to prevent timezone conversion issues
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '-';
  
  // If it looks like a timestamp (contains 'T' or is a Date object)
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  
  // Handle YYYY-MM-DD string format
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

/**
 * Parse DD/MM/YYYY to YYYY-MM-DD for database
 */
export const parseDateForDB = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Fetch all rows from a Supabase query builder by paginating through the results.
 * This bypasses the PostgREST max-rows API limit (default 2000).
 */
export const fetchAllRows = async (queryBuilder: any, step: number = 2000) => {
  let allData: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < step) break;
    from += step;
  }
  return allData;
};
