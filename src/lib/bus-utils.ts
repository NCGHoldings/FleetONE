/**
 * Utility functions for bus number normalization and matching
 * Bridges naming differences between school records (e.g., "NE-2100") 
 * and fleet records (e.g., "NE 2100")
 */

/**
 * Normalize a bus registration number for comparison
 * Removes spaces, hyphens, and converts to uppercase
 * @param input - The bus number string to normalize
 * @returns Normalized string (e.g., "NE-2100" -> "NE2100")
 */
export function normalizeBusNo(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[-\s]/g, "").toUpperCase();
}

/**
 * Find a matching bus from fleet buses based on bus registration number
 * @param busRegNo - The bus registration number from school records
 * @param fleetBuses - Array of fleet buses with id and bus_no
 * @returns The matching bus or undefined
 */
export function findMatchingBus<T extends { id: string; bus_no: string }>(
  busRegNo: string | null | undefined,
  fleetBuses: T[]
): T | undefined {
  if (!busRegNo) return undefined;
  const normalized = normalizeBusNo(busRegNo);
  return fleetBuses.find((b) => normalizeBusNo(b.bus_no) === normalized);
}

/**
 * Get all buses that match a route's bus registration numbers
 * @param routeBusRegNos - Array of bus registration numbers from a route
 * @param fleetBuses - Array of fleet buses
 * @returns Array of matching fleet buses
 */
export function getRouteBuses<T extends { id: string; bus_no: string }>(
  routeBusRegNos: string[],
  fleetBuses: T[]
): T[] {
  const normalizedRouteNos = new Set(
    routeBusRegNos.filter(Boolean).map(normalizeBusNo)
  );
  return fleetBuses.filter((bus) =>
    normalizedRouteNos.has(normalizeBusNo(bus.bus_no))
  );
}

/**
 * Check if two bus numbers match (handling different formats)
 * @param busNo1 - First bus number
 * @param busNo2 - Second bus number
 * @returns True if they match after normalization
 */
export function busNumbersMatch(
  busNo1: string | null | undefined,
  busNo2: string | null | undefined
): boolean {
  if (!busNo1 || !busNo2) return false;
  return normalizeBusNo(busNo1) === normalizeBusNo(busNo2);
}
