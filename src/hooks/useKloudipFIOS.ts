import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
// ALWAYS route through our proxy to bypass AdBlockers in production (Vercel/Netlify rewrites)
const FIOS_URL = "/telemetry/api";
export interface FIOSUnit {
  nm: string;
  id: number;
  pos?: {
    t: number;
    y: number;
    x: number;
    s: number;
    c: number;
    z: number;
    sc: number;
  };
  prms?: Record<string, {v: any, ct: number, at: number}>;
}

export const useKloudipFIOS = (token: string, refreshIntervalSeconds: number = 30) => {
  const [session, setSession] = useState<{ sid: string; nm: string } | null>(null);
  const [vehicles, setVehicles] = useState<FIOSUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const login = useCallback(async () => {
    if (!token) return null;
    try {
      const loginParams = encodeURIComponent(JSON.stringify({ token: token, fl: 1 }));
      const loginRes = await fetch(`${FIOS_URL}?svc=token/login&params=${loginParams}`);
      const loginData = await loginRes.json();
      
      if (loginData.error) {
        throw new Error(`Login failed with code: ${loginData.error}`);
      }
      
      setSession({
        sid: loginData.eid,
        nm: loginData.user?.nm || 'Unknown User'
      });
      return loginData.eid as string;
    } catch (err: any) {
      console.error("Kloudip FIOS Auth Error:", err);
      setError(err.message);
      return null;
    }
  }, [token]);

  const logout = useCallback(async () => {
    if (!session?.sid) return;
    try {
      await fetch(`${FIOS_URL}?svc=core/logout&params={}&sid=${session.sid}`);
      setSession(null);
    } catch (err) {
      console.error("Logout error", err);
    }
  }, [session?.sid]);

  const fetchLiveTracking = useCallback(async (currentSid?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let sid = currentSid || session?.sid;
      if (!sid) {
        sid = await login();
      }
      if (!sid) return [];

      const searchParams = encodeURIComponent(JSON.stringify({
        spec: { itemsType: "avl_unit", propName: "sys_name", propValueMask: "*", sortType: "sys_name" },
        force: 1, 
        flags: 4294967295, // Max flags: Gets positional, sensors, custom props, params 
        from: 0, 
        to: 0 
      }));
      
      const unitsRes = await fetch(`${FIOS_URL}?svc=core/search_items&params=${searchParams}&sid=${sid}`);
      const unitsData = await unitsRes.json();
      
      if (unitsData.error) {
        if (unitsData.error === 1 || unitsData.error === 4) {
          setSession(null);
          toast.error("FIOS Session expired. Reconnecting...");
          if(!currentSid) {
             const newSid = await login();
             if (newSid) return fetchLiveTracking(newSid);
          }
        }
        throw new Error(`Search failed: ${unitsData.error}`);
      }
      
      if (unitsData.items) {
        setVehicles(unitsData.items);
        return unitsData.items as FIOSUnit[];
      }
      return [];
    } catch (err: any) {
      console.error("Kloudip Proxy Fetch Error", err);
      // Surface the error to the user so they know if AdBlockers are blocking it
      toast.error(`FIOS Connection Failed: ${err.message}. Please check if an AdBlocker is blocking fios-api.kloudip.com`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [session?.sid, login]);

  // Hook into continuous polling
  useEffect(() => {
    if (!token || refreshIntervalSeconds <= 0) return;

    fetchLiveTracking();
    
    const interval = setInterval(() => {
      fetchLiveTracking();
    }, refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [token, refreshIntervalSeconds, fetchLiveTracking]);

  return { session, vehicles, loading, error, login, logout, fetchLiveTracking };
};
