import { AlertTriangle, Trash2, ArrowLeftRight } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const NCG_TEST_ID = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

const TEST_SUB_COMPANY_IDS = [
  'efc37802-e6bf-4426-ab69-fcac84c953b1',
  '0fba4a2f-598b-47e8-b863-283d00380b06',
  'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
  'bfd054c7-2403-4972-9a8a-2599a777a801',
  'ac957087-0224-4149-b231-7aa9e6a3aea1',
];

const ALL_TEST_IDS = [NCG_TEST_ID, ...TEST_SUB_COMPANY_IDS];

const TRANSFER_TABLES = [
  { key: 'chart_of_accounts', label: 'Chart of Accounts' },
  { key: 'customers', label: 'Customers' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'bank_accounts', label: 'Bank Accounts' },
  { key: 'journal_entries', label: 'Journal Entries + Lines' },
  { key: 'ar_invoices', label: 'AR Invoices + Lines' },
  { key: 'ap_invoices', label: 'AP Invoices + Lines' },
  { key: 'ar_receipts', label: 'AR Receipts + Allocations' },
  { key: 'ap_payments', label: 'AP Payments + Allocations' },
  { key: 'bank_transactions', label: 'Bank Transactions' },
];

export const TestModeBanner = () => {
  const { isTestCompany } = useCompany();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferDirection, setTransferDirection] = useState<'live_to_test' | 'test_to_live'>('live_to_test');
  const [transferMode, setTransferMode] = useState<'clear_then_copy' | 'merge'>('clear_then_copy');
  const [selectedTables, setSelectedTables] = useState<string[]>(TRANSFER_TABLES.map(t => t.key));
  const [isTransferring, setIsTransferring] = useState(false);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);
  const queryClient = useQueryClient();

  // Show LIVE banner for non-test companies
  if (!isTestCompany) {
    return (
      <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <span className="font-semibold text-sm">🟢 LIVE MODE</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-500">
            — This is your production environment. All data is real.
          </span>
        </div>
      </div>
    );
  }

  const handleClearTestData = async () => {
    setIsClearing(true);
    try {
      const tablesToClear = [
        'ar_receipt_allocations',
        'ar_receipts',
        'ap_payment_allocations',
        'ap_payment_lines',
        'ap_payments',
        'ar_invoice_lines',
        'ap_invoice_lines',
        'ar_invoices',
        'ap_invoices',
        'journal_entry_lines',
        'journal_entries',
        'bank_transactions',
        'cashbook_entries',
        'customers',
        'vendors',
      ];

      for (const table of tablesToClear) {
        const { error } = await (supabase as any)
          .from(table)
          .delete()
          .in('company_id', ALL_TEST_IDS);
        if (error) console.warn(`Clear ${table}:`, error.message);
      }

      await supabase
        .from('chart_of_accounts')
        .update({ current_balance: 0 })
        .eq('company_id', NCG_TEST_ID);

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

  const handleTransfer = async () => {
    setIsTransferring(true);
    setShowConfirmTransfer(false);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-accounting-data', {
        body: {
          direction: transferDirection,
          mode: transferMode,
          tables: selectedTables,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const results = data.results || {};
        const totalCopied = Object.values(results).reduce((sum: number, r: any) => sum + (r.copied || 0), 0);
        const totalErrors = Object.values(results).reduce((sum: number, r: any) => sum + (r.errors?.length || 0), 0);

        if (totalErrors > 0) {
          toast.warning(`Transfer completed with ${totalErrors} errors. ${totalCopied} records copied.`);
          console.warn('Transfer results:', results);
        } else {
          toast.success(`Transfer complete! ${totalCopied} records copied.`);
        }

        queryClient.invalidateQueries();
        setShowTransferDialog(false);
      } else {
        throw new Error(data?.error || 'Transfer failed');
      }
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast.error(`Transfer failed: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const toggleTable = (key: string) => {
    setSelectedTables(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-blue-500/50 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400"
            onClick={() => setShowTransferDialog(true)}
          >
            <ArrowLeftRight className="h-3 w-3 mr-1" />
            Transfer Data
          </Button>
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
      </div>

      {/* Clear Dialog */}
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

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer Accounting Data</DialogTitle>
            <DialogDescription>
              Copy accounting data between live and test environments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Direction */}
            <div className="space-y-2">
              <Label className="font-medium">Direction</Label>
              <div className="flex gap-2">
                <Button
                  variant={transferDirection === 'live_to_test' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransferDirection('live_to_test')}
                  className="flex-1"
                >
                  Live → Test
                </Button>
                <Button
                  variant={transferDirection === 'test_to_live' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransferDirection('test_to_live')}
                  className="flex-1"
                >
                  Test → Live
                </Button>
              </div>
              {transferDirection === 'test_to_live' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will write test data to your production environment!
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Collision Mode */}
            <div className="space-y-2">
              <Label className="font-medium">When target has existing data</Label>
              <div className="flex gap-2">
                <Button
                  variant={transferMode === 'clear_then_copy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransferMode('clear_then_copy')}
                  className="flex-1"
                >
                  Clear & Replace
                </Button>
                <Button
                  variant={transferMode === 'merge' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransferMode('merge')}
                  className="flex-1"
                >
                  Merge (skip conflicts)
                </Button>
              </div>
            </div>

            {/* Table Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Tables to Transfer</Label>
                <Badge variant="secondary">{selectedTables.length} selected</Badge>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
                {TRANSFER_TABLES.map(table => (
                  <label
                    key={table.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={selectedTables.includes(table.key)}
                      onCheckedChange={() => toggleTable(table.key)}
                    />
                    <span className="text-sm">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowConfirmTransfer(true)}
              disabled={selectedTables.length === 0 || isTransferring}
            >
              {isTransferring ? "Transferring..." : "Start Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Confirmation */}
      <AlertDialog open={showConfirmTransfer} onOpenChange={setShowConfirmTransfer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Data Transfer
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Direction:</strong> {transferDirection === 'live_to_test' ? 'Live → Test' : 'Test → Live'}
              <br />
              <strong>Mode:</strong> {transferMode === 'clear_then_copy' ? 'Clear & Replace' : 'Merge'}
              <br />
              <strong>Tables:</strong> {selectedTables.length} selected
              <br /><br />
              {transferDirection === 'test_to_live' ? (
                <span className="text-destructive font-bold">
                  ⚠️ This will modify PRODUCTION data. Are you absolutely sure?
                </span>
              ) : (
                'This will copy data from live to the test environment.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              className={transferDirection === 'test_to_live'
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
              }
            >
              Confirm Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
