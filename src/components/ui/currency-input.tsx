import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    min?: number;
}

/**
 * Currency input that formats numbers with commas while typing.
 * Shows: 10,000,000.00 at all times.
 * Stores: raw number value (10000000).
 */
export const CurrencyInput = ({
    value,
    onChange,
    placeholder = "0.00",
    className,
    disabled,
    min,
}: CurrencyInputProps) => {
    const [displayValue, setDisplayValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Format number with commas
    const formatWithCommas = (num: number): string => {
        if (num === 0) return "";
        const parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    };

    // Sync display value when external value changes (and input not focused)
    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setDisplayValue(value === 0 ? "" : formatWithCommas(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        // Allow empty
        if (raw === "" || raw === "0") {
            setDisplayValue(raw);
            onChange(0);
            return;
        }

        // Strip everything except digits and decimal point
        const cleaned = raw.replace(/[^0-9.]/g, "");

        // Prevent multiple decimal points
        const parts = cleaned.split(".");
        const sanitized = parts.length > 2
            ? parts[0] + "." + parts.slice(1).join("")
            : cleaned;

        const numericValue = parseFloat(sanitized) || 0;

        if (min !== undefined && numericValue < min) return;

        // Format with commas while preserving cursor position
        const cursorPos = e.target.selectionStart || 0;
        const oldLength = raw.length;

        // Format the integer part with commas, keep decimal part as-is
        const decimalParts = sanitized.split(".");
        const intPart = decimalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const formatted = decimalParts.length > 1
            ? intPart + "." + decimalParts[1]
            : intPart;

        setDisplayValue(formatted);
        onChange(numericValue);

        // Adjust cursor position after formatting
        requestAnimationFrame(() => {
            if (inputRef.current) {
                const newLength = formatted.length;
                const diff = newLength - oldLength;
                const newPos = Math.max(0, cursorPos + diff);
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        });
    };

    const handleFocus = () => {
        // Keep formatted display - user can type naturally
    };

    const handleBlur = () => {
        // Ensure clean formatted display on blur
        setDisplayValue(value === 0 ? "" : formatWithCommas(value));
    };

    return (
        <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn("text-right", className)}
            disabled={disabled}
        />
    );
};
