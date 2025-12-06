import { useState } from "react";
import { Bus, DollarSign, Calendar, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { DataEntryControlWidget } from "@/components/dashboard/DataEntryControlWidget";
import { DashboardHeroSection } from "@/components/dashboard/DashboardHeroSection";
import { EnhancedKPICard } from "@/components/dashboard/EnhancedKPICard";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { FleetUtilizationChart } from "@/components/dashboard/FleetUtilizationChart";
import { LiveAlertsPanel } from "@/components/dashboard/LiveAlertsPanel";
import { FleetStatusTable } from "@/components/dashboard/FleetStatusTable";
import { RoutePerformanceChart } from "@/components/dashboard/RoutePerformanceChart";
import { QuickStatsWidget } from "@/components/dashboard/QuickStatsWidget";

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₨ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₨ ${(value / 1000).toFixed(0)}K`;
  return `₨ ${value.toFixed(0)}`;
};

export default function Dashboard() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    kpis,
    kpisLoading,
    revenueTrend,
    revenueTrendLoading,
    fleetStatus,
    fleetStatusLoading,
    alerts,
    alertsLoading,
    routePerformance,
    routePerformanceLoading,
    refetchKpis,
    refetchFleetStatus,
  } = useDashboardAnalytics();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchKpis(), refetchFleetStatus()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Generate sparkline data from revenue trend
  const revenueSparkline = revenueTrend?.slice(-7).map(d => d.revenue) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section */}
      <DashboardHeroSection onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedKPICard
          title="Monthly Revenue"
          value={formatCurrency(kpis?.totalRevenue || 0)}
          change={kpis?.revenueChange}
          changeLabel="vs last month"
          icon={<DollarSign className="w-5 h-5" />}
          gradient="blue"
          isLoading={kpisLoading}
          sparklineData={revenueSparkline}
          delay={1}
        />
        <EnhancedKPICard
          title="Active Fleet"
          value={kpis?.activeBuses || 0}
          subtitle={`${kpis?.movingBuses || 0} moving, ${kpis?.idleBuses || 0} idle`}
          icon={<Bus className="w-5 h-5" />}
          gradient="purple"
          isLoading={kpisLoading}
          delay={2}
        />
        <EnhancedKPICard
          title="Today's Trips"
          value={kpis?.todayTrips || 0}
          subtitle={`${kpis?.completedTrips || 0} completed`}
          icon={<Calendar className="w-5 h-5" />}
          gradient="green"
          isLoading={kpisLoading}
          delay={3}
        />
        <EnhancedKPICard
          title="Active Staff"
          value={kpis?.activeStaff || 0}
          subtitle={`${kpis?.driversOnDuty || 0} drivers on duty`}
          icon={<Users className="w-5 h-5" />}
          gradient="orange"
          isLoading={kpisLoading}
          delay={4}
        />
      </div>

      {/* Data Entry Control Widget (Admin only) */}
      {isAdmin && <DataEntryControlWidget />}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueExpenseChart data={revenueTrend} isLoading={revenueTrendLoading} />
        <FleetUtilizationChart
          moving={kpis?.movingBuses}
          idle={kpis?.idleBuses}
          offline={kpis?.offlineBuses}
          isLoading={kpisLoading}
        />
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RoutePerformanceChart data={routePerformance} isLoading={routePerformanceLoading} />
        <div className="grid grid-cols-1 gap-6">
          <QuickStatsWidget
            fuelEfficiency={12.5}
            maintenanceDue={kpis?.offlineBuses || 0}
            enginesRunning={kpis?.movingBuses || 0}
            totalBuses={kpis?.activeBuses || 0}
            isLoading={kpisLoading}
          />
        </div>
      </div>

      {/* Alerts and Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LiveAlertsPanel alerts={alerts} isLoading={alertsLoading} />
        <div className="lg:col-span-2">
          <FleetStatusTable data={fleetStatus} isLoading={fleetStatusLoading} />
        </div>
      </div>
    </div>
  );
}
