import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";

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

export default function ComparisonDashboard({
  drivers,
  routes,
  buses,
}: ComparisonDashboardProps) {
  const [comparisonType, setComparisonType] = useState<"drivers" | "routes" | "buses">("drivers");
  const [selected1, setSelected1] = useState<string>("");
  const [selected2, setSelected2] = useState<string>("");

  const data = comparisonType === "drivers" ? drivers : comparisonType === "routes" ? routes : buses;
  
  const item1 = data.find(d => d.id === selected1);
  const item2 = data.find(d => d.id === selected2);

  const renderComparison = () => {
    if (!item1 || !item2) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          Select two {comparisonType} to compare
        </div>
      );
    }

    const metrics = [
      { label: "Total Income", key: "income", format: (v: number) => `₹${v.toLocaleString()}` },
      { label: "Total Expenses", key: "expenses", format: (v: number) => `₹${v.toLocaleString()}` },
      { label: "Net Profit", key: "netProfit", format: (v: number) => `₹${v.toLocaleString()}` },
      { label: "Total Trips", key: "trips", format: (v: number) => v.toString() },
      { label: "Avg Efficiency", key: "efficiency", format: (v: number) => `${v.toFixed(2)} km/L` },
    ];

    return (
      <div className="space-y-4">
        {metrics.map((metric) => {
          const value1 = item1[metric.key as keyof ComparisonItem] as number;
          const value2 = item2[metric.key as keyof ComparisonItem] as number;
          const diff = value1 - value2;
          const diffPercent = value2 !== 0 ? ((diff / value2) * 100) : 0;
          const isPositive = diff > 0;

          return (
            <div key={metric.key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{metric.label}</h4>
                <Badge variant={isPositive ? "default" : "secondary"}>
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(diffPercent).toFixed(1)}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">{item1.name}</div>
                  <div className="text-lg font-semibold">{metric.format(value1)}</div>
                </div>

                <div className="flex justify-center">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">{item2.name}</div>
                  <div className="text-lg font-semibold">{metric.format(value2)}</div>
                </div>
              </div>

              <div className="mt-3 text-center text-sm text-muted-foreground">
                Difference: <span className={isPositive ? "text-primary" : "text-destructive"}>
                  {metric.format(Math.abs(diff))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Side-by-Side Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">Compare performance across drivers, routes, or buses</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Type Selector */}
        <div className="flex gap-2">
          <Button
            variant={comparisonType === "drivers" ? "default" : "outline"}
            onClick={() => {
              setComparisonType("drivers");
              setSelected1("");
              setSelected2("");
            }}
          >
            Drivers
          </Button>
          <Button
            variant={comparisonType === "routes" ? "default" : "outline"}
            onClick={() => {
              setComparisonType("routes");
              setSelected1("");
              setSelected2("");
            }}
          >
            Routes
          </Button>
          <Button
            variant={comparisonType === "buses" ? "default" : "outline"}
            onClick={() => {
              setComparisonType("buses");
              setSelected1("");
              setSelected2("");
            }}
          >
            Buses
          </Button>
        </div>

        {/* Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select First {comparisonType.slice(0, -1)}</label>
            <Select value={selected1} onValueChange={setSelected1}>
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${comparisonType.slice(0, -1)}`} />
              </SelectTrigger>
              <SelectContent>
                {data.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={item.id === selected2}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Second {comparisonType.slice(0, -1)}</label>
            <Select value={selected2} onValueChange={setSelected2}>
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${comparisonType.slice(0, -1)}`} />
              </SelectTrigger>
              <SelectContent>
                {data.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={item.id === selected1}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Results */}
        <div className="mt-6">
          {renderComparison()}
        </div>
      </CardContent>
    </Card>
  );
}
