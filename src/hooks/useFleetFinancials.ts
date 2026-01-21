import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

export interface VehicleOperatingCost {
  busId: string;
  busNo: string;
  category: string;
  totalKm: number;
  totalFuelCost: number;
  totalFuelLiters: number;
  totalMaintenanceCost: number;
  totalSalaryCost: number;
  totalOtherCost: number;
  totalCost: number;
  costPerKm: number;
  fuelEfficiency: number; // KM per liter
}

export interface FleetCostSummary {
  totalCost: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalSalaryCost: number;
  totalOtherCost: number;
  totalKm: number;
  averageCostPerKm: number;
  averageFuelEfficiency: number;
  vehicleCount: number;
}

export interface MonthlyCostTrend {
  month: string;
  monthLabel: string;
  fuelCost: number;
  maintenanceCost: number;
  salaryCost: number;
  otherCost: number;
  totalCost: number;
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// Fetch fleet operating costs with date range
export function useFleetOperatingCosts(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['fleet-operating-costs', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Fetch daily bus expenses with bus details
      const { data: expenses, error: expensesError } = await supabase
        .from('daily_bus_expenses')
        .select(`
          *,
          buses!inner(
            id,
            bus_no,
            category
          )
        `)
        .gte('expense_date', startStr)
        .lte('expense_date', endStr);

      if (expensesError) throw expensesError;

      // Fetch daily trips for KM data
      const { data: trips, error: tripsError } = await supabase
        .from('daily_trips')
        .select('bus_id, total_km')
        .gte('trip_date', startStr)
        .lte('trip_date', endStr);

      if (tripsError) throw tripsError;

      // Fetch maintenance financials
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance_financials')
        .select(`
          total_expenses,
          maintenance_record_id,
          maintenance_records!inner(
            bus_id,
            maintenance_date
          )
        `)
        .gte('created_at', startStr)
        .lte('created_at', endStr);

      if (maintenanceError) {
        console.warn('Maintenance financials query failed, continuing without it:', maintenanceError);
      }

      // Aggregate data by bus
      const busDataMap = new Map<string, {
        busNo: string;
        category: string;
        totalKm: number;
        fuelCost: number;
        fuelLiters: number;
        maintenanceCost: number;
        salaryCost: number;
        otherCost: number;
      }>();

      // Process daily expenses
      expenses?.forEach((exp: any) => {
        const busId = exp.bus_id;
        const bus = exp.buses;
        
        if (!busDataMap.has(busId)) {
          busDataMap.set(busId, {
            busNo: bus?.bus_no || 'Unknown',
            category: bus?.category || 'Unknown',
            totalKm: 0,
            fuelCost: 0,
            fuelLiters: 0,
            maintenanceCost: 0,
            salaryCost: 0,
            otherCost: 0,
          });
        }

        const data = busDataMap.get(busId)!;
        data.fuelCost += exp.fuel_cost || 0;
        data.fuelLiters += exp.fuel_liters || 0;
        data.salaryCost += exp.salary || 0;
        data.maintenanceCost += (exp.repair || 0) + (exp.tyre_tube || 0);
        data.otherCost += (
          (exp.food || 0) +
          (exp.parking || 0) +
          (exp.highway_charges || 0) +
          (exp.police || 0) +
          (exp.permits_renewal || 0) +
          (exp.temporary_permit || 0) +
          (exp.ntc || 0) +
          (exp.emission_fitness || 0) +
          (exp.log_sheet || 0) +
          (exp.body_wash || 0) +
          (exp.legal_court || 0) +
          (exp.accident_compensation || 0) +
          (exp.staff_accommodation || 0) +
          (exp.vehicle_hire || 0) +
          (exp.runner || 0) +
          (exp.short_misc || 0) +
          (exp.other || 0)
        );
      });

      // Add KM data from trips
      trips?.forEach((trip: any) => {
        const busId = trip.bus_id;
        if (busDataMap.has(busId)) {
          busDataMap.get(busId)!.totalKm += trip.total_km || 0;
        }
      });

      // Add maintenance costs
      maintenance?.forEach((maint: any) => {
        const busId = maint.maintenance_records?.bus_id;
        if (busId && busDataMap.has(busId)) {
          busDataMap.get(busId)!.maintenanceCost += maint.total_expenses || 0;
        }
      });

      // Convert to array and calculate derived metrics
      const vehicleCosts: VehicleOperatingCost[] = Array.from(busDataMap.entries()).map(([busId, data]) => {
        const totalCost = data.fuelCost + data.maintenanceCost + data.salaryCost + data.otherCost;
        const costPerKm = data.totalKm > 0 ? totalCost / data.totalKm : 0;
        const fuelEfficiency = data.fuelLiters > 0 ? data.totalKm / data.fuelLiters : 0;

        return {
          busId,
          busNo: data.busNo,
          category: data.category,
          totalKm: data.totalKm,
          totalFuelCost: data.fuelCost,
          totalFuelLiters: data.fuelLiters,
          totalMaintenanceCost: data.maintenanceCost,
          totalSalaryCost: data.salaryCost,
          totalOtherCost: data.otherCost,
          totalCost,
          costPerKm,
          fuelEfficiency,
        };
      });

      // Calculate summary
      const summary: FleetCostSummary = {
        totalCost: vehicleCosts.reduce((sum, v) => sum + v.totalCost, 0),
        totalFuelCost: vehicleCosts.reduce((sum, v) => sum + v.totalFuelCost, 0),
        totalMaintenanceCost: vehicleCosts.reduce((sum, v) => sum + v.totalMaintenanceCost, 0),
        totalSalaryCost: vehicleCosts.reduce((sum, v) => sum + v.totalSalaryCost, 0),
        totalOtherCost: vehicleCosts.reduce((sum, v) => sum + v.totalOtherCost, 0),
        totalKm: vehicleCosts.reduce((sum, v) => sum + v.totalKm, 0),
        averageCostPerKm: 0,
        averageFuelEfficiency: 0,
        vehicleCount: vehicleCosts.length,
      };

      summary.averageCostPerKm = summary.totalKm > 0 ? summary.totalCost / summary.totalKm : 0;
      
      const totalFuelLiters = vehicleCosts.reduce((sum, v) => sum + v.totalFuelLiters, 0);
      summary.averageFuelEfficiency = totalFuelLiters > 0 ? summary.totalKm / totalFuelLiters : 0;

      // Cost breakdown
      const costBreakdown: CostBreakdown[] = [
        { category: 'Fuel', amount: summary.totalFuelCost, percentage: 0, color: 'hsl(var(--chart-1))' },
        { category: 'Maintenance', amount: summary.totalMaintenanceCost, percentage: 0, color: 'hsl(var(--chart-2))' },
        { category: 'Staff Salary', amount: summary.totalSalaryCost, percentage: 0, color: 'hsl(var(--chart-3))' },
        { category: 'Other', amount: summary.totalOtherCost, percentage: 0, color: 'hsl(var(--chart-4))' },
      ];

      costBreakdown.forEach(item => {
        item.percentage = summary.totalCost > 0 ? (item.amount / summary.totalCost) * 100 : 0;
      });

      return {
        vehicleCosts: vehicleCosts.sort((a, b) => b.totalCost - a.totalCost),
        summary,
        costBreakdown,
      };
    },
  });
}

