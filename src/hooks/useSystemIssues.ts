import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type IssueCategory = 'form_error' | 'dropdown_empty' | 'submission_failure' | 'page_crash' | 'data_missing' | 'performance' | 'ui_bug' | 'general';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'investigating' | 'diagnosed' | 'fix_in_progress' | 'resolved' | 'closed' | 'wont_fix';

export interface SystemIssue {
  id: string;
  issue_number: number;
  reported_by: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  title: string;
  description: string | null;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  page_url: string | null;
  page_name: string | null;
  browser_info: string | null;
  error_message: string | null;
  screenshot_url: string | null;
  auto_diagnosis: string | null;
  suggested_fix: string | null;
  is_auto_diagnosed: boolean;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  notify_reporter: boolean;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

// ── Auto-Diagnosis Engine ──────────────────────────────────────────────────
const DIAGNOSIS_RULES: { keywords: string[]; category: IssueCategory; diagnosis: string; suggestedFix: string }[] = [
  {
    keywords: ['dropdown', 'empty', 'select', 'no options', 'not showing options', 'blank dropdown'],
    category: 'dropdown_empty',
    diagnosis: 'Empty dropdown detected. This is typically caused by a failed API call to fetch dropdown options, or missing data in the referenced table.',
    suggestedFix: '1. Check if the referenced table has data.\n2. Verify Supabase RLS policies allow reading the dropdown source table.\n3. Check browser console for network errors on the page.'
  },
  {
    keywords: ['form', 'not submitting', 'submit', 'save failed', 'cannot save', 'error saving', 'form error'],
    category: 'form_error',
    diagnosis: 'Form submission failure detected. Common causes: validation errors not displayed, missing required fields in the database schema, or RLS policy blocking inserts.',
    suggestedFix: '1. Check all required fields are filled.\n2. Verify Supabase INSERT RLS policy for the target table.\n3. Check browser console for the specific Postgres error code.'
  },
  {
    keywords: ['crash', 'white screen', 'blank page', 'page not loading', 'broken'],
    category: 'page_crash',
    diagnosis: 'Page crash / white screen detected. This usually indicates a JavaScript runtime error or a component rendering failure.',
    suggestedFix: '1. Check browser console for uncaught errors.\n2. Clear browser cache and retry.\n3. The issue may be related to missing data that a component depends on.'
  },
  {
    keywords: ['slow', 'loading', 'takes long', 'performance', 'lag', 'frozen'],
    category: 'performance',
    diagnosis: 'Performance issue detected. Could be caused by large dataset queries without pagination, missing database indexes, or heavy frontend renders.',
    suggestedFix: '1. Check if the page is loading too much data at once.\n2. Add pagination or limit the query.\n3. Check Supabase dashboard for slow queries.'
  },
  {
    keywords: ['missing data', 'data not showing', 'records gone', 'data lost', 'not displaying'],
    category: 'data_missing',
    diagnosis: 'Missing data issue. Data may exist but is hidden by RLS policies, company_id filtering, or a query filter issue.',
    suggestedFix: '1. Verify the data exists in Supabase table editor.\n2. Check RLS policies and company_id filters.\n3. Ensure the user has the correct role to view the data.'
  },
  {
    keywords: ['button', 'not working', 'click', 'nothing happens', 'unresponsive'],
    category: 'ui_bug',
    diagnosis: 'UI interaction issue. A button or interactive element is not responding. May be missing an onClick handler or a disabled state.',
    suggestedFix: '1. Check if the button has an onClick handler.\n2. Look for conditional disabled states.\n3. Check browser console for JavaScript errors when clicking.'
  }
];

function autoDiagnose(title: string, description: string): { category: IssueCategory; diagnosis: string; suggestedFix: string } | null {
  const text = `${title} ${description}`.toLowerCase();
  
  for (const rule of DIAGNOSIS_RULES) {
    const matches = rule.keywords.filter(kw => text.includes(kw));
    if (matches.length >= 1) {
      return {
        category: rule.category,
        diagnosis: rule.diagnosis,
        suggestedFix: rule.suggestedFix
      };
    }
  }
  
  return null;
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useSystemIssuesList(filters?: { status?: string; category?: string; priority?: string }) {
  return useQuery({
    queryKey: ['system-issues', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('system_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SystemIssue[];
    }
  });
}

export function useMyIssues() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-system-issues', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('system_issues')
        .select('*')
        .eq('reported_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SystemIssue[];
    },
    enabled: !!user?.id
  });
}

