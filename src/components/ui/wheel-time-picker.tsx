import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WheelTimePickerProps {
  value?: string; // Format: "HH:mm"
  onChange: (time: string) => void;
  className?: string;
}

export function WheelTimePicker({ value = "09:00", onChange, className }: WheelTimePickerProps) {
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  // Update parent when time changes
  useEffect(() => {
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeString);
  }, [hours, minutes, onChange]);

  const handleHourChange = (hour: number) => {
    setHours(hour);
  };

  const handleMinuteChange = (minute: number) => {
    setMinutes(minute);
  };

  const renderTimeColumn = (
    items: number[],
    selectedValue: number,
    onSelect: (value: number) => void,
    label: string
  ) => (
    <div className="flex-1">
      <div className="text-center text-xs font-medium text-muted-foreground mb-2">
        {label}
      </div>
      <div className="relative h-48 overflow-y-auto border rounded-lg bg-muted/50">
        {/* Selection indicator */}
        <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-12 border-y-2 border-primary/30 bg-primary/10 pointer-events-none z-10"></div>
        
        {/* Padding top */}
        <div className="h-20"></div>
        
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "h-12 flex items-center justify-center cursor-pointer transition-all duration-200 text-lg font-medium relative",
              selectedValue === item
                ? "text-foreground font-bold"
                : "text-muted-foreground"
            )}
            onClick={() => onSelect(item)}
          >
            {item.toString().padStart(2, '0')}
          </div>
        ))}
        
        {/* Padding bottom */}
        <div className="h-20"></div>
      </div>
    </div>
  );

  // Generate hours (0-23)
  const hourItems = Array.from({ length: 24 }, (_, i) => i);
  
  // Generate minutes (0-59) in 5-minute intervals for easier selection
  const minuteItems = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className={cn("bg-background border rounded-lg p-4", className)}>
      <div className="flex items-start gap-4">
        {renderTimeColumn(hourItems, hours, handleHourChange, "Hour")}
        
        <div className="flex items-center justify-center pt-8">
          <div className="text-2xl font-bold text-muted-foreground">:</div>
        </div>
        
        {renderTimeColumn(minuteItems, minutes, handleMinuteChange, "Minute")}
      </div>
      
      <div className="text-center mt-4 text-sm text-muted-foreground border-t pt-3">
        Selected: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
      </div>
    </div>
  );
}