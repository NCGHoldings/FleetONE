import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusMasterData {
  bus: any;
  trips: {
    total: number;
    totalIncome: number;
    totalDistance: number;
    avgIncomePerTrip: number;
    recentTrips: any[];
    monthlyTrend: { month: string; income: number; trips: number }[];
  };
  expenses: {
    total: number;
    fuelCost: number;
    recentExpenses: any[];
  };
  financials: {
    netProfit: number;
    profitMargin: number;
    runningDays: number;
  };
  service: {
    lastServiceDate: string | null;
    lastServiceMileage: number | null;
    nextServiceDate: string | null;
    nextServiceMileage: number | null;
    overdueKm: number | null;
    serviceRecords: any[];
    alerts: any[];
  };
  fuel: {
    readings: any[];
    avgEfficiency: number | null;
    expectedEfficiency: number | null;
  };
  tyres: any[];
  loans: {
    activeLoans: any[];
    payments: any[];
    totalDebt: number;
  };
  documents: {
    insuranceExpiry: string | null;
    revenueLicenseExpiry: string | null;
    insuranceStatus: 'valid' | 'expiring' | 'expired';
    licenseStatus: 'valid' | 'expiring' | 'expired';
  };
}

const getExpiryStatus = (expiryDate: string | null): 'valid' | 'expiring' | 'expired' => {
  if (!expiryDate) return 'expired';
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'valid';
};

export const useBusMasterData = (busId: string | null) => {
  return useQuery({
    queryKey: ['bus-master-data', busId],
    queryFn: async (): Promise<BusMasterData | null> => {
      if (!busId) return null;

      // Fetch bus details with category
      const { data: bus, error: busError } = await supabase
        .from('buses')
        .select(`
          *,
          bus_categories(name, color, code),
          bus_sub_categories(name, color, code)
        `)
        .eq('id', busId)
        .single();

      if (busError) throw busError;

      // Fetch all trips for this bus
      const { data: trips, error: tripsError } = await supabase
        .from('daily_trips')
        .select('*')
        .eq('bus_id', busId)
        .order('trip_date', { ascending: false });

      if (tripsError) throw tripsError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('daily_bus_expenses')
        .select('*')
        .eq('bus_id', busId)
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch service alerts
      const { data: serviceAlerts } = await supabase
        .from('bus_service_alerts')
        .select('*')
        .eq('bus_id', busId)
        .order('created_at', { ascending: false });

      // Fetch fuel readings
      const { data: fuelReadings } = await supabase
        .from('bus_fuel_readings')
        .select('*')
        .eq('bus_id', busId)
        .order('reading_timestamp', { ascending: false })
        .limit(50);

      // Fetch tyres
      const { data: tyres } = await supabase
        .from('bus_tyres')
        .select('*')
        .eq('bus_id', busId)
        .order('position');

      // Fetch loans and payments
      const { data: loans } = await supabase
        .from('bus_loans')
        .select(`
          *,
          bus_loan_payments(*)
        `)
        .eq('bus_id', busId);

      // Calculate trip statistics
      const totalIncome = trips?.reduce((sum, t) => sum + (t.income || 0), 0) || 0;
      const totalDistance = trips?.reduce((sum, t) => sum + (t.distance_km || 0), 0) || 0;
      const avgIncomePerTrip = trips?.length ? totalIncome / trips.length : 0;

      // Calculate monthly trend (last 6 months)
      const monthlyMap = new Map<string, { income: number; trips: number }>();
      trips?.forEach(trip => {
        const monthKey = trip.trip_date.substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(monthKey) || { income: 0, trips: 0 };
        monthlyMap.set(monthKey, {
          income: existing.income + (trip.income || 0),
          trips: existing.trips + 1
        });
      });
      const monthlyTrend = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      // Calculate expense totals
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total_daily_expenses || 0), 0) || 0;
      const totalFuelCost = expenses?.reduce((sum, e) => sum + (e.fuel_cost || 0), 0) || 0;

      // Calculate service status
      const currentMileage = bus.current_mileage || 0;
      const nextServiceMileage = bus.next_service_mileage || null;
      const overdueKm = nextServiceMileage && currentMileage > nextServiceMileage 
        ? currentMileage - nextServiceMileage 
        : null;

      // Calculate fuel efficiency - we don't have fuel_efficiency in the table, so use expected from bus
      const avgEfficiency = bus.expected_km_per_liter || null;

      // Calculate loan totals
      const activeLoans = loans?.filter(l => l.status === 'active') || [];
      const totalDebt = activeLoans.reduce((sum, l) => {
        const paidAmount = l.bus_loan_payments?.reduce((s: number, p: any) => 
          s + (p.payment_status === 'paid' ? p.total_installment : 0), 0) || 0;
        return sum + (l.loan_amount - paidAmount);
      }, 0);

      // Get unique running days
      const uniqueDays = new Set(trips?.map(t => t.trip_date)).size;

      return {
        bus,
        trips: {
          total: trips?.length || 0,
          totalIncome,
          totalDistance,
          avgIncomePerTrip,
          recentTrips: trips?.slice(0, 20) || [],
          monthlyTrend
        },
        expenses: {
          total: totalExpenses,
          fuelCost: totalFuelCost,
          recentExpenses: expenses?.slice(0, 20) || []
        },
        financials: {
          netProfit: totalIncome - totalExpenses,
          profitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
          runningDays: uniqueDays
        },
        service: {
          lastServiceDate: bus.last_service_date,
          lastServiceMileage: bus.last_service_mileage,
          nextServiceDate: bus.next_service_date,
          nextServiceMileage: bus.next_service_mileage,
          overdueKm,
          serviceRecords: [],
          alerts: serviceAlerts || []
        },
        fuel: {
          readings: fuelReadings || [],
          avgEfficiency,
          expectedEfficiency: bus.expected_km_per_liter
        },
        tyres: tyres || [],
        loans: {
          activeLoans,
          payments: activeLoans.flatMap(l => l.bus_loan_payments || []),
          totalDebt
        },
        documents: {
          insuranceExpiry: bus.insurance_expiry,
          revenueLicenseExpiry: bus.revenue_license_expiry,
          insuranceStatus: getExpiryStatus(bus.insurance_expiry),
          licenseStatus: getExpiryStatus(bus.revenue_license_expiry)
        }
      };
    },
    enabled: !!busId
  });
};

