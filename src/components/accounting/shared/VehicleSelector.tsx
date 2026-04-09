import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VehicleSelectorProps {
  busId: string;
  busNo: string;
  vehicleType: "fleet" | "external" | "";
  onSelect: (busId: string, busNo: string, vehicleType: "fleet" | "external") => void;
  onClear: () => void;
}

export const VehicleSelector = ({ busId, busNo, vehicleType, onSelect, onClear }: VehicleSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [isManual, setIsManual] = useState(vehicleType === "external");
  const [manualBusNo, setManualBusNo] = useState(vehicleType === "external" ? busNo : "");

  const { data: buses } = useQuery({
    queryKey: ["buses-for-selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_number, model, type, status")
        .order("bus_number");
      if (error) throw error;
      return data || [];
    },
  });

  const groupedBuses = useMemo(() => {
    if (!buses) return new Map<string, typeof buses>();
    const map = new Map<string, typeof buses>();
    for (const bus of buses) {
      const group = bus.type || "Other";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(bus);
    }
    return map;
  }, [buses]);

  const selectedBus = buses?.find(b => b.id === busId);

  const displayValue = vehicleType === "fleet" && selectedBus
    ? `${selectedBus.bus_number} (${selectedBus.model || "N/A"})`
    : vehicleType === "external" && busNo
    ? busNo
    : "";

  return (
    <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Vehicle / Bus No (Optional)</Label>
        </div>
        {displayValue && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { onClear(); setManualBusNo(""); setIsManual(false); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={cn("text-xs", !isManual && "font-semibold text-primary")}>Fleet</span>
        <Switch checked={isManual} onCheckedChange={(checked) => { setIsManual(checked); if (!checked) { setManualBusNo(""); } else { onClear(); } }} />
        <span className={cn("text-xs", isManual && "font-semibold text-primary")}>External / Manual</span>
      </div>

      {isManual ? (
        <div className="space-y-1">
          <Input
            placeholder="Type vehicle number (e.g., ABC-1234)"
            value={manualBusNo}
            onChange={(e) => {
              setManualBusNo(e.target.value);
              if (e.target.value.trim()) {
                onSelect("", e.target.value.trim(), "external");
              } else {
                onClear();
              }
            }}
            className="font-mono"
          />
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between font-normal", !busId && "text-muted-foreground")}
            >
              <span className="truncate">{displayValue || "Select fleet vehicle..."}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 z-[200] bg-popover border shadow-lg" align="start" sideOffset={4} style={{ pointerEvents: 'auto' }} onOpenAutoFocus={(e) => e.preventDefault()}>
            <Command shouldFilter={true}>
              <CommandInput placeholder="Search by bus number..." />
              <CommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No vehicle found.</CommandEmpty>
                {Array.from(groupedBuses.entries()).map(([type, typeBuses]) => (
                  <CommandGroup key={type} heading={type}>
                    {typeBuses.map((bus) => (
                      <CommandItem
                        key={bus.id}
                        value={`${bus.bus_number} ${bus.model || ""}`}
                        onSelect={() => {
                          onSelect(bus.id, bus.bus_number, "fleet");
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", busId === bus.id ? "opacity-100" : "opacity-0")} />
                        <span className="font-mono text-xs mr-2">{bus.bus_number}</span>
                        <span className="text-muted-foreground text-xs truncate">{bus.model || ""}</span>
                        {bus.status && (
                          <Badge variant={bus.status === "Running" ? "default" : "secondary"} className="ml-auto text-[10px]">
                            {bus.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {displayValue && (
        <Badge variant="outline" className="text-[10px]">
          {vehicleType === "fleet" ? "🚌 Fleet Vehicle" : "🚗 External Vehicle"}: {displayValue}
        </Badge>
      )}
    </div>
  );
};
