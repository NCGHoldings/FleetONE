import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, MapPin, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface MultiDayRoute {
  id: string;
  route_id: string | null;
  route_name: string;
  route_pattern: string | null;
  is_enabled: boolean;
  typical_days_per_trip: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Route {
  id: string;
  route_no: string;
  route_name: string | null;
}

export function MultiDayRouteConfig() {
  const [routes, setRoutes] = useState<MultiDayRoute[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MultiDayRoute | null>(null);

  const [formData, setFormData] = useState({
    route_id: '',
    route_name: '',
    route_pattern: '',
    typical_days_per_trip: 2,
    description: '',
  });

  useEffect(() => {
    fetchMultiDayRoutes();
    fetchAvailableRoutes();
  }, []);

  const fetchMultiDayRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('multi_day_route_config')
        .select('*')
        .order('route_name');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching multi-day routes:', error);
      toast.error('Failed to load multi-day routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, route_no, route_name')
        .order('route_no');

      if (error) throw error;
      setAvailableRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const handleAddRoute = async () => {
    if (!formData.route_name.trim()) {
      toast.error('Please enter a route name');
      return;
    }

    try {
      const { error } = await supabase
        .from('multi_day_route_config')
        .insert({
          route_id: formData.route_id || null,
          route_name: formData.route_name,
          route_pattern: formData.route_pattern || null,
          typical_days_per_trip: formData.typical_days_per_trip,
          description: formData.description || null,
          is_enabled: true,
        });

      if (error) throw error;

      toast.success('Multi-day route added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchMultiDayRoutes();
    } catch (error: any) {
      console.error('Error adding route:', error);
      toast.error(error.message || 'Failed to add multi-day route');
    }
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;

    try {
      const { error } = await supabase
        .from('multi_day_route_config')
        .update({
          route_id: formData.route_id || null,
          route_name: formData.route_name,
          route_pattern: formData.route_pattern || null,
          typical_days_per_trip: formData.typical_days_per_trip,
          description: formData.description || null,
        })
        .eq('id', editingRoute.id);

      if (error) throw error;

      toast.success('Multi-day route updated successfully');
      setEditingRoute(null);
      resetForm();
      fetchMultiDayRoutes();
    } catch (error: any) {
      console.error('Error updating route:', error);
      toast.error(error.message || 'Failed to update multi-day route');
    }
  };

  const handleToggleEnabled = async (routeId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('multi_day_route_config')
        .update({ is_enabled: !currentState })
        .eq('id', routeId);

      if (error) throw error;

      toast.success(`Route ${!currentState ? 'enabled' : 'disabled'}`);
      fetchMultiDayRoutes();
    } catch (error: any) {
      console.error('Error toggling route:', error);
      toast.error(error.message || 'Failed to toggle route');
    }
  };

  const handleDeleteRoute = async (routeId: string, routeName: string) => {
    if (!confirm(`Delete multi-day route "${routeName}"?`)) return;

    try {
      const { error } = await supabase
        .from('multi_day_route_config')
        .delete()
        .eq('id', routeId);

      if (error) throw error;

      toast.success('Multi-day route deleted');
      fetchMultiDayRoutes();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast.error(error.message || 'Failed to delete route');
    }
  };

  const openEditDialog = (route: MultiDayRoute) => {
    setEditingRoute(route);
    setFormData({
      route_id: route.route_id || '',
      route_name: route.route_name,
      route_pattern: route.route_pattern || '',
      typical_days_per_trip: route.typical_days_per_trip,
      description: route.description || '',
    });
  };

  const resetForm = () => {
    setFormData({
      route_id: '',
      route_name: '',
      route_pattern: '',
      typical_days_per_trip: 2,
      description: '',
    });
  };

  const handleRouteSelect = (routeId: string) => {
    const selectedRoute = availableRoutes.find(r => r.id === routeId);
    if (selectedRoute) {
      setFormData(prev => ({
        ...prev,
        route_id: routeId,
        route_name: selectedRoute.route_name || selectedRoute.route_no,
      }));
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading multi-day routes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Multi-Day Route Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure routes that span multiple days (e.g., Moratuwa-Jaffna)
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRoute(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Multi-Day Route</DialogTitle>
              <DialogDescription>
                Configure a new route that requires per-trip date assignment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Existing Route (Optional)</Label>
                <Select value={formData.route_id} onValueChange={handleRouteSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route or enter custom name" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoutes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_no} {route.route_name ? `- ${route.route_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Route Name *</Label>
                <Input
                  value={formData.route_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, route_name: e.target.value }))}
                  placeholder="e.g., Moratuwa-Jaffna"
                />
              </div>

              <div className="space-y-2">
                <Label>Route Pattern</Label>
                <Input
                  value={formData.route_pattern}
                  onChange={(e) => setFormData(prev => ({ ...prev, route_pattern: e.target.value }))}
                  placeholder="e.g., Moratuwa-Jaffna or Jaffna-Moratuwa"
                />
              </div>

              <div className="space-y-2">
                <Label>Typical Days Per Trip</Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.typical_days_per_trip}
                  onChange={(e) => setFormData(prev => ({ ...prev, typical_days_per_trip: parseInt(e.target.value) || 1 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Used for smart date defaults (e.g., 2 = Trip 1 yesterday, Trip 2 today)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional notes about this route"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRoute}>Add Route</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingRoute !== null} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Multi-Day Route</DialogTitle>
            <DialogDescription>
              Update route configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Existing Route (Optional)</Label>
              <Select value={formData.route_id} onValueChange={handleRouteSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route or enter custom name" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoutes.map(route => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.route_no} {route.route_name ? `- ${route.route_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Route Name *</Label>
              <Input
                value={formData.route_name}
                onChange={(e) => setFormData(prev => ({ ...prev, route_name: e.target.value }))}
                placeholder="e.g., Moratuwa-Jaffna"
              />
            </div>

            <div className="space-y-2">
              <Label>Route Pattern</Label>
              <Input
                value={formData.route_pattern}
                onChange={(e) => setFormData(prev => ({ ...prev, route_pattern: e.target.value }))}
                placeholder="e.g., Moratuwa-Jaffna or Jaffna-Moratuwa"
              />
            </div>

            <div className="space-y-2">
              <Label>Typical Days Per Trip</Label>
              <Input
                type="number"
                min="1"
                max="7"
                value={formData.typical_days_per_trip}
                onChange={(e) => setFormData(prev => ({ ...prev, typical_days_per_trip: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional notes about this route"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoute(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRoute}>Update Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No multi-day routes configured yet</p>
            <p className="text-sm">Add routes like Moratuwa-Jaffna that require per-trip date assignment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {routes.map(route => (
            <Card key={route.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{route.route_name}</span>
                      <Badge variant={route.is_enabled ? "default" : "secondary"}>
                        {route.is_enabled ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {route.typical_days_per_trip} days
                      </Badge>
                    </div>
                    {route.route_pattern && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Pattern: {route.route_pattern}
                      </p>
                    )}
                    {route.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {route.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={route.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(route.id, route.is_enabled)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(route)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoute(route.id, route.route_name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
