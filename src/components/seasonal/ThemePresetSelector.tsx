import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { ThemeConfig } from '@/hooks/useSeasonalTheme';

interface ThemePreset {
  id: string;
  preset_name: string;
  category: string;
  theme_config: ThemeConfig;
  preview_image_url?: string;
  is_system_preset: boolean;
}

interface ThemePresetSelectorProps {
  selectedPresetId?: string;
  onSelect: (preset: ThemePreset) => void;
}

export const ThemePresetSelector = ({ selectedPresetId, onSelect }: ThemePresetSelectorProps) => {
  const { data: presets, isLoading } = useQuery({
    queryKey: ['theme-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_presets')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as unknown as ThemePreset[];
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading presets...</div>;
  }

  const categoryColors: Record<string, string> = {
    christmas: 'from-red-500 to-green-600',
    halloween: 'from-orange-500 to-purple-600',
    new_year: 'from-yellow-400 to-blue-500',
    diwali: 'from-orange-600 to-purple-500',
    valentines: 'from-pink-400 to-red-500',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {presets?.map((preset) => (
        <Card
          key={preset.id}
          className={`relative p-4 cursor-pointer transition-all hover:scale-105 ${
            selectedPresetId === preset.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSelect(preset)}
        >
          {selectedPresetId === preset.id && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}

          <div
            className={`w-full h-24 rounded-md bg-gradient-to-br ${
              categoryColors[preset.category] || 'from-gray-300 to-gray-500'
            } mb-3 flex items-center justify-center text-4xl`}
          >
            {preset.theme_config.decorations.logoOverlay || '🎨'}
          </div>

          <h4 className="font-semibold text-sm mb-1">{preset.preset_name}</h4>
          <p className="text-xs text-muted-foreground capitalize">{preset.category}</p>
        </Card>
      ))}
    </div>
  );
};
