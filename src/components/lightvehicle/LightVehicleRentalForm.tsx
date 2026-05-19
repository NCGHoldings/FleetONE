import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { useCustomers } from '@/hooks/useAccountingData';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { createVehicleARInvoice } from '@/hooks/useVehicleSalesFinance';
import { generateLightVehicleRentalInvoiceHTML } from '@/lib/lightvehicle-rental-invoice-generator';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

interface LightVehicleRentalFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function LightVehicleRentalForm({ onCancel, onSuccess }: LightVehicleRentalFormProps) {
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();
  const { data: customers } = useCustomers();
  const { settings } = useSystemSettings();
  const { generatePDFFromHTML } = usePDFGeneration();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_name: '',
    vehicle_number: '',
    customer_id: '',
    start_date: new Date().toISOString().split('T')[0],
    monthly_rent_amount: '',
    next_billing_date: new Date().toISOString().split('T')[0],
    
    // New Fields for Invoice Template
    allocated_customer_name: '',
    sbu: 'LIS',
    user_name: '',
    mileage: '',
    ref_no: '',
    quote_no: '',
    fuel_expenses: '0',
    gps_rental: '0',
    discount: '0',
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
      
      const customer = customers?.find(c => c.id === formData.customer_id);
      
      // 1. Create Rental Agreement
      const { data: rentalData, error: rentalError } = await supabase
        .from('lightvehicle_rentals')
        .insert([{
          vehicle_name: formData.vehicle_name,
          vehicle_number: formData.vehicle_number || null,
          customer_id: formData.customer_id,
          start_date: formData.start_date,
          monthly_rent_amount: parseFloat(formData.monthly_rent_amount || '0'),
          next_billing_date: formData.next_billing_date,
          status: 'active'
        }])
        .select()
        .single();

      if (rentalError) throw rentalError;

      // Calculations
      const rentAmount = parseFloat(formData.monthly_rent_amount || '0');
      const fuelExp = parseFloat(formData.fuel_expenses || '0');
      const gpsRent = parseFloat(formData.gps_rental || '0');
      const discountAmount = parseFloat(formData.discount || '0');
      
      const originalQuote = rentAmount + fuelExp + gpsRent;
      const subTotal = originalQuote;
      const priceAfterDiscount = subTotal - discountAmount;
      const totalPaid = 0;
      const balanceDue = priceAfterDiscount - totalPaid;

