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
  

  const CACHE_KEY_PROFILE = 'ncg_user_profile_cache';
  const CACHE_KEY_ROLES = 'ncg_user_roles_cache';

  const fetchUserProfile = async (userId: string) => {
    try {
      // 1. Try to load from cache first so UI is immediately responsive offline
      try {
        const cachedProfile = localStorage.getItem(`${CACHE_KEY_PROFILE}_${userId}`);
        const cachedRoles = localStorage.getItem(`${CACHE_KEY_ROLES}_${userId}`);
        if (cachedProfile) setUserProfile(JSON.parse(cachedProfile));
        if (cachedRoles) setUserRoles(JSON.parse(cachedRoles));
      } catch (cacheErr) {
        console.warn('Cache read error', cacheErr);
      }

      // 5-second timeout to fail fast if Supabase is unreachable
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Auth fetch timeout")), 30000);
      });

      // 2. Fetch fresh profile
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const profileResponse = await Promise.race([profilePromise, timeoutPromise]) as any;
      const { data: profile, error: profileError } = profileResponse;

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      } else if (profile) {
        setUserProfile(profile);
        localStorage.setItem(`${CACHE_KEY_PROFILE}_${userId}`, JSON.stringify(profile));
      }

      // 3. Fetch fresh user roles
      const rolesPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const rolesResponse = await Promise.race([rolesPromise, timeoutPromise]) as any;
      const { data: roles, error: rolesError } = rolesResponse;

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      } else if (roles) {
        const rolesList = roles.map((r: any) => r.role) || [];
        setUserRoles(rolesList);
        localStorage.setItem(`${CACHE_KEY_ROLES}_${userId}`, JSON.stringify(rolesList));
      }
    } catch (error) {
      console.warn('[Auth] Network timeout or error during profile fetch. Retaining cached roles.', error);
    }
  };

  const fetchMFAFactors = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("MFA fetch timeout")), 30000));
      const mfaPromise = supabase.auth.mfa.listFactors();
      const response = await Promise.race([mfaPromise, timeoutPromise]) as any;
      const { data, error } = response;
      if (error) throw error;
      setMfaFactors(data.totp || []);
    } catch (err) {
      console.warn("[Auth] Error or timeout fetching MFA factors:", err);
    }
  };

  const fetchAAL = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AAL fetch timeout")), 30000));
      const aalPromise = supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const response = await Promise.race([aalPromise, timeoutPromise]) as any;
      const { data, error } = response;
      if (error) throw error;
      setAal(data.currentLevel as any);
    } catch (err) {
      console.warn("[Auth] Error or timeout fetching AAL:", err);
    }
  };

  useEffect(() => {
    // Keep track of mounted state to avoid state updates on unmounted component
    let isMounted = true;

    // Helper to initialize user data
    let isInitializing = false;
    
    const initializeUserData = async (sessionUser: User | null) => {
      if (isInitializing) return;
      isInitializing = true;
      console.log("[Auth] Starting initializeUserData for user:", sessionUser?.id);
      
      if (sessionUser) {
        try {
          await Promise.all([
            fetchUserProfile(sessionUser.id),
            fetchMFAFactors(),
            fetchAAL()
          ]);
          console.log("[Auth] initializeUserData Promise.all finished");
        } catch (e) {
          console.error("[Auth] initializeUserData error:", e);
        }
      } else {
        setUserProfile(null);
        setUserRoles([]);
        setMfaFactors([]);
        setAal(null);
      }
      
      console.log("[Auth] Setting loading to false (isMounted: " + isMounted + ")");
      if (isMounted) setLoading(false);
      isInitializing = false;
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        await initializeUserData(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("Error getting session:", error);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      
      await initializeUserData(session?.user ?? null);
    });

    // Fallback: force loading to false after 3 seconds to prevent infinite loading
    const forceLoadTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("[Auth] Force clearing loading state due to timeout");
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(forceLoadTimeout);
      subscription.unsubscribe();
    };
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