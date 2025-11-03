import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdvanceDetailsData } from '@/lib/advance-details-generator';

export interface AdvanceDetailsRecord extends AdvanceDetailsData {
  id: string;
  quotationId: string;
  paymentId?: string;
  status: 'draft' | 'completed' | 'void';
  pdfDocumentData?: string;
  pdfGeneratedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function useAdvanceDetails() {
  const [loading, setLoading] = useState(false);

  const fetchAdvanceDetails = async (quotationId: string): Promise<AdvanceDetailsRecord | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('special_hire_advance_details')
        .select('*')
        .eq('quotation_id', quotationId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        quotationId: data.quotation_id,
        paymentId: data.payment_id,
        quotationNo: data.quotation_no,
        hireDate: new Date(data.hire_date),
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        numberOfDays: data.number_of_days,
        driverName: data.driver_name,
        driverContact: data.driver_contact,
        driverMealAllowance: parseFloat(data.driver_meal_allowance?.toString() || '0'),
        driverSalary: parseFloat(data.driver_salary?.toString() || '0'),
        driverHighwayCharges: parseFloat(data.driver_highway_charges?.toString() || '0'),
        driverOtherCharges: parseFloat(data.driver_other_charges?.toString() || '0'),
        driverSignature: data.driver_signature_data ? {
          data: data.driver_signature_data,
          type: data.driver_signature_type,
        } : undefined,
        conductorName: data.conductor_name,
        conductorContact: data.conductor_contact,
        conductorMealAllowance: parseFloat(data.conductor_meal_allowance?.toString() || '0'),
        conductorSalary: parseFloat(data.conductor_salary?.toString() || '0'),
        conductorSignature: data.conductor_signature_data ? {
          data: data.conductor_signature_data,
          type: data.conductor_signature_type,
        } : undefined,
        preparedBy: data.prepared_by_name,
        preparedBySignature: data.prepared_by_signature_data ? {
          data: data.prepared_by_signature_data,
          type: data.prepared_by_signature_type,
        } : undefined,
        checkedBy: data.checked_by_name,
        checkedBySignature: data.checked_by_signature_data ? {
          data: data.checked_by_signature_data,
          type: data.checked_by_signature_type,
        } : undefined,
        authorizedBy: data.authorized_by_name,
        authorizedBySignature: data.authorized_by_signature_data ? {
          data: data.authorized_by_signature_data,
          type: data.authorized_by_signature_type,
        } : undefined,
        totalAmount: parseFloat(data.total_amount?.toString() || '0'),
        notes: data.notes,
        status: data.status as 'draft' | 'completed' | 'void',
        pdfDocumentData: data.pdf_document_data,
        pdfGeneratedAt: data.pdf_generated_at,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching advance details:', error);
      toast.error('Failed to fetch advance details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveAdvanceDetails = async (
    data: Partial<AdvanceDetailsData> & { 
      quotationId: string; 
      paymentId?: string;
      id?: string;
      status?: 'draft' | 'completed';
      pdfDocumentData?: string;
    }
  ): Promise<{ success: boolean; id?: string }> => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const recordData = {
        quotation_id: data.quotationId,
        payment_id: data.paymentId,
        quotation_no: data.quotationNo,
        hire_date: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
        pickup_location: data.pickupLocation,
        drop_location: data.dropLocation,
        number_of_days: data.numberOfDays,
        driver_name: data.driverName,
        driver_contact: data.driverContact,
        driver_meal_allowance: data.driverMealAllowance,
        driver_salary: data.driverSalary,
        driver_highway_charges: data.driverHighwayCharges,
        driver_other_charges: data.driverOtherCharges,
        driver_signature_data: data.driverSignature?.data,
        driver_signature_type: data.driverSignature?.type,
        conductor_name: data.conductorName,
        conductor_contact: data.conductorContact,
        conductor_meal_allowance: data.conductorMealAllowance || 0,
        conductor_salary: data.conductorSalary || 0,
        conductor_signature_data: data.conductorSignature?.data,
        conductor_signature_type: data.conductorSignature?.type,
        prepared_by_name: data.preparedBy,
        prepared_by_signature_data: data.preparedBySignature?.data,
        prepared_by_signature_type: data.preparedBySignature?.type,
        checked_by_name: data.checkedBy,
        checked_by_signature_data: data.checkedBySignature?.data,
        checked_by_signature_type: data.checkedBySignature?.type,
        authorized_by_name: data.authorizedBy,
        authorized_by_signature_data: data.authorizedBySignature?.data,
        authorized_by_signature_type: data.authorizedBySignature?.type,
        total_amount: data.totalAmount,
        notes: data.notes,
        status: data.status || 'draft',
        pdf_document_data: data.pdfDocumentData,
        pdf_generated_at: data.pdfDocumentData ? new Date().toISOString() : null,
        created_by: user?.id,
      };

      let result;
      if (data.id) {
        // Update existing
        result = await supabase
          .from('special_hire_advance_details')
          .update(recordData)
          .eq('id', data.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('special_hire_advance_details')
          .insert(recordData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast.success(data.id ? 'Advance details updated successfully' : 'Advance details saved successfully');
      return { success: true, id: result.data.id };
    } catch (error) {
      console.error('Error saving advance details:', error);
      toast.error('Failed to save advance details');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const deleteAdvanceDetails = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('special_hire_advance_details')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Advance details deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting advance details:', error);
      toast.error('Failed to delete advance details');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchAdvanceDetails,
    saveAdvanceDetails,
    deleteAdvanceDetails,
  };
}
