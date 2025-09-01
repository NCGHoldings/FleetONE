/**
 * Extra-Time Charge Calculator for Outside Hire Types
 * Implements the business rules for calculating overtime and overnight charges
 */

export interface ExtraTimeConfig {
  baselineSpeedKmph?: number;
  hourlyRate?: number;
  nightBlockFee?: number;
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
  totalDistanceKm: number,
  pickupDatetime: string | Date,
  dropDatetime: string | Date,
  config: ExtraTimeConfig = {}
): ExtraTimeResult {
  const {
    baselineSpeedKmph = 10,
    hourlyRate = 500,
    nightBlockFee = 3000
  } = config;

  // Calculate available hours based on distance and baseline speed
  const availableHours = totalDistanceKm / baselineSpeedKmph;

  // Calculate actual hours from pickup to drop
  const pickupTime = new Date(pickupDatetime).getTime();
  const dropTime = new Date(dropDatetime).getTime();
  const actualHours = Math.max(0, (dropTime - pickupTime) / (1000 * 60 * 60));

  // Calculate extra hours
  let extraHours = Math.max(0, actualHours - availableHours);
  
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

  // Case: up to 10h – hourly only
  if (extraHours <= 10) {
    overtimeCharge = extraHours * hourlyRate;
  } else {
    // Case: >10h – first night block then loop
    
    // First 24h block (night block)
    overnightCharge += nightBlockFee;
    extraHours -= 24;

    // Additional blocks
    while (extraHours > 0) {
      if (extraHours > 10) {
        // Another full night block
        overnightCharge += nightBlockFee;
        extraHours -= 24;
      } else {
        // ≤10h charged hourly
        overtimeCharge += extraHours * hourlyRate;
        extraHours = 0;
      }
    }
  }

  const totalExtraCharge = overtimeCharge + overnightCharge;

  return {
    availableHours: Math.round(availableHours * 100) / 100,
    actualHours: Math.round(actualHours * 100) / 100,
    extraHours: Math.max(0, actualHours - availableHours),
    overtimeCharge: Math.round(overtimeCharge),
    overnightCharge: Math.round(overnightCharge),
    totalExtraCharge: Math.round(totalExtraCharge)
  };
}