// Hook to get fleet-wide alerts
export const useFleetAlerts = () => {
  return useQuery({
    queryKey: ['fleet-alerts'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get buses with expired or expiring documents
      const { data: buses } = await supabase
        .from('buses')
        .select('id, bus_no, insurance_expiry, revenue_license_expiry, current_mileage, next_service_mileage, status')
        .eq('status', 'active');

      const alerts = {
        expiredInsurance: [] as any[],
        expiringInsurance: [] as any[],
        expiredLicense: [] as any[],
        expiringLicense: [] as any[],
        serviceOverdue: [] as any[],
        serviceDueSoon: [] as any[]
      };

      buses?.forEach(bus => {
        // Insurance checks
        if (bus.insurance_expiry) {
          const status = getExpiryStatus(bus.insurance_expiry);
          if (status === 'expired') alerts.expiredInsurance.push(bus);
          else if (status === 'expiring') alerts.expiringInsurance.push(bus);
        }

        // License checks
        if (bus.revenue_license_expiry) {
          const status = getExpiryStatus(bus.revenue_license_expiry);
          if (status === 'expired') alerts.expiredLicense.push(bus);
          else if (status === 'expiring') alerts.expiringLicense.push(bus);
        }

        // Service checks
        if (bus.current_mileage && bus.next_service_mileage) {
          const diff = bus.next_service_mileage - bus.current_mileage;
          if (diff < 0) alerts.serviceOverdue.push({ ...bus, overdueKm: Math.abs(diff) });
          else if (diff < 1000) alerts.serviceDueSoon.push({ ...bus, remainingKm: diff });
        }
      });

      return alerts;
    }
  });
};
