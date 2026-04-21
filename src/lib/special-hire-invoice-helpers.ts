/**
 * Helper utilities for Special Hire invoice data resolution.
 * Extracts bus type name and correct mileage from quotation data.
 */

export interface AdditionalDistanceCharge {
  description: string;
  distance: number;
  amount: number;
}

export interface InvoiceMileage {
  /** Base trip distance from quotation (parking_to_pickup + km_trip + drop_to_parking). */
  base: number;
  /** Sum of `additional_distance` km added inside the quotation's additional_charges. */
  quotationExtras: number;
  /** Quoted total (base + quotationExtras). What was promised before the trip. */
  quoted: number;
  /** Actual KM traveled (post-trip adjustment). Falls back to quoted when no adjustment. */
  actual: number;
  /** Post-trip extra KM = actual - quoted (signed). */
  postTripExtras: number;
  /** Sum amount of all quotation-time additional_distance items (LKR). */
  quotationExtrasAmount: number;
  /** Itemized list of quotation-time additional_distance entries. */
  quotationExtrasBreakdown: AdditionalDistanceCharge[];
}

/**
 * Resolve bus type name from quotation data.
 * Priority: bus_fleet_details JSON → bus_types join → fallback
 */
export function resolveBusType(quotation: any): string {
  // 1. Try bus_fleet_details JSON (stored on quotation)
  try {
    const fleetDetails = typeof quotation.bus_fleet_details === 'string'
      ? JSON.parse(quotation.bus_fleet_details)
      : quotation.bus_fleet_details;
    if (fleetDetails?.buses?.[0]?.bus_type_name) {
      return fleetDetails.buses[0].bus_type_name;
    }
  } catch { /* ignore parse errors */ }

  // 2. Try bus_types join
  if (quotation.bus_types?.name) {
    return quotation.bus_types.name;
  }

  // 3. Fallback
  return 'Standard Bus';
}

/**
 * Calculate base total KM from quotation using correct column names.
 * DB columns: km_parking_to_pickup, km_trip, km_drop_to_parking
 */
export function calculateTotalKm(quotation: any): number {
  const parkingToPickup = Number(quotation?.km_parking_to_pickup) || 0;
  const trip = Number(quotation?.km_trip) || 0;
  const dropToParking = Number(quotation?.km_drop_to_parking) || 0;
  return parkingToPickup + trip + dropToParking;
}

/**
 * Get trip distance from quotation.
 * Priority: km_trip → total_distance_km → calculated total
 */
export function getTripDistance(quotation: any): number {
  return Number(quotation?.km_trip) || Number(quotation?.total_distance_km) || calculateTotalKm(quotation);
}

/**
 * Parse the quotation.additional_charges JSON and extract all `additional_distance` entries.
 * These represent extra KM the salesperson explicitly added inside the quotation form.
 */
export function getQuotationAdditionalDistance(quotation: any): {
  distanceKm: number;
  amount: number;
  breakdown: AdditionalDistanceCharge[];
} {
  let charges: any[] = [];
  try {
    const raw = quotation?.additional_charges;
    if (!raw) return { distanceKm: 0, amount: 0, breakdown: [] };
    charges = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(charges)) return { distanceKm: 0, amount: 0, breakdown: [] };
  } catch {
    return { distanceKm: 0, amount: 0, breakdown: [] };
  }

  const breakdown: AdditionalDistanceCharge[] = [];
  let distanceKm = 0;
  let amount = 0;

  for (const c of charges) {
    if (!c || c.type !== 'additional_distance') continue;
    const d = Number(c.distance) || 0;
    const a = Number(c.amount) || 0;
    distanceKm += d;
    amount += a;
    breakdown.push({
      description: c.reason || 'Additional Distance/KM',
      distance: d,
      amount: a,
    });
  }

  return { distanceKm, amount, breakdown };
}

/**
 * Single source of truth for invoice mileage display.
 * Combines quotation base distance + quotation-time extras + post-trip adjustment actual KM.
 *
 * Rules:
 * - quoted = base + quotationExtras (what the customer agreed to)
 * - actual = adjustment.actual_km_traveled when available and > 0, else quoted
 * - postTripExtras = actual - quoted (can be negative)
 */
export function getInvoiceMileage(quotation: any, adjustment?: any | null): InvoiceMileage {
  const base = calculateTotalKm(quotation);
  const { distanceKm: quotationExtras, amount: quotationExtrasAmount, breakdown: quotationExtrasBreakdown } =
    getQuotationAdditionalDistance(quotation);
  const quoted = base + quotationExtras;

  // Resolve "actual" — prefer adjustment.actual_km_traveled when sensible.
  let actual = quoted;
  if (adjustment) {
    const adjActual = Number(adjustment.actual_km_traveled) || 0;
    const adjQuoted = Number(adjustment.original_quoted_km) || 0;
    const adjExtra = Number(adjustment.extra_km) || 0;

    if (adjActual > 0) {
      actual = adjActual;
    } else if (adjQuoted > 0 && adjExtra !== 0) {
      // Reconstruct from quoted + extra when actual was lost.
      actual = adjQuoted + adjExtra;
    } else if (adjExtra !== 0 && quoted > 0) {
      // Last-resort: use canonical quoted KM + recorded extra.
      actual = quoted + adjExtra;
    }
  }

  const postTripExtras = actual - quoted;

  return {
    base,
    quotationExtras,
    quoted,
    actual,
    postTripExtras,
    quotationExtrasAmount,
    quotationExtrasBreakdown,
  };
}