      // 2. Generate an Invoice No
      const invoiceNo = `LVR-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;
      
      // 3. Create Rental Invoice Record
      const invoicePayload = {
          rental_id: rentalData.id,
          invoice_no: invoiceNo,
          invoice_date: new Date().toISOString().split('T')[0],
          rental_period: `${formData.start_date} - ${formData.next_billing_date}`,
          allocated_customer_name: formData.allocated_customer_name,
          sbu: formData.sbu,
          user_name: formData.user_name,
          address: customer?.billing_address || '',
          mileage: formData.mileage,
          ref_no: formData.ref_no,
          quote_no: formData.quote_no,
          vehicle_type: formData.vehicle_name,
          vehicle_no: formData.vehicle_number,
          
          rent_amount: rentAmount,
          fuel_expenses: fuelExp,
          gps_rental: gpsRent,
          discount: discountAmount,
          original_quote_amount: originalQuote,
          sub_total: subTotal,
          price_after_discount: priceAfterDiscount,
          total_paid: totalPaid,
          balance_due: balanceDue,
          company_id: selectedCompanyId
      };
      
      const { error: invoiceError } = await supabase
        .from('lightvehicle_rental_invoices')
        .insert([invoicePayload]);
        
      if (invoiceError) {
          console.warn('Could not save to lightvehicle_rental_invoices table. Ensure migration is run.', invoiceError);
      }

      // 4. Create AR Invoice
      if (settings?.trade_receivable_account_id && settings?.sales_revenue_account_id) {
          const arResult = await createVehicleARInvoice({
            module: 'light_vehicle',
            orderId: rentalData.id,
            orderNo: rentalData.id.substring(0, 8),
            customerId: formData.customer_id,
            totalAmount: priceAfterDiscount,
            advanceAmount: 0,
            companyId: selectedCompanyId,
            settings: settings,
            invoiceNo: invoiceNo,
            invoiceDate: invoicePayload.invoice_date,
          });
          
          if (arResult?.success) {
              console.log('AR Invoice generated successfully');
          }
      } else {
          console.warn('Missing AR GL accounts in system settings. AR Invoice not created.');
      }

      // 5. Generate PDF
      const htmlContent = generateLightVehicleRentalInvoiceHTML({
          invoiceNo: invoiceNo,
          invoiceDate: invoicePayload.invoice_date,
          customerCode: customer?.customer_code || 'N/A',
          customerName: customer?.customer_name || 'Unknown',
          allocatedCustomerName: formData.allocated_customer_name,
          sbu: formData.sbu,
          userName: formData.user_name,
          address: customer?.billing_address || '',
          mileage: formData.mileage,
          refNo: formData.ref_no,
          rentalPeriod: invoicePayload.rental_period,
          quoteNo: formData.quote_no,
          vehicleType: formData.vehicle_name,
          vehicleNo: formData.vehicle_number || '',
          rentAmount: rentAmount,
          fuelExpenses: fuelExp,
          gpsRental: gpsRent,
          discount: discountAmount,
          originalQuoteAmount: originalQuote,
          subTotal: subTotal,
          priceAfterDiscount: priceAfterDiscount,
          totalPaid: totalPaid,
          balanceDue: balanceDue,
      });

      const blob = await generatePDFFromHTML(htmlContent, {
          title: `Invoice_${invoiceNo}`,
      });
      
      if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice_${invoiceNo}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: "Rental agreement and invoice created successfully."
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
    <Card className="border-0 shadow-none">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 px-0">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Vehicle Details</h3>
                    <div className="space-y-2">
                    <Label htmlFor="vehicle_name">Vehicle Name / Model *</Label>
                    <Input id="vehicle_name" name="vehicle_name" required value={formData.vehicle_name} onChange={handleChange} placeholder="e.g. Toyota Aqua"/>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="vehicle_number">Vehicle Reg Number</Label>
                    <Input id="vehicle_number" name="vehicle_number" value={formData.vehicle_number} onChange={handleChange} placeholder="e.g. WP CAA-1234"/>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input id="mileage" name="mileage" value={formData.mileage} onChange={handleChange} placeholder="e.g. 50,000 km"/>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Customer Details</h3>
                    <div className="space-y-2">
                        <Label htmlFor="customer_id">Customer / Renter *</Label>
                        <select id="customer_id" name="customer_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required value={formData.customer_id} onChange={handleChange}>
                            <option value="">Select a Customer</option>
                            {customers?.map(c => (
                            <option key={c.id} value={c.id}>{c.customer_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="allocated_customer_name">Allocated Cu. Name</Label>
                        <Input id="allocated_customer_name" name="allocated_customer_name" value={formData.allocated_customer_name} onChange={handleChange} placeholder="e.g. Lyceum Rathnapura"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Agreement Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="start_date">Rental Start Date *</Label>
                        <Input type="date" id="start_date" name="start_date" required value={formData.start_date} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="next_billing_date">First Billing Date *</Label>
                        <Input type="date" id="next_billing_date" name="next_billing_date" required value={formData.next_billing_date} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="ref_no">Ref No</Label>
                        <Input id="ref_no" name="ref_no" value={formData.ref_no} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="quote_no">Quote No</Label>
                        <Input id="quote_no" name="quote_no" value={formData.quote_no} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="sbu">SBU</Label>
                        <Input id="sbu" name="sbu" value={formData.sbu} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="user_name">User / Sales Rep</Label>
                        <Input id="user_name" name="user_name" value={formData.user_name} onChange={handleChange} />
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Financial Details</h3>
                    <div className="space-y-2">
                        <Label htmlFor="monthly_rent_amount">Monthly Rent Amount (LKR) *</Label>
                        <Input type="number" step="0.01" min="0" id="monthly_rent_amount" name="monthly_rent_amount" required value={formData.monthly_rent_amount} onChange={handleChange} placeholder="0.00"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="fuel_expenses">Fuel Expenses (LKR)</Label>
                        <Input type="number" step="0.01" min="0" id="fuel_expenses" name="fuel_expenses" value={formData.fuel_expenses} onChange={handleChange} placeholder="0.00"/>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="gps_rental">GPS Rental (LKR)</Label>
                        <Input type="number" step="0.01" min="0" id="gps_rental" name="gps_rental" value={formData.gps_rental} onChange={handleChange} placeholder="0.00"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="discount">Discount (LKR)</Label>
                        <Input type="number" step="0.01" min="0" id="discount" name="discount" value={formData.discount} onChange={handleChange} placeholder="0.00"/>
                    </div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2 px-0 pb-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Save & Generate Invoice'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
