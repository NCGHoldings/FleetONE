import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouteTargets, RouteTargetFormData } from "@/hooks/useRouteTargets";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Route {
  id: string;
  route_name: string;
}

export function RouteTargetSettings() {
  const { targets, loading, addTarget, updateTarget, deleteTarget } = useRouteTargets();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RouteTargetFormData>({
    route_id: "",
    revenue_target: 0,
    driver_commission_percent: 5,
    conductor_commission_percent: 3,
    effective_from: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const { data } = await supabase
      .from("routes")
      .select("id, route_name")
      .eq("is_active", true)
      .order("route_name");
    setRoutes((data || []) as Route[]);
  };

  const resetForm = () => {
    setFormData({
      route_id: "",
      revenue_target: 0,
      driver_commission_percent: 5,
      conductor_commission_percent: 3,
      effective_from: new Date().toISOString().split("T")[0],
    });
    setEditingId(null);
  };

  const handleOpenDialog = (target?: any) => {
    if (target) {
      setEditingId(target.id);
      setFormData({
        route_id: target.route_id,
        revenue_target: target.revenue_target,
        driver_commission_percent: target.driver_commission_percent,
        conductor_commission_percent: target.conductor_commission_percent,
        effective_from: target.effective_from,
        effective_to: target.effective_to,
        notes: target.notes,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.route_id) {
      toast.error("Please select a route");
      return;
    }
    if (formData.revenue_target <= 0) {
      toast.error("Revenue target must be greater than 0");
      return;
    }

    let success;
    if (editingId) {
      success = await updateTarget(editingId, formData);
    } else {
      success = await addTarget(formData);
    }

    if (success) {
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string, routeName: string) => {
    if (confirm(`Delete target for ${routeName}? This cannot be undone.`)) {
      await deleteTarget(id);
    }
  };

  const getRouteName = (routeId: string) => {
    return routes.find((r) => r.id === routeId)?.route_name || "Unknown Route";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-500" />
          <span className="font-medium">{targets.filter((t) => t.is_active).length} Active Targets</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Route Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Route Target" : "Add Route Target"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Route *</Label>
                <Select
                  value={formData.route_id}
                  onValueChange={(v) => setFormData({ ...formData, route_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Daily Revenue Target (LKR) *</Label>
                <Input
                  type="number"
                  value={formData.revenue_target}
                  onChange={(e) => setFormData({ ...formData, revenue_target: Number(e.target.value) })}
                  placeholder="e.g., 50000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Driver Commission %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.driver_commission_percent}
                    onChange={(e) =>
                      setFormData({ ...formData, driver_commission_percent: Number(e.target.value) })
                    }
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conductor Commission %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.conductor_commission_percent}
                    onChange={(e) =>
                      setFormData({ ...formData, conductor_commission_percent: Number(e.target.value) })
                    }
                    placeholder="e.g., 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective To (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.effective_to || ""}
                    onChange={(e) => setFormData({ ...formData, effective_to: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>{editingId ? "Update" : "Add"} Target</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Revenue Target</TableHead>
                <TableHead>Driver %</TableHead>
                <TableHead>Conductor %</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No route targets configured. Click "Add Route Target" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.routes?.route_name || getRouteName(t.route_id)}
                    </TableCell>
                    <TableCell>LKR {t.revenue_target.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.driver_commission_percent}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.conductor_commission_percent}%</Badge>
                    </TableCell>
                    <TableCell>{t.effective_from}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "secondary"}>
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(t.id, t.routes?.route_name || "this target")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
