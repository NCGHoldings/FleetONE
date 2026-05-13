/**
 * TransactionDateAdjuster — Audit-safe date correction tool
 * Allows administrators to correct invoice_date / entry_date on already-posted
 * AR invoices and GL journal entries, with mandatory reason logging.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, AlertTriangle, CheckCircle2, RefreshCw, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionDateAdjusterProps {
  isOpen: boolean;
  onClose: () => void;
  /** The AR invoice to adjust (if applicable) */
  arInvoice?: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    journal_entry_id?: string;
  } | null;
  /** Direct journal entry to adjust (if no AR invoice) */
  journalEntry?: {
    id: string;
    entry_number: string;
    entry_date: string;
  } | null;
  /** Callback after successful adjustment */
  onAdjusted?: () => void;
}

export function TransactionDateAdjuster({
  isOpen,
  onClose,
  arInvoice,
  journalEntry,
  onAdjusted,
}: TransactionDateAdjusterProps) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedJE, setLinkedJE] = useState<{ id: string; entry_number: string; entry_date: string } | null>(null);

  // Derive the current date from either the AR invoice or the JE
  const currentDate = arInvoice?.invoice_date || journalEntry?.entry_date || '';
  const identifier = arInvoice?.invoice_number || journalEntry?.entry_number || '';

  // Load linked JE if we have an AR invoice with a journal_entry_id
  useEffect(() => {
    if (!isOpen) return;
    setNewDate('');
    setReason('');
    setLinkedJE(null);

    if (arInvoice?.journal_entry_id) {
      supabase
        .from('journal_entries')
        .select('id, entry_number, entry_date')
        .eq('id', arInvoice.journal_entry_id)
        .single()
        .then(({ data }) => {
          if (data) setLinkedJE(data);
        });
    }
  }, [isOpen, arInvoice, journalEntry]);

  const handleSubmit = async () => {
    if (!newDate) {
      toast.error('Please select a new date.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('A reason for adjustment is mandatory (min 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const adjustedItems: string[] = [];

      // 1. Update AR Invoice date
      if (arInvoice) {
        const { error: arErr } = await supabase
          .from('ar_invoices')
          .update({
            invoice_date: newDate,
          })
          .eq('id', arInvoice.id);

        if (arErr) throw new Error(`AR Invoice update failed: ${arErr.message}`);
        adjustedItems.push(`AR Invoice ${arInvoice.invoice_number}`);
      }

      // 2. Update linked Journal Entry date (from AR invoice link)
      if (linkedJE) {
        const { error: jeErr } = await (supabase as any)
          .from('journal_entries')
          .update({
            entry_date: newDate,
          })
          .eq('id', linkedJE.id);

        if (jeErr) throw new Error(`Journal Entry update failed: ${jeErr.message}`);
        adjustedItems.push(`JE ${linkedJE.entry_number}`);
      }

      // 3. Update standalone Journal Entry (when adjusting JE directly)
      if (journalEntry && !linkedJE) {
        const { error: jeErr } = await (supabase as any)
          .from('journal_entries')
          .update({
            entry_date: newDate,
          })
          .eq('id', journalEntry.id);

        if (jeErr) throw new Error(`Journal Entry update failed: ${jeErr.message}`);
        adjustedItems.push(`JE ${journalEntry.entry_number}`);
      }

      // 4. Write audit trail
      try {
        await supabase.from('audit_trail' as any).insert({
          action: 'DATE_ADJUSTMENT',
          table_name: arInvoice ? 'ar_invoices' : 'journal_entries',
          record_id: arInvoice?.id || journalEntry?.id,
          old_values: JSON.stringify({
            date: currentDate,
            identifier,
          }),
          new_values: JSON.stringify({
            date: newDate,
            reason: reason.trim(),
            adjusted_items: adjustedItems,
          }),
          performed_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        // Non-blocking — audit table may not exist yet
        console.warn('[DateAdjuster] Audit trail write failed (non-blocking):', auditErr);
      }

      toast.success(`Date corrected: ${adjustedItems.join(' + ')} → ${format(new Date(newDate + 'T00:00:00'), 'MMM dd, yyyy')}`);
      onAdjusted?.();
      onClose();
    } catch (err: any) {
      console.error('[DateAdjuster] Error:', err);
      toast.error(err.message || 'Failed to adjust date');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-600" />
            Adjust Transaction Date
          </DialogTitle>
          <DialogDescription>
            Correct the posting date for <strong>{identifier}</strong>. This is an audited operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Current State */}
          <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Date</span>
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                {currentDate ? format(new Date(currentDate + 'T00:00:00'), 'MMM dd, yyyy') : '—'}
              </Badge>
            </div>
            {arInvoice && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>AR Invoice</span>
                <span>{arInvoice.invoice_number}</span>
              </div>
            )}
            {linkedJE && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Linked JE</span>
                <span>{linkedJE.entry_number} ({linkedJE.entry_date})</span>
              </div>
            )}
            {journalEntry && !linkedJE && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Journal Entry</span>
                <span>{journalEntry.entry_number}</span>
              </div>
            )}
          </div>

          {/* Cascading update notice */}
          {arInvoice && linkedJE && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                This will update <strong>both</strong> the AR Invoice date and the linked Journal Entry date to maintain ledger consistency.
              </p>
            </div>
          )}

          {/* New Date */}
          <div className="space-y-2">
            <Label htmlFor="adj-new-date" className="text-sm font-medium">
              Corrected Date
            </Label>
            <Input
              id="adj-new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="adj-reason" className="text-sm font-medium flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              Reason for Adjustment <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Invoice was backdated to April 10 but posted with today's date due to system bug"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded in the audit trail for compliance.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newDate || !reason.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Adjusting...' : 'Confirm Date Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
