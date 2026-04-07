import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  days_requested: number;
  status: LeaveStatus;
  organization_id: string;
  created_by: string;
  created_at: string;
  // Joined profile data
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export function useLeaveRequests() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  
  // You would typically get this from a CompanyContext or similar
  // For now, we simulate multi-company by getting it from the user's profile
  // or fetching globally if super_admin.
  
  const fetchLeaveRequests = async (): Promise<LeaveRequest[]> => {
    // Basic fetch - in a real app, you'd filter by organization_id
    const { data, error } = await (supabase as any)
      .from('leave_requests')
      .select(`
        *,
        profiles:created_by(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching leave requests:", error);
      throw error;
    }

    return (data || []) as LeaveRequest[];
  };

  const { data: leaveRequests, isLoading, error } = useQuery({
    queryKey: ['leave_requests'],
    queryFn: fetchLeaveRequests,
    enabled: !!session,
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeaveStatus }) => {
      const { data, error } = await (supabase as any)
        .from('leave_requests')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      toast.success(`Leave request ${variables.status} successfully`);
    },
    onError: (error) => {
      console.error("Error updating leave request:", error);
      toast.error("Failed to update leave request status");
    }
  });

  return {
    leaveRequests,
    isLoading,
    error,
    approveRequest: (id: string) => updateLeaveStatus.mutate({ id, status: 'approved' }),
    rejectRequest: (id: string) => updateLeaveStatus.mutate({ id, status: 'rejected' }),
    isUpdating: updateLeaveStatus.isPending
  };
}
