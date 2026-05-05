import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Map, MapPin, GitMerge, Bus, ChevronDown, ChevronRight, ArrowLeftRight, Settings, Target, Wallet, Users, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useRouteAudit } from "@/hooks/useRouteAudit";
import { Progress } from "@/components/ui/progress";
import { RouteSyncAuditDashboard } from "@/components/fleet/RouteSyncAuditDashboard";

interface FleetRoute {
  id: string;
  route_no: string;
  route_name: string;
  start_location: string;
  end_location: string;
  distance_km: number | null;
  fare_amount: number | null;
  is_active: boolean;
  category: string | null;
  route_group: string | null;
}

export default function RouteManagement() {
  const [routes, setRoutes] = useState<FleetRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FleetRoute | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busCountMap, setBusCountMap] = useState<Record<string, number>>({});
  const [collapsedCorridors, setCollapsedCorridors] = useState<string[]>([]);

  // Audit engine
  const { summary: auditSummary } = useRouteAudit();

  // Merge state
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const [formData, setFormData] = useState({
    route_no: "",
    route_name: "",
    start_location: "",
    end_location: "",
    distance_km: "",
    fare_amount: "",
    is_active: true,
    category: "Public Bus",
    route_group: "",
    
    // Gamification & Targets
    revenue_target: "100000",
    fuel_allocation_liters: "150",
    driver_commission_pct: "5",
    conductor_commission_pct: "5",
    
    // Standard Costs
    meal_allowance: "1500",
    highway_fee: "2000",
    runner_fee: "500",
    
    // Crew Allocations
    default_bus: "",
    default_driver: "",
    default_conductor: ""
  });

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("route_no", { ascending: true });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      console.error("Error fetching routes:", error);
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("buses")
        .select("route");

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach((bus: any) => {
        if (bus.route) {
          const normalized = bus.route.toLowerCase().replace(/[\s\-–]+/g, " ").trim();
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      });
      setBusCountMap(counts);
    } catch (error: any) {
      console.error("Error fetching bus counts:", error);
    }
  };

  const getBusCount = (routeName: string): number => {
    const normalized = routeName.toLowerCase().replace(/[\s\-–]+/g, " ").trim();
    let count = busCountMap[normalized] || 0;
    if (count === 0) {
      Object.entries(busCountMap).forEach(([key, val]) => {
        if (key.includes(normalized) || normalized.includes(key)) {
          count += val;
        }
      });
    }
    return count;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [colFilters, setColFilters] = useState({
    routeNo: "",
    routeName: "",
    category: "",
    locations: "",
    distance: "",
    buses: "",
    status: ""
  });

  useEffect(() => {
    fetchRoutes();
    fetchBusCounts();
  }, []);

  const filteredRoutes = routes.filter((r) => {
    // Tab filter
    if (categoryFilter === "public" && r.category !== "Public Bus") return false;
    if (categoryFilter === "school" && r.category !== "School Bus") return false;

    // Column Filters
    if (colFilters.routeNo && !(r.route_no || "").toLowerCase().includes(colFilters.routeNo.toLowerCase())) return false;
    if (colFilters.routeName && !(r.route_name || "").toLowerCase().includes(colFilters.routeName.toLowerCase())) return false;
    if (colFilters.category && !(r.category || "").toLowerCase().includes(colFilters.category.toLowerCase())) return false;
    if (colFilters.locations) {
      const locString = `${r.start_location || ""} ${r.end_location || ""}`.toLowerCase();
      if (!locString.includes(colFilters.locations.toLowerCase())) return false;
    }
    if (colFilters.distance && r.distance_km !== null && !String(r.distance_km).includes(colFilters.distance)) return false;
    if (colFilters.buses) {
      const bCount = getBusCount(r.route_name || "");
      if (!String(bCount).includes(colFilters.buses)) return false;
    }
    if (colFilters.status) {
      const st = r.is_active ? "active" : "inactive";
      if (!st.includes(colFilters.status.toLowerCase())) return false;
    }

    // Global Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = 
        (r.route_no && r.route_no.toLowerCase().includes(q)) ||
        (r.route_name && r.route_name.toLowerCase().includes(q)) ||
        (r.start_location && r.start_location.toLowerCase().includes(q)) ||
        (r.end_location && r.end_location.toLowerCase().includes(q)) ||
        (r.route_group && r.route_group.toLowerCase().includes(q));
      
      if (!match) return false;
    }

    return true;
  });

  const publicCount = routes.filter(r => r.category === "Public Bus").length;
  const schoolCount = routes.filter(r => r.category === "School Bus").length;

  // Get unique corridor groups from existing routes
  const existingGroups = useMemo(() => {
    return [...new Set(routes.map(r => r.route_group).filter(Boolean))] as string[];
  }, [routes]);

  // Group routes by corridor
  const groupedRoutes = useMemo(() => {
    const corridors: { name: string; routes: FleetRoute[] }[] = [];
    const ungrouped: FleetRoute[] = [];
    const groupMap: Record<string, FleetRoute[]> = {};

    filteredRoutes.forEach(route => {
      if (route.route_group) {
        if (!groupMap[route.route_group]) groupMap[route.route_group] = [];
        groupMap[route.route_group].push(route);
      } else {
        ungrouped.push(route);
      }
    });

    Object.entries(groupMap).forEach(([name, rts]) => {
      corridors.push({ name, routes: rts.sort((a, b) => a.route_no.localeCompare(b.route_no)) });
    });
    corridors.sort((a, b) => a.name.localeCompare(b.name));

    return { corridors, ungrouped };
  }, [filteredRoutes]);

  const toggleCorridor = (name: string) => {
    setCollapsedCorridors(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Auto-suggest corridor when start/end match an existing route's reverse
  const suggestedGroup = useMemo(() => {
    if (formData.route_group || !formData.start_location || !formData.end_location) return null;
    const start = formData.start_location.toLowerCase().trim();
    const end = formData.end_location.toLowerCase().trim();
    
    const match = routes.find(r => {
      const rStart = (r.start_location || "").toLowerCase().trim();
      const rEnd = (r.end_location || "").toLowerCase().trim();
      return (rStart === end && rEnd === start) || (rStart === start && rEnd === end);
    });
    
    if (match) {
      return match.route_group || `${match.start_location} - ${match.end_location}`;
    }
    return null;
  }, [formData.start_location, formData.end_location, formData.route_group, routes]);

  const handleOpenEdit = (routeItem: FleetRoute) => {
    setFormData({
      route_no: routeItem.route_no || "",
      route_name: routeItem.route_name || "",
      start_location: routeItem.start_location || "",
      end_location: routeItem.end_location || "",
      distance_km: routeItem.distance_km ? String(routeItem.distance_km) : "",
      fare_amount: routeItem.fare_amount ? String(routeItem.fare_amount) : "",
      category: routeItem.category || "Public Bus",
      route_group: routeItem.route_group || "",
      
      // Extract from master_config JSONB
      revenue_target: (routeItem as any).master_config?.revenue_target || "100000",
      fuel_allocation_liters: (routeItem as any).master_config?.fuel_allocation_liters || "150",
      driver_commission_pct: (routeItem as any).master_config?.driver_commission_pct || "5",
      conductor_commission_pct: (routeItem as any).master_config?.conductor_commission_pct || "5",
      meal_allowance: (routeItem as any).master_config?.meal_allowance || "1500",
      highway_fee: (routeItem as any).master_config?.highway_fee || "2000",
      runner_fee: (routeItem as any).master_config?.runner_fee || "500",
      default_bus: (routeItem as any).master_config?.default_bus || "",
      default_driver: (routeItem as any).master_config?.default_driver || "",
      default_conductor: (routeItem as any).master_config?.default_conductor || ""
    });
    setEditingRoute(routeItem);
    setIsDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setFormData({
      route_no: "",
      route_name: "",
      start_location: "",
      end_location: "",
      is_active: true,
      category: "Public Bus",
      route_group: "",
      revenue_target: "100000",
      fuel_allocation_liters: "150",
      driver_commission_pct: "5",
      conductor_commission_pct: "5",
      meal_allowance: "1500",
      highway_fee: "2000",
      runner_fee: "500",
      default_bus: "",
      default_driver: "",
      default_conductor: ""
    });
    setEditingRoute(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.route_name || !formData.route_no) {
        toast.error("Route No and Route Name are required.");
        return;
      }

      const payload: any = {
        route_no: formData.route_no,
        route_name: formData.route_name,
        start_location: formData.start_location || null,
        end_location: formData.end_location || null,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
        fare_amount: formData.fare_amount ? parseFloat(formData.fare_amount) : null,
        is_active: formData.is_active,
        category: formData.category,
        route_group: formData.route_group || null,
        master_config: {
          revenue_target: formData.revenue_target,
          fuel_allocation_liters: formData.fuel_allocation_liters,
          driver_commission_pct: formData.driver_commission_pct,
          conductor_commission_pct: formData.conductor_commission_pct,
          meal_allowance: formData.meal_allowance,
          highway_fee: formData.highway_fee,
          runner_fee: formData.runner_fee,
          default_bus: formData.default_bus,
          default_driver: formData.default_driver,
          default_conductor: formData.default_conductor
        }
      };

      if (editingRoute) {
        const { error } = await supabase
          .from("routes")
          .update(payload)
          .eq("id", editingRoute.id);
        if (error) throw error;
        toast.success("Route updated successfully");
      } else {
        const { error } = await supabase.from("routes").insert([payload]);
        if (error) throw error;
        toast.success("Route created successfully");
      }

      setIsDialogOpen(false);
      fetchRoutes();
    } catch (error: any) {
      console.error("Error saving route:", error);
      toast.error(error.message || "Failed to save route");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this route? Ensure no buses depend on it.")) return;
    try {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Route deleted successfully");
      fetchRoutes();
    } catch (error: any) {
      console.error("Error deleting route:", error);
      toast.error("Failed to delete route. It may be in use.");
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      toast.error("Please select both source and target routes.");
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      toast.error("Source and target routes cannot be the same.");
      return;
    }

    if (!confirm("Are you sure? This will replace all history of the source route with the target route. This cannot be undone.")) return;

    setIsMerging(true);
    try {
      const source = routes.find(r => r.id === mergeSourceId);
      const target = routes.find(r => r.id === mergeTargetId);
      if (!source || !target) throw new Error("Invalid routes selected");

      await supabase.from("fleet_master_roster")
        .update({ route_id: target.id, route_label: target.route_name })
        .or(`route_id.eq.${source.id},route_label.eq.${source.route_name}`);

      await supabase.from("daily_trips")
        .update({ route_id: target.id, route_label: target.route_name })
        .or(`route_id.eq.${source.id},route_label.eq.${source.route_name}`);

      await supabase.from("buses")
        .update({ route: target.route_name })
        .eq("route", source.route_name);

      const tablesWithRouteId = [
        "ap_invoices", "driver_allocations", "journal_entry_lines",
        "multi_day_route_config", "real_time_tracking", "route_permits",
        "route_targets", "staff_commissions"
      ];
      
      for (const tableName of tablesWithRouteId) {
        await supabase.from(tableName as any)
          .update({ route_id: target.id })
          .eq("route_id", source.id);
      }

      const { error: delError } = await supabase.from("routes").delete().eq("id", source.id);
      if (delError) throw delError;

      toast.success(`Successfully merged ${source.route_name} into ${target.route_name}`);
      setIsMergeDialogOpen(false);
      setMergeSourceId("");
      setMergeTargetId("");
      fetchRoutes();
      fetchBusCounts();
    } catch (error: any) {
      console.error("Merge error:", error);
      toast.error(error.message || "Failed to merge routes.");
    } finally {
      setIsMerging(false);
    }
  };

  const renderRouteRow = (route: FleetRoute, indent = false) => {
    const busCount = getBusCount(route.route_name);
    return (
      <TableRow key={route.id} className="group">
        <TableCell className={`font-semibold ${indent ? "pl-10" : ""}`}>{route.route_no}</TableCell>
        <TableCell className="font-medium text-primary">{route.route_name}</TableCell>
        <TableCell>
          <Badge variant={route.category === "School Bus" ? "secondary" : "outline"}
            className={route.category === "School Bus" 
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" 
              : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}>
            {route.category || "Public Bus"}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <MapPin className="w-3 h-3" />
            {route.start_location || "?"} <span className="mx-1">→</span> {route.end_location || "?"}
          </div>
        </TableCell>
        <TableCell>{route.distance_km ? `${route.distance_km} km` : "-"}</TableCell>
        <TableCell className="text-center">
          {busCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <Bus className="w-3.5 h-3.5 text-muted-foreground" />
              {busCount}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
        <TableCell>
          {route.is_active ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">Inactive</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(route)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(route.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const renderRouteTable = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">
                <div className="mb-2">Route No</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.routeNo}
                  onChange={e => setColFilters(p => ({ ...p, routeNo: e.target.value }))}
                  className="h-7 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="w-[200px]">
                <div className="mb-2">Route Name</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.routeName}
                  onChange={e => setColFilters(p => ({ ...p, routeName: e.target.value }))}
                  className="h-7 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="w-[140px]">
                <div className="mb-2">Category</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.category}
                  onChange={e => setColFilters(p => ({ ...p, category: e.target.value }))}
                  className="h-7 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="min-w-[200px]">
                <div className="mb-2">Locations</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.locations}
                  onChange={e => setColFilters(p => ({ ...p, locations: e.target.value }))}
                  className="h-7 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="mb-2">Distance</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.distance}
                  onChange={e => setColFilters(p => ({ ...p, distance: e.target.value }))}
                  className="h-7 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="w-[100px] text-center">
                <div className="mb-2">Buses</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.buses}
                  onChange={e => setColFilters(p => ({ ...p, buses: e.target.value }))}
                  className="h-7 text-xs font-normal mx-auto"
                />
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="mb-2">Status</div>
                <Input 
                  placeholder="Filter..." 
                  value={colFilters.status}
                  onChange={e => setColFilters(p => ({ ...p, status: e.target.value }))}
                  className="h-7 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="w-[100px] text-right">
                <div className="mb-2">Actions</div>
                {/* Spacer for actions column */}
                <div className="h-7"></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Loading routes...</TableCell>
              </TableRow>
            ) : filteredRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No routes found for this category.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {groupedRoutes.corridors.map(corridor => {
                  const isCollapsed = collapsedCorridors.includes(corridor.name);
                  const totalBuses = corridor.routes.reduce((sum, r) => sum + getBusCount(r.route_name), 0);
                  const totalDistance = corridor.routes.reduce((sum, r) => sum + (r.distance_km || 0), 0);
                  return (
                    <React.Fragment key={corridor.name}>
                      <TableRow 
                        className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-t-2 border-border"
                        onClick={() => toggleCorridor(corridor.name)}
                      >
                        <TableCell colSpan={2}>
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <ArrowLeftRight className="w-4 h-4 text-primary" />
                            <span>{corridor.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs font-normal">
                              {corridor.routes.length} routes
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-sm text-muted-foreground">Round-trip corridor</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {totalDistance > 0 ? `${totalDistance} km total` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {totalBuses > 0 && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium">
                              <Bus className="w-3.5 h-3.5 text-muted-foreground" />
                              {totalBuses}
                            </span>
                          )}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                      {!isCollapsed && corridor.routes.map(route => renderRouteRow(route, true))}
                    </React.Fragment>
                  );
                })}
                {groupedRoutes.ungrouped.length > 0 && groupedRoutes.corridors.length > 0 && (
                  <TableRow className="bg-muted/30 border-t-2 border-border">
                    <TableCell colSpan={8} className="font-semibold text-muted-foreground text-sm py-2">
                      Standalone Routes
                    </TableCell>
                  </TableRow>
                )}
                {groupedRoutes.ungrouped.map(route => renderRouteRow(route))}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Map className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Fleet Route Dictionary
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage standardized routes globally across the fleet system
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsMergeDialogOpen(true)} className="gap-2 text-primary border-primary hover:bg-primary/10">
            <GitMerge className="h-4 w-4" /> Merge Duplicates
          </Button>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Route
          </Button>
        </div>
      </div>

      {/* Merge Dialog */}
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Duplicate Routes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-muted-foreground">
            <p>
              This tool helps clean up duplicate routing names by finding all references to a redundant route and porting them to the Official Target Route, then safely deleting the redundant one.
            </p>
            <div className="space-y-2">
              <Label>Source Route (Duplicate to DELETE)</Label>
              <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
                <SelectTrigger><SelectValue placeholder="Select redundant route..." /></SelectTrigger>
                <SelectContent>
                  {routes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.route_name} ({r.route_no})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center py-2">
              <GitMerge className="h-4 w-4 text-muted-foreground/50 rotate-90" />
            </div>
            <div className="space-y-2">
              <Label>Target Route (Official route to KEEP)</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger><SelectValue placeholder="Select official canonical route..." /></SelectTrigger>
                <SelectContent>
                  {routes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.route_name} ({r.route_no})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-6" onClick={handleMerge} disabled={isMerging || !mergeSourceId || !mergeTargetId}>
              {isMerging ? "Merging historical records..." : "Merge and Delete Source"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route Master Profile" : "Create New Route"}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic" className="flex items-center gap-2"><MapPin className="w-4 h-4"/> Basic Info</TabsTrigger>
              <TabsTrigger value="targets" className="flex items-center gap-2"><Target className="w-4 h-4"/> Targets</TabsTrigger>
              <TabsTrigger value="costs" className="flex items-center gap-2"><Wallet className="w-4 h-4"/> Costs</TabsTrigger>
              <TabsTrigger value="crew" className="flex items-center gap-2"><Users className="w-4 h-4"/> Crew Maps</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="route_no" className="text-right font-medium">Route No *</Label>
                <Input id="route_no" placeholder="e.g. 99" value={formData.route_no}
                  onChange={(e) => setFormData({ ...formData, route_no: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="route_name" className="text-right font-medium">Route Name *</Label>
                <Input id="route_name" placeholder="e.g. Colombo - Badulla" value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="category" className="text-right font-medium">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger className="col-span-3 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public Bus">Public Bus</SelectItem>
                    <SelectItem value="School Bus">School Bus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="start_location" className="text-right font-medium">Start Loc</Label>
                <Input id="start_location" placeholder="Colombo" value={formData.start_location}
                  onChange={(e) => setFormData({ ...formData, start_location: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="end_location" className="text-right font-medium">End Loc</Label>
                <Input id="end_location" placeholder="Badulla" value={formData.end_location}
                  onChange={(e) => setFormData({ ...formData, end_location: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="route_group" className="text-right font-medium">Corridor</Label>
                <div className="col-span-3 space-y-1">
                  <Select value={formData.route_group || "__none__"} onValueChange={(val) => setFormData({ ...formData, route_group: val === "__none__" ? "" : val })}>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select corridor group..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No corridor (standalone)</SelectItem>
                      {existingGroups.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suggestedGroup && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={() => setFormData({ ...formData, route_group: suggestedGroup })}
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      Auto-detected reverse route — link to "{suggestedGroup}"?
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="distance_km" className="text-right font-medium">Distance (km)</Label>
                <Input id="distance_km" type="number" placeholder="210" value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="fare_amount" className="text-right font-medium">Fare (Rs)</Label>
                <Input id="fare_amount" type="number" placeholder="1500" value={formData.fare_amount}
                  onChange={(e) => setFormData({ ...formData, fare_amount: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="is_active" className="text-right font-medium">Active?</Label>
                <div className="col-span-3 flex items-center">
                  <Switch id="is_active" checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="targets" className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
                <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-2"><Target className="w-4 h-4" /> Gamification & Targets</h4>
                <p className="text-sm text-blue-600/80">These values power the 'Mental Game' banners in the Crew App.</p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="revenue_target" className="text-right font-medium">Daily Revenue Target (Rs)</Label>
                <Input id="revenue_target" type="number" value={formData.revenue_target}
                  onChange={(e) => setFormData({ ...formData, revenue_target: e.target.value })} className="col-span-3 font-semibold text-emerald-600 bg-emerald-50" />
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="fuel_target" className="text-right font-medium">Daily Fuel Target (Liters)</Label>
                <Input id="fuel_target" type="number" value={formData.fuel_allocation_liters}
                  onChange={(e) => setFormData({ ...formData, fuel_allocation_liters: e.target.value })} className="col-span-3 font-semibold text-amber-600 bg-amber-50" />
              </div>

              <div className="grid grid-cols-4 gap-4 items-center mt-6">
                <Label className="text-right font-medium">Commission if Target Beaten</Label>
                <div className="col-span-3 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Driver (%)</Label>
                    <Input type="number" value={formData.driver_commission_pct}
                      onChange={(e) => setFormData({ ...formData, driver_commission_pct: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Conductor (%)</Label>
                    <Input type="number" value={formData.conductor_commission_pct}
                      onChange={(e) => setFormData({ ...formData, conductor_commission_pct: e.target.value })} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 mb-4">
                <h4 className="font-semibold text-slate-800 mb-1 flex items-center gap-2"><Wallet className="w-4 h-4" /> Standard Operating Costs</h4>
                <p className="text-sm text-slate-500">These will automatically pre-fill the expenses section in the Daily Trips app.</p>
              </div>

              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="meal_allowance" className="text-right font-medium">Meal Allowance (Rs)</Label>
                <Input id="meal_allowance" type="number" value={formData.meal_allowance}
                  onChange={(e) => setFormData({ ...formData, meal_allowance: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="highway_fee" className="text-right font-medium">Highway Tolls (Rs)</Label>
                <Input id="highway_fee" type="number" value={formData.highway_fee}
                  onChange={(e) => setFormData({ ...formData, highway_fee: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>

              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="runner_fee" className="text-right font-medium">Runner Fee (Rs)</Label>
                <Input id="runner_fee" type="number" value={formData.runner_fee}
                  onChange={(e) => setFormData({ ...formData, runner_fee: e.target.value })} className="col-span-3 bg-slate-50" />
              </div>
            </TabsContent>

            <TabsContent value="crew" className="space-y-4">
              <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 mb-4">
                <h4 className="font-semibold text-purple-800 mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> Default Bus Allocations</h4>
                <p className="text-sm text-purple-600/80">Map a bus to this route, and assign its default Driver and Conductor for automated data entry.</p>
              </div>

              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="default_bus" className="text-right font-medium">Bus Number</Label>
                <Input id="default_bus" placeholder="e.g. NCG-1234" value={formData.default_bus}
                  onChange={(e) => setFormData({ ...formData, default_bus: e.target.value })} className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="default_driver" className="text-right font-medium">Default Driver</Label>
                <Input id="default_driver" placeholder="Search staff..." value={formData.default_driver}
                  onChange={(e) => setFormData({ ...formData, default_driver: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 gap-4 items-center">
                <Label htmlFor="default_conductor" className="text-right font-medium">Default Conductor</Label>
                <Input id="default_conductor" placeholder="Search staff..." value={formData.default_conductor}
                  onChange={(e) => setFormData({ ...formData, default_conductor: e.target.value })} className="col-span-3" />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 min-w-[120px]">
              {editingRoute ? "Save Route Master" : "Create Master Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Tabs & Search */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Routes ({routes.length})</TabsTrigger>
            <TabsTrigger value="public">Public Bus ({publicCount})</TabsTrigger>
            <TabsTrigger value="school">School Bus ({schoolCount})</TabsTrigger>
            <TabsTrigger value="sync-audit" className="gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Sync Audit
              {auditSummary && auditSummary.totalOrphans > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] h-5 px-1.5">{auditSummary.totalOrphans}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by route, location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        <TabsContent value="all">{renderRouteTable()}</TabsContent>
        <TabsContent value="public">{renderRouteTable()}</TabsContent>
        <TabsContent value="school">{renderRouteTable()}</TabsContent>

        <TabsContent value="sync-audit">
          <RouteSyncAuditDashboard onSyncComplete={() => {
            fetchRoutes();
            fetchBusCounts();
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
