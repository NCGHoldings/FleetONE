import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useScheduleGovernance = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const generateSchedule = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('schedule-governance-items', {
        body: {}
      });

      if (error) {
        console.error('Error generating schedule:', error);
        toast.error('Failed to generate schedule', {
          description: error.message || 'Please try again or contact support.'
        });
        return false;
      }

      const result = data as { success: boolean; message: string; scheduled_count?: number };
      
      if (result.success) {
        toast.success('Schedule generated successfully!', {
          description: result.scheduled_count 
            ? `Generated ${result.scheduled_count} occurrences`
            : result.message
        });
        
        // Invalidate and refetch occurrences
        await queryClient.invalidateQueries({ queryKey: ['governance-occurrences'] });
        
        return true;
      } else {
        toast.error('Failed to generate schedule', {
          description: result.message
        });
        return false;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error occurred', {
        description: 'Please try again later.'
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateSchedule,
    isGenerating
  };
};
