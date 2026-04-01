import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number | string;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  prefix?: string;
  compact?: boolean;
}

/**
 * Currency input that displays formatted numbers with thousand separators.
 * Accepts numeric value, displays "100,000", returns raw number on change.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, placeholder = "0", disabled, className, prefix = "Rs" }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    // Sync display value when external value changes
    React.useEffect(() => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num) || num === 0) {
        setDisplayValue("");
      } else {
        setDisplayValue(num.toLocaleString("en-US"));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      
      // Handle decimal: only allow one dot
      const parts = raw.split(".");
      const cleaned = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
      
      const num = parseFloat(cleaned) || 0;
      
      // Format display with commas
      if (cleaned === "" || cleaned === ".") {
        setDisplayValue("");
        onValueChange(0);
      } else if (cleaned.endsWith(".")) {
        // User is typing a decimal, keep the dot
        setDisplayValue(num.toLocaleString("en-US") + ".");
        onValueChange(num);
      } else {
        const decimalParts = cleaned.split(".");
        if (decimalParts.length === 2) {
          setDisplayValue(
            parseInt(decimalParts[0] || "0").toLocaleString("en-US") + "." + decimalParts[1]
          );
        } else {
          setDisplayValue(num.toLocaleString("en-US"));
        }
        onValueChange(num);
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
          {prefix}
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
