import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ServiceType {
  id: string;
  name: string;
  hourly_rate: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ServiceTypesAdmin() {
  const { hasRole } = useAuth();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    hourly_rate: '',
    description: '',
    is_active: true
  });

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast.error('Failed to load service types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      const serviceData = {
        name: formData.name,
        hourly_rate: parseFloat(formData.hourly_rate),
        description: formData.description || null,
        is_active: formData.is_active
      };

      if (editingService) {
        const { error } = await supabase
          .from('service_types')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service type updated successfully');
      } else {
        const { error } = await supabase
          .from('service_types')
          .insert(serviceData);

        if (error) throw error;
        toast.success('Service type created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchServiceTypes();
    } catch (error: any) {
      console.error('Error saving service type:', error);
      toast.error(error.message || 'Failed to save service type');
    }
  };

  const handleEdit = (service: ServiceType) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      hourly_rate: service.hourly_rate.toString(),
      description: service.description || '',
      is_active: service.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    if (!confirm('Are you sure you want to delete this service type?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Service type deleted successfully');
      fetchServiceTypes();
    } catch (error: any) {
      console.error('Error deleting service type:', error);
      toast.error('Failed to delete service type');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      const { error } = await supabase
        .from('service_types')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Service type ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchServiceTypes();
    } catch (error: any) {
      console.error('Error updating service type:', error);
      toast.error('Failed to update service type');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hourly_rate: '',
      description: '',
      is_active: true
    });
    setEditingService(null);
  };

  const columns: ColumnDef<ServiceType>[] = [
    {
      accessorKey: "name",
      header: "Service Type",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "hourly_rate",
      header: "Hourly Rate",
      cell: ({ row }) => (
        <div className="font-medium text-primary">
          ₨{(row.getValue("hourly_rate") as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("description") || '-'}
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("is_active") ? "default" : "secondary"}>
          {row.getValue("is_active") ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    ...(isAdmin ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={row.original.is_active ? "secondary" : "default"}
            onClick={() => toggleActive(row.original.id, row.original.is_active)}
          >
            {row.original.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Service Types & Pay Rates
          </CardTitle>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Edit Service Type' : 'Add New Service Type'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Service Type Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                      placeholder="e.g., Engine Repair"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate (₨)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="50"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData(prev => ({...prev, hourly_rate: e.target.value}))}
                      placeholder="500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                      placeholder="Brief description of the service type"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({...prev, is_active: e.target.checked}))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSubmit} className="flex-1">
                      {editingService ? 'Update' : 'Create'} Service Type
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={serviceTypes}
          searchKey="name"
          title={`${serviceTypes.length} Service Types`}
        />
      </CardContent>
    </Card>
  );
}