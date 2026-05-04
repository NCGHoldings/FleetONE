import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeParseJSON } from "@/lib/utils";

export interface StaffMemberPerformance {
  id: string;
  staff_registry_id: string;
  staff_name: string;
  staff_type: 'driver' | 'conductor';
  phone?: string;
  nic?: string;
  address?: string;
  license_number?: string;
  license_expiry?: string;
  license_type?: string;
  date_of_birth?: string;
  blood_group?: string;
  joined_date?: string;
  salary_type?: string;
  daily_rate?: number;
  monthly_salary?: number;
  is_active: boolean;
  
  // Additional Details
  emergency_contact?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Performance Metrics
  totalTrips: number;
  totalKm: number;
  totalHours: number;
  totalRevenue: number;
  avgFuelEfficiency: number;
  onTimeRate: number;
  complaintsCount: number;
  commissionEarned: number;
  attendanceRate: number;
  performanceScore: number;
  rating: number;
  performanceTier: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

export interface PerformanceInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  staffId?: string;
}

export interface StaffPerformanceSummary {
  totalActiveStaff: number;
  totalDrivers: number;
  totalConductors: number;
  totalHoursThisMonth: number;
  totalCommissionsEarned: number;
  avgPerformanceScore: number;
  complaintsThisMonth: number;
  topPerformersCount: number;
}

interface UseStaffPerformanceOptions {
  dateRange?: { start: string; end: string };
}

