import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Map, MapPin, GitMerge, Bus, ChevronDown, ChevronRight, ArrowLeftRight } from "lucide-react";
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

  useEffect(() => {
    fetchRoutes();
    fetchBusCounts();
  }, []);

  const filteredRoutes = routes.filter((r) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "public") return r.category === "Public Bus";
    if (categoryFilter === "school") return r.category === "School Bus";
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
      is_active: routeItem.is_active !== false,
      category: routeItem.category || "Public Bus",
      route_group: routeItem.route_group || "",
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
      distance_km: "",
      fare_amount: "",
      is_active: true,
      category: "Public Bus",
      route_group: "",
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="route_no" className="text-right">Route No *</Label>
              <Input id="route_no" placeholder="e.g. 99" value={formData.route_no}
                onChange={(e) => setFormData({ ...formData, route_no: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="route_name" className="text-right">Route Name *</Label>
              <Input id="route_name" placeholder="e.g. Colombo - Badulla" value={formData.route_name}
                onChange={(e) => setFormData({ ...formData, route_name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public Bus">Public Bus</SelectItem>
                  <SelectItem value="School Bus">School Bus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="start_location" className="text-right">Start Loc</Label>
              <Input id="start_location" placeholder="Colombo" value={formData.start_location}
                onChange={(e) => setFormData({ ...formData, start_location: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="end_location" className="text-right">End Loc</Label>
              <Input id="end_location" placeholder="Badulla" value={formData.end_location}
                onChange={(e) => setFormData({ ...formData, end_location: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="route_group" className="text-right">Corridor</Label>
              <div className="col-span-3 space-y-1">
                <Select value={formData.route_group || "__none__"} onValueChange={(val) => setFormData({ ...formData, route_group: val === "__none__" ? "" : val })}>
                  <SelectTrigger><SelectValue placeholder="Select corridor group..." /></SelectTrigger>
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
              <Label htmlFor="distance_km" className="text-right">Distance (km)</Label>
              <Input id="distance_km" type="number" placeholder="210" value={formData.distance_km}
                onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="fare_amount" className="text-right">Fare (Rs)</Label>
              <Input id="fare_amount" type="number" placeholder="1500" value={formData.fare_amount}
                onChange={(e) => setFormData({ ...formData, fare_amount: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="is_active" className="text-right">Active?</Label>
              <div className="col-span-3 flex items-center">
                <Switch id="is_active" checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              </div>
            </div>
            <Button className="w-full mt-4" onClick={handleSubmit}>
              {editingRoute ? "Save Changes" : "Create Route"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList>
          <TabsTrigger value="all">All Routes ({routes.length})</TabsTrigger>
          <TabsTrigger value="public">Public Bus ({publicCount})</TabsTrigger>
          <TabsTrigger value="school">School Bus ({schoolCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={categoryFilter}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route No</TableHead>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead className="text-center">Buses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      {/* Corridor Groups */}
                      {groupedRoutes.corridors.map(corridor => {
                        const isCollapsed = collapsedCorridors.has(corridor.name);
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
                              <TableCell className="text-sm text-muted-foreground">
                                Round-trip corridor
                              </TableCell>
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

                      {/* Ungrouped Routes */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
