import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataQualityResult } from "@/hooks/useDataQualityChecks";
import { BusinessRuleResult } from "@/hooks/useBusinessRulesChecks";
import { CrossModuleResult } from "@/hooks/useCrossModuleChecks";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ResultItem = DataQualityResult | BusinessRuleResult | CrossModuleResult;

interface DataQualityPanelProps {
  results: ResultItem[];
  isRunning: boolean;
  onRefresh: () => void;
  title: string;
  description?: string;
  lastRunTime?: Date | null;
  accentColor?: 'blue' | 'purple' | 'orange' | 'green' | 'cyan';
}

export const DataQualityPanel = ({
  results,
  isRunning,
  onRefresh,
  title,
  description,
  lastRunTime,
  accentColor = 'blue'
}: DataQualityPanelProps) => {
  const navigate = useNavigate();

  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  const accentColors = {
    blue: 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10',
    purple: 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10',
    orange: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10',
    green: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
    cyan: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    const category = 'category' in result ? result.category : 'Cross-Module';
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as Record<string, ResultItem[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            {errorCount > 0 && (
              <Badge variant="destructive">{errorCount} Critical</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                {warningCount} Warnings
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-slate-400 mt-1">
              {description}
              {lastRunTime && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last run: {format(lastRunTime, 'HH:mm:ss')}
                </span>
              )}
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh} 
          disabled={isRunning}
          className={accentColors[accentColor]}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRunning && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-lg border border-slate-700/30">
          <RefreshCw className="h-12 w-12 text-slate-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-slate-300">Running Checks...</h3>
          <p className="text-slate-400">Please wait while we analyze your data</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.entries(groupedResults).map(([category, items]) => (
            <Card key={category} className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {items.map((result) => (
                    <div
                      key={result.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        result.status === 'error' && "bg-red-500/10 border border-red-500/20",
                        result.status === 'warning' && "bg-amber-500/10 border border-amber-500/20",
                        result.status === 'success' && "bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <p className="font-medium text-sm text-slate-200">{result.name}</p>
                          <p className="text-xs text-slate-400">{result.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.count > 0 && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              result.status === 'error' && "bg-red-500/20 text-red-400",
                              result.status === 'warning' && "bg-amber-500/20 text-amber-400"
                            )}
                          >
                            {result.count}
                          </Badge>
                        )}
                        {result.action && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(result.action!.path)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
