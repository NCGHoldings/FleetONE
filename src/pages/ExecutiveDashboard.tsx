import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  RefreshCw, 
  Maximize2, 
  Settings, 
  Clock,
  TrendingUp,
  Building2,
  Tv
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { ExecutiveKPICard } from "@/components/executive/ExecutiveKPICard";
import { ExecutiveRevenueTrendChart } from "@/components/executive/ExecutiveRevenueTrendChart";
import { ExecutiveFleetStatusChart } from "@/components/executive/ExecutiveFleetStatusChart";
import { ExecutiveRoutePerformanceChart } from "@/components/executive/ExecutiveRoutePerformanceChart";
import { ExecutiveQuickStats } from "@/components/executive/ExecutiveQuickStats";
import { ExecutiveLiveAlerts } from "@/components/executive/ExecutiveLiveAlerts";
import { ExecutiveDateFilter } from "@/components/executive/ExecutiveDateFilter";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExecutiveDashboard() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    kpis,
    revenueTrend,
    routePerformance,
    fleetStatus,
    isLoading,
    refetch,
  } = useExecutiveDashboard({
    startDate: dateRange.from,
    endDate: dateRange.to,
    refreshInterval: autoRefresh ? 30000 : 0,
  });

  // Update last update time
  useEffect(() => {
    if (!isLoading) {
      setLastUpdate(new Date());
    }
  }, [isLoading, kpis]);

  // Auto-refresh indicator
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleRefresh = async () => {
    await refetch();
    setLastUpdate(new Date());
  };

  // Calculate quick stats from trip data
  const quickStats = {
    todayTrips: kpis.find(k => k.key === 'daily_trips')?.value || 0,
    completedTrips: Math.round((kpis.find(k => k.key === 'completion_rate')?.value || 0) / 100 * (kpis.find(k => k.key === 'daily_trips')?.value || 0)),
    avgFuelEfficiency: kpis.find(k => k.key === 'fuel_efficiency')?.value || 0,
    totalDistance: kpis.find(k => k.key === 'total_distance')?.value || 0,
    activeStaff: 0, // Would need separate query
  };

  // Get main KPIs for display (first 4)
  const mainKPIs = kpis.slice(0, 4);

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background to-muted/20",
      "p-4 lg:p-6 space-y-6"
    )}>
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Executive Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="gap-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted"
                )} />
                {autoRefresh ? "Live" : "Paused"}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated {format(lastUpdate, 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExecutiveDateFilter 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
            className="gap-2"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden lg:inline">TV Mode</span>
          </Button>

          <Link to="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.header>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-xl" />
          ))
        ) : (
          mainKPIs.map((kpi, index) => (
            <ExecutiveKPICard
              key={kpi.key}
              name={kpi.name}
              value={kpi.value}
              target={kpi.target}
              achievement={kpi.achievement}
              status={kpi.status}
              unit={kpi.unit}
              delay={index}
            />
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ExecutiveRevenueTrendChart 
          data={revenueTrend} 
          isLoading={isLoading}
        />
        <ExecutiveFleetStatusChart 
          data={fleetStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <ExecutiveRoutePerformanceChart 
          data={routePerformance}
          isLoading={isLoading}
        />
        <ExecutiveQuickStats 
          stats={quickStats}
          isLoading={isLoading}
        />
        <ExecutiveLiveAlerts />
      </div>

      {/* Footer with data source indicator */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4"
      >
        <TrendingUp className="w-4 h-4" />
        <span>
          Data from {format(dateRange.from, 'MMM dd')} to {format(dateRange.to, 'MMM dd, yyyy')} • 
          Based on actual trip records
        </span>
      </motion.footer>
    </div>
  );
}
