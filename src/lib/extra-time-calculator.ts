/**
 * Extra-Time Charge Calculator for Outside Hire Types
 * Implements the business rules for calculating overtime and overnight charges
 */

export interface ExtraTimeConfig {
  baselineSpeedKmph?: number;
  hourlyRate?: number;
  nightBlockFee?: number;
  // Support for Lyceum/Internal hire types that use rate card standard hours
  useStandardHours?: boolean;
  standardHours?: number;
}

export interface ExtraTimeResult {
  availableHours: number;
  actualHours: number;
  extraHours: number;
  overtimeCharge: number;
  overnightCharge: number;
  totalExtraCharge: number;
}

export function calculateExtraTimeCharge(
  quotedDistanceKm: number,
  pickupDatetime: string | Date,
  dropDatetime: string | Date,
  config: ExtraTimeConfig = {}
): ExtraTimeResult {
  const {
    baselineSpeedKmph = 10,
    hourlyRate = 500,
    nightBlockFee = 10000,
    useStandardHours = false,
    standardHours = 8
  } = config;

  // Calculate available hours based on hire type
  // - Outside hire: distance-based (km / 10 km/h baseline speed)
  // - Lyceum/Internal hire: rate card standard_hours
  const availableHours = useStandardHours 
    ? standardHours 
    : quotedDistanceKm / baselineSpeedKmph;

  // Calculate actual hours from pickup to drop
  const pickupTime = new Date(pickupDatetime).getTime();
  const dropTime = new Date(dropDatetime).getTime();
  const actualHours = Math.max(0, (dropTime - pickupTime) / (1000 * 60 * 60));

  // Calculate extra hours
  const extraHours = Math.max(0, actualHours - availableHours);
  
  if (extraHours === 0) {
    return {
      availableHours: Math.round(availableHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      extraHours: 0,
      overtimeCharge: 0,
      overnightCharge: 0,
      totalExtraCharge: 0
    };
  }

  let overtimeCharge = 0;
  let overnightCharge = 0;

  if (extraHours <= 10) {
    // Simple hourly for up to 10 hours
    overtimeCharge = extraHours * hourlyRate;
  } else {
    // Over 10 hours - use overnight blocks
    // Business rule: 10-24h = 1 block, 24-34h = 1 block + hourly, 34-48h = 2 blocks, etc.
    let remainingHours = extraHours;
    
    while (remainingHours > 10) {
      // Each overnight block covers up to 24 hours
      overnightCharge += nightBlockFee;
      remainingHours -= 24;
    }
    
    // Any remaining hours (if positive and ≤10) are charged hourly
    if (remainingHours > 0) {
      overtimeCharge = remainingHours * hourlyRate;
    }
  }

  const totalExtraCharge = overtimeCharge + overnightCharge;

  return {
    availableHours: Math.round(availableHours * 100) / 100,
    actualHours: Math.round(actualHours * 100) / 100,
    extraHours: Math.round(extraHours * 100) / 100,
    overtimeCharge: Math.round(overtimeCharge),
    overnightCharge: Math.round(overnightCharge),
    totalExtraCharge: Math.round(totalExtraCharge)
  };
}
