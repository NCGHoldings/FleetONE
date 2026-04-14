import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueChange: number;
  expensesChange: number;
  profitChange: number;
}

interface ExecutiveFinancialSummaryProps {
  data: FinancialData;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `Rs ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `Rs ${(value / 1000).toFixed(0)}K`;
  }
  return `Rs ${value.toLocaleString()}`;
};

export function ExecutiveFinancialSummary({ data, isLoading }: ExecutiveFinancialSummaryProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: data.totalRevenue,
      change: data.revenueChange,
      icon: DollarSign,
      gradient: "from-blue-600 via-blue-700 to-indigo-800",
      shadowColor: "shadow-blue-500/30",
      iconBg: "bg-blue-500/30",
    },
    {
      title: "Total Expenses",
      value: data.totalExpenses,
      change: data.expensesChange,
      icon: Receipt,
      gradient: "from-rose-600 via-rose-700 to-pink-800",
      shadowColor: "shadow-rose-500/30",
      iconBg: "bg-rose-500/30",
      invertChange: true,
    },
    {
      title: "Net Profit",
      value: data.netProfit,
      change: data.profitChange,
      icon: Wallet,
      gradient: "from-emerald-600 via-emerald-700 to-teal-800",
      shadowColor: "shadow-emerald-500/30",
      iconBg: "bg-emerald-500/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 3xl:gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[120px] sm:h-[140px] 3xl:h-[180px] rounded-xl sm:rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 3xl:gap-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isPositive = card.invertChange ? card.change < 0 : card.change > 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className={cn(
              "relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 3xl:p-8",
              `bg-gradient-to-br ${card.gradient}`,
              `shadow-xl ${card.shadowColor}`,
              "hover:scale-[1.02] transition-transform duration-300"
            )}
          >
            {/* Decorative circles */}
            <div className="absolute -right-6 sm:-right-8 -top-6 sm:-top-8 w-24 sm:w-32 h-24 sm:h-32 rounded-full bg-white/5" />
            <div className="absolute -right-3 sm:-right-4 -bottom-3 sm:-bottom-4 w-16 sm:w-24 h-16 sm:h-24 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={cn("p-2 sm:p-3 3xl:p-4 rounded-lg sm:rounded-xl", card.iconBg)}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 3xl:w-8 3xl:h-8 text-white" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm 3xl:text-base font-medium",
                  isPositive ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                )}>
                  <TrendIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{Math.abs(card.change).toFixed(1)}%</span>
                </div>
              </div>

              <h3 className="text-white/80 text-xs sm:text-sm 3xl:text-base font-medium mb-0.5 sm:mb-1">{card.title}</h3>
              <motion.p
                className="text-2xl sm:text-3xl lg:text-4xl 3xl:text-5xl font-bold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                {formatCurrency(card.value)}
              </motion.p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
