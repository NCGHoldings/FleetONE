import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateIndentationCSS, 
  IndentationSettings, 
  DEFAULT_INDENTATION,
  RomanNumeralSettings,
  DEFAULT_ROMAN_NUMERALS,
  LetterListSettings,
  DEFAULT_LETTER_LIST
} from '@/utils/indentationCSSGenerator';

// Re-export types from centralized generator
export type { IndentationSettings, RomanNumeralSettings, LetterListSettings };
export { DEFAULT_INDENTATION, DEFAULT_ROMAN_NUMERALS, DEFAULT_LETTER_LIST };

export function useSystemSettings() {
  const queryClient = useQueryClient();

  // Fetch indentation settings
  const { data: indentationSettings, isLoading } = useQuery({
    queryKey: ['system-settings', 'hierarchical_indentation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'hierarchical_indentation')
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        return DEFAULT_INDENTATION;
      }

      return (data?.setting_value as unknown as IndentationSettings) || DEFAULT_INDENTATION;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update indentation settings
  const updateIndentation = useMutation({
    mutationFn: async (newSettings: IndentationSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: newSettings as unknown as any,
          updated_by: user?.id 
        })
        .eq('setting_key', 'hierarchical_indentation');

      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Indentation settings updated successfully');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Failed to update indentation settings');
    },
  });

  // Use centralized CSS generator
  const generateCSS = (settings: IndentationSettings = indentationSettings || DEFAULT_INDENTATION) => {
    return generateIndentationCSS(settings);
  };

  return {
    indentationSettings: indentationSettings || DEFAULT_INDENTATION,
    isLoading,
    updateIndentation: updateIndentation.mutate,
    isUpdating: updateIndentation.isPending,
    generateCSS,
  };
}
