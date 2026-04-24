import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  emptyLabel = "None"
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value && value !== "none"
    ? options.find(o => o.value === value)?.label || value
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between h-8 text-xs font-normal w-full",
            !selectedLabel && "text-muted-foreground border-dashed",
            className
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup className="max-h-[250px] overflow-auto">
            <CommandItem
              value="none"
              onSelect={() => { onValueChange("none"); setOpen(false); }}
              className="text-xs italic text-muted-foreground"
            >
              <Check className={cn("mr-2 h-3 w-3", (!value || value === "none") ? "opacity-100" : "opacity-0")} />
              {emptyLabel}
            </CommandItem>
            {options.map(opt => (
              <CommandItem
                key={opt.value}
                value={opt.label}
                onSelect={() => { onValueChange(opt.value); setOpen(false); }}
                className="text-xs"
              >
                <Check className={cn("mr-2 h-3 w-3", value === opt.value ? "opacity-100" : "opacity-0")} />
                {opt.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
