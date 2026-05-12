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
  lastStatementBalance: number;
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
  lastStatementBalance,
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

  const adjustedBankBalance =
    statementBalance + totalDepositsInTransit - totalOutstandingChecks;

  const adjustedBookBalance = summary.clearedBookBalance;
  const difference = adjustedBookBalance - statementBalance;
  const isReconciled = Math.abs(summary.difference) < 0.01;

  const handlePrint = () => {
    window.print();
  };

  if (!bankAccount) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto p-0 recon-report-dialog">
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
        <div className="px-8 py-6 space-y-6">

          {/* --- Report Header --- */}
          <div className="text-center border-b pb-5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight">
                {selectedCompany?.name || "Company"}
              </h1>
            </div>
            <h2 className="text-base font-semibold text-muted-foreground">
              Bank Reconciliation Statement
            </h2>
            <div className="mt-3 flex flex-wrap justify-center gap-x-8 gap-y-1 text-sm text-muted-foreground">
              <span><strong>Account:</strong> {bankAccount.account_name} — {bankAccount.account_number}</span>
              <span><strong>Statement Date:</strong> {statementDate ? format(new Date(statementDate + "T00:00:00"), "dd MMM yyyy") : "—"}</span>
              {statementNo && <span><strong>Statement No:</strong> {statementNo}</span>}
              <span><strong>Report Date:</strong> {format(new Date(), "dd MMM yyyy, HH:mm")}</span>
            </div>
          </div>

          {/* --- Section A: Balance Per Bank Statement --- */}
          <div className="recon-report-section">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-semibold" colSpan={2}>
                    Section A — Balance Per Bank Statement
                  </th>
                  <th className="text-right px-3 py-2 font-semibold w-36">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2" colSpan={2}>Ending Balance as per Bank Statement</td>
                  <td className="text-right px-3 py-2 font-semibold">{fmt(statementBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Section B: Deposits in Transit --- */}
          <div className="recon-report-section">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-950/30">
                  <th className="text-left px-3 py-2 font-semibold">Section B — Add: Deposits in Transit</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Date</th>
                  <th className="text-left px-3 py-2 font-medium w-32">Reference</th>
                  <th className="text-right px-3 py-2 font-semibold w-36">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {unclearedDeposits.length === 0 ? (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-muted-foreground italic" colSpan={4}>No deposits in transit</td>
                  </tr>
                ) : (
                  unclearedDeposits.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-1.5 text-xs">{t.description || "—"}</td>
                      <td className="px-3 py-1.5 text-xs">{format(new Date(t.transaction_date), "dd/MM/yyyy")}</td>
                      <td className="px-3 py-1.5 text-xs">{t.reference || "—"}</td>
                      <td className="text-right px-3 py-1.5">{fmt(t.debit_amount || 0)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-semibold">
                  <td className="px-3 py-2" colSpan={3}>Total Deposits in Transit</td>
                  <td className="text-right px-3 py-2">{fmt(totalDepositsInTransit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Section C: Outstanding Checks --- */}
          <div className="recon-report-section">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50 dark:bg-orange-950/30">
                  <th className="text-left px-3 py-2 font-semibold">Section C — Less: Outstanding Checks/Payments</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Date</th>
                  <th className="text-left px-3 py-2 font-medium w-32">Reference</th>
                  <th className="text-right px-3 py-2 font-semibold w-36">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {unclearedPayments.length === 0 ? (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-muted-foreground italic" colSpan={4}>No outstanding checks</td>
                  </tr>
                ) : (
                  unclearedPayments.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-1.5 text-xs">{t.description || "—"}</td>
                      <td className="px-3 py-1.5 text-xs">{format(new Date(t.transaction_date), "dd/MM/yyyy")}</td>
                      <td className="px-3 py-1.5 text-xs">{t.reference || "—"}</td>
                      <td className="text-right px-3 py-1.5">({fmt(t.credit_amount || 0)})</td>
                    </tr>
                  ))
                )}
                <tr className="bg-orange-50/50 dark:bg-orange-950/20 font-semibold">
                  <td className="px-3 py-2" colSpan={3}>Total Outstanding Checks</td>
                  <td className="text-right px-3 py-2">({fmt(totalOutstandingChecks)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Section D: Adjusted Bank Balance --- */}
          <div className="recon-report-section">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-left px-3 py-2 font-bold" colSpan={2}>
                    Section D — Adjusted Bank Balance
                  </th>
                  <th className="text-right px-3 py-2 font-bold w-36">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-1.5" colSpan={2}>Balance per Bank Statement</td>
                  <td className="text-right px-3 py-1.5">{fmt(statementBalance)}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-1.5" colSpan={2}>Add: Deposits in Transit</td>
                  <td className="text-right px-3 py-1.5">{fmt(totalDepositsInTransit)}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-1.5" colSpan={2}>Less: Outstanding Checks</td>
                  <td className="text-right px-3 py-1.5">({fmt(totalOutstandingChecks)})</td>
                </tr>
                <tr className="bg-primary/5 font-bold border-t-2 border-primary/30">
                  <td className="px-3 py-2" colSpan={2}>Adjusted Bank Balance</td>
                  <td className="text-right px-3 py-2 text-base">{fmt(adjustedBankBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Divider --- */}
          <div className="border-t-2 border-dashed border-muted-foreground/30" />

          {/* --- Section E: Balance Per Books --- */}
          <div className="recon-report-section">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-semibold" colSpan={2}>
                    Section E — Balance Per Books (General Ledger)
                  </th>
                  <th className="text-right px-3 py-2 font-semibold w-36">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2" colSpan={2}>Book Balance (Last Stmt Balance + Total Activity)</td>
                  <td className="text-right px-3 py-2 font-semibold">{fmt(summary.bookBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Section F: Adjustments --- */}
          {adjustments.length > 0 && (
            <div className="recon-report-section">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 dark:bg-amber-950/30">
                    <th className="text-left px-3 py-2 font-semibold">Section F — Adjustments to Book Balance</th>
                    <th className="text-left px-3 py-2 font-medium w-32">Type</th>
                    <th className="text-right px-3 py-2 font-semibold w-36">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj, i) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-1.5">{adj.description}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                          adj.type === "interest_earned"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }`}>
                          {adjTypeLabel(adj.type)}
                        </span>
                      </td>
                      <td className="text-right px-3 py-1.5">
                        {adj.type === "interest_earned" ? fmt(adj.amount) : `(${fmt(adj.amount)})`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50/50 dark:bg-amber-950/20 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>Net Adjustment</td>
                    <td className="text-right px-3 py-2">
                      {fmt(summary.adjDepositTotal - summary.adjPaymentTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* --- Section G: Adjusted Book Balance --- */}
          <div className="recon-report-section">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-left px-3 py-2 font-bold" colSpan={2}>
                    Section G — Adjusted Book Balance
                  </th>
                  <th className="text-right px-3 py-2 font-bold w-36">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-1.5" colSpan={2}>Book Balance</td>
                  <td className="text-right px-3 py-1.5">{fmt(summary.bookBalance)}</td>
                </tr>
                {adjustments.length > 0 && (
                  <>
                    {summary.adjDepositTotal > 0 && (
                      <tr className="border-b">
                        <td className="px-3 py-1.5" colSpan={2}>Add: Interest / Credits</td>
                        <td className="text-right px-3 py-1.5">{fmt(summary.adjDepositTotal)}</td>
                      </tr>
                    )}
                    {summary.adjPaymentTotal > 0 && (
                      <tr className="border-b">
                        <td className="px-3 py-1.5" colSpan={2}>Less: Bank Charges / Fees</td>
                        <td className="text-right px-3 py-1.5">({fmt(summary.adjPaymentTotal)})</td>
                      </tr>
                    )}
                  </>
                )}
                <tr className="bg-primary/5 font-bold border-t-2 border-primary/30">
                  <td className="px-3 py-2" colSpan={2}>Adjusted Book Balance</td>
                  <td className="text-right px-3 py-2 text-base">{fmt(adjustedBookBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Reconciliation Status --- */}
          <div className={`recon-report-section rounded-lg border-2 p-4 ${
            isReconciled
              ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30"
              : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isReconciled ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {isReconciled ? "✓ Reconciliation Balanced" : "⚠ Unreconciled Difference"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isReconciled
                      ? "The adjusted bank balance matches the adjusted book balance."
                      : "There is a difference between the adjusted balances that needs to be resolved."}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Difference</p>
                <p className={`text-lg font-bold ${isReconciled ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  LKR {fmt(summary.difference)}
                </p>
              </div>
            </div>
          </div>

          {/* --- Matched Items Summary --- */}
          {clearedTransactions.length > 0 && (
            <div className="recon-report-section">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold">Cleared/Matched Transactions ({clearedTransactions.length})</th>
                    <th className="text-left px-3 py-2 font-medium w-28">Date</th>
                    <th className="text-left px-3 py-2 font-medium w-32">Reference</th>
                    <th className="text-right px-3 py-2 font-medium w-28">Debit</th>
                    <th className="text-right px-3 py-2 font-medium w-28">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {clearedTransactions.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-1 text-xs">{t.description || "—"}</td>
                      <td className="px-3 py-1 text-xs">{format(new Date(t.transaction_date), "dd/MM/yyyy")}</td>
                      <td className="px-3 py-1 text-xs">{t.reference || "—"}</td>
                      <td className="text-right px-3 py-1 text-xs">{(t.debit_amount || 0) > 0 ? fmt(t.debit_amount) : "—"}</td>
                      <td className="text-right px-3 py-1 text-xs">{(t.credit_amount || 0) > 0 ? fmt(t.credit_amount) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Total Cleared</td>
                    <td className="text-right px-3 py-2">{fmt(summary.clearedDepositTotal)}</td>
                    <td className="text-right px-3 py-2">{fmt(summary.clearedPaymentTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* --- Footer --- */}
          <div className="border-t pt-4 flex justify-between text-xs text-muted-foreground">
            <div>
              <p>Prepared on: {format(new Date(), "dd MMM yyyy, HH:mm:ss")}</p>
              <p>Bank Account: {bankAccount.account_name} ({bankAccount.account_number})</p>
            </div>
            <div className="text-right">
              <p>{selectedCompany?.name || "Company"}</p>
              <p>Bank Reconciliation Statement</p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
