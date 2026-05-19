import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DateRangePickerProps {
  value?: DateRange;
  onDateRangeChange: (dateRange: { from?: Date; to?: Date } | undefined) => void;
  className?: string;
}

export function DateRangePicker({ 
  value,
  onDateRangeChange, 
  className 
}: DateRangePickerProps) {
  // Use controlled value if provided, else fall back to undefined
  const date = value;
  const [pickerMode, setPickerMode] = useState<"single" | "range">("range");

  const handleRangeSelect = (selectedDate: DateRange | undefined) => {
    onDateRangeChange(selectedDate);
  };

  const handleSingleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateRangeChange(undefined);
    } else {
      const newRange = { from: selectedDate, to: selectedDate };
      onDateRangeChange(newRange);
    }
  };

  const handleClear = () => {
    onDateRangeChange(undefined);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to && date.to.getTime() !== date.from.getTime() ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
            {date && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="ml-auto h-4 w-4 p-0 hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="border-b p-2">
            <Tabs value={pickerMode} onValueChange={(v) => setPickerMode(v as "single" | "range")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Date</TabsTrigger>
                <TabsTrigger value="range">Date Range</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {pickerMode === "range" ? (
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
              captionLayout="dropdown-buttons"
              fromYear={2010}
              toYear={2035}
            />
          ) : (
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={date?.from}
              selected={date?.from}
              onSelect={handleSingleSelect}
              numberOfMonths={1}
              className="p-3 pointer-events-auto"
              captionLayout="dropdown-buttons"
              fromYear={2010}
              toYear={2035}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}