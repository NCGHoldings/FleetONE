import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Zap, 
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { ComparisonInsight } from '@/hooks/useComparisonAnalytics';

interface InstantComparisonInsightsProps {
  insights: ComparisonInsight[];
  entityNames: string[];
}

export default function InstantComparisonInsights({ 
  insights, 
  entityNames 
}: InstantComparisonInsightsProps) {
  const getInsightIcon = (type: ComparisonInsight['type']) => {
    switch (type) {
      case 'strength':
        return <Award className="h-5 w-5 text-emerald-500" />;
      case 'weakness':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'opportunity':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'threat':
        return <Zap className="h-5 w-5 text-rose-500" />;
    }
  };

  const getInsightBadgeColor = (type: ComparisonInsight['type']) => {
    switch (type) {
      case 'strength':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300';
      case 'weakness':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300';
      case 'opportunity':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300';
      case 'threat':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-300';
    }
  };

  const strengthInsights = insights.filter(i => i.type === 'strength');
  const weaknessInsights = insights.filter(i => i.type === 'weakness');
  const opportunityInsights = insights.filter(i => i.type === 'opportunity');
  const threatInsights = insights.filter(i => i.type === 'threat');

  // Calculate winner summary
  const winnerCount: Record<string, number> = {};
  entityNames.forEach(name => { winnerCount[name] = 0; });
  
  strengthInsights.forEach(insight => {
    if (winnerCount[insight.entity] !== undefined) {
      winnerCount[insight.entity]++;
    }
  });

  const overallWinner = Object.entries(winnerCount)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-purple-500" />
              Instant Analysis
            </CardTitle>
            {overallWinner && overallWinner[1] > 0 && (
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                <Award className="h-3 w-3 mr-1" />
                {overallWinner[0]} leads in {overallWinner[1]} metrics
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {strengthInsights.length}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-500">Strengths</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {weaknessInsights.length}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-500">Weaknesses</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {opportunityInsights.length}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-500">Opportunities</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {threatInsights.length}
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-500">Threats</div>
            </div>
          </div>

          {/* Key Insights List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {insights.slice(0, 8).map((insight, index) => (
              <motion.div
                key={`${insight.entity}-${insight.metric}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${getInsightBadgeColor(insight.type)}`}>
                      {insight.entity}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {insight.metric}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">
                    {insight.message}
                  </p>
                  {insight.percentDiff !== undefined && insight.percentDiff !== 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {insight.percentDiff > 0 ? (
                        <ArrowUp className="h-3 w-3 text-emerald-500" />
                      ) : insight.percentDiff < 0 ? (
                        <ArrowDown className="h-3 w-3 text-rose-500" />
                      ) : (
                        <Minus className="h-3 w-3 text-slate-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        insight.percentDiff > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {Math.abs(insight.percentDiff)}% {insight.percentDiff > 0 ? 'ahead' : 'behind'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {insights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select entities to see comparison insights</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
