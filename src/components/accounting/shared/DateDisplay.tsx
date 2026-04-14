import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: "short" | "long" | "relative" | "datetime";
  className?: string;
}

export const DateDisplay = ({
  date,
  format: displayFormat = "short",
  className,
}: DateDisplayProps) => {
  if (!date) return <span className={cn("text-muted-foreground", className)}>—</span>;

  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return <span className={cn("text-muted-foreground", className)}>Invalid date</span>;
  }

  const formatPatterns = {
    short: "MMM dd, yyyy",
    long: "MMMM dd, yyyy",
    datetime: "MMM dd, yyyy HH:mm",
    relative: "",
  };

  const formattedDate =
    displayFormat === "relative"
      ? formatDistanceToNow(parsedDate, { addSuffix: true })
      : format(parsedDate, formatPatterns[displayFormat]);

  return <span className={cn("whitespace-nowrap", className)}>{formattedDate}</span>;
};