export function useSystemIssueStats() {
  return useQuery({
    queryKey: ['system-issues-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('system_issues')
        .select('*');

      if (error) throw error;
      const issues = (data || []) as SystemIssue[];

      return {
        total: issues.length,
        open: issues.filter(i => i.status === 'open').length,
        investigating: issues.filter(i => i.status === 'investigating' || i.status === 'diagnosed').length,
        inProgress: issues.filter(i => i.status === 'fix_in_progress').length,
        resolved: issues.filter(i => i.status === 'resolved' || i.status === 'closed').length,
        critical: issues.filter(i => i.priority === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length,
        autoDiagnosed: issues.filter(i => i.is_auto_diagnosed).length,
        byCategory: issues.reduce((acc: Record<string, number>, i) => {
          acc[i.category] = (acc[i.category] || 0) + 1;
          return acc;
        }, {}),
      };
    }
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useReportIssue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      category: IssueCategory;
      priority: IssuePriority;
      page_url?: string;
      page_name?: string;
      error_message?: string;
    }) => {
      // Run auto-diagnosis
      const diagnosis = autoDiagnose(input.title, input.description);

      const issueData: any = {
        ...input,
        reported_by: user?.id || null,
        reporter_name: user?.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
          : user?.email || 'Unknown',
        reporter_email: user?.email || null,
        browser_info: `${navigator.userAgent.substring(0, 200)}`,
        status: 'open',
      };

      // Apply auto-diagnosis if found
      if (diagnosis) {
        issueData.category = diagnosis.category;
        issueData.auto_diagnosis = diagnosis.diagnosis;
        issueData.suggested_fix = diagnosis.suggestedFix;
        issueData.is_auto_diagnosed = true;
        issueData.status = 'diagnosed';
      }

      const { data, error } = await (supabase as any)
        .from('system_issues')
        .insert(issueData)
        .select()
        .single();

      if (error) throw error;
      return data as SystemIssue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-issues'] });
      queryClient.invalidateQueries({ queryKey: ['my-system-issues'] });
      queryClient.invalidateQueries({ queryKey: ['system-issues-stats'] });
      const diagNote = data.is_auto_diagnosed ? ' — Auto-diagnosed!' : '';
      toast.success(`Issue #${data.issue_number} reported${diagNote}`);
    },
    onError: (error: any) => {
      toast.error('Failed to report issue: ' + error.message);
    }
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SystemIssue> & { id: string }) => {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // If resolving, set resolved_at and resolved_by
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id || null;
      }

      const { data, error } = await (supabase as any)
        .from('system_issues')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SystemIssue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-issues'] });
      queryClient.invalidateQueries({ queryKey: ['my-system-issues'] });
      queryClient.invalidateQueries({ queryKey: ['system-issues-stats'] });
      toast.success(`Issue #${data.issue_number} updated to "${data.status}"`);
    },
    onError: (error: any) => {
      toast.error('Failed to update issue: ' + error.message);
    }
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const ISSUE_CATEGORIES: { value: IssueCategory; label: string; icon: string }[] = [
  { value: 'form_error', label: 'Form Error', icon: '📋' },
  { value: 'dropdown_empty', label: 'Empty Dropdown', icon: '📂' },
  { value: 'submission_failure', label: 'Submission Failure', icon: '❌' },
  { value: 'page_crash', label: 'Page Crash', icon: '💥' },
  { value: 'data_missing', label: 'Data Missing', icon: '🔍' },
  { value: 'performance', label: 'Performance', icon: '🐌' },
  { value: 'ui_bug', label: 'UI Bug', icon: '🎨' },
  { value: 'general', label: 'General', icon: '📝' },
];

export const ISSUE_PRIORITIES: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

export const ISSUE_STATUSES: { value: IssueStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'bg-blue-500' },
  { value: 'investigating', label: 'Investigating', color: 'bg-purple-500' },
  { value: 'diagnosed', label: 'Diagnosed', color: 'bg-indigo-500' },
  { value: 'fix_in_progress', label: 'Fix in Progress', color: 'bg-amber-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500' },
  { value: 'wont_fix', label: "Won't Fix", color: 'bg-slate-400' },
];
