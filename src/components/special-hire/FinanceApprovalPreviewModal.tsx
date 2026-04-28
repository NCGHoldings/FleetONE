import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { SearchableFinanceAccountSelector } from '@/components/settings/SearchableFinanceAccountSelector';
import { useSpecialHireFinanceSettings, useUpdateSpecialHireFinanceSettings } from '@/hooks/useSpecialHireFinance';
import { useChartOfAccounts } from '@/hooks/useAccountingData';
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, Wand2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FinanceApprovalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentAmount: number;
  paymentType: 'advance' | 'balance' | 'full';
  customerName: string;
  quotationNo: string;
}

export function FinanceApprovalPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  paymentAmount,
  paymentType,
  customerName,
  quotationNo
}: FinanceApprovalPreviewModalProps) {
  const { data: settings, isLoading: settingsLoading } = useSpecialHireFinanceSettings();
  const { data: chartOfAccounts } = useChartOfAccounts();
  const updateSettings = useUpdateSpecialHireFinanceSettings();

  const [isConfiguring, setIsConfiguring] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>({
    revenue_external_account_id: '',
    trade_receivable_account_id: '',
    customer_advance_account_id: '',
    default_bank_account_id: ''
  });

  const isSettingsComplete = 
    settings?.trade_receivable_account_id && 
    settings?.customer_advance_account_id && 
    settings?.default_bank_account_id && 
    (settings?.revenue_internal_account_id || settings?.revenue_external_account_id);

  // Sync local settings when loaded
  useEffect(() => {
    if (settings && !isSettingsComplete) {
      setLocalSettings({
        revenue_external_account_id: settings.revenue_external_account_id || '',
        trade_receivable_account_id: settings.trade_receivable_account_id || '',
        customer_advance_account_id: settings.customer_advance_account_id || '',
        default_bank_account_id: settings.default_bank_account_id || '',
      });
      setIsConfiguring(true);
    } else if (settings && isSettingsComplete) {
      setIsConfiguring(false);
    } else if (!settings && !settingsLoading) {
      setIsConfiguring(true);
    }
  }, [settings, isSettingsComplete, settingsLoading]);

  const handleAutoFill = () => {
    if (!chartOfAccounts || chartOfAccounts.length === 0) return;
    
    const matchAccount = (keywords: string[], type?: string) => {
      return chartOfAccounts.find(a => 
        (!type || a.account_type === type) && 
        keywords.some(k => a.account_name.toLowerCase().includes(k))
      )?.id || "";
    };

    setLocalSettings({
      revenue_external_account_id: localSettings.revenue_external_account_id || matchAccount(["special hire revenue - external", "external revenue", "sales", "revenue"], "revenue"),
      trade_receivable_account_id: localSettings.trade_receivable_account_id || matchAccount(["trade receivable", "accounts receivable", "trade debtor"], "asset"),
      customer_advance_account_id: localSettings.customer_advance_account_id || matchAccount(["customer advance", "advance receipt", "advance"], "liability"),
      default_bank_account_id: localSettings.default_bank_account_id || matchAccount(["bank", "cash", "petty cash"], "asset"),
    });
    toast.success("Accounts auto-filled. Please save.");
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      setIsConfiguring(false);
    } catch (e: any) {
      // Error handled by mutation
    }
  };

  const getAccountName = (id: string) => {
    return chartOfAccounts?.find(a => a.id === id)?.account_name || 'Unknown Account';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Finance Approval Preview</DialogTitle>
          <DialogDescription>
            Review the exact financial paths before confirming this payment.
          </DialogDescription>
        </DialogHeader>

        {settingsLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking finance configurations...</p>
          </div>
        ) : isConfiguring ? (
          <div className="space-y-6">
            <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription>
                You must map the core General Ledger accounts before approving any Special Hire payments. 
                This ensures accurate automatic posting.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleAutoFill}>
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Fill Defaults
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Default Bank/Cash Account (Debit)</Label>
                <SearchableFinanceAccountSelector
                  value={localSettings.default_bank_account_id || null}
                  onValueChange={(val) => setLocalSettings(p => ({ ...p, default_bank_account_id: val || '' }))}
                  accounts={chartOfAccounts || []}
                  placeholder="Select bank account..."
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Advance Liability Account (Credit)</Label>
                <SearchableFinanceAccountSelector
                  value={localSettings.customer_advance_account_id || null}
                  onValueChange={(val) => setLocalSettings(p => ({ ...p, customer_advance_account_id: val || '' }))}
                  accounts={chartOfAccounts || []}
                  placeholder="Select advance account..."
                />
              </div>
              <div className="space-y-2">
                <Label>Trade Receivable Account (AR)</Label>
                <SearchableFinanceAccountSelector
                  value={localSettings.trade_receivable_account_id || null}
                  onValueChange={(val) => setLocalSettings(p => ({ ...p, trade_receivable_account_id: val || '' }))}
                  accounts={chartOfAccounts || []}
                  placeholder="Select receivable account..."
                />
              </div>
              <div className="space-y-2">
                <Label>Special Hire Revenue Account</Label>
                <SearchableFinanceAccountSelector
                  value={localSettings.revenue_external_account_id || null}
                  onValueChange={(val) => setLocalSettings(p => ({ ...p, revenue_external_account_id: val || '' }))}
                  accounts={chartOfAccounts || []}
                  placeholder="Select revenue account..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save & Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <h4 className="font-medium text-sm text-slate-500 mb-4">TRANSACTION SUMMARY</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Quotation No</p>
                  <p className="font-medium">{quotationNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Type</p>
                  <p className="font-medium capitalize">{paymentType} Payment</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold text-primary">LKR {paymentAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm text-slate-500 mb-3 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> 
                PROJECTED JOURNAL ENTRY
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Account</th>
                      <th className="px-4 py-2 text-right font-medium">Debit</th>
                      <th className="px-4 py-2 text-right font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(paymentType === 'advance' || paymentType === 'full') && (
                      <>
                        <tr>
                          <td className="px-4 py-3 font-medium">
                            {getAccountName(settings?.default_bank_account_id)}
                            <p className="text-xs text-muted-foreground font-normal">Asset - Bank/Cash</p>
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {paymentAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium pl-8">
                            {getAccountName(settings?.customer_advance_account_id)}
                            <p className="text-xs text-muted-foreground font-normal">Liability - Customer Advance</p>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">-</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {paymentAmount.toLocaleString()}
                          </td>
                        </tr>
                      </>
                    )}
                    {paymentType === 'balance' && (
                      <>
                        <tr>
                          <td className="px-4 py-3 font-medium">
                            {getAccountName(settings?.default_bank_account_id)}
                            <p className="text-xs text-muted-foreground font-normal">Asset - Bank/Cash</p>
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {paymentAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">-</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium pl-8">
                            {getAccountName(settings?.trade_receivable_account_id)}
                            <p className="text-xs text-muted-foreground font-normal">Asset - Trade Receivable</p>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">-</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {paymentAmount.toLocaleString()}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold border-t-2">
                    <tr>
                      <td className="px-4 py-2 text-right">Total:</td>
                      <td className="px-4 py-2 text-right text-primary">LKR {paymentAmount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-primary">LKR {paymentAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Confirming will automatically generate the <strong>Sales Receipt</strong>, post the above Journal Entry, and link everything to <strong>{customerName}</strong>.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onConfirm}>
                Confirm & Post to GL <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
