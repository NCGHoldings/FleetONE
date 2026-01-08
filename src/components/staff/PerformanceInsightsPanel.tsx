import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, AlertTriangle, Info, AlertCircle, Lightbulb } from "lucide-react";

interface PerformanceInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  staffId?: string;
}

interface PerformanceInsightsPanelProps {
  insights: PerformanceInsight[];
  onInsightClick?: (staffId: string) => void;
}

export function PerformanceInsightsPanel({ insights, onInsightClick }: PerformanceInsightsPanelProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20';
    }
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No insights available. Add more trip data to see performance insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Performance Insights
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {insights.length} insights
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${getInsightBgColor(insight.type)}`}
                onClick={() => insight.staffId && onInsightClick?.(insight.staffId)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
