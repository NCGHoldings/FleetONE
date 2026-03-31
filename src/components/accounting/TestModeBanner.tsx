import { AlertTriangle, Trash2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const NCG_TEST_ID = 'a0000000-0000-0000-0000-000000000001';

const TEST_SUB_COMPANY_IDS = [
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006',
];

const ALL_TEST_IDS = [NCG_TEST_ID, ...TEST_SUB_COMPANY_IDS];

export const TestModeBanner = () => {
  const { isTestCompany } = useCompany();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();

  if (!isTestCompany) return null;

  const handleClearTestData = async () => {
    setIsClearing(true);
    try {
      // Delete in dependency order (children first)
      const tables = [
        // AR allocations & receipts
        { table: 'ar_receipt_allocations' as const, col: 'company_id' },
        { table: 'ar_receipts' as const, col: 'company_id' },
        // AP allocations & payments
        { table: 'ap_payment_allocations' as const, col: 'company_id' },
        { table: 'ap_payment_lines' as const, col: 'company_id' },
        { table: 'ap_payments' as const, col: 'company_id' },
        // Invoice lines
        { table: 'ar_invoice_lines' as const, col: 'company_id' },
        { table: 'ap_invoice_lines' as const, col: 'company_id' },
        // Invoices
        { table: 'ar_invoices' as const, col: 'company_id' },
        { table: 'ap_invoices' as const, col: 'company_id' },
        // Journal entries
        { table: 'journal_entry_lines' as const, col: 'company_id' },
        { table: 'journal_entries' as const, col: 'company_id' },
        // Bank
        { table: 'bank_transactions' as const, col: 'company_id' },
        { table: 'cashbook_entries' as const, col: 'company_id' },
        // Customers & Vendors
        { table: 'customers' as const, col: 'company_id' },
        { table: 'vendors' as const, col: 'company_id' },
      ];

      for (const { table, col } of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in(col, ALL_TEST_IDS);
        if (error) console.warn(`Clear ${table}:`, error.message);
      }

      // Reset COA balances to 0
      await supabase
        .from('chart_of_accounts')
        .update({ current_balance: 0 })
        .eq('company_id', NCG_TEST_ID);

      // Invalidate all queries
      queryClient.invalidateQueries();
      toast.success("Test data cleared successfully! COA structure preserved.");
    } catch (err) {
      console.error("Clear test data error:", err);
      toast.error("Failed to clear test data");
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  return (
    <>
      <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold text-sm">🧪 TEST MODE</span>
          <span className="text-xs text-amber-600 dark:text-amber-500">
            — All data here is isolated from live. Safe to experiment.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-500/50 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
          onClick={() => setShowClearDialog(true)}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear Test Data
        </Button>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Test Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all transactions, invoices, payments, journal entries,
              customers, and vendors from the test environment.
              <br /><br />
              <strong>Chart of Accounts and GL Settings will be preserved.</strong>
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearTestData}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? "Clearing..." : "Yes, Clear Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
