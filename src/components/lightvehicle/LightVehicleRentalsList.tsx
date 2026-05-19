import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Play, Plus, Receipt, FileText } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { LightVehicleRentalAgreementModal } from './LightVehicleRentalAgreementModal';

interface Rental {
  id: string;
  vehicle_name: string;
  vehicle_number: string;
  customer_id: string;
  customers: { customer_name: string };
  start_date: string;
  end_date: string | null;
  monthly_rent_amount: number;
  next_billing_date: string;
  status: string;
  created_at: string;
}

interface LightVehicleRentalsListProps {
  onNewRental: () => void;
}

export function LightVehicleRentalsList({ onNewRental }: LightVehicleRentalsListProps) {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();

  const fetchRentals = async () => {
    if (!selectedCompanyId) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('lightvehicle_rentals')
        .select(`
          *,
          customers(customer_name)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setRentals(data || []);
    } catch (error: any) {
      console.error('Error fetching rentals:', error);
      toast({
        title: "Error",
        description: "Failed to load rental agreements.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [selectedCompanyId]);

  const runBilling = async () => {
    if (!selectedCompanyId) return;
    
    try {
      setBillingLoading(true);
      const { data, error } = await supabase.rpc('generate_lightvehicle_rent_invoices', {
        p_company_id: selectedCompanyId
      });

      if (error) throw error;

      if (data && data.success) {
        toast({
          title: "Billing Run Complete",
          description: data.message || `Successfully generated invoices.`,
        });
        fetchRentals(); // Refresh list to see updated next_billing_dates
      } else {
        throw new Error(data?.error || "Failed to generate invoices.");
      }
    } catch (error: any) {
      console.error('Error running billing:', error);
      toast({
        title: "Billing Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Monthly Rent Collection
          </h3>
          <p className="text-sm text-muted-foreground">Manage active vehicle rental agreements and auto-generate AR invoices when rent is due.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runBilling} disabled={billingLoading || loading} className="gap-2">
            <Play className="h-4 w-4 text-green-600" />
            {billingLoading ? "Running..." : "Run Monthly Billing"}
          </Button>
          <Button onClick={onNewRental} className="gap-2">
            <Plus className="h-4 w-4" />
            New Rental Agreement
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Monthly Rent</TableHead>
              <TableHead>Next Billing Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading rentals...</TableCell>
              </TableRow>
            ) : rentals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No rental agreements found.</TableCell>
              </TableRow>
            ) : (
              rentals.map((rental) => (
                <TableRow key={rental.id}>
                  <TableCell>
                    <div className="font-medium">{rental.vehicle_name}</div>
                    <div className="text-xs text-muted-foreground">{rental.vehicle_number || 'N/A'}</div>
                  </TableCell>
                  <TableCell>{rental.customers?.customer_name || 'Unknown'}</TableCell>
                  <TableCell>{format(new Date(rental.start_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="font-medium">LKR {rental.monthly_rent_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={new Date(rental.next_billing_date) <= new Date() ? 'text-red-600 font-medium' : ''}>
                      {format(new Date(rental.next_billing_date), 'MMM dd, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rental.status === 'active' ? 'default' : 'secondary'}>
                      {rental.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRental(rental)}>
                      <FileText className="h-4 w-4 mr-1" />
                      Agreement
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LightVehicleRentalAgreementModal 
        rental={selectedRental}
        open={!!selectedRental}
        onClose={() => setSelectedRental(null)}
      />
    </div>
  );
}
