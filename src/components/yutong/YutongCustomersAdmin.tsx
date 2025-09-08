import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

const customerSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  contact_person: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('Sri Lanka'),
  customer_type: z.enum(['business', 'individual', 'government']).default('business'),
  credit_limit: z.number().min(0).default(0),
  payment_terms: z.number().min(0).default(30),
  tax_number: z.string().optional(),
  business_registration_no: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  customer_code: string;
  company_name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  country: string;
  customer_type: string;
  credit_limit: number;
  payment_terms: number;
  tax_number?: string;
  business_registration_no?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function YutongCustomersAdmin() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: 'Sri Lanka',
      customer_type: 'business',
      credit_limit: 0,
      payment_terms: 30,
      tax_number: '',
      business_registration_no: '',
      notes: '',
    },
  });

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('yutong_customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      // Ensure all required fields are present
      const insertData = {
        company_name: data.company_name,
        phone: data.phone,
        contact_person: data.contact_person || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country,
        customer_type: data.customer_type,
        credit_limit: data.credit_limit,
        payment_terms: data.payment_terms,
        tax_number: data.tax_number || '',
        business_registration_no: data.business_registration_no || '',
        notes: data.notes || '',
        customer_code: `TEMP-${Date.now()}` // Will be overridden by trigger
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('yutong_customers')
          .update(insertData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('yutong_customers')
          .insert([insertData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Customer created successfully",
        });
      }

      setShowForm(false);
      setEditingCustomer(null);
      form.reset();
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      company_name: customer.company_name,
      contact_person: customer.contact_person || '',
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country,
      customer_type: customer.customer_type as 'business' | 'individual' | 'government',
      credit_limit: customer.credit_limit,
      payment_terms: customer.payment_terms,
      tax_number: customer.tax_number || '',
      business_registration_no: customer.business_registration_no || '',
      notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('yutong_customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'customer_code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('customer_code')}</span>
      ),
    },
    {
      accessorKey: 'company_name',
      header: 'Company',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('company_name')}</div>
          {row.original.contact_person && (
            <div className="text-sm text-muted-foreground">{row.original.contact_person}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.getValue('phone')}</div>
          {row.original.email && (
            <div className="text-muted-foreground">{row.original.email}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'customer_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.getValue('customer_type')}
        </Badge>
      ),
    },
    {
      accessorKey: 'credit_limit',
      header: 'Credit Limit',
      cell: ({ row }) => (
        <span>LKR {Number(row.getValue('credit_limit')).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
          {row.getValue('is_active') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.contact_person && customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Management</CardTitle>
            <Button onClick={() => {
              setEditingCustomer(null);
              form.reset();
              setShowForm(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <DataTable
            columns={columns}
            data={filteredCustomers}
          />
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="credit_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit (LKR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business_registration_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Registration No</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}