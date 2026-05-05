import React, { createContext, useContext, useState, useEffect } from 'react';
import { createAnonymousClient } from '@/integrations/supabase/public-client';

interface CrewMember {
  id: string;
  staff_name: string;
  staff_type: string;
  nic_number: string | null;
  contact_number: string | null;
}

interface CrewAuthContextType {
  crewMember: CrewMember | null;
  isAuthenticated: boolean;
  login: (nic: string, phone: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const CrewAuthContext = createContext<CrewAuthContextType | undefined>(undefined);

export const CrewAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crewMember, setCrewMember] = useState<CrewMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for an existing session on mount
    const savedSession = localStorage.getItem('crew_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setCrewMember(parsed);
      } catch (e) {
        localStorage.removeItem('crew_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (nic: string, phone: string): Promise<boolean> => {
    try {
      const supabase = createAnonymousClient();
      
      // Look up the staff member in the staff_registry
      const { data, error } = await supabase
        .from('staff_registry')
        .select('id, staff_name, staff_type, nic_number, contact_number')
        .eq('nic_number', nic.trim())
        .eq('contact_number', phone.trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return false;
      }

      setCrewMember(data);
      localStorage.setItem('crew_session', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Crew login error:', error);
      return false;
    }
  };

  const logout = () => {
    setCrewMember(null);
    localStorage.removeItem('crew_session');
    localStorage.removeItem('app_mode');
  };

  return (
    <CrewAuthContext.Provider value={{ crewMember, isAuthenticated: !!crewMember, login, logout, isLoading }}>
      {children}
    </CrewAuthContext.Provider>
  );
};

export const useCrewAuth = () => {
  const context = useContext(CrewAuthContext);
  if (context === undefined) {
    throw new Error('useCrewAuth must be used within a CrewAuthProvider');
  }
  return context;
};
