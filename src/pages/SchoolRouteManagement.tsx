import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Route {
  id: string;
  route_name: string;
  route_code: string;
  start_location: string;
  end_location: string;
  estimated_duration_minutes: number;
  pickup_points: any;
  is_active: boolean;
  created_at: string;
}

export default function SchoolRouteManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    route_name: "",
    route_code: "",
    start_location: "",
    end_location: "",
    estimated_duration_minutes: "",
  });

  useEffect(() => {
    fetchRoutes();
  }, [branchId]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("school_routes")
        .select("*")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .order("route_name");

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
      toast({
        title: "Error",
        description: "Failed to load routes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const routeData = {
        ...formData,
        estimated_duration_minutes: Number(formData.estimated_duration_minutes),
        branch_id: branchId,
      };

      if (editingRoute) {
        const { error } = await supabase
          .from("school_routes")
          .update(routeData)
          .eq("id", editingRoute.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("school_routes")
          .insert(routeData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Route ${editingRoute ? "updated" : "created"} successfully`,
      });

      setIsAddModalOpen(false);
      setEditingRoute(null);
      setFormData({
        route_name: "",
        route_code: "",
        start_location: "",
        end_location: "",
        estimated_duration_minutes: "",
      });
      fetchRoutes();
    } catch (error) {
      console.error("Error saving route:", error);
      toast({
        title: "Error",
        description: "Failed to save route",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    try {
      const { error } = await supabase
        .from("school_routes")
        .update({ is_active: false })
        .eq("id", routeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route deleted successfully",
      });
      fetchRoutes();
    } catch (error) {
      console.error("Error deleting route:", error);
      toast({
        title: "Error",
        description: "Failed to delete route",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      route_code: route.route_code,
      start_location: route.start_location,
      end_location: route.end_location,
      estimated_duration_minutes: route.estimated_duration_minutes?.toString() || "",
    });
    setIsAddModalOpen(true);
  };

  const columns = [
    {
      accessorKey: "route_code",
      header: "Route Code",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue("route_code")}</Badge>
      ),
    },
    {
      accessorKey: "route_name",
      header: "Route Name",
    },
    {
      accessorKey: "start_location",
      header: "Start Location",
    },
    {
      accessorKey: "end_location",
      header: "End Location",
    },
    {
      accessorKey: "estimated_duration_minutes",
      header: "Duration (mins)",
    },
    {
      id: "pickup_points",
      header: "Pickup Points",
      cell: ({ row }: any) => {
        const points = Array.isArray(row.original.pickup_points) ? row.original.pickup_points : [];
        return (
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {points.length} points
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/school-bus/branch/${branchId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Branch
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Route Management</h1>
            <p className="text-muted-foreground">
              Manage bus routes and pickup points for this branch
            </p>
          </div>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingRoute(null);
              setFormData({
                route_name: "",
                route_code: "",
                start_location: "",
                end_location: "",
                estimated_duration_minutes: "",
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="route_code">Route Code</Label>
                <Input
                  id="route_code"
                  value={formData.route_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, route_code: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="route_name">Route Name</Label>
                <Input
                  id="route_name"
                  value={formData.route_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, route_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="start_location">Start Location</Label>
                <Input
                  id="start_location"
                  value={formData.start_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_location: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_location">End Location</Label>
                <Input
                  id="end_location"
                  value={formData.end_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_location: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="estimated_duration_minutes">Duration (minutes)</Label>
                <Input
                  id="estimated_duration_minutes"
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {editingRoute ? "Update Route" : "Create Route"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Routes ({routes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={routes}
            searchKey="route_name"
          />
        </CardContent>
      </Card>
    </div>
  );
}