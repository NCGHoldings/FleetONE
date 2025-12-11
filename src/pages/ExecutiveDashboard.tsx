import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  RefreshCw, 
  Maximize2, 
  Settings, 
  Clock,
  Building2,
  Tv
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { ExecutiveFinancialSummary } from "@/components/executive/ExecutiveFinancialSummary";
import { ExecutiveRevenueChart } from "@/components/executive/ExecutiveRevenueChart";
import { ExecutiveAchievementRings } from "@/components/executive/ExecutiveAchievementRings";
import { ExecutiveRouteFlow } from "@/components/executive/ExecutiveRouteFlow";
import { ExecutiveFleetWidget } from "@/components/executive/ExecutiveFleetWidget";
import { ExecutiveMonthlyComparison } from "@/components/executive/ExecutiveMonthlyComparison";
import { ExecutiveDateFilter } from "@/components/executive/ExecutiveDateFilter";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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
    monthlyComparison,
    financialSummary,
    tripCount,
    isLoading,
    refetch,
  } = useExecutiveDashboard({
    startDate: dateRange.from,
    endDate: dateRange.to,
    refreshInterval: autoRefresh ? 30000 : 0,
  });

  useEffect(() => {
    if (!isLoading) {
      setLastUpdate(new Date());
    }
  }, [isLoading, kpis]);

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

  // Transform KPIs for achievement rings
  const kpiAchievements = kpis.map(kpi => ({
    name: kpi.name,
    achievement: kpi.achievement,
    target: kpi.target,
    current: kpi.value,
    unit: kpi.unit,
  }));

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background to-muted/30",
      "p-4 lg:p-6 space-y-6"
    )}>
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Executive Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="gap-1.5 border-emerald-500/50 text-emerald-600">
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
            className={cn(
              "gap-2",
              autoRefresh && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            )}
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

      {/* Financial Summary Cards */}
      <ExecutiveFinancialSummary 
        data={financialSummary}
        isLoading={isLoading}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ExecutiveRevenueChart 
          data={revenueTrend} 
          isLoading={isLoading}
        />
        <ExecutiveAchievementRings 
          kpis={kpiAchievements}
          isLoading={isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ExecutiveRouteFlow 
          routes={routePerformance}
          isLoading={isLoading}
        />
        <ExecutiveFleetWidget 
          data={fleetStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Monthly Comparison */}
      <ExecutiveMonthlyComparison 
        data={monthlyComparison}
        isLoading={isLoading}
      />

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4"
      >
        <Badge variant="secondary" className="gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Based on {tripCount} actual trip records
        </Badge>
        <span>•</span>
        <span>
          {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
        </span>
      </motion.footer>
    </div>
  );
}
