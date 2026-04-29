import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

type PresetKey = "all" | "today" | "this_month" | "last_3_months" | "this_year" | "custom";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "this_month", label: "This Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("all");
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const handlePresetChange = (preset: PresetKey) => {
    setSelectedPreset(preset);
    const today = new Date();

    switch (preset) {
      case "all":
        onChange({ startDate: null, endDate: null });
        setShowCustom(false);
        break;
      case "today":
        onChange({
          startDate: format(today, "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        });
        setShowCustom(false);
        break;
      case "this_month":
        onChange({
          startDate: format(startOfMonth(today), "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        });
        setShowCustom(false);
        break;
      case "last_3_months":
        onChange({
          startDate: format(subMonths(today, 3), "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        });
        setShowCustom(false);
        break;
      case "this_year":
        onChange({
          startDate: format(startOfYear(today), "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        });
        setShowCustom(false);
        break;
      case "custom":
        setShowCustom(true);
        break;
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startDate: format(customStart, "yyyy-MM-dd"),
        endDate: format(customEnd, "yyyy-MM-dd"),
      });
      setShowCustom(false);
    }
  };

  const getDisplayLabel = () => {
    if (selectedPreset === "custom" && value.startDate && value.endDate) {
      return `${format(new Date(value.startDate), "MMM d")} - ${format(new Date(value.endDate), "MMM d, yyyy")}`;
    }
    return presets.find((p) => p.key === selectedPreset)?.label || "All Time";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayLabel()}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                variant={selectedPreset === preset.key ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange(preset.key)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {showCustom && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Start Date</p>
                  <CalendarComponent
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">End Date</p>
                  <CalendarComponent
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    className="rounded-md border"
                  />
                </div>
              </div>
              <Button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full"
              >
                Apply Custom Range
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
