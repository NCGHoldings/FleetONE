import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Phone, Mail, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  person_name: z.string().min(1, 'Name is required'),
  designation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface ResponsiblePerson {
  id: string;
  role: string;
  person_name: string;
  designation?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_default?: boolean;
}

export function LightVehicleResponsiblePersonsAdmin() {
  const [persons, setPersons] = useState<ResponsiblePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPerson, setEditingPerson] = useState<ResponsiblePerson | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true,
      is_default: false,
    }
  });

  const loadPersons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lightvehicle_responsible_persons')
        .select('*')
        .order('role');

      if (error) throw error;
      setPersons(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load responsible persons",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, []);

  const handleSubmit = async (data: FormData) => {
    try {
      // If setting as default, clear other defaults first
      if (data.is_default) {
        await supabase
          .from('lightvehicle_responsible_persons')
          .update({ is_default: false })
          .neq('id', editingPerson?.id || '');
      }

      if (editingPerson) {
        const { error } = await supabase
          .from('lightvehicle_responsible_persons')
          .update({
            role: data.role,
            person_name: data.person_name,
            designation: data.designation || null,
            phone: data.phone || null,
            email: data.email || null,
            is_active: data.is_active,
            is_default: data.is_default,
          })
          .eq('id', editingPerson.id);

        if (error) throw error;
        toast({ title: "Success", description: "Person updated successfully" });
      } else {
        const { error } = await supabase
          .from('lightvehicle_responsible_persons')
          .insert([{
            role: data.role,
            person_name: data.person_name,
            designation: data.designation || null,
            phone: data.phone || null,
            email: data.email || null,
            is_active: data.is_active,
            is_default: data.is_default,
          } as any]);
        if (error) throw error;
        toast({ title: "Success", description: "Person created successfully" });
      }

      setShowDialog(false);
      setEditingPerson(null);
      form.reset();
      loadPersons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (person: ResponsiblePerson) => {
    setEditingPerson(person);
    form.reset({
      role: person.role,
      person_name: person.person_name,
      designation: person.designation || '',
      phone: person.phone || '',
      email: person.email || '',
      is_active: person.is_active,
      is_default: person.is_default || false,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      const { error } = await supabase
        .from('lightvehicle_responsible_persons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Person deleted successfully" });
      loadPersons();
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
          <CardTitle>Settings - Responsible Persons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Settings - Responsible Persons</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPerson(null);
                form.reset({ is_active: true, is_default: false });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPerson ? 'Edit Person' : 'Add New Person'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., sales_manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="person_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Person name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sales Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+94 77 XXX XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@ncgholdings.lk" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-6">
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

                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel>Default for Footer</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingPerson ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {persons.map((person) => (
            <Card key={person.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{person.person_name}</span>
                    <Badge variant="outline">{person.role}</Badge>
                    {!person.is_active && <Badge variant="secondary">Inactive</Badge>}
                    {person.is_default && (
                      <Badge variant="outline" className="border-primary text-primary">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                  {person.designation && (
                    <p className="text-sm text-muted-foreground">{person.designation}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {person.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {person.phone}
                      </span>
                    )}
                    {person.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {person.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(person)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(person.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {persons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No responsible persons found. Add your first person to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
