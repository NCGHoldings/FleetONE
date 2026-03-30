/**
 * Helper utilities for Special Hire invoice data resolution.
 * Extracts bus type name and correct mileage from quotation data.
 */

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
 * Calculate total KM from quotation using correct column names.
 * DB columns: km_parking_to_pickup, km_trip, km_drop_to_parking
 */
export function calculateTotalKm(quotation: any): number {
  const parkingToPickup = Number(quotation.km_parking_to_pickup) || 0;
  const trip = Number(quotation.km_trip) || 0;
  const dropToParking = Number(quotation.km_drop_to_parking) || 0;
  return parkingToPickup + trip + dropToParking;
}

/**
 * Get trip distance from quotation.
 * Priority: km_trip → total_distance_km → calculated total
 */
export function getTripDistance(quotation: any): number {
  return Number(quotation.km_trip) || Number(quotation.total_distance_km) || calculateTotalKm(quotation);
}
