import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HealthStatus = 'success' | 'warning' | 'error' | 'pending';

export interface HealthCheckResult {
  id: string;
  checkType: string;
  checkName: string;
  status: HealthStatus;
  message: string;
  latency: number;
  timestamp: Date;
  error?: unknown;
  errorDetails?: string;
}

export interface ConsoleLog {
  id: string;
  timestamp: Date;
  status: HealthStatus;
  message: string;
  latency?: number;
}

interface UseSystemHealthChecksReturn {
  results: HealthCheckResult[];
  consoleLogs: ConsoleLog[];
  isRunning: boolean;
  lastRunTime: Date | null;
  autoRefreshEnabled: boolean;
  criticalErrorCount: number;
  runFullHealthCheck: () => Promise<void>;
  clearLogs: () => void;
  toggleAutoRefresh: () => void;
}

export function useSystemHealthChecks(): UseSystemHealthChecksReturn {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false); // DISABLED by default — was true, causing 6 heavy DB/Storage/Realtime tests every 5 min
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((status: HealthStatus, message: string, latency?: number) => {
    const log: ConsoleLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      status,
      message,
      latency
    };
    setConsoleLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  // Test Auth Session
  const testAuthSession = useCallback(async (): Promise<HealthCheckResult> => {
    const start = performance.now();
    const id = crypto.randomUUID();
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);
      
      if (error) throw error;
      
      if (session) {
        addLog('success', `Auth session valid (${latency}ms)`, latency);
        return {
          id,
          checkType: 'auth',
          checkName: 'Session Validity',
          status: 'success',
          message: 'Session active',
          latency,
          timestamp: new Date()
        };
      } else {
        addLog('warning', `No active session (${latency}ms)`, latency);
        return {
          id,
          checkType: 'auth',
          checkName: 'Session Validity',
          status: 'warning',
          message: 'No active session',
          latency,
          timestamp: new Date()
        };
      }
    } catch (error) {
      const latency = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `Auth check failed: ${errorMessage}`, latency);
      return {
        id,
        checkType: 'auth',
        checkName: 'Session Validity',
        status: 'error',
        message: 'Auth check failed',
        latency,
        timestamp: new Date(),
        error,
        errorDetails: errorMessage
      };
    }
  }, [addLog]);

  // Test Storage Upload
  const testStorageUpload = useCallback(async (): Promise<HealthCheckResult> => {
    const start = performance.now();
    const id = crypto.randomUUID();
    const testFileName = `health-check-${Date.now()}.txt`;
    const testContent = new Blob(['HEALTH_CHECK_TEST_' + Date.now()], { type: 'text/plain' });
    
    try {
      // Upload to documents bucket
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`health-checks/${testFileName}`, testContent);
      
      if (uploadError) throw uploadError;
      
      // Verify exists
      const { data: listData, error: listError } = await supabase.storage
        .from('documents')
        .list('health-checks');
      
      if (listError) throw listError;
      
      const fileExists = listData?.some(file => file.name === testFileName);
      if (!fileExists) throw new Error('Uploaded file not found');
      
      // Cleanup - delete immediately
      await supabase.storage
        .from('documents')
        .remove([`health-checks/${testFileName}`]);
      
      const latency = Math.round(performance.now() - start);
      const status: HealthStatus = latency > 2000 ? 'warning' : 'success';
      
      addLog(status, `Storage upload/delete ${status === 'success' ? 'successful' : 'slow'} (${latency}ms)`, latency);
      
      return {
        id,
        checkType: 'storage',
        checkName: 'Storage Upload',
        status,
        message: status === 'success' ? 'Upload/delete OK' : 'Slow response',
        latency,
        timestamp: new Date()
      };
    } catch (error) {
      const latency = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `Storage test failed: ${errorMessage}`, latency);
      return {
        id,
        checkType: 'storage',
        checkName: 'Storage Upload',
        status: 'error',
        message: 'Storage test failed',
        latency,
        timestamp: new Date(),
        error,
        errorDetails: errorMessage
      };
    }
  }, [addLog]);

  // Test Database Latency
  const testDatabaseLatency = useCallback(async (): Promise<HealthCheckResult> => {
    const start = performance.now();
    const id = crypto.randomUUID();
    
    try {
      const { count, error } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      const latency = Math.round(performance.now() - start);
      let status: HealthStatus = 'success';
      let message = `Query OK (${count} rows)`;
      
      if (latency > 1000) {
        status = 'error';
        message = 'Very slow response';
      } else if (latency > 300) {
        status = 'warning';
        message = 'High latency';
      }
      
      addLog(status, `Database latency: ${latency}ms`, latency);
      
      return {
        id,
        checkType: 'database',
        checkName: 'DB Latency',
        status,
        message,
        latency,
        timestamp: new Date()
      };
    } catch (error) {
      const latency = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `Database query failed: ${errorMessage}`, latency);
      return {
        id,
        checkType: 'database',
        checkName: 'DB Latency',
        status: 'error',
        message: 'Query failed',
        latency,
        timestamp: new Date(),
        error,
        errorDetails: errorMessage
      };
    }
  }, [addLog]);

  // Test Database Write
  const testDatabaseWrite = useCallback(async (): Promise<HealthCheckResult> => {
    const start = performance.now();
    const id = crypto.randomUUID();
    const testId = crypto.randomUUID();
    
    try {
      // Insert test row
      const { error: insertError } = await supabase
        .from('system_health_logs')
        .insert({
          id: testId,
          check_type: 'synthetic_test',
          check_name: 'Database Write Test',
          status: 'pending',
          message: 'Testing database write capability',
          is_test_data: true
        });
      
      if (insertError) throw insertError;
      
      // Verify the row exists
      const { data: verifyData, error: verifyError } = await supabase
        .from('system_health_logs')
        .select('id')
        .eq('id', testId)
        .single();
      
      if (verifyError) throw verifyError;
      if (!verifyData) throw new Error('Inserted row not found');
      
      // Cleanup - delete immediately
      await supabase
        .from('system_health_logs')
        .delete()
        .eq('id', testId);
      
      const latency = Math.round(performance.now() - start);
      
      addLog('success', `Database write/read/delete successful (${latency}ms)`, latency);
      
      return {
        id,
        checkType: 'database',
        checkName: 'DB Write',
        status: 'success',
        message: 'Write/read/delete OK',
        latency,
        timestamp: new Date()
      };
    } catch (error) {
      // Cleanup attempt
      await supabase.from('system_health_logs').delete().eq('id', testId);
      
      const latency = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `Database write failed: ${errorMessage}`, latency);
      
      return {
        id,
        checkType: 'database',
        checkName: 'DB Write',
        status: 'error',
        message: 'Write test failed',
        latency,
        timestamp: new Date(),
        error,
        errorDetails: errorMessage
      };
    }
  }, [addLog]);

  // Test RLS Policies on Critical Tables
  const testRLSPolicies = useCallback(async (): Promise<HealthCheckResult> => {
    const start = performance.now();
    const id = crypto.randomUUID();
    const tableResults: string[] = [];
    
    try {
      // Test each table explicitly
      const { error: busError } = await supabase
        .from('buses')
        .select('id', { count: 'exact', head: true });
      tableResults.push(busError ? 'buses: FAIL' : 'buses: OK');
      
      const { error: tripsError } = await supabase
        .from('daily_trips')
        .select('id', { count: 'exact', head: true });
      tableResults.push(tripsError ? 'daily_trips: FAIL' : 'daily_trips: OK');
      
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      tableResults.push(profilesError ? 'profiles: FAIL' : 'profiles: OK');
      
      const latency = Math.round(performance.now() - start);
      const hasErrors = tableResults.some(r => r.includes('FAIL'));
      const status: HealthStatus = hasErrors ? 'error' : 'success';
      
      addLog(status, `RLS check: ${tableResults.join(', ')} (${latency}ms)`, latency);
      
      return {
        id,
        checkType: 'database',
        checkName: 'RLS Policies',
        status,
        message: hasErrors ? 'Some tables inaccessible' : 'All tables accessible',
        latency,
        timestamp: new Date(),
        errorDetails: hasErrors ? tableResults.filter(r => r.includes('FAIL')).join(', ') : undefined
      };
    } catch (error) {
      const latency = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `RLS check failed: ${errorMessage}`, latency);
      
      return {
        id,
        checkType: 'database',
        checkName: 'RLS Policies',
        status: 'error',
        message: 'RLS check failed',
        latency,
        timestamp: new Date(),
        error,
        errorDetails: errorMessage
      };
    }
  }, [addLog]);

  // Test Real-time Connection
  const testRealtimeConnection = useCallback(async (): Promise<HealthCheckResult> => {
    const start = performance.now();
    const id = crypto.randomUUID();
    
    try {
      // Check if we can establish a channel
      const channel = supabase.channel('health-check-' + Date.now());
      
      const subscribePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      });
      
      const success = await subscribePromise;
      await supabase.removeChannel(channel);
      
      const latency = Math.round(performance.now() - start);
      
      if (success) {
        addLog('success', `Realtime connected (${latency}ms)`, latency);
        return {
          id,
          checkType: 'api',
          checkName: 'Realtime',
          status: 'success',
          message: 'Connected',
          latency,
          timestamp: new Date()
        };
      } else {
        addLog('warning', `Realtime timeout (${latency}ms)`, latency);
        return {
          id,
          checkType: 'api',
          checkName: 'Realtime',
          status: 'warning',
          message: 'Connection timeout',
          latency,
          timestamp: new Date()
        };
      }
    } catch (error) {
      const latency = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `Realtime failed: ${errorMessage}`, latency);
      
      return {
        id,
        checkType: 'api',
        checkName: 'Realtime',
        status: 'error',
        message: 'Connection failed',
        latency,
        timestamp: new Date(),
        error,
        errorDetails: errorMessage
      };
    }
  }, [addLog]);

  // Run Full Health Check
  const runFullHealthCheck = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('pending', 'Starting full system health check...');
    
    try {
      // Run all tests in parallel
      const [authResult, storageResult, dbLatencyResult, dbWriteResult, rlsResult, realtimeResult] = await Promise.all([
        testAuthSession(),
        testStorageUpload(),
        testDatabaseLatency(),
        testDatabaseWrite(),
        testRLSPolicies(),
        testRealtimeConnection()
      ]);
      
      const allResults = [authResult, storageResult, dbLatencyResult, dbWriteResult, rlsResult, realtimeResult];
      setResults(allResults);
      setLastRunTime(new Date());
      
      const passed = allResults.filter(r => r.status === 'success').length;
      const warnings = allResults.filter(r => r.status === 'warning').length;
      const errors = allResults.filter(r => r.status === 'error').length;
      
      addLog(
        errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'success',
        `Health check complete: ${passed} passed, ${warnings} warnings, ${errors} errors`
      );
      
      // Persist results to database (without error_details as it may not exist in schema)
      const logEntries = allResults.map(result => ({
        check_type: result.checkType,
        check_name: result.checkName,
        status: result.status,
        response_time_ms: result.latency,
        message: result.errorDetails ? `${result.message} - ${result.errorDetails}` : result.message,
        is_test_data: false
      }));
      
      await supabase.from('system_health_logs').insert(logEntries);
      
    } catch (error) {
      addLog('error', `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, addLog, testAuthSession, testStorageUpload, testDatabaseLatency, testDatabaseWrite, testRLSPolicies, testRealtimeConnection]);

  const clearLogs = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => !prev);
  }, []);

  // Calculate critical error count
  const criticalErrorCount = results.filter(r => r.status === 'error').length;

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (autoRefreshEnabled) {
      // Run initial check
      runFullHealthCheck();
      
      // Set up interval
      intervalRef.current = setInterval(() => {
        runFullHealthCheck();
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    results,
    consoleLogs,
    isRunning,
    lastRunTime,
    autoRefreshEnabled,
    criticalErrorCount,
    runFullHealthCheck,
    clearLogs,
    toggleAutoRefresh
  };
}
