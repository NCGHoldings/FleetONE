
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Upload, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  bus_name: z.string().min(1, 'Bus name is required'),
  model: z.string().min(1, 'Model is required'),
  seating_capacity: z.number().min(1, 'Seating capacity must be at least 1'),
  engine: z.string().min(1, 'Engine is required'),
  manufactured_year: z.number().min(1900, 'Valid year required').max(new Date().getFullYear() + 1),
  condition: z.string().min(1, 'Condition is required'),
  unit_price: z.number().min(1, 'Unit price is required'),
  is_active: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface BusModel {
  id: string;
  bus_name: string;
  model_name: string; // This maps to 'model' in our form
  capacity: number; // This maps to 'seating_capacity' in our form
  engine: string;
  manufactured_year: number;
  condition: string;
  base_price: number; // This maps to 'unit_price' in our form
  is_active: boolean;
  created_at: string;
  image_url?: string;
}

export function YutongBusModelsAdmin() {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<BusModel | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true
    }
  });

  const loadBusModels = async () => {
    try {
      setLoading(true);
      console.log('Loading bus models...');
      const { data, error } = await supabase
        .from('yutong_bus_models')
        .select('*')
        .order('bus_name');

      console.log('Bus models query result:', { data, error });

      if (error) throw error;
      setBusModels(data || []);
      console.log('Bus models loaded successfully:', data?.length || 0, 'records');
    } catch (error: any) {
      console.error('Error loading bus models:', error);
      toast({
        title: "Error",
        description: "Failed to load bus models",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusModels();
  }, []);

  const handleImageUpload = async (file: File, modelId: string) => {
    try {
      setUploadingImage(modelId);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${modelId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('yutong-bus-models')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('yutong-bus-models')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('yutong_bus_models')
        .update({ image_url: publicUrl })
        .eq('id', modelId);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Image uploaded successfully" });
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSubmit = async (data: FormData) => {
    try {
      // Map form data to database column names
      const dbData = {
        bus_name: data.bus_name,
        model_name: data.model,
        capacity: data.seating_capacity,
        engine: data.engine,
        manufactured_year: data.manufactured_year,
        condition: data.condition,
        base_price: data.unit_price,
        is_active: data.is_active
      };

      if (editingModel) {
        const { error } = await supabase
          .from('yutong_bus_models')
          .update(dbData)
          .eq('id', editingModel.id);

        if (error) throw error;
        toast({ title: "Success", description: "Bus model updated successfully" });
      } else {
        const { error } = await supabase
          .from('yutong_bus_models')
          .insert([dbData]);

        if (error) throw error;
        toast({ title: "Success", description: "Bus model created successfully" });
      }

      setShowDialog(false);
      setEditingModel(null);
      form.reset();
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (model: BusModel) => {
    setEditingModel(model);
    // Map database fields to form fields
    form.reset({
      bus_name: model.bus_name,
      model: model.model_name,
      seating_capacity: model.capacity,
      engine: model.engine,
      manufactured_year: model.manufactured_year,
      condition: model.condition,
      unit_price: model.base_price,
      is_active: model.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus model?')) return;

    try {
      const { error } = await supabase
        .from('yutong_bus_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Bus model deleted successfully" });
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yutong Bus Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading bus models...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Yutong Bus Models</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingModel(null);
                form.reset({ is_active: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bus Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? 'Edit Bus Model' : 'Add New Bus Model'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bus_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bus Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Yutong ZK6129H" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ZK6129H" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seating_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seating Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 49"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., YC6L280-30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufactured_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufactured Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear() + 1}
                              placeholder="e.g., 2024"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., New, Used, Refurbished" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (LKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 12500000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingModel ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {busModels.map((model) => (
            <Card key={model.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {model.image_url ? (
                  <img
                    src={model.image_url}
                    alt={model.bus_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, model.id);
                    }}
                    className="hidden"
                    id={`upload-${model.id}`}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => document.getElementById(`upload-${model.id}`)?.click()}
                    disabled={uploadingImage === model.id}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{model.bus_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      model.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium">Model:</span> {model.model_name}</p>
                    <p><span className="font-medium">Capacity:</span> {model.capacity} seats</p>
                    <p><span className="font-medium">Year:</span> {model.manufactured_year}</p>
                    <p><span className="font-medium">Condition:</span> {model.condition}</p>
                    <p><span className="font-medium">Engine:</span> {model.engine}</p>
                  </div>
                  
                  <div className="text-lg font-bold text-primary">
                    LKR {model.base_price.toLocaleString()}
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(model)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(model.id)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {busModels.length === 0 && (
          <div className="text-center py-12">
            <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No bus models found</h3>
            <p className="text-muted-foreground">Get started by adding your first bus model.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
