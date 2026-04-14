// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, GripVertical, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const optionSchema = z.object({
  option_value: z.string().min(1, 'Option value is required'),
  display_order: z.number().min(0).default(0),
});

type OptionFormData = z.infer<typeof optionSchema>;

interface CustomizationOption {
  id: string;
  option_type: string;
  option_value: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const optionTypes = [
  { value: 'seat_colour', label: 'Seat Colour', icon: '🪑' },
  { value: 'curtain_colour', label: 'Curtain Colour', icon: '🪟' },
  { value: 'body_colour', label: 'Body Colour', icon: '🚌' },
  { value: 'headrest_logo', label: 'Seat Headrest Logo', icon: '🏷️' },
];

export function SinotrukCustomizationAdmin() {
  const [options, setOptions] = useState<CustomizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOption, setEditingOption] = useState<CustomizationOption | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('seat_colour');
  const { toast } = useToast();

  const form = useForm<OptionFormData>({
    resolver: zodResolver(optionSchema),
    defaultValues: {
      option_value: '',
      display_order: 0,
    }
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sinotruck_customization_options')
        .select('*')
        .order('option_type')
        .order('display_order');

      if (error) throw error;
      setOptions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load customization options",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: OptionFormData) => {
    try {
      if (editingOption) {
        // Update existing option
        const { error } = await supabase
          .from('sinotruck_customization_options')
          .update({
            option_value: data.option_value,
            display_order: data.display_order,
          })
          .eq('id', editingOption.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customization option updated successfully"
        });
      } else {
        // Create new option
        const { error } = await supabase
          .from('sinotruck_customization_options')
          .insert([{
            option_type: activeTab as 'seat_colour' | 'curtain_colour' | 'body_colour' | 'headrest_logo',
            option_value: data.option_value,
            display_order: data.display_order,
            is_active: true,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customization option added successfully"
        });
      }

      setShowDialog(false);
      setEditingOption(null);
      form.reset();
      loadOptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (option: CustomizationOption) => {
    try {
      const { error } = await supabase
        .from('sinotruck_customization_options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Option ${!option.is_active ? 'activated' : 'deactivated'} successfully`
      });

      loadOptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return;

    try {
      const { error } = await supabase
        .from('sinotruck_customization_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customization option deleted successfully"
      });

      loadOptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (option: CustomizationOption) => {
    setEditingOption(option);
    form.reset({
      option_value: option.option_value,
      display_order: option.display_order,
    });
    setShowDialog(true);
  };

  const handleAddNew = () => {
    setEditingOption(null);
    form.reset({
      option_value: '',
      display_order: 0,
    });
    setShowDialog(true);
  };

  const getOptionsForType = (type: string) => {
    return options.filter(o => o.option_type === type);
  };

  const renderOptionsTable = (type: string) => {
    const typeOptions = getOptionsForType(type);

    if (typeOptions.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No options added yet. Click "Add Option" to get started.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Order</TableHead>
            <TableHead>Option Value</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {typeOptions.map((option) => (
            <TableRow key={option.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span>{option.display_order}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{option.option_value}</TableCell>
              <TableCell>
                <Switch
                  checked={option.is_active}
                  onCheckedChange={() => handleToggleActive(option)}
                />
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(option)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(option.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Vehicle Customization Options
            </CardTitle>
            <CardDescription>
              Manage available customization options for Sinotruk bus quotations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              {optionTypes.map((type) => (
                <TabsTrigger key={type.value} value={type.value} className="gap-2">
                  <span>{type.icon}</span>
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Option
            </Button>
          </div>

          {optionTypes.map((type) => (
            <TabsContent key={type.value} value={type.value}>
              {renderOptionsTable(type.value)}
            </TabsContent>
          ))}
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOption ? 'Edit' : 'Add'} Customization Option
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="option_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option Value *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Black, Red, Blue" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingOption ? 'Update' : 'Add'} Option
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
