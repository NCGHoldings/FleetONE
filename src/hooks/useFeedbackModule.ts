import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeedbackLevel {
  id: string;
  level_number: number;
  level_name: string;
  description: string | null;
  color_code: string;
  icon: string;
  can_escalate_to: number | null;
  required_role: string | null;
  sla_days: number;
  is_active: boolean;
}

export interface FeedbackMeeting {
  id: string;
  meeting_date: string;
  meeting_time: string | null;
  level: number;
  meeting_type: string;
  title: string | null;
  conducted_by: string | null;
  conducted_by_name: string | null;
  attendees: any[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  summary: string | null;
  action_items: any[];
  previous_meeting_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackItem {
  id: string;
  item_number: number;
  meeting_id: string | null;
  feedback_complaint_id: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  raised_by_name: string | null;
  raised_by_staff_id: string | null;
  current_level: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  action_taken: string | null;
  resolution: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  escalation_reason: string | null;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

export interface FeedbackItemHistory {
  id: string;
  feedback_item_id: string;
  level: number;
  action_type: string;
  action_by: string | null;
  action_by_name: string | null;
  notes: string | null;
  previous_status: string | null;
  new_status: string | null;
  metadata: any;
  created_at: string;
}

// Fetch feedback levels
export function useFeedbackLevels() {
  return useQuery({
    queryKey: ['feedback-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number');
      
      if (error) throw error;
      return data as FeedbackLevel[];
    }
  });
}

// Fetch feedback meetings
export function useFeedbackMeetings(filters?: { level?: number; status?: string }) {
  return useQuery({
    queryKey: ['feedback-meetings', filters],
    queryFn: async () => {
      let query = supabase
        .from('feedback_meetings')
        .select('*')
        .order('meeting_date', { ascending: false });
      
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FeedbackMeeting[];
    }
  });
}

// Fetch feedback items
export function useFeedbackItems(filters?: { level?: number; status?: string; meetingId?: string }) {
  return useQuery({
    queryKey: ['feedback-items', filters],
    queryFn: async () => {
      let query = supabase
        .from('feedback_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.level) {
        query = query.eq('current_level', filters.level);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.meetingId) {
        query = query.eq('meeting_id', filters.meetingId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FeedbackItem[];
    }
  });
}

// Fetch item history
export function useFeedbackItemHistory(itemId: string) {
  return useQuery({
    queryKey: ['feedback-item-history', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_item_history')
        .select('*')
        .eq('feedback_item_id', itemId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as FeedbackItemHistory[];
    },
    enabled: !!itemId
  });
}

// Create meeting mutation
export function useCreateMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (meeting: Partial<FeedbackMeeting>) => {
      const { data, error } = await supabase
        .from('feedback_meetings')
        .insert(meeting as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-meetings'] });
      toast.success('Meeting created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create meeting: ' + error.message);
    }
  });
}

// Update meeting mutation
export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeedbackMeeting> & { id: string }) => {
      const { data, error } = await supabase
        .from('feedback_meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-meetings'] });
      toast.success('Meeting updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update meeting: ' + error.message);
    }
  });
}

// Create feedback item mutation
export function useCreateFeedbackItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Partial<FeedbackItem>) => {
      const { data, error } = await supabase
        .from('feedback_items')
        .insert(item as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create history entry
      await supabase.from('feedback_item_history').insert({
        feedback_item_id: data.id,
        level: item.current_level || 1,
        action_type: 'created',
        action_by_name: 'System',
        notes: 'Item created',
        new_status: 'pending'
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      toast.success('Feedback item added');
    },
    onError: (error) => {
      toast.error('Failed to add item: ' + error.message);
    }
  });
}

// Update feedback item mutation
export function useUpdateFeedbackItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, previousStatus, actionType, actionNotes, ...updates }: 
      Partial<FeedbackItem> & { id: string; previousStatus?: string; actionType?: string; actionNotes?: string }) => {
      const { data, error } = await supabase
        .from('feedback_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create history entry
      if (actionType) {
        await supabase.from('feedback_item_history').insert({
          feedback_item_id: id,
          level: updates.current_level || data.current_level,
          action_type: actionType,
          action_by_name: 'User',
          notes: actionNotes,
          previous_status: previousStatus,
          new_status: updates.status || data.status
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-item-history'] });
    },
    onError: (error) => {
      toast.error('Failed to update item: ' + error.message);
    }
  });
}

// Escalate item mutation
export function useEscalateFeedbackItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, currentLevel, reason }: { id: string; currentLevel: number; reason: string }) => {
      const newLevel = currentLevel + 1;
      
      const { data, error } = await supabase
        .from('feedback_items')
        .update({
          current_level: newLevel,
          status: 'escalated',
          escalation_reason: reason
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create history entry
      await supabase.from('feedback_item_history').insert({
        feedback_item_id: id,
        level: newLevel,
        action_type: 'escalated',
        action_by_name: 'User',
        notes: `Escalated to Level ${newLevel}: ${reason}`,
        previous_status: 'pending',
        new_status: 'escalated'
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-item-history'] });
      toast.success('Item escalated to next level');
    },
    onError: (error) => {
      toast.error('Failed to escalate: ' + error.message);
    }
  });
}

// Resolve item mutation
export function useResolveFeedbackItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      const { data, error } = await supabase
        .from('feedback_items')
        .update({
          status: 'resolved',
          resolution,
          resolved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create history entry
      await supabase.from('feedback_item_history').insert({
        feedback_item_id: id,
        level: data.current_level,
        action_type: 'resolved',
        action_by_name: 'User',
        notes: resolution,
        previous_status: 'pending',
        new_status: 'resolved'
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-item-history'] });
      toast.success('Item resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve: ' + error.message);
    }
  });
}

// Get statistics
export function useFeedbackStats() {
  return useQuery({
    queryKey: ['feedback-stats'],
    queryFn: async () => {
      const [itemsRes, meetingsRes] = await Promise.all([
        supabase.from('feedback_items').select('*'),
        supabase.from('feedback_meetings').select('*')
      ]);
      
      const items = itemsRes.data || [];
      const meetings = meetingsRes.data || [];
      
      const totalItems = items.length;
      const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
      const resolvedItems = items.filter(i => i.status === 'resolved').length;
      const escalatedItems = items.filter(i => i.status === 'escalated').length;
      
      const itemsByLevel: Record<number, { pending: number; resolved: number; total: number }> = {};
      items.forEach(item => {
        if (!itemsByLevel[item.current_level]) {
          itemsByLevel[item.current_level] = { pending: 0, resolved: 0, total: 0 };
        }
        itemsByLevel[item.current_level].total++;
        if (item.status === 'resolved') {
          itemsByLevel[item.current_level].resolved++;
        } else {
          itemsByLevel[item.current_level].pending++;
        }
      });
      
      const completedMeetings = meetings.filter(m => m.status === 'completed').length;
      const scheduledMeetings = meetings.filter(m => m.status === 'scheduled').length;
      
      return {
        totalItems,
        pendingItems,
        resolvedItems,
        escalatedItems,
        resolutionRate: totalItems > 0 ? Math.round((resolvedItems / totalItems) * 100) : 0,
        itemsByLevel,
        totalMeetings: meetings.length,
        completedMeetings,
        scheduledMeetings
      };
    }
  });
}
