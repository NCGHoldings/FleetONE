import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Save, X, ChevronsUpDown, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TripData {
  id: string;
  trip_no: string;
  route_name: string;
  driver_name?: string;
  conductor_name?: string;
}

interface InlineCrewEditorProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripData | null;
  onSaved: () => void;
}

interface StaffOption {
  id: string;
  staff_name: string;
}

function StaffCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: StaffOption[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trimmed = search.trim();
  const exists = options.some(
    (o) => o.staff_name.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={`Search or type new ${label.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(trimmed);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                >
                  <Plus className="h-4 w-4" />
                  Use "{trimmed}"
                </button>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No staff found.
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.staff_name}
                  onSelect={() => {
                    onChange(opt.staff_name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.staff_name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.staff_name}
                </CommandItem>
              ))}
              {trimmed && !exists && (
                <CommandItem
                  value={`__add__${trimmed}`}
                  onSelect={() => {
                    onChange(trimmed);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use "{trimmed}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function InlineCrewEditor({
  isOpen,
  onClose,
  trip,
  onSaved,
}: InlineCrewEditorProps) {
  const [driver, setDriver] = useState("");
  const [conductor, setConductor] = useState("");
  const [drivers, setDrivers] = useState<StaffOption[]>([]);
  const [conductors, setConductors] = useState<StaffOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !trip) return;
    setDriver(trip.driver_name || "");
    setConductor(trip.conductor_name || "");

    const loadStaff = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_registry")
        .select("id, staff_name, staff_type")
        .eq("is_active", true)
        .order("staff_name");
      if (!error && data) {
        setDrivers(data.filter((s: any) => s.staff_type === "driver"));
        setConductors(data.filter((s: any) => s.staff_type === "conductor"));
      }
      setLoading(false);
    };
    loadStaff();
  }, [isOpen, trip]);

  const ensureStaff = async (
    name: string,
    type: "driver" | "conductor",
    existing: StaffOption[]
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existing.some((s) => s.staff_name.toLowerCase() === trimmed.toLowerCase())) return;
    try {
      await supabase.from("staff_registry").insert({
        staff_name: trimmed,
        staff_type: type,
        salary_type: "monthly",
        monthly_salary: 0,
        is_active: true,
      });
    } catch (e) {
      console.warn(`Could not auto-add ${type}:`, e);
      toast({
        title: "Saved trip",
        description: `Couldn't add ${trimmed} to staff registry — please add manually.`,
      });
    }
  };

  const handleSave = async () => {
    if (!trip) return;
    setSaving(true);
    try {
      // Read current notes
      const { data: current, error: fetchErr } = await supabase
        .from("daily_trips")
        .select("notes")
        .eq("id", trip.id)
        .single();
      if (fetchErr) throw fetchErr;

      const existingNotes =
        current?.notes && typeof current.notes === "object" && !Array.isArray(current.notes)
          ? (current.notes as Record<string, any>)
          : {};

      const mergedNotes = {
        ...existingNotes,
        driver: driver.trim(),
        conductor: conductor.trim(),
      };

      const { error } = await supabase
        .from("daily_trips")
        .update({
          notes: mergedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trip.id);

      if (error) throw error;

      // Auto-add new names to staff registry (non-blocking soft-fail)
      await Promise.all([
        ensureStaff(driver, "driver", drivers),
        ensureStaff(conductor, "conductor", conductors),
      ]);

      toast({
        title: "Crew updated",
        description: `Driver & conductor saved for ${trip.trip_no}`,
      });

      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error updating crew:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update crew",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Crew - {trip.trip_no}</DialogTitle>
          <DialogDescription>{trip.route_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Driver</Label>
            <StaffCombobox
              label="Driver"
              value={driver}
              onChange={setDriver}
              options={drivers}
              placeholder={loading ? "Loading..." : "Select or type driver name"}
            />
            <p className="text-xs text-muted-foreground">
              Pick from list or type a new name — new names are added to staff registry automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Conductor</Label>
            <StaffCombobox
              label="Conductor"
              value={conductor}
              onChange={setConductor}
              options={conductors}
              placeholder={loading ? "Loading..." : "Select or type conductor name"}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
