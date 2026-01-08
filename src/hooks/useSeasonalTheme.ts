import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeConfig {
  colors: {
    primary: string;
    accent: string;
    headerOverlay?: string;
    [key: string]: string | undefined;
  };
  animations: {
    type: 'none' | 'snowflakes' | 'pumpkins' | 'fireworks' | 'diyas' | 'hearts';
    density: 'low' | 'medium' | 'high';
    color?: string;
  };
  decorations: {
    logoOverlay?: string | null;
    backgroundPattern?: string | null;
  };
  greeting?: string | null;
}

export interface SeasonalTheme {
  id: string;
  season_name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_enabled: boolean;
  is_active: boolean;
  priority: number;
  theme_config: ThemeConfig;
  preview_image_url?: string;
  created_at: string;
  updated_at: string;
}

export const useSeasonalTheme = () => {
  const [activeTheme, setActiveTheme] = useState<SeasonalTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [masterEnabled, setMasterEnabled] = useState(true);

  const fetchActiveTheme = async () => {
    try {
      // Call the function to update active status first
      await supabase.rpc('update_active_seasonal_themes');

      // Fetch the highest priority active theme
      const { data, error } = await supabase
        .from('seasonal_themes')
        .select('*')
        .eq('is_active', true)
        .eq('is_enabled', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setActiveTheme(data as unknown as SeasonalTheme | null);
      
      // Cache in localStorage
      if (data) {
        localStorage.setItem('seasonal_theme', JSON.stringify(data));
        localStorage.setItem('seasonal_theme_timestamp', Date.now().toString());
      } else {
        localStorage.removeItem('seasonal_theme');
      }
    } catch (error) {
      console.error('Error fetching seasonal theme:', error);
      
      // Try to load from cache if fetch fails
      const cached = localStorage.getItem('seasonal_theme');
      const timestamp = localStorage.getItem('seasonal_theme_timestamp');
      
      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        // Use cache if less than 1 hour old
        if (cacheAge < 3600000) {
          setActiveTheme(JSON.parse(cached));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load master switch state
    const stored = localStorage.getItem('seasonal_themes_enabled');
    if (stored !== null) {
      setMasterEnabled(stored === 'true');
    }

    fetchActiveTheme();

    // Set up real-time subscription for theme changes
    const channel = supabase
      .channel('seasonal_themes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seasonal_themes'
        },
        () => {
          fetchActiveTheme();
        }
      )
      .subscribe();

    // Check for theme changes every hour
    const interval = setInterval(fetchActiveTheme, 3600000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const toggleMasterSwitch = (enabled: boolean) => {
    setMasterEnabled(enabled);
    localStorage.setItem('seasonal_themes_enabled', enabled.toString());
  };

  const isThemeActive = masterEnabled && activeTheme !== null;

  return {
    activeTheme: isThemeActive ? activeTheme : null,
    isLoading,
    isThemeActive,
    masterEnabled,
    toggleMasterSwitch,
    refetch: fetchActiveTheme,
  };
};
