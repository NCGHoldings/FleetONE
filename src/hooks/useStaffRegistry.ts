import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SalaryType = 'monthly' | 'daily';
export type StaffType = 'driver' | 'conductor';

export interface StaffMember {
  id: string;
  profile_id: string | null;
  staff_name: string;
  staff_type: StaffType;
  salary_type: SalaryType;
  monthly_salary: number;
  daily_rate: number;
  contact_number: string | null;
  nic_number: string | null;
  emergency_contact: string | null;
  address: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffFormData {
  staff_name: string;
  staff_type: StaffType;
  salary_type: SalaryType;
  monthly_salary?: number;
  daily_rate?: number;
  contact_number?: string;
  nic_number?: string;
  emergency_contact?: string;
  address?: string;
  profile_id?: string;
  notes?: string;
  is_active?: boolean;
}

export function useStaffRegistry() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_registry')
        .select('*')
        .order('staff_name');

      if (error) throw error;
      setStaff((data || []) as StaffMember[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching staff registry:', err);
      setError(err.message);
      toast.error('Failed to load staff registry');
    } finally {
      setLoading(false);
    }
  };

  const addStaff = async (data: StaffFormData) => {
    try {
      const { error } = await supabase
        .from('staff_registry')
        .insert({
          staff_name: data.staff_name,
          staff_type: data.staff_type,
          salary_type: data.salary_type,
          monthly_salary: data.monthly_salary || 0,
          daily_rate: data.daily_rate || 0,
          contact_number: data.contact_number || null,
          nic_number: data.nic_number || null,
          emergency_contact: data.emergency_contact || null,
          address: data.address || null,
          profile_id: data.profile_id || null,
          notes: data.notes || null,
          is_active: data.is_active ?? true,
        });

      if (error) throw error;
      toast.success('Staff member added successfully');
      await fetchStaff();
      return true;
    } catch (err: any) {
      console.error('Error adding staff:', err);
      toast.error(err.message || 'Failed to add staff member');
      return false;
    }
  };

  const updateStaff = async (id: string, data: Partial<StaffFormData>) => {
    try {
      const { error } = await supabase
        .from('staff_registry')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Staff member updated successfully');
      await fetchStaff();
      return true;
    } catch (err: any) {
      console.error('Error updating staff:', err);
      toast.error(err.message || 'Failed to update staff member');
      return false;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_registry')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Staff member deleted successfully');
      await fetchStaff();
      return true;
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      toast.error(err.message || 'Failed to delete staff member');
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    return updateStaff(id, { is_active: isActive });
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return {
    staff,
    loading,
    error,
    fetchStaff,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleActive,
    drivers: staff.filter(s => s.staff_type === 'driver' && s.is_active),
    conductors: staff.filter(s => s.staff_type === 'conductor' && s.is_active),
  };
}
