import { useEffect } from 'react';
import { useSeasonalThemeContext } from './SeasonalThemeProvider';

export const ThemeStyleInjector = () => {
  const { activeTheme, isThemeActive } = useSeasonalThemeContext();

  useEffect(() => {
    if (!isThemeActive || !activeTheme) {
      // Remove custom theme variables
      document.documentElement.style.removeProperty('--theme-primary');
      document.documentElement.style.removeProperty('--theme-accent');
      document.documentElement.style.removeProperty('--theme-header-overlay');
      return;
    }

    const { colors } = activeTheme.theme_config;

    // Inject theme colors as CSS variables
    if (colors.primary) {
      document.documentElement.style.setProperty('--theme-primary', colors.primary);
    }
    if (colors.accent) {
      document.documentElement.style.setProperty('--theme-accent', colors.accent);
    }
    if (colors.headerOverlay) {
      document.documentElement.style.setProperty('--theme-header-overlay', colors.headerOverlay);
    }

    return () => {
      // Cleanup on unmount
      document.documentElement.style.removeProperty('--theme-primary');
      document.documentElement.style.removeProperty('--theme-accent');
      document.documentElement.style.removeProperty('--theme-header-overlay');
    };
  }, [activeTheme, isThemeActive]);

  return null;
};
