import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Trophy, Users, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { COMPARISON_COLORS } from "@/lib/comparison-colors";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";

// New components
import InstantComparisonInsights from "./comparison/InstantComparisonInsights";
import HistoricalTrendPanel from "./comparison/HistoricalTrendPanel";
import PredictiveForecastPanel from "./comparison/PredictiveForecastPanel";
import FocusAreaRecommendations from "./comparison/FocusAreaRecommendations";
import ActionPlanPanel from "./comparison/ActionPlanPanel";
import PerformanceScorecard from "./comparison/PerformanceScorecard";
import MultiComparisonMatrix from "./comparison/MultiComparisonMatrix";
import ComparisonSparklineCard from "./comparison/ComparisonSparklineCard";

// Existing components
import ComparisonBarChart from "./charts/ComparisonBarChart";
import { DollarSign, Gauge, MapPin, TrendingUp } from "lucide-react";

interface ComparisonItem {
  id: string;
  name: string;
  income: number;
  expenses: number;
  netProfit: number;
  trips: number;
  efficiency: number;
}

interface ComparisonDashboardProps {
  drivers: ComparisonItem[];
  routes: ComparisonItem[];
  buses: ComparisonItem[];
}

const ENTITY_COLORS = [
  COMPARISON_COLORS.entity1.primary,
  COMPARISON_COLORS.entity2.primary,
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

export default function ComparisonDashboard({
  drivers,
  routes,
  buses,
}: ComparisonDashboardProps) {
  const [comparisonType, setComparisonType] = useState<"drivers" | "routes" | "buses">("drivers");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [historicalPeriod, setHistoricalPeriod] = useState<7 | 14 | 30>(14);

  const data = comparisonType === "drivers" ? drivers : comparisonType === "routes" ? routes : buses;
  const selectedEntities = data.filter(d => selectedIds.includes(d.id));

  // Use the comparison analytics hook
  const {
    historical,
    growthMetrics,
    predictions,
    insights,
    focusAreas,
    actionItems,
    performanceScores
  } = useComparisonAnalytics(selectedEntities);

  const handleAddEntity = (id: string) => {
    if (selectedIds.length < 5 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemoveEntity = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const handleTypeChange = (type: "drivers" | "routes" | "buses") => {
    setComparisonType(type);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-purple-500" />
            Advanced Multi-Comparison Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare up to 5 {comparisonType} with historical trends, predictions, and actionable insights
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Selector */}
          <div className="flex flex-wrap gap-2">
            {(["drivers", "routes", "buses"] as const).map(type => (
              <Button
                key={type}
                variant={comparisonType === type ? "default" : "outline"}
                onClick={() => handleTypeChange(type)}
                className={comparisonType === type 
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0" 
                  : ""}
              >
                <Users className="h-4 w-4 mr-2" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          {/* Entity Selection */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Selected Entities */}
            {selectedEntities.map((entity, index) => (
              <Badge
                key={entity.id}
                className="py-2 px-3 text-sm"
                style={{ 
                  backgroundColor: ENTITY_COLORS[index] + '20',
                  color: ENTITY_COLORS[index],
                  borderColor: ENTITY_COLORS[index]
                }}
              >
                {entity.name}
                <button
                  onClick={() => handleRemoveEntity(entity.id)}
                  className="ml-2 hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {/* Add Entity Dropdown */}
            {selectedIds.length < 5 && (
              <Select onValueChange={handleAddEntity}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={`Add ${comparisonType.slice(0, -1)}...`} />
                </SelectTrigger>
                <SelectContent>
                  {data
                    .filter(item => !selectedIds.includes(item.id))
                    .map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            <span className="text-xs text-muted-foreground">
              {selectedIds.length}/5 selected
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {selectedEntities.length < 2 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <Trophy className="h-16 w-16 mx-auto text-purple-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select Entities to Compare</h3>
            <p className="text-muted-foreground">
              Choose at least 2 {comparisonType} from the dropdown above to see comparison analytics
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Instant Insights */}
          <InstantComparisonInsights 
            insights={insights}
            entityNames={selectedEntities.map(e => e.name)}
          />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
              <TabsTrigger value="focus">Focus Areas</TabsTrigger>
              <TabsTrigger value="actions">Action Plan</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <MultiComparisonMatrix entities={selectedEntities} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ComparisonSparklineCard
                  title="Income"
                  entities={selectedEntities}
                  getValue={(e) => e.income ?? 0}
                  historicalData={historical}
                  getHistoricalValue={(p) => p.income ?? 0}
                  format={(v) => `Rs ${((v ?? 0)/1000).toFixed(0)}k`}
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <ComparisonSparklineCard
                  title="Net Profit"
                  entities={selectedEntities}
                  getValue={(e) => e.netProfit ?? 0}
                  historicalData={historical}
                  getHistoricalValue={(p) => p.profit ?? 0}
                  format={(v) => `Rs ${((v ?? 0)/1000).toFixed(0)}k`}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <ComparisonSparklineCard
                  title="Trips"
                  entities={selectedEntities}
                  getValue={(e) => e.trips ?? 0}
                  historicalData={historical}
                  getHistoricalValue={(p) => p.trips ?? 0}
                  format={(v) => (v ?? 0).toString()}
                  icon={<MapPin className="h-4 w-4" />}
                />
                <ComparisonSparklineCard
                  title="Efficiency"
                  entities={selectedEntities}
                  getValue={(e) => e.efficiency ?? 0}
                  historicalData={historical}
                  getHistoricalValue={(p) => p.efficiency ?? 0}
                  format={(v) => `${(v ?? 0).toFixed(1)} km/L`}
                  icon={<Gauge className="h-4 w-4" />}
                />
              </div>

              {selectedEntities.length === 2 && (
                <ComparisonBarChart
                  name1={selectedEntities[0].name}
                  name2={selectedEntities[1].name}
                  data1={{
                    income: selectedEntities[0].income,
                    expenses: selectedEntities[0].expenses,
                    netProfit: selectedEntities[0].netProfit,
                  }}
                  data2={{
                    income: selectedEntities[1].income,
                    expenses: selectedEntities[1].expenses,
                    netProfit: selectedEntities[1].netProfit,
                  }}
                />
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <HistoricalTrendPanel
                entities={selectedEntities}
                historicalData={historical}
                growthMetrics={growthMetrics}
                selectedPeriod={historicalPeriod}
                onPeriodChange={setHistoricalPeriod}
              />
            </TabsContent>

            {/* Forecast Tab */}
            <TabsContent value="forecast">
              <PredictiveForecastPanel
                entities={selectedEntities}
                predictions={predictions}
              />
            </TabsContent>

            {/* Scorecard Tab */}
            <TabsContent value="scorecard">
              <PerformanceScorecard
                entities={selectedEntities}
                scores={performanceScores}
              />
            </TabsContent>

            {/* Focus Areas Tab */}
            <TabsContent value="focus">
              <FocusAreaRecommendations focusAreas={focusAreas} />
            </TabsContent>

            {/* Action Plan Tab */}
            <TabsContent value="actions">
              <ActionPlanPanel actionItems={actionItems} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
