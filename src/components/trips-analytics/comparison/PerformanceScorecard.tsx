import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Award, 
  TrendingUp, 
  DollarSign, 
  Fuel, 
  MapPin,
  Gauge
} from 'lucide-react';
import { COMPARISON_COLORS } from '@/lib/comparison-colors';

interface PerformanceScore {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
}

interface PerformanceScorecardProps {
  entities: Array<{ id: string; name: string }>;
  scores: Record<string, PerformanceScore>;
}

const ENTITY_COLORS = [
  COMPARISON_COLORS.entity1.primary,
  COMPARISON_COLORS.entity2.primary,
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

const BREAKDOWN_ICONS: Record<string, React.ReactNode> = {
  income: <DollarSign className="h-4 w-4" />,
  profit: <TrendingUp className="h-4 w-4" />,
  trips: <MapPin className="h-4 w-4" />,
  efficiency: <Fuel className="h-4 w-4" />,
  costs: <Gauge className="h-4 w-4" />
};

export default function PerformanceScorecard({
  entities,
  scores
}: PerformanceScorecardProps) {
  const getGradeConfig = (grade: string) => {
    if (grade.startsWith('A')) {
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-500',
        glow: 'shadow-emerald-500/30'
      };
    }
    if (grade.startsWith('B')) {
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-500',
        glow: 'shadow-blue-500/30'
      };
    }
    if (grade.startsWith('C')) {
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-500',
        glow: 'shadow-amber-500/30'
      };
    }
    if (grade.startsWith('D')) {
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-500',
        glow: 'shadow-orange-500/30'
      };
    }
    return {
      bg: 'bg-rose-500',
      text: 'text-rose-500',
      glow: 'shadow-rose-500/30'
    };
  };

  // Find overall winner
  const sortedEntities = [...entities].sort((a, b) => {
    const scoreA = scores[a.id]?.score || 0;
    const scoreB = scores[b.id]?.score || 0;
    return scoreB - scoreA;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Performance Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scorecards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEntities.map((entity, index) => {
              const scoreData = scores[entity.id];
              if (!scoreData) return null;
              
              const gradeConfig = getGradeConfig(scoreData.grade);
              const isWinner = index === 0;
              
              return (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-5 rounded-xl border-2 ${
                    isWinner 
                      ? 'border-amber-400 dark:border-amber-600 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  {/* Winner Badge */}
                  {isWinner && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 shadow-lg">
                        <Award className="h-3 w-3 mr-1" />
                        Top Performer
                      </Badge>
                    </div>
                  )}
                  
                  {/* Entity Name */}
                  <div className="text-center mb-4 pt-2">
                    <span 
                      className="font-bold text-lg"
                      style={{ color: ENTITY_COLORS[entities.indexOf(entity)] }}
                    >
                      {entity.name}
                    </span>
                  </div>
                  
                  {/* Grade Circle */}
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                      className={`w-24 h-24 rounded-full ${gradeConfig.bg} flex items-center justify-center shadow-lg ${gradeConfig.glow}`}
                    >
                      <span className="text-4xl font-bold text-white">
                        {scoreData.grade}
                      </span>
                    </motion.div>
                  </div>
                  
                  {/* Score */}
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold">{scoreData.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  
                  {/* Breakdown Bars */}
                  <div className="space-y-2">
                    {Object.entries(scoreData.breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className="w-6 text-muted-foreground">
                          {BREAKDOWN_ICONS[key]}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize text-muted-foreground">{key}</span>
                            <span className="font-medium">{value}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${value}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                              className={`h-full rounded-full ${
                                value >= 80 ? 'bg-emerald-500' :
                                value >= 60 ? 'bg-blue-500' :
                                value >= 40 ? 'bg-amber-500' :
                                'bg-rose-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Grade Legend */}
          <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
            {['A', 'B', 'C', 'D', 'F'].map(grade => {
              const config = getGradeConfig(grade);
              return (
                <div key={grade} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${config.bg} flex items-center justify-center text-white text-xs font-bold`}>
                    {grade}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {grade === 'A' ? '90-100' :
                     grade === 'B' ? '70-89' :
                     grade === 'C' ? '55-69' :
                     grade === 'D' ? '40-54' : '<40'}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
