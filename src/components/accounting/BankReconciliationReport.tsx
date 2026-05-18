import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, CheckCircle, AlertTriangle, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

// --- Types ---
interface ClearedState {
  [transactionId: string]: {
    cleared: boolean;
    clearedAmount: number;
  };
}

interface ReconciliationSummary {
  paymentCount: number;
  paymentTotal: number;
  depositCount: number;
  depositTotal: number;
  clearedPaymentTotal: number;
  clearedDepositTotal: number;
  adjDepositTotal: number;
  adjPaymentTotal: number;
  bookBalance: number;
  clearedBookBalance: number;
  stmtEndBal: number;
  difference: number;
}

interface Adjustment {
  type: string;
  amount: number;
  description: string;
}

interface BankReconciliationReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount: any | null;
  statementDate: string;
  statementNo: string;
  statementBalance: number;
  statementOpeningBalance: number;
  clearedState: ClearedState;
  transactions: any[];
  adjustments: Adjustment[];
  summary: ReconciliationSummary;
}

// --- Helpers ---
const fmt = (n: number) =>
  n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const adjTypeLabel = (type: string): string => {
  switch (type) {
    case "bank_charge": return "Bank Charges";
    case "service_fee": return "Service Fee";
    case "interest_earned": return "Interest Earned";
    case "tax_deduction": return "Tax Deduction";
    case "correction": return "Correction Entry";
    default: return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
};

// ================ COMPONENT ================
export const BankReconciliationReport = ({
  open,
  onOpenChange,
  bankAccount,
  statementDate,
  statementNo,
  statementBalance,
  statementOpeningBalance,
  clearedState,
  transactions,
  adjustments,
  summary,
}: BankReconciliationReportProps) => {
  const { selectedCompany } = useCompany();

  // --- Derived lists ---
  const clearedTransactions = transactions.filter(
    (t) => clearedState[t.id]?.cleared
  );

  const clearedDeposits = clearedTransactions.filter(t => (t.debit_amount || 0) > 0);
  const clearedPayments = clearedTransactions.filter(t => (t.credit_amount || 0) > 0);

  const unclearedDeposits = transactions.filter(
    (t) =>
      !t.source_type?.startsWith("statement_import") &&
      !clearedState[t.id]?.cleared &&
      !t.is_reconciled &&
      (t.debit_amount || 0) > 0
  );

  const unclearedPayments = transactions.filter(
    (t) =>
      !t.source_type?.startsWith("statement_import") &&
      !clearedState[t.id]?.cleared &&
      !t.is_reconciled &&
      (t.credit_amount || 0) > 0
  );

  const totalDepositsInTransit = unclearedDeposits.reduce(
    (sum, t) => sum + (t.debit_amount || 0), 0
  );
  const totalOutstandingChecks = unclearedPayments.reduce(
    (sum, t) => sum + (t.credit_amount || 0), 0
  );

  const adjustedBookBalance = summary.clearedBookBalance;
  const difference = adjustedBookBalance - statementBalance;

  const handlePrint = () => {
    window.print();
  };

  if (!bankAccount) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto p-0 recon-report-dialog">
        {/* ---- Print-only styles ---- */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .recon-report-dialog,
            .recon-report-dialog * { visibility: visible !important; }
            .recon-report-dialog {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 20px !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              background: white !important;
              color: black !important;
              font-size: 11pt !important;
            }
            .recon-report-no-print { display: none !important; }
            .recon-report-section { break-inside: avoid; }
            table { font-size: 10pt !important; }
            * { color: black !important; background: white !important; }
          }
        `}</style>

        {/* ---- Screen-only header with actions ---- */}
        <div className="recon-report-no-print sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur">
          <DialogHeader className="p-0">
            <DialogTitle className="text-base font-semibold">Bank Reconciliation Report</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* =================== REPORT BODY =================== */}
        <div className="px-10 py-8 space-y-8 text-sm">

          {/* --- SAP B1 Style Report Header --- */}
          <div className="flex justify-between items-start border-b pb-6">
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-blue-900 mb-6">
                  Bank Reconciliation Report
               </h1>
               <div className="space-y-1">
                  <div className="flex"><strong className="w-44">G/L Account:</strong> <span>{bankAccount.account_number} ( {bankAccount.account_name} )</span></div>
                  <div className="flex"><strong className="w-44">Reconciliation Number:</strong> <span>{statementNo || "—"}</span></div>
                  <div className="flex"><strong className="w-44">Statement Date:</strong> <span>{statementDate ? format(new Date(statementDate + "T00:00:00"), "MM/dd/yy") : "—"}</span></div>
                  <div className="flex"><strong className="w-44">Statement Number:</strong> <span>{statementNo || "—"}</span></div>
               </div>
            </div>
            <div className="text-right">
               <h2 className="font-bold text-base">{selectedCompany?.name || "Company"}</h2>
               <div className="text-xs text-muted-foreground mt-4 space-y-1">
                 <div className="flex justify-end gap-2"><strong className="w-12 text-left">Date:</strong> <span className="w-24 text-right">{format(new Date(), "MM/dd/yy")}</span></div>
                 <div className="flex justify-end gap-2"><strong className="w-12 text-left">Time:</strong> <span className="w-24 text-right">{format(new Date(), "h:mm:ss a")}</span></div>
               </div>
            </div>
          </div>

          {/* --- Reconciliation Summary Header --- */}
          <div className="recon-report-section border border-blue-200 rounded-sm overflow-hidden">
            <div className="bg-blue-50/80 px-4 py-2 border-b border-blue-200 font-bold text-blue-900 text-[15px]">
              Reconciliation Summary
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-12 text-[13px]">
              {/* Bank Statement */}
              <div>
                <h3 className="font-bold mb-3 text-sm">Bank Statement</h3>
                <div className="flex justify-between py-0.5">
                  <span>Beginning Balance</span>
                  <span>LKR {fmt(statementOpeningBalance)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Cleared Cheques and Payments</span>
                  <span>LKR {summary.clearedPaymentTotal > 0 ? `(${fmt(summary.clearedPaymentTotal)})` : "0.00"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Cleared Deposits and Credits</span>
                  <span>LKR {fmt(summary.clearedDepositTotal)}</span>
                </div>
                <div className="flex justify-between py-0.5 font-bold mt-2">
                  <span>Ending Balance</span>
                  <span>LKR {fmt(statementBalance)}</span>
                </div>
              </div>

              {/* G/L Account */}
              <div>
                <h3 className="font-bold mb-3 text-sm">G/L Account</h3>
                <div className="flex justify-between py-0.5">
                  <span>Account Balance</span>
                  <span>LKR {fmt(summary.bookBalance)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Uncleared Cheques and Payments</span>
                  <span>LKR {fmt(totalOutstandingChecks)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Uncleared Deposits and Credits</span>
                  <span>LKR {totalDepositsInTransit > 0 ? `(${fmt(totalDepositsInTransit)})` : "0.00"}</span>
                </div>
                <div className="flex justify-between py-0.5 font-bold mt-2">
                  <span>Adjusted Account Balance</span>
                  <span>LKR {fmt(adjustedBookBalance)}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-blue-200 px-5 py-3 flex gap-[300px] font-bold text-sm bg-white">
               <span className="w-44">Variance</span>
               <span>LKR {fmt(Math.abs(difference))}</span>
            </div>
          </div>

          {/* --- Cleared Cheques and Payments Table --- */}
          {clearedPayments.length > 0 && (
            <div className="recon-report-section border border-blue-100 rounded-sm overflow-hidden">
              <div className="bg-blue-50/50 px-4 py-2 border-b border-blue-100 font-bold text-blue-900 text-sm">
                Cleared Cheques and Payments
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium w-12">Type</th>
                    <th className="text-left px-4 py-2 font-medium w-20">Trans. No.</th>
                    <th className="text-left px-4 py-2 font-medium w-20">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Payee / Description</th>
                    <th className="text-left px-4 py-2 font-medium w-28">Ref / Chq No.</th>
                    <th className="text-right px-4 py-2 font-medium w-28">Debit</th>
                    <th className="text-right px-4 py-2 font-medium w-28">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {clearedPayments.map((t) => (
                    <tr key={t.id} className="border-b border-muted/50 last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-1.5 text-muted-foreground">
                        {t.source_type?.includes('ap_payment') ? 'PS' : t.source_type?.includes('ar_receipt') ? 'RC' : t.source_type?.includes('statement') ? 'ST' : 'JV'}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">{t.id?.split('-')[0]}</td>
                      <td className="px-4 py-1.5">{format(new Date(t.transaction_date), "MM/dd/yy")}</td>
                      <td className="px-4 py-1.5 font-medium">{t.description || "—"}</td>
                      <td className="px-4 py-1.5">{t.reference || t.cheque_number || "—"}</td>
                      <td className="text-right px-4 py-1.5 text-muted-foreground">—</td>
                      <td className="text-right px-4 py-1.5">LKR {fmt(t.credit_amount || 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/5 font-bold border-t border-muted">
                    <td className="px-4 py-2 text-right" colSpan={6}>Total Cleared Payments</td>
                    <td className="text-right px-4 py-2">LKR {fmt(summary.clearedPaymentTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* --- Cleared Deposits and Credits Table --- */}
          {clearedDeposits.length > 0 && (
            <div className="recon-report-section border border-blue-100 rounded-sm overflow-hidden">
              <div className="bg-blue-50/50 px-4 py-2 border-b border-blue-100 font-bold text-blue-900 text-sm">
                Cleared Deposits and Credits
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium w-12">Type</th>
                    <th className="text-left px-4 py-2 font-medium w-20">Trans. No.</th>
                    <th className="text-left px-4 py-2 font-medium w-20">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Description</th>
                    <th className="text-left px-4 py-2 font-medium w-28">Ref / Chq No.</th>
                    <th className="text-right px-4 py-2 font-medium w-28">Debit</th>
                    <th className="text-right px-4 py-2 font-medium w-28">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {clearedDeposits.map((t) => (
                    <tr key={t.id} className="border-b border-muted/50 last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-1.5 text-muted-foreground">
                        {t.source_type?.includes('ap_payment') ? 'PS' : t.source_type?.includes('ar_receipt') ? 'RC' : t.source_type?.includes('statement') ? 'ST' : 'JV'}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">{t.id?.split('-')[0]}</td>
                      <td className="px-4 py-1.5">{format(new Date(t.transaction_date), "MM/dd/yy")}</td>
                      <td className="px-4 py-1.5 font-medium">{t.description || "—"}</td>
                      <td className="px-4 py-1.5">{t.reference || t.cheque_number || "—"}</td>
                      <td className="text-right px-4 py-1.5">LKR {fmt(t.debit_amount || 0)}</td>
                      <td className="text-right px-4 py-1.5 text-muted-foreground">—</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/5 font-bold border-t border-muted">
                    <td className="px-4 py-2 text-right" colSpan={5}>Total Cleared Deposits</td>
                    <td className="text-right px-4 py-2">LKR {fmt(summary.clearedDepositTotal)}</td>
                    <td className="text-right px-4 py-2 text-muted-foreground">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* --- Adjustments Table --- */}
          {adjustments.length > 0 && (
            <div className="recon-report-section border border-amber-100 rounded-sm overflow-hidden">
              <div className="bg-amber-50/50 px-4 py-2 border-b border-amber-100 font-bold text-amber-900 text-sm">
                Adjustments to Book Balance
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Description</th>
                    <th className="text-left px-4 py-2 font-medium w-40">Type</th>
                    <th className="text-right px-4 py-2 font-medium w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj, i) => (
                    <tr key={i} className="border-b border-muted/50 last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-1.5">{adj.description || "—"}</td>
                      <td className="px-4 py-1.5">{adjTypeLabel(adj.type)}</td>
                      <td className="text-right px-4 py-1.5">
                        {adj.type === "interest_earned" ? `LKR ${fmt(adj.amount)}` : `LKR (${fmt(adj.amount)})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
