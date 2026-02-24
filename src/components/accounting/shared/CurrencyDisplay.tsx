import { formatLKR } from "@/lib/accounting-utils";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number | null | undefined;
  className?: string;
  showSign?: boolean;
  colorCode?: boolean;
}

export const CurrencyDisplay = ({
  amount,
  className,
  showSign = false,
  colorCode = false,
}: CurrencyDisplayProps) => {
  const value = amount || 0;
  const isNegative = value < 0;
  const isPositive = value > 0;

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        colorCode && isNegative && "text-destructive",
        colorCode && isPositive && "text-green-600 dark:text-green-400",
        className
      )}
    >
      {showSign && isPositive && "+"}
      {formatLKR(value)}
    </span>
  );
};
