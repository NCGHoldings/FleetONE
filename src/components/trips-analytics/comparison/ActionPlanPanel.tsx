import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Clock, 
  Zap, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Rocket
} from 'lucide-react';
import { ActionItem } from '@/hooks/useComparisonAnalytics';

interface ActionPlanPanelProps {
  actionItems: ActionItem[];
}

export default function ActionPlanPanel({
  actionItems
}: ActionPlanPanelProps) {
  const getEffortConfig = (effort: ActionItem['effort']) => {
    switch (effort) {
      case 'low':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          label: 'Quick Win'
        };
      case 'medium':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
          label: 'Moderate'
        };
      case 'high':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          label: 'Strategic'
        };
    }
  };

  const totalPotentialGain = actionItems.reduce((sum, item) => sum + item.potentialGain, 0);
  const quickWins = actionItems.filter(item => item.effort === 'low');
  const strategicItems = actionItems.filter(item => item.effort === 'high');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              Action Plan
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500 text-white">
                <DollarSign className="h-3 w-3 mr-1" />
                ₹{(totalPotentialGain / 1000).toFixed(0)}k Potential
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <Zap className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {quickWins.length}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-500">Quick Wins</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <ClipboardList className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {actionItems.length}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-500">Total Actions</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <Rocket className="h-6 w-6 mx-auto text-purple-500 mb-1" />
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {strategicItems.length}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-500">Strategic</div>
            </div>
          </div>

          {/* Action Items List */}
          {actionItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                No immediate actions required
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All entities are performing optimally
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item, index) => {
                const effortConfig = getEffortConfig(item.effort);
                
                return (
                  <motion.div
                    key={`${item.action}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Priority Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {item.priority}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Action Title */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold">{item.action}</span>
                          <Badge className={`${effortConfig.bg} ${effortConfig.text} border-0`}>
                            {effortConfig.label}
                          </Badge>
                        </div>
                        
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Timeframe
                            </div>
                            <div className="font-medium">{item.timeframe}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Metric</div>
                            <div className="font-medium capitalize">{item.metric}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Expected Impact</div>
                            <div className="font-medium text-emerald-600 dark:text-emerald-400">
                              {item.expectedImpact}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Potential Gain</div>
                            <div className="font-medium text-emerald-600 dark:text-emerald-400">
                              ₹{item.potentialGain.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom Summary */}
          {actionItems.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Complete all actions
                  </h4>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500">
                    Estimated total improvement: ₹{totalPotentialGain.toLocaleString()}
                  </p>
                </div>
                <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-0">
                  <Rocket className="h-4 w-4 mr-2" />
                  Start Implementation
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
