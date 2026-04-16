import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Info, Lightbulb } from 'lucide-react';
import { Insight } from '@/hooks/useTripsAnalytics';
import { Button } from '@/components/ui/button';

interface InsightsPanelProps {
  insights: Insight[];
  onActionClick?: (insight: Insight) => void;
}

export default function InsightsPanel({ insights, onActionClick }: InsightsPanelProps) {
  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getVariant = (type: Insight['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
      </div>
      
      <div className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights available for the selected period.</p>
        ) : (
          insights.map((insight, index) => (
            <Alert key={index} variant={getVariant(insight.type)}>
              <div className="flex items-start gap-3">
                {getIcon(insight.type)}
                <div className="flex-1">
                  <AlertTitle className="mb-1">{insight.title}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {insight.message}
                  </AlertDescription>
                  {insight.action && onActionClick && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="px-0 h-auto mt-2"
                      onClick={() => onActionClick(insight)}
                    >
                      {insight.action} →
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          ))
        )}
      </div>
    </Card>
  );
}
