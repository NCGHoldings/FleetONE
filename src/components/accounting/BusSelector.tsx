import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bus, Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeBusNo } from "@/lib/bus-utils";
import { toast } from "sonner";

interface BusSelectorData {
  bus_id?: string;
  bus_no?: string;
  bus_type?: string;
  bus_category_id?: string;
  bus_sub_category_id?: string;
}

interface BusSelectorProps {
  value: BusSelectorData;
  onChange: (data: BusSelectorData) => void;
}

interface BusRecord {
  id: string;
  bus_no: string;
  type: string;
  model: string;
  category_id: string | null;
  sub_category_id: string | null;
  status: string | null;
}

interface BusCategory {
  id: string;
  code: string;
  name: string;
  color: string;
}

interface BusSubCategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
  color: string | null;
}

export const BusSelector = ({ value, onChange }: BusSelectorProps) => {
  const queryClient = useQueryClient();
  const [busOpen, setBusOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newBusNo, setNewBusNo] = useState("");
  const [newBusType, setNewBusType] = useState("");
  const [newBusModel, setNewBusModel] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch all buses
  const { data: buses = [] } = useQuery<BusRecord[]>({
    queryKey: ["buses-for-ar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no, type, model, category_id, sub_category_id, status")
        .order("bus_no");
      if (error) throw error;
      return (data || []) as BusRecord[];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<BusCategory[]>({
    queryKey: ["bus-categories-ar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_categories")
        .select("id, code, name, color")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as BusCategory[];
    },
  });

  // Fetch sub-categories
  const { data: subCategories = [] } = useQuery<BusSubCategory[]>({
    queryKey: ["bus-sub-categories-ar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_sub_categories")
        .select("id, category_id, code, name, color")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as BusSubCategory[];
    },
  });

  // Fetch distinct bus types
  const { data: busTypes = [] } = useQuery<string[]>({
    queryKey: ["bus-types-ar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_types")
        .select("name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((t: any) => t.name);
    },
  });

  // Filter buses by selected type
  const filteredBuses = useMemo(() => {
    if (!value.bus_type) return buses;
    return buses.filter(b => b.type === value.bus_type);
  }, [buses, value.bus_type]);

  // Filter sub-categories by selected category
  const filteredSubCategories = useMemo(() => {
    if (!value.bus_category_id) return [];
    return subCategories.filter(sc => sc.category_id === value.bus_category_id);
  }, [subCategories, value.bus_category_id]);

  const selectedBus = buses.find(b => b.id === value.bus_id);
  const selectedCategory = categories.find(c => c.id === value.bus_category_id);
  const selectedSubCategory = subCategories.find(sc => sc.id === value.bus_sub_category_id);

  const handleBusSelect = (bus: BusRecord) => {
    const cat = categories.find(c => c.id === bus.category_id);
    onChange({
      bus_id: bus.id,
      bus_no: bus.bus_no,
      bus_type: bus.type,
      bus_category_id: bus.category_id || undefined,
      bus_sub_category_id: bus.sub_category_id || undefined,
    });
    setBusOpen(false);
  };

  const handleCategoryChange = async (categoryId: string) => {
    const newData = {
      ...value,
      bus_category_id: categoryId === "_none" ? undefined : categoryId,
      bus_sub_category_id: undefined, // Reset sub-category
    };
    onChange(newData);

    // Update bus profile if a bus is selected
    if (value.bus_id && categoryId !== "_none") {
      await supabase
        .from("buses")
        .update({ category_id: categoryId, category_assignment_source: "ar_invoice" })
        .eq("id", value.bus_id);
      queryClient.invalidateQueries({ queryKey: ["buses-for-ar"] });
    }
  };

  const handleSubCategoryChange = async (subCategoryId: string) => {
    const newData = {
      ...value,
      bus_sub_category_id: subCategoryId === "_none" ? undefined : subCategoryId,
    };
    onChange(newData);

    // Update bus profile
    if (value.bus_id && subCategoryId !== "_none") {
      await supabase
        .from("buses")
        .update({ sub_category_id: subCategoryId })
        .eq("id", value.bus_id);
      queryClient.invalidateQueries({ queryKey: ["buses-for-ar"] });
    }
  };

  const handleTypeChange = (type: string) => {
    onChange({ ...value, bus_type: type === "_none" ? undefined : type });
  };

  const handleAddNewBus = async () => {
    if (!newBusNo.trim()) {
      toast.error("Bus number is required");
      return;
    }
    if (!newBusType) {
      toast.error("Bus type is required");
      return;
    }

    setCreating(true);
    try {
      const { data: newBus, error } = await supabase
        .from("buses")
        .insert([{
          bus_no: newBusNo.trim(),
          type: newBusType,
          model: newBusModel.trim() || "Unknown",
          capacity: 50,
          year: new Date().getFullYear(),
          status: "active" as const,
          category_id: value.bus_category_id || null,
          sub_category_id: value.bus_sub_category_id || null,
        }])
        .select("id, bus_no, type, model, category_id, sub_category_id, status")
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["buses-for-ar"] });
      
      onChange({
        bus_id: newBus.id,
        bus_no: newBus.bus_no,
        bus_type: newBus.type,
        bus_category_id: newBus.category_id || undefined,
        bus_sub_category_id: newBus.sub_category_id || undefined,
      });

      toast.success(`Bus ${newBus.bus_no} created in Fleet Management`);
      setAddingNew(false);
      setNewBusNo("");
      setNewBusType("");
      setNewBusModel("");
      setBusOpen(false);
    } catch (err: any) {
      toast.error(`Failed to create bus: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleClear = () => {
    onChange({});
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Bus Number Selector */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Bus Number</Label>
        <Popover open={busOpen} onOpenChange={setBusOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={busOpen}
              className="w-full justify-between h-9 text-sm font-normal"
            >
              {value.bus_no ? (
                <span className="flex items-center gap-1.5">
                  <Bus className="h-3.5 w-3.5 text-muted-foreground" />
                  {value.bus_no}
                </span>
              ) : (
                <span className="text-muted-foreground">Select bus...</span>
              )}
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0 z-[100]" align="start">
            {!addingNew ? (
              <Command>
                <CommandInput placeholder="Search bus number..." className="border-b" />
                <CommandList>
                  <CommandEmpty>No bus found.</CommandEmpty>
                  <CommandGroup>
                    {filteredBuses.map((bus) => {
                      const cat = categories.find(c => c.id === bus.category_id);
                      return (
                        <CommandItem
                          key={bus.id}
                          value={bus.bus_no}
                          onSelect={() => handleBusSelect(bus)}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", value.bus_id === bus.id ? "opacity-100" : "opacity-0")}
                          />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{bus.bus_no}</span>
                            <span className="text-xs text-muted-foreground">
                              {bus.type} • {bus.model}
                              {cat && ` • ${cat.name}`}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => setAddingNew(true)}
                      className="text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Bus
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            ) : (
              <div className="p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm">Add New Bus</h4>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAddingNew(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Bus No. (e.g., NC 6915)"
                    value={newBusNo}
                    onChange={(e) => setNewBusNo(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Select value={newBusType} onValueChange={setNewBusType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {busTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Model (optional)"
                    value={newBusModel}
                    onChange={(e) => setNewBusModel(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleAddNewBus}
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create & Select"}
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Bus Type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Type</Label>
        <Select value={value.bus_type || "_none"} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Bus type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Any type</SelectItem>
            {busTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Category</Label>
        <Select value={value.bus_category_id || "_none"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full inline-block"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub-Category */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Sub-Category</Label>
        <div className="flex gap-1">
          <Select
            value={value.bus_sub_category_id || "_none"}
            onValueChange={handleSubCategoryChange}
            disabled={!value.bus_category_id}
          >
            <SelectTrigger className="h-9 text-sm flex-1">
              <SelectValue placeholder={value.bus_category_id ? "Sub-category..." : "Select category first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {filteredSubCategories.map((sc) => (
                <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value.bus_id && (
            <Button variant="ghost" size="sm" className="h-9 px-2" onClick={handleClear} title="Clear bus selection">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
