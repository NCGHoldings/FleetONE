import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { buildSpecialHireQuotationBankSnapshot, SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS } from '@/lib/special-hire-bank-details';

interface SpecialHireQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  drop_location: string;
  gross_revenue: number;
  hire_type: string;
  number_of_buses: number;
}

interface SpecialHireQuotationRepeatModalProps {
  quotation: SpecialHireQuotation | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SpecialHireQuotationRepeatModal({
  quotation,
  open,
  onClose,
  onSuccess,
}: SpecialHireQuotationRepeatModalProps) {
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;

  const handleRepeat = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      // Fetch the COMPLETE quotation data from database to get ALL fields
      const { data: fullQuotation, error: fetchError } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', quotation.id)
        .single();

      if (fetchError || !fullQuotation) {
        throw new Error('Failed to fetch quotation details');
      }

      // Fetch current bank details for new quotations (don't copy old bank snapshot)
      let bankSnapshot = { ...SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS };
      if (effectiveCompanyId) {
        const { data: finSettings } = await supabase
          .from('special_hire_finance_settings')
          .select('quotation_bank_name, quotation_account_name, quotation_account_no')
          .eq('company_id', effectiveCompanyId)
          .limit(1)
          .maybeSingle();

        bankSnapshot = buildSpecialHireQuotationBankSnapshot(finSettings);
      }

      // Create quotations one by one to get unique quotation numbers from DB sequence
      const createdQuotationNos: string[] = [];
      
      for (let i = 0; i < numberOfCopies; i++) {
        // Copy ALL relevant fields from the original quotation
        // NOTE: quotation_no is NOT included - database default will auto-generate it
        const duplicateData = {
          // Status and version for new quotation
          status: 'draft',
          version_number: '1.0',
          is_active_version: true,
          created_by: user.id,
          parent_quotation_id: null, // This is a new quotation, not a version
          
          // Customer information
          customer_name: fullQuotation.customer_name,
          customer_phone: fullQuotation.customer_phone,
          customer_email: fullQuotation.customer_email,
          company_name: fullQuotation.company_name,
          
          // Route details
          pickup_location: fullQuotation.pickup_location,
          pickup_lat: fullQuotation.pickup_lat,
          pickup_lng: fullQuotation.pickup_lng,
          drop_location: fullQuotation.drop_location,
          drop_lat: fullQuotation.drop_lat,
          drop_lng: fullQuotation.drop_lng,
          intermediate_stops: fullQuotation.intermediate_stops,
          parking_location_id: fullQuotation.parking_location_id,
          uses_multi_parking: fullQuotation.uses_multi_parking,
          
          // Trip details
          hire_type: fullQuotation.hire_type,
          number_of_buses: fullQuotation.number_of_buses,
          number_of_passengers: fullQuotation.number_of_passengers,
          bus_type_id: fullQuotation.bus_type_id,
          bus_fleet_details: fullQuotation.bus_fleet_details,
          
          // Dates
          pickup_datetime: fullQuotation.pickup_datetime,
          drop_datetime: fullQuotation.drop_datetime,
          valid_until: fullQuotation.valid_until,
          
          // Distance and pricing
          km_parking_to_pickup: fullQuotation.km_parking_to_pickup,
          km_trip: fullQuotation.km_trip,
          km_drop_to_parking: fullQuotation.km_drop_to_parking,
          fuel_cost_fuel_only: fullQuotation.fuel_cost_fuel_only,
          hire_charge: fullQuotation.hire_charge,
          extra_charges: fullQuotation.extra_charges,
          gross_revenue: fullQuotation.gross_revenue,
          driver_charge: fullQuotation.driver_charge,
          other_expenses: fullQuotation.other_expenses,
          total_expenses: fullQuotation.total_expenses,
          net_profit: fullQuotation.net_profit,
          percentage_adjustment: fullQuotation.percentage_adjustment,
          
          // Commission
          commission_pct: fullQuotation.commission_pct,
          commission_amount: fullQuotation.commission_amount,
          commission_pass_through_pct: fullQuotation.commission_pass_through_pct,
          commission_pass_through_amount: fullQuotation.commission_pass_through_amount,
          referral_agent_id: fullQuotation.referral_agent_id,
          referral_commission_pct: fullQuotation.referral_commission_pct,
          referral_commission_amount: fullQuotation.referral_commission_amount,
          
          // Discounts
          discount_percentage: fullQuotation.discount_percentage,
          discount_type: fullQuotation.discount_type,
          discount_amount_lkr: fullQuotation.discount_amount_lkr,
          
          // Additional charges and options
          additional_charges: fullQuotation.additional_charges,
          total_additional_charges: fullQuotation.total_additional_charges,
          customer_total_with_fuel: fullQuotation.customer_total_with_fuel,
          special_request: fullQuotation.special_request,
          overtime_charge: fullQuotation.overtime_charge,
          overnight_charge: fullQuotation.overnight_charge,
          fixed_rate: fullQuotation.fixed_rate,
          exceeding_distance_charge: fullQuotation.exceeding_distance_charge,
          
          // Reset fields that shouldn't be copied
          trip_id: null,
          approval_status: 'pending' as const,
          approved_by: null,
          approval_date: null,
          approval_comments: null,
          advance_paid: 0,
          balance_due: fullQuotation.gross_revenue || 0,
          total_paid: 0,
          assigned_driver_name: null,
          assigned_conductor_name: null,
          assigned_bus_no: null,
          trip_status: null,
          cancellation_reason: null,
          status_changed_by: null,
          status_changed_at: null,
          refund_amount: null,
          refund_reason: null,
          refund_processed_at: null,
          refund_processed_by: null,
          submission_id: null,
          sent_via_whatsapp: null,
          whatsapp_sent_at: null,
          finance_customer_id: null,
          ar_invoice_id: null,
          audit_log: [{
            action: 'DUPLICATE',
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            source_quotation_no: fullQuotation.quotation_no
          }],
          // Use current bank details, not old snapshot
          ...bankSnapshot,
        };

        // Insert WITHOUT quotation_no - let database sequence generate it
        const { data, error } = await supabase
          .from('special_hire_quotations')
          .insert([duplicateData])
          .select('quotation_no')
          .single();

        if (error) throw error;
        if (data?.quotation_no) {
          createdQuotationNos.push(data.quotation_no);
        }
      }

      // Show actual generated quotation numbers
      const quotationsList = createdQuotationNos.join(', ');
      toast.success(`Created: ${quotationsList}`);

      onSuccess();
      onClose();
      setNumberOfCopies(1);
    } catch (error: any) {
      console.error('Error duplicating quotation:', error);
      toast.error("Failed to create quotations", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Quotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Quotation:</span>
              <span className="font-medium">{quotation.quotation_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{quotation.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Route:</span>
              <span className="font-medium text-right max-w-[200px] truncate">
                {quotation.pickup_location} → {quotation.drop_location}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hire Type:</span>
              <span className="font-medium">{quotation.hire_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Revenue:</span>
              <span className="font-medium">LKR {quotation.gross_revenue?.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="copies">Number of Copies</Label>
            <Input
              id="copies"
              type="number"
              min={1}
              max={20}
              value={numberOfCopies}
              onChange={(e) => setNumberOfCopies(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="mt-2"
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">This will create {numberOfCopies} new quotation{numberOfCopies > 1 ? 's' : ''} with:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Same customer details</li>
              <li>Same route and stops</li>
              <li>Same pricing and commission</li>
              <li>Same bus type and fleet details</li>
              <li>New unique quotation numbers</li>
              <li>Status set to "Draft"</li>
              <li>Payment/Trip fields reset</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRepeat} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Create {numberOfCopies} Quotation{numberOfCopies > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
