import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataQualityResult } from "@/hooks/useDataQualityChecks";
import { BusinessRuleResult } from "@/hooks/useBusinessRulesChecks";
import { CrossModuleResult } from "@/hooks/useCrossModuleChecks";

type ResultItem = DataQualityResult | BusinessRuleResult | CrossModuleResult;

interface DataQualityPanelProps {
  results: ResultItem[];
  isRunning: boolean;
  onRefresh: () => void;
  title: string;
  errorCount: number;
  warningCount: number;
}

export const DataQualityPanel = ({
  results,
  isRunning,
  onRefresh,
  title,
  errorCount,
  warningCount
}: DataQualityPanelProps) => {
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    const category = result.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as Record<string, ResultItem[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {errorCount > 0 && (
            <Badge variant="destructive">{errorCount} Critical</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
              {warningCount} Warnings
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRunning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(groupedResults).map(([category, items]) => (
          <Card key={category}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {items.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <p className="font-medium text-sm">{result.name}</p>
                        <p className="text-xs text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.count > 0 && (
                        <Badge variant="secondary">{result.count}</Badge>
                      )}
                      {result.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(result.action!.path)}
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
    </div>
  );
};
