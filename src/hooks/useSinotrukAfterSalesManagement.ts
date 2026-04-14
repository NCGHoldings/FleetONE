// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Interface definitions
export interface SinotrukWarranty {
  id: string;
  order_id: string;
  warranty_number: string;
  warranty_type: string;
  coverage_details?: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  mileage_limit_km?: number;
  status: 'active' | 'expired' | 'claimed' | 'void';
  terms_and_conditions?: string;
  exclusions?: string;
  claim_process?: string;
  service_provider?: string;
  contact_information?: any;
  warranty_certificate_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SinotrukServiceReminder {
  id: string;
  order_id: string;
  warranty_id?: string;
  reminder_type: string;
  due_date: string;
  due_mileage_km?: number;
  service_description?: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  customer_contacted: boolean;
  customer_contacted_at?: string;
  service_booked: boolean;
  service_booked_at?: string;
  service_completed: boolean;
  service_completed_at?: string;
  next_reminder_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SinotrukSupportTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  order_id?: string;
  warranty_id?: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
  assigned_to?: string;
  assigned_to_name?: string;
  customer_contact_email?: string;
  customer_contact_phone?: string;
  resolution?: string;
  resolution_time_hours?: number;
  customer_satisfaction_rating?: number;
  attachments: any[];
  internal_notes?: string;
  customer_notes?: string;
  escalated: boolean;
  escalated_to?: string;
  escalated_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SinotrukCustomerFeedback {
  id: string;
  customer_id: string;
  order_id?: string;
  feedback_type: string;
  overall_rating: '1' | '2' | '3' | '4' | '5';
  product_quality_rating?: '1' | '2' | '3' | '4' | '5';
  delivery_experience_rating?: '1' | '2' | '3' | '4' | '5';
  customer_service_rating?: '1' | '2' | '3' | '4' | '5';
  value_for_money_rating?: '1' | '2' | '3' | '4' | '5';
  likelihood_to_recommend: number;
  comments?: string;
  positive_aspects?: string;
  areas_for_improvement?: string;
  would_purchase_again?: boolean;
  feedback_channel?: string;
  responded_to: boolean;
  response_date?: string;
  response_notes?: string;
  follow_up_required: boolean;
  follow_up_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useSinotrukAfterSalesManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Warranty Management
  const createWarranty = async (warrantyData: Partial<SinotrukWarranty>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_warranties')
        .insert(warrantyData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Warranty created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating warranty:', error);
      toast({
        title: "Error",
        description: "Failed to create warranty",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateWarrantyStatus = async (warrantyId: string, status: 'active' | 'expired' | 'claimed' | 'void') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_warranties')
        .update({ status })
        .eq('id', warrantyId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Warranty status updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating warranty status:', error);
      toast({
        title: "Error",
        description: "Failed to update warranty status",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getWarranties = async (orderId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sinotruck_warranties')
        .select(`
          *,
          sinotruck_orders!inner(
            order_no,
            sinotruck_customers!inner(
              customer_name,
              contact_person,
              email,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching warranties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch warranties",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Service Reminders
  const createServiceReminder = async (reminderData: Partial<SinotrukServiceReminder>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_service_reminders')
        .insert(reminderData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service reminder created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating service reminder:', error);
      toast({
        title: "Error",
        description: "Failed to create service reminder",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateReminderStatus = async (reminderId: string, updates: Partial<SinotrukServiceReminder>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_service_reminders')
        .update(updates)
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service reminder updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating service reminder:', error);
      toast({
        title: "Error",
        description: "Failed to update service reminder",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceReminders = async (orderId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sinotruck_service_reminders')
        .select('*')
        .order('due_date', { ascending: true });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching service reminders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch service reminders",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Support Tickets
  const createSupportTicket = async (ticketData: Partial<SinotrukSupportTicket>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_support_tickets')
        .insert(ticketData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string, additionalData?: any) => {
    setIsLoading(true);
    try {
      const updateData = { status, ...additionalData };
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('sinotruck_support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getSupportTickets = async (customerId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sinotruck_support_tickets')
        .select(`
          *,
          sinotruck_customers!inner(
            customer_name,
            contact_person,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch support tickets",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Customer Feedback
  const createCustomerFeedback = async (feedbackData: Partial<SinotrukCustomerFeedback>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_customer_feedback')
        .insert(feedbackData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer feedback recorded successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating customer feedback:', error);
      toast({
        title: "Error",
        description: "Failed to record customer feedback",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const respondToFeedback = async (feedbackId: string, responseNotes: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_customer_feedback')
        .update({
          responded_to: true,
          response_date: new Date().toISOString(),
          response_notes: responseNotes,
        })
        .eq('id', feedbackId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Response to feedback recorded successfully",
      });

      return data;
    } catch (error) {
      console.error('Error responding to feedback:', error);
      toast({
        title: "Error",
        description: "Failed to record response",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerFeedback = async (customerId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sinotruck_customer_feedback')
        .select(`
          *,
          sinotruck_customers!inner(
            customer_name,
            contact_person,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching customer feedback:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer feedback",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    // Warranty Management
    createWarranty,
    updateWarrantyStatus,
    getWarranties,
    // Service Reminders
    createServiceReminder,
    updateReminderStatus,
    getServiceReminders,
    // Support Tickets
    createSupportTicket,
    updateTicketStatus,
    getSupportTickets,
    // Customer Feedback
    createCustomerFeedback,
    respondToFeedback,
    getCustomerFeedback,
  };
}