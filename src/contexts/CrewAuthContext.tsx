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
  login: (nic: string) => Promise<boolean>;
  register: (fullName: string, callingName: string, nic: string, phone: string, staffType: string, salaryType: string, employmentType: string, assignedBus: string) => Promise<{success: boolean, error?: string}>;
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

  const login = async (nic: string): Promise<boolean> => {
    try {
      const supabase = createAnonymousClient();
      
      // Look up the staff member using the secure RPC
      const { data, error } = await supabase.rpc('login_crew_member', {
        p_nic_number: nic.trim()
      });

      if (error || !data || data.length === 0) {
        console.error('Crew login error from RPC:', error || 'No data found');
        return false;
      }

      const crewData = data[0];
      
      if (crewData.is_active === false) {
        console.error('Account is inactive');
        return false;
      }

      setCrewMember(crewData);
      localStorage.setItem('crew_session', JSON.stringify(crewData));
      return true;
    } catch (error) {
      console.error('Crew login error:', error);
      return false;
    }
  };

  const register = async (fullName: string, callingName: string, nic: string, phone: string, staffType: string, salaryType: string, employmentType: string, assignedBus: string) => {
    try {
      const supabase = createAnonymousClient();
      
      const { data, error } = await supabase.rpc('register_crew_member', {
        p_full_name: fullName,
        p_calling_name: callingName,
        p_nic_number: nic,
        p_contact_number: phone,
        p_pin_code: '0000', // Default PIN since it's no longer asked in UI
        p_staff_type: staffType,
        p_salary_type: salaryType,
        p_employment_type: employmentType,
        p_assigned_bus: '' // Bypass backend strict bus existence check
      });

      if (error) throw error;
      
      if (data && data.success) {
        // Now that the user is registered without the validation blocking them, 
        // try to update the bus number directly
        if (assignedBus) {
          try {
            await supabase
              .from('staff_registry')
              .update({ assigned_bus: assignedBus })
              .eq('id', data.data.id);
          } catch (e) {
            console.error('Failed to forcefully update assigned bus', e);
          }
        }
        
        setCrewMember(data.data);
        localStorage.setItem('crew_session', JSON.stringify(data.data));
        return { success: true };
      } else {
        return { success: false, error: data?.error || 'Registration failed' };
      }
    } catch (error: any) {
      console.error('Crew registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setCrewMember(null);
    localStorage.removeItem('crew_session');
    localStorage.removeItem('app_mode');
  };

  return (
    <CrewAuthContext.Provider value={{ crewMember, isAuthenticated: !!crewMember, login, register, logout, isLoading }}>
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