export function useStaffPerformance(options: UseStaffPerformanceOptions = {}) {
  const [staffPerformance, setStaffPerformance] = useState<StaffMemberPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const { toast } = useToast();

  const fetchStaffPerformance = async () => {
    try {
      setLoading(true);

      // 1. Fetch only drivers and conductors from staff_registry
      const { data: staffRegistry, error: staffError } = await supabase
        .from('staff_registry')
        .select('*')
        .in('staff_type', ['driver', 'conductor'])
        .order('staff_name');

      if (staffError) {
        console.warn('Staff registry fetch error:', staffError);
        // Don't throw, just exit gracefully
        setStaffPerformance([]);
        setLoading(false);
        toast({ title: "Error", description: `Staff registry error: ${staffError.message}`, variant: "destructive" });
        return;
      }

      if (!staffRegistry || staffRegistry.length === 0) {
        setStaffPerformance([]);
        setLoading(false);
        return;
      }

      // 2. Fetch attendance for this month
      const { data: attendance, error: attendanceError } = await supabase
        .from('staff_attendance')
        .select('*')
        .gte('attendance_date', startOfMonth.toISOString().split('T')[0]);

      if (attendanceError) console.error('Attendance error:', attendanceError);

      // 3. Fetch commissions
      const { data: commissionRecords, error: commissionError } = await supabase
        .from('staff_commissions')
        .select('*')
        .gte('created_at', startOfMonth.toISOString());

      if (commissionError) console.error('Commission error:', commissionError);

      // 4. Fetch complaints
      const { data: complaints, error: complaintsError } = await supabase
        .from('feedback_complaints')
        .select('id, related_persons, created_at, title, description')
        .gte('created_at', startOfMonth.toISOString());

      if (complaintsError) console.error('Complaints error:', complaintsError);

      // 5. Fetch daily trips to calculate revenue and KM
      const { data: trips, error: tripsError } = await supabase
        .from('daily_trips')
        .select('id, trip_date, distance_km, income, km_per_liter, status, notes')
        .gte('trip_date', startOfMonth.toISOString().split('T')[0]);

      if (tripsError) console.error('Trips error:', tripsError);

      // Calculate working days in current month
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const workingDays = Math.floor(daysInMonth * (5/7)); // Approximate working days

      // Process each staff member
      const performanceData: StaffMemberPerformance[] = staffRegistry.map(staff => {
        try {
          // Get attendance for this staff
          const staffAttendance = (attendance || []).filter(
            a => a.staff_registry_id === staff.id || a.staff_id === staff.id
          );

          // Get commissions for this staff
          const staffCommissions = (commissionRecords || []).filter(
            c => c.staff_id === staff.id
          );

          // Get complaints mentioning this staff
          const staffComplaints = (complaints || []).filter(c => {
            const relatedPersons = c.related_persons as any;
            if (relatedPersons) {
              if (Array.isArray(relatedPersons) && relatedPersons.includes(staff.id)) return true;
              if (typeof relatedPersons === 'string' && relatedPersons.includes(staff.id)) return true;
            }
            // Also check by name in title/description
            const staffNameLower = staff.staff_name?.toLowerCase() || '';
            if (staffNameLower && (
              c.title?.toLowerCase().includes(staffNameLower) || 
              c.description?.toLowerCase().includes(staffNameLower)
            )) {
              return true;
            }
            return false;
          });

          // Match trips by staff name in notes
          const staffTrips = (trips || []).filter(trip => {
            const notes = safeParseJSON(trip.notes, {});
            const driverName = (notes as any)?.driver?.toLowerCase() || '';
            const conductorName = (notes as any)?.conductor?.toLowerCase() || '';
            const staffNameLower = staff.staff_name?.toLowerCase() || '';
            if (!staffNameLower) return false;
            return driverName.includes(staffNameLower) || conductorName.includes(staffNameLower);
          });

          // Calculate metrics
          const totalTrips = staffAttendance.length || staffTrips.length;
          const totalKm = staffTrips.reduce((sum, t) => sum + (parseFloat(t.distance_km as any) || 0), 0);
          const totalHours = staffAttendance.reduce((sum, a) => sum + (parseFloat(a.hours_worked as any) || 0), 0);
          
          // Calculate revenue from JSONB or numeric income column
          const totalRevenue = staffTrips.reduce((sum, t) => {
            let inc = 0;
            if (typeof t.income === 'object' && t.income !== null) {
               inc = Object.values(t.income).reduce((a: any, b: any) => a + (Number(b) || 0), 0) as number;
            } else {
               inc = parseFloat(t.income as any) || 0;
            }
            return sum + inc;
          }, 0);
          
          // Fuel efficiency
          const fuelTrips = staffTrips.filter(t => t.km_per_liter && parseFloat(t.km_per_liter as any) > 0);
          const avgFuelEfficiency = fuelTrips.length > 0
            ? fuelTrips.reduce((sum, t) => sum + parseFloat(t.km_per_liter as any), 0) / fuelTrips.length
            : 0;

          // On-time rate
          const completedTrips = staffTrips.filter(t => t.status === 'completed').length;
          const onTimeRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 100;

          // Commission earned
          const commissionEarned = staffCommissions
            .filter(c => c.status === 'approved' || c.status === 'paid')
            .reduce((sum, c) => sum + (parseFloat(c.commission_amount as any) || 0), 0);

          const uniqueDaysWorked = new Set(staffAttendance.map(a => a.attendance_date)).size;
          const attendanceRate = workingDays > 0 ? Math.min(100, (uniqueDaysWorked / workingDays) * 100) : 0;


        // Calculate performance score
        let performanceScore = 50; // Base score
        
        // Attendance (20% weight)
        performanceScore += (attendanceRate / 100) * 20;
        
        // Fuel efficiency (25% weight) - baseline 8 km/l
        if (avgFuelEfficiency > 0) {
          performanceScore += Math.min(25, (avgFuelEfficiency / 8) * 25);
        }
        
        // On-time rate (20% weight)
        performanceScore += (onTimeRate / 100) * 20;
        
        // Commission bonus (15% weight)
        if (commissionEarned > 0) {
          performanceScore += Math.min(15, (commissionEarned / 10000) * 15);
        }
        
        // Trip volume (10% weight)
        performanceScore += Math.min(10, totalTrips * 0.5);
        
        // Complaint penalty (10% weight)
        performanceScore -= Math.min(10, staffComplaints.length * 5);
        
        performanceScore = Math.max(0, Math.min(100, performanceScore));
        
        // Rating (1-5 stars)
        const rating = (performanceScore / 100) * 5;

        // Performance tier
        let performanceTier: 'excellent' | 'good' | 'average' | 'needs_improvement';
        if (performanceScore >= 80) performanceTier = 'excellent';
        else if (performanceScore >= 60) performanceTier = 'good';
        else if (performanceScore >= 40) performanceTier = 'average';
        else performanceTier = 'needs_improvement';

        return {
          id: staff.id,
          staff_registry_id: staff.id,
          staff_name: staff.staff_name || '',
          staff_type: staff.staff_type as 'driver' | 'conductor',
          phone: staff.contact_number,
          nic: staff.nic_number,
          address: staff.address,
          license_number: staff.license_number || undefined,
          license_expiry: staff.license_expiry || undefined,
          license_type: staff.license_type || undefined,
          date_of_birth: staff.date_of_birth || undefined,
          blood_group: staff.blood_group || undefined,
          joined_date: staff.joined_date || undefined,
          salary_type: staff.salary_type,
          daily_rate: staff.daily_rate,
          monthly_salary: staff.monthly_salary,
          is_active: staff.is_active ?? true,
          emergency_contact: staff.emergency_contact,
          notes: staff.notes,
          created_at: staff.created_at,
          updated_at: staff.updated_at,
          totalTrips,
          totalKm: Math.round(totalKm * 10) / 10,
          totalHours: Math.round(totalHours * 10) / 10,
          totalRevenue: Math.round(totalRevenue),
          avgFuelEfficiency: Math.round(avgFuelEfficiency * 10) / 10,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          complaintsCount: staffComplaints.length,
          commissionEarned: Math.round(commissionEarned),
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          performanceScore: Math.round(performanceScore * 10) / 10,
          rating: Math.round(rating * 10) / 10,
          performanceTier,
        };
        } catch (innerError) {
          console.error(`Error processing staff ${staff.id}:`, innerError);
          return {
            id: staff.id,
            staff_registry_id: staff.id,
            staff_name: staff.staff_name || 'Unknown',
            staff_type: staff.staff_type as 'driver' | 'conductor',
            phone: staff.contact_number,
            nic: staff.nic_number,
            address: staff.address,
            salary_type: staff.salary_type,
            daily_rate: staff.daily_rate,
            monthly_salary: staff.monthly_salary,
            is_active: staff.is_active ?? true,
            created_at: staff.created_at,
            updated_at: staff.updated_at,
            totalTrips: 0, totalKm: 0, totalHours: 0, totalRevenue: 0,
            avgFuelEfficiency: 0, onTimeRate: 0, complaintsCount: 0,
            commissionEarned: 0, attendanceRate: 0, performanceScore: 0,
            rating: 0, performanceTier: 'needs_improvement' as any
          };
        }
      });

      setStaffPerformance(performanceData);

      // Calculate summary
      const activeStaff = performanceData.filter(s => s.status === 'active');
      const newSummary: StaffPerformanceSummary = {
        totalActiveStaff: activeStaff.length,
        totalDrivers: activeStaff.filter(s => s.staff_type === 'driver').length,
        totalConductors: activeStaff.filter(s => s.staff_type === 'conductor').length,
        totalHoursThisMonth: activeStaff.reduce((sum, s) => sum + s.totalHours, 0),
        totalCommissionsEarned: activeStaff.reduce((sum, s) => sum + s.commissionEarned, 0),
        avgPerformanceScore: activeStaff.length > 0 
          ? activeStaff.reduce((sum, s) => sum + s.performanceScore, 0) / activeStaff.length 
          : 0,
        complaintsThisMonth: activeStaff.reduce((sum, s) => sum + s.complaintsCount, 0),
        topPerformersCount: activeStaff.filter(s => s.performanceScore > 80).length,
      };

      setSummary(newSummary);

      // Generate insights
      generateInsights(performanceData);

    } catch (error: any) {
      console.error('Error fetching staff performance:', error);
      toast({
        title: "Error",
        description: `Failed to load staff performance data: ${error?.message || error}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (data: StaffMemberPerformance[]) => {
    const newInsights: PerformanceInsight[] = [];

    // Top performer
    const topPerformer = data.reduce((max, s) => s.performanceScore > max.performanceScore ? s : max, data[0]);
    if (topPerformer && topPerformer.performanceScore > 70) {
      newInsights.push({
        type: 'success',
        title: 'Top Performer',
        message: `${topPerformer.staff_name} leads with ${topPerformer.performanceScore}% performance score`,
        staffId: topPerformer.id,
      });
    }

    // Best fuel efficiency
    const bestEfficiency = data.filter(s => s.avgFuelEfficiency > 0)
      .reduce((max, s) => s.avgFuelEfficiency > max.avgFuelEfficiency ? s : max, data[0]);
    if (bestEfficiency && bestEfficiency.avgFuelEfficiency > 8) {
      newInsights.push({
        type: 'success',
        title: 'Best Fuel Efficiency',
        message: `${bestEfficiency.staff_name} achieves ${bestEfficiency.avgFuelEfficiency} km/L`,
        staffId: bestEfficiency.id,
      });
    }

    // Low attendance warning
    const lowAttendance = data.filter(s => s.attendanceRate < 70 && s.is_active);
    if (lowAttendance.length > 0) {
      newInsights.push({
        type: 'warning',
        title: 'Low Attendance Alert',
        message: `${lowAttendance.length} staff member(s) have attendance below 70%`,
      });
    }

    // Complaints alert
    const withComplaints = data.filter(s => s.complaintsCount > 0);
    if (withComplaints.length > 0) {
      const totalComplaints = withComplaints.reduce((sum, s) => sum + s.complaintsCount, 0);
      newInsights.push({
        type: 'warning',
        title: 'Complaints',
        message: `${totalComplaints} complaint(s) across ${withComplaints.length} staff member(s)`,
      });
    }

    // Commission eligible
    const commissionEarners = data.filter(s => s.commissionEarned > 0);
    if (commissionEarners.length > 0) {
      const totalCommission = commissionEarners.reduce((sum, s) => sum + s.commissionEarned, 0);
      newInsights.push({
        type: 'info',
        title: 'Commissions Earned',
        message: `LKR ${totalCommission.toLocaleString()} earned by ${commissionEarners.length} staff`,
      });
    }

    // Needs improvement
    const needsImprovement = data.filter(s => s.performanceTier === 'needs_improvement' && s.is_active);
    if (needsImprovement.length > 0) {
      newInsights.push({
        type: 'error',
        title: 'Needs Improvement',
        message: `${needsImprovement.length} staff member(s) scoring below 40%`,
      });
    }

    setInsights(newInsights);
  };

  // Summary statistics
  const summary = useMemo<StaffPerformanceSummary>(() => {
    const activeStaff = staffPerformance.filter(s => s.is_active);
    return {
      totalActiveStaff: activeStaff.length,
      totalDrivers: activeStaff.filter(s => s.staff_type === 'driver').length,
      totalConductors: activeStaff.filter(s => s.staff_type === 'conductor').length,
      totalHoursThisMonth: activeStaff.reduce((sum, s) => sum + s.totalHours, 0),
      totalCommissionsEarned: activeStaff.reduce((sum, s) => sum + s.commissionEarned, 0),
      avgPerformanceScore: activeStaff.length > 0 
        ? activeStaff.reduce((sum, s) => sum + s.performanceScore, 0) / activeStaff.length 
        : 0,
      complaintsThisMonth: activeStaff.reduce((sum, s) => sum + s.complaintsCount, 0),
      topPerformersCount: activeStaff.filter(s => s.performanceTier === 'excellent').length,
    };
  }, [staffPerformance]);

  // Filtered lists
  const drivers = useMemo(() => 
    staffPerformance.filter(s => s.staff_type === 'driver' && s.is_active), 
    [staffPerformance]
  );

  const conductors = useMemo(() => 
    staffPerformance.filter(s => s.staff_type === 'conductor' && s.is_active), 
    [staffPerformance]
  );

  const topPerformers = useMemo(() => 
    staffPerformance
      .filter(s => s.is_active)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5),
    [staffPerformance]
  );

  useEffect(() => {
    fetchStaffPerformance();
  }, [options.dateRange?.start, options.dateRange?.end]);

  return {
    staffPerformance,
    loading,
    summary,
    insights,
    drivers,
    conductors,
    topPerformers,
    refetch: fetchStaffPerformance,
  };
}
