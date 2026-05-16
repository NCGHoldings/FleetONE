import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { useCustomers } from '@/hooks/useAccountingData';

interface LightVehicleRentalFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function LightVehicleRentalForm({ onCancel, onSuccess }: LightVehicleRentalFormProps) {
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();
  const { data: customers } = useCustomers();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_name: '',
    vehicle_number: '',
    customer_id: '',
    start_date: new Date().toISOString().split('T')[0],
    monthly_rent_amount: '',
    next_billing_date: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('lightvehicle_rentals')
        .insert([{
          vehicle_name: formData.vehicle_name,
          vehicle_number: formData.vehicle_number || null,
          customer_id: formData.customer_id,
          start_date: formData.start_date,
          monthly_rent_amount: parseFloat(formData.monthly_rent_amount),
          next_billing_date: formData.next_billing_date,
          company_id: selectedCompanyId,
          status: 'active'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Rental agreement created successfully."
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error creating rental:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Rental Agreement</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_name">Vehicle Name / Model *</Label>
              <Input 
                id="vehicle_name" 
                name="vehicle_name" 
                required 
                value={formData.vehicle_name} 
                onChange={handleChange} 
                placeholder="e.g. Toyota Aqua"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_number">Vehicle Reg Number</Label>
              <Input 
                id="vehicle_number" 
                name="vehicle_number" 
                value={formData.vehicle_number} 
                onChange={handleChange} 
                placeholder="e.g. WP CAA-1234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer / Renter *</Label>
            <select 
              id="customer_id" 
              name="customer_id" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
              value={formData.customer_id}
              onChange={handleChange}
            >
              <option value="">Select a Customer</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.customer_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Rental Start Date *</Label>
              <Input 
                type="date" 
                id="start_date" 
                name="start_date" 
                required 
                value={formData.start_date} 
                onChange={handleChange} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_billing_date">First Billing Date *</Label>
              <Input 
                type="date" 
                id="next_billing_date" 
                name="next_billing_date" 
                required 
                value={formData.next_billing_date} 
                onChange={handleChange} 
              />
              <p className="text-xs text-muted-foreground">Invoice will be generated on this date</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_rent_amount">Monthly Rent Amount (LKR) *</Label>
            <Input 
              type="number" 
              step="0.01" 
              min="0"
              id="monthly_rent_amount" 
              name="monthly_rent_amount" 
              required 
              value={formData.monthly_rent_amount} 
              onChange={handleChange} 
              placeholder="0.00"
            />
          </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Agreement'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