// Fetch monthly cost trends
export function useFleetCostTrends(months: number = 6) {
  return useQuery({
    queryKey: ['fleet-cost-trends', months],
    queryFn: async () => {
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

      const trends: MonthlyCostTrend[] = [];

      for (const month of monthsInterval) {
        const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

        const { data: expenses } = await supabase
          .from('daily_bus_expenses')
          .select('fuel_cost, repair, tyre_tube, salary, food, parking, highway_charges, police, permits_renewal, temporary_permit, ntc, emission_fitness, log_sheet, body_wash, legal_court, accident_compensation, staff_accommodation, vehicle_hire, runner, short_misc, other')
          .gte('expense_date', monthStart)
          .lte('expense_date', monthEnd);

        let fuelCost = 0;
        let maintenanceCost = 0;
        let salaryCost = 0;
        let otherCost = 0;

        expenses?.forEach((exp: any) => {
          fuelCost += exp.fuel_cost || 0;
          maintenanceCost += (exp.repair || 0) + (exp.tyre_tube || 0);
          salaryCost += exp.salary || 0;
          otherCost += (
            (exp.food || 0) +
            (exp.parking || 0) +
            (exp.highway_charges || 0) +
            (exp.police || 0) +
            (exp.permits_renewal || 0) +
            (exp.temporary_permit || 0) +
            (exp.ntc || 0) +
            (exp.emission_fitness || 0) +
            (exp.log_sheet || 0) +
            (exp.body_wash || 0) +
            (exp.legal_court || 0) +
            (exp.accident_compensation || 0) +
            (exp.staff_accommodation || 0) +
            (exp.vehicle_hire || 0) +
            (exp.runner || 0) +
            (exp.short_misc || 0) +
            (exp.other || 0)
          );
        });

        trends.push({
          month: format(month, 'yyyy-MM'),
          monthLabel: format(month, 'MMM yyyy'),
          fuelCost,
          maintenanceCost,
          salaryCost,
          otherCost,
          totalCost: fuelCost + maintenanceCost + salaryCost + otherCost,
        });
      }

      return trends;
    },
  });
}

// Fetch category-wise cost comparison
export function useFleetCostsByCategory(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['fleet-costs-by-category', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: expenses, error } = await supabase
        .from('daily_bus_expenses')
        .select(`
          fuel_cost, repair, tyre_tube, salary, food, parking, highway_charges,
          buses!inner(category)
        `)
        .gte('expense_date', startStr)
        .lte('expense_date', endStr);

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, { 
        totalCost: number; 
        fuelCost: number; 
        maintenanceCost: number;
        count: number;
      }>();

      expenses?.forEach((exp: any) => {
        const category = exp.buses?.category || 'Unknown';
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { totalCost: 0, fuelCost: 0, maintenanceCost: 0, count: 0 });
        }

        const data = categoryMap.get(category)!;
        const fuelCost = exp.fuel_cost || 0;
        const maintenanceCost = (exp.repair || 0) + (exp.tyre_tube || 0);
        const totalCost = fuelCost + maintenanceCost + (exp.salary || 0) + 
          (exp.food || 0) + (exp.parking || 0) + (exp.highway_charges || 0);

        data.fuelCost += fuelCost;
        data.maintenanceCost += maintenanceCost;
        data.totalCost += totalCost;
        data.count += 1;
      });

      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        totalCost: data.totalCost,
        fuelCost: data.fuelCost,
        maintenanceCost: data.maintenanceCost,
        avgCostPerEntry: data.count > 0 ? data.totalCost / data.count : 0,
      }));
    },
  });
}
