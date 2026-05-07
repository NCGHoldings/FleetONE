import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: string[];
  userProfile: any;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isAuthenticated: boolean;
  mfaFactors: any[];
  aal: "aal1" | "aal2" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [aal, setAal] = useState<"aal1" | "aal2" | null>(null);
  

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      setUserProfile(profile);

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return;
      }

      const rolesList = roles?.map(r => r.role) || [];
      setUserRoles(rolesList);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchMFAFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data.totp || []);
    } catch (err) {
      console.error("Error fetching MFA factors:", err);
    }
  };

  const fetchAAL = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      setAal(data.currentLevel as any);
    } catch (err) {
      console.error("Error fetching AAL:", err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
            fetchMFAFactors();
            fetchAAL();
          }, 0);
        } else {
          setUserProfile(null);
          setUserRoles([]);
          setMfaFactors([]);
          setAal(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
          fetchMFAFactors();
          fetchAAL();
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast.error("There was a problem signing out. Please try again.");
      } else {
        toast.success("You have been successfully signed out.");
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
  };

  const hasRole = (role: string): boolean => {
    return userRoles.includes(role);
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    session,
    loading,
    userRoles,
    userProfile,
    signOut,
    hasRole,
    isAuthenticated,
    mfaFactors,
    aal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}