import React, { useState, useMemo } from "react";
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
  triggerClassName?: string;
  emptyLabel?: string;
  /** Max options to render in the dropdown. Defaults to 100. Use for large datasets. */
  maxDisplayed?: number;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  triggerClassName = "",
  emptyLabel = "None",
  maxDisplayed = 100
}: Props) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLabel = value && value !== "none"
    ? options.find(o => o.value === value)?.label || value
    : null;

  // Pre-filter options client-side BEFORE passing to Command to avoid rendering 3000+ DOM nodes
  const displayedOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      // No search: show the first maxDisplayed options
      return options.slice(0, maxDisplayed);
    }
    
    // With search: filter all options and return top matches
    const filtered = options.filter(opt => 
      opt.label.toLowerCase().includes(query)
    );
    return filtered.slice(0, maxDisplayed);
  }, [options, searchQuery, maxDisplayed]);

  const showTruncationNote = options.length > maxDisplayed && !searchQuery.trim() && displayedOptions.length >= maxDisplayed;

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchQuery(""); // Reset search on close
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between h-8 text-xs font-normal w-full",
            !selectedLabel && "text-muted-foreground border-dashed",
            className,
            triggerClassName
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-8 text-xs" 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
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
            {displayedOptions.map(opt => (
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
            {showTruncationNote && (
              <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-center border-t">
                Showing {maxDisplayed} of {options.length} — type to search all
              </div>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
