import React from 'react';
import { Target, Trophy, TrendingDown, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface GamificationBannerProps {
  totalIncome: number;
  totalExpenses: number;
  routeTarget?: number;
}

export const GamificationBanner: React.FC<GamificationBannerProps> = ({ totalIncome, totalExpenses, routeTarget = 0 }) => {
  if (totalIncome === 0 || routeTarget === 0) return null; // Don't show anything if they haven't entered data yet or no target is set

  const isWin = totalIncome >= routeTarget;
  const targetDiff = Math.abs(totalIncome - routeTarget);
  const commission = isWin ? Math.floor(targetDiff * 0.05) : 0; // 5% commission on excess

  return (
    <Card className={`overflow-hidden border-0 shadow-lg animate-in slide-in-from-top-4 duration-500 mb-6 ${
      isWin 
        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
        : 'bg-gradient-to-r from-amber-500 to-amber-600'
    }`}>
      <div className="p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {isWin ? (
              <Trophy className="w-8 h-8 text-emerald-100" />
            ) : (
              <Target className="w-8 h-8 text-amber-100" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              {isWin ? "TARGET EXCEEDED! 🎉" : "TARGET MISSED"}
            </h3>
            <p className="text-sm opacity-90 mt-1 font-medium leading-tight">
              {isWin ? (
                <>
                  You beat the Rs. {(routeTarget).toLocaleString()} daily target by <span className="font-bold underline">Rs. {targetDiff.toLocaleString()}</span>! 
                  Estimated Commission Bonus: <span className="font-bold text-yellow-300">Rs. {commission.toLocaleString()}</span>
                </>
              ) : (
                <>
                  Revenue was Rs. {totalIncome.toLocaleString()} (Target: Rs. {(routeTarget).toLocaleString()}). 
                  You missed out on commission today by Rs. {targetDiff.toLocaleString()}. Try again tomorrow! Good Luck!
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
