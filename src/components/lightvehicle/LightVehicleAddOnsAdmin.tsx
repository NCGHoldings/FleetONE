// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  addon_name: z.string().min(1, 'Add-on name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AddOn {
  id: string;
  addon_name: string;
  category: string;
  description?: string;
  price: number;
  is_active: boolean;
}

const ADDON_CATEGORIES = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'safety', label: 'Safety' },
  { value: 'accessory', label: 'Accessory' },
];

export function LightVehicleAddOnsAdmin() {
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddon, setEditingAddon] = useState<AddOn | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true,
      category: 'accessory',
      price: 0,
    }
  });

  const loadAddons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lightvehicle_addons')
        .select('*')
        .order('category', { ascending: true })
        .order('addon_name');

      if (error) throw error;
      setAddons(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load add-ons",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddons();
  }, []);

  const handleSubmit = async (data: FormData) => {
    try {
      if (editingAddon) {
        const { error } = await supabase
          .from('lightvehicle_addons')
          .update(data)
          .eq('id', editingAddon.id);

        if (error) throw error;
        toast({ title: "Success", description: "Add-on updated successfully" });
      } else {
        const { error } = await supabase
          .from('lightvehicle_addons')
          .insert([data as any]);
        if (error) throw error;
        toast({ title: "Success", description: "Add-on created successfully" });
      }

      setShowDialog(false);
      setEditingAddon(null);
      form.reset();
      loadAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (addon: AddOn) => {
    setEditingAddon(addon);
    form.reset({
      addon_name: addon.addon_name,
      category: addon.category,
      description: addon.description || '',
      price: addon.price,
      is_active: addon.is_active,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) return;

    try {
      const { error } = await supabase
        .from('lightvehicle_addons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Add-on deleted successfully" });
      loadAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      exterior: 'bg-blue-100 text-blue-800',
      interior: 'bg-green-100 text-green-800',
      electronics: 'bg-purple-100 text-purple-800',
      safety: 'bg-red-100 text-red-800',
      accessory: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add-ons Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading add-ons...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Add-ons Management</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingAddon(null);
                form.reset({ is_active: true, category: 'accessory', price: 0 });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Add-on
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAddon ? 'Edit Add-on' : 'Add New Add-on'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="addon_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add-on Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Window Tinting" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ADDON_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (LKR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormLabel>Active</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingAddon ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addons.map((addon) => (
            <Card key={addon.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{addon.addon_name}</h3>
                    <Badge className={getCategoryBadgeColor(addon.category)}>
                      {addon.category}
                    </Badge>
                  </div>
                  {!addon.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>

                {addon.description && (
                  <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                )}

                <div className="text-lg font-bold text-primary mb-3">
                  LKR {addon.price.toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(addon)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(addon.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {addons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No add-ons found. Add your first add-on to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
