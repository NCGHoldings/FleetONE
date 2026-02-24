import { createContext, useContext, ReactNode } from 'react';
import { useSeasonalTheme, SeasonalTheme } from '@/hooks/useSeasonalTheme';

interface SeasonalThemeContextType {
  activeTheme: SeasonalTheme | null;
  isLoading: boolean;
  isThemeActive: boolean;
  masterEnabled: boolean;
  toggleMasterSwitch: (enabled: boolean) => void;
  refetch: () => Promise<void>;
}

const SeasonalThemeContext = createContext<SeasonalThemeContextType | undefined>(undefined);

export const SeasonalThemeProvider = ({ children }: { children: ReactNode }) => {
  const themeData = useSeasonalTheme();

  return (
    <SeasonalThemeContext.Provider value={themeData}>
      {children}
    </SeasonalThemeContext.Provider>
  );
};

export const useSeasonalThemeContext = () => {
  const context = useContext(SeasonalThemeContext);
  if (context === undefined) {
    throw new Error('useSeasonalThemeContext must be used within a SeasonalThemeProvider');
  }
  return context;
};
