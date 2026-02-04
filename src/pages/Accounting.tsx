import { AppLayout } from "@/components/layout/AppLayout";
import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, DollarSign, TrendingUp, TrendingDown, AlertCircle, Building2, Users, Package, Truck, Landmark, HardDrive, Calculator, FileCheck, ClipboardCheck, BarChart3, Settings } from "lucide-react";
import { ChartOfAccountsView } from "@/components/accounting/ChartOfAccountsView";
import { JournalEntriesView } from "@/components/accounting/JournalEntriesView";
import { AccountsPayableView } from "@/components/accounting/AccountsPayableView";
import { AccountsReceivableView } from "@/components/accounting/AccountsReceivableView";
import { ARReceiptsView } from "@/components/accounting/ARReceiptsView";
import { APPaymentsView } from "@/components/accounting/APPaymentsView";
import { FinancialStatementsView } from "@/components/accounting/FinancialStatementsView";
import { TaxManagementView } from "@/components/accounting/TaxManagementView";
import { CustomerMasterView } from "@/components/accounting/CustomerMasterView";
import { VendorMasterView } from "@/components/accounting/VendorMasterView";
import { BankingView } from "@/components/accounting/BankingView";
import { FixedAssetsView } from "@/components/accounting/FixedAssetsView";
import { CostingBudgetView } from "@/components/accounting/CostingBudgetView";
import { VehicleOperatingCostView } from "@/components/accounting/VehicleOperatingCostView";
import { AuditReportsView } from "@/components/accounting/AuditReportsView";
import { InventoryView } from "@/components/accounting/InventoryView";
import { PurchaseOrderView } from "@/components/accounting/PurchaseOrderView";
import { PendingApprovalsView } from "@/components/accounting/PendingApprovalsView";
import { ChequeRegisterView } from "@/components/accounting/ChequeRegisterView";
import { RecurringEntriesView } from "@/components/accounting/RecurringEntriesView";
import { CashFlowView } from "@/components/accounting/CashFlowView";
import { DepreciationRunView } from "@/components/accounting/DepreciationRunView";
// Phase 1 New Components
import { CurrencyManagementView } from "@/components/accounting/CurrencyManagementView";
import { FinancialPeriodsView } from "@/components/accounting/FinancialPeriodsView";
import { PurchaseRequisitionView } from "@/components/accounting/PurchaseRequisitionView";
import { GoodsReceiptNoteView } from "@/components/accounting/GoodsReceiptNoteView";
import { InvoiceMatchingView } from "@/components/accounting/InvoiceMatchingView";
import { BankReconciliationWorksheet } from "@/components/accounting/BankReconciliationWorksheet";
import { TrialBalanceView } from "@/components/accounting/TrialBalanceView";
// Phase 2 Components
import { FundTransferForm } from "@/components/accounting/FundTransferForm";
import { AssetDisposalForm } from "@/components/accounting/AssetDisposalForm";
import { BadDebtProvisionView } from "@/components/accounting/BadDebtProvisionView";
import { PeriodClosingChecklistView } from "@/components/accounting/PeriodClosingChecklistView";
// Phase 3 Components
import { BatchSerialTrackingView } from "@/components/accounting/BatchSerialTrackingView";
import { WHTCertificateView } from "@/components/accounting/WHTCertificateView";
import { VendorPerformanceView } from "@/components/accounting/VendorPerformanceView";
// Gap Analysis - AR/AP Components
import { ARCreditNotesView } from "@/components/accounting/ARCreditNotesView";
import { ARAgeingReport } from "@/components/accounting/ARAgeingReport";
import { ARReconciliationView } from "@/components/accounting/ARReconciliationView";
import { APDebitNotesView } from "@/components/accounting/APDebitNotesView";
import { APAgeingReport } from "@/components/accounting/APAgeingReport";
import { APReconciliationView } from "@/components/accounting/APReconciliationView";
// Gap Analysis - Inventory Components
import { InventoryAgeingView } from "@/components/accounting/InventoryAgeingView";
import { StockReconciliationView } from "@/components/accounting/StockReconciliationView";
// Gap Analysis - Banking Components
import { CashbookView } from "@/components/accounting/CashbookView";
import { PaymentBatchView } from "@/components/accounting/PaymentBatchView";
// Gap Analysis - Fixed Assets Components
import { AssetRevaluationForm } from "@/components/accounting/AssetRevaluationForm";
import { AssetTransferForm } from "@/components/accounting/AssetTransferForm";
// Gap Analysis - Reports & Compliance
import { SSCLTransactionsView } from "@/components/accounting/SSCLTransactionsView";
import { SegmentReportView } from "@/components/accounting/SegmentReportView";
import { TaxReturnGeneratorView } from "@/components/accounting/TaxReturnGeneratorView";
// Gap Analysis - Settings & Admin
import { ApprovalConfigView } from "@/components/accounting/ApprovalConfigView";
import { UserActivityView } from "@/components/accounting/UserActivityView";
import { NotificationsView } from "@/components/accounting/NotificationsView";
import { DataImportWizard } from "@/components/accounting/DataImportWizard";
// Gap Analysis - Advance Allocations
import { AdvanceAllocationForm } from "@/components/accounting/AdvanceAllocationForm";
// Multi-company
import { CompanySwitcher } from "@/components/accounting/CompanySwitcher";
// Settings Components
import { CompanySettingsView } from "@/components/accounting/settings/CompanySettingsView";
import { DocumentTemplateManager } from "@/components/accounting/settings/DocumentTemplateManager";
import { ModuleIntegrationView } from "@/components/accounting/settings/ModuleIntegrationView";
import { BalanceReconciliationTool } from "@/components/accounting/settings/BalanceReconciliationTool";
// Expense Management
import { ExpenseReviewView } from "@/components/accounting/ExpenseReviewView";
import { CompanyExpensesView } from "@/components/accounting/CompanyExpensesView";
import { PettyCashView } from "@/components/accounting/PettyCashView";
import { IOUManagementView } from "@/components/accounting/IOUManagementView";

import { useAccountingSummary, useARInvoices, useAPInvoices, useJournalEntries } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Receipt, Wallet } from "lucide-react";

type ModuleTab = "gl" | "ar" | "ap" | "expenses" | "inventory" | "procurement" | "banking" | "assets" | "reports" | "settings";

const Accounting = () => {
  const [activeModule, setActiveModule] = useState<ModuleTab>("gl");
  const { data: summary, isLoading: summaryLoading } = useAccountingSummary();
  const { data: arInvoices } = useARInvoices();
  const { data: apInvoices } = useAPInvoices();
  const { data: journalEntries } = useJournalEntries();

  // Calculate overdue amounts
  const today = new Date();
  const arOverdue = arInvoices?.filter(inv => 
    new Date(inv.due_date) < today && inv.status !== "paid" && inv.status !== "cancelled"
  ) || [];
  const apOverdue = apInvoices?.filter(inv => 
    new Date(inv.due_date) < today && inv.status !== "paid" && inv.status !== "cancelled"
  ) || [];

  const arOverdueAmount = arOverdue.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const apOverdueAmount = apOverdue.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  // Recent journal entries (last 5)
  const recentJournals = journalEntries?.slice(0, 5) || [];

  const moduleButtons = [
    { id: "gl" as ModuleTab, label: "General Ledger", icon: BookOpen },
    { id: "ar" as ModuleTab, label: "AR", icon: TrendingUp },
    { id: "ap" as ModuleTab, label: "AP", icon: TrendingDown },
    { id: "expenses" as ModuleTab, label: "Expenses", icon: Receipt },
    { id: "inventory" as ModuleTab, label: "Inventory", icon: Package },
    { id: "procurement" as ModuleTab, label: "Procurement", icon: Truck },
    { id: "banking" as ModuleTab, label: "Banking", icon: Landmark },
    { id: "assets" as ModuleTab, label: "Fixed Assets", icon: HardDrive },
    { id: "reports" as ModuleTab, label: "Reports", icon: BarChart3 },
    { id: "settings" as ModuleTab, label: "Settings", icon: Settings },
  ];

  return (
    <PageAccessGuard pageId="accounting">
      <AppLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Finance & Accounting ERP</h1>
              <p className="text-muted-foreground mt-2">
                Complete accounting management with GL, AR/AP, Inventory, Procurement, Banking, Fixed Assets & Reporting
              </p>
            </div>
            <CompanySwitcher />
          </div>

          {/* Module Navigation */}
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            {moduleButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveModule(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeModule === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* General Ledger Module */}
          {activeModule === "gl" && (
            <Tabs defaultValue="dashboard" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
                  <TabsTrigger value="journal">Journal Entries</TabsTrigger>
                  <TabsTrigger value="recurring">Recurring Entries</TabsTrigger>
                  <TabsTrigger value="periods">Financial Periods</TabsTrigger>
                  <TabsTrigger value="currencies">Currencies</TabsTrigger>
                  <TabsTrigger value="period-closing">Period Closing</TabsTrigger>
                  <TabsTrigger value="approvals">Approvals</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="dashboard" className="space-y-6">
                {/* Financial Summary KPIs */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Assets</p>
                        <h3 className="text-2xl font-bold mt-2">
                          <CurrencyDisplay amount={summary?.totalAssets || 0} />
                        </h3>
                      </div>
                      <DollarSign className="h-10 w-10 text-primary" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Liabilities</p>
                        <h3 className="text-2xl font-bold mt-2">
                          <CurrencyDisplay amount={summary?.totalLiabilities || 0} />
                        </h3>
                      </div>
                      <FileText className="h-10 w-10 text-destructive" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <h3 className="text-2xl font-bold mt-2 text-green-600">
                          <CurrencyDisplay amount={summary?.totalRevenue || 0} />
                        </h3>
                      </div>
                      <TrendingUp className="h-10 w-10 text-green-600" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <h3 className="text-2xl font-bold mt-2 text-orange-600">
                          <CurrencyDisplay amount={summary?.totalExpenses || 0} />
                        </h3>
                      </div>
                      <TrendingDown className="h-10 w-10 text-orange-600" />
                    </div>
                  </Card>
                </div>

                {/* Net Income Card */}
                <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Income (Revenue - Expenses)</p>
                      <h3 className={`text-3xl font-bold mt-2 ${(summary?.netIncome || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                        <CurrencyDisplay amount={summary?.netIncome || 0} />
                      </h3>
                    </div>
                    <BookOpen className="h-12 w-12 text-primary opacity-50" />
                  </div>
                </Card>

                {/* AR/AP Overview */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Accounts Receivable Overview
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Outstanding</span>
                        <span className="font-semibold">
                          <CurrencyDisplay amount={arInvoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Overdue Invoices</span>
                        <Badge variant="destructive">{arOverdue.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Overdue Amount</span>
                        <span className="font-semibold text-destructive">
                          <CurrencyDisplay amount={arOverdueAmount} />
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                      Accounts Payable Overview
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Outstanding</span>
                        <span className="font-semibold">
                          <CurrencyDisplay amount={apInvoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Overdue Invoices</span>
                        <Badge variant="destructive">{apOverdue.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Overdue Amount</span>
                        <span className="font-semibold text-destructive">
                          <CurrencyDisplay amount={apOverdueAmount} />
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Journal Entries</h3>
                    {recentJournals.length > 0 ? (
                      <div className="space-y-3">
                        {recentJournals.map((entry) => (
                          <div key={entry.id} className="flex justify-between items-center py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">{entry.entry_number}</p>
                              <p className="text-sm text-muted-foreground">{entry.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                <CurrencyDisplay amount={entry.total_debit || 0} />
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(entry.entry_date), "MMM dd, yyyy")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent entries</p>
                    )}
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      Alerts & Notifications
                    </h3>
                    <div className="space-y-3">
                      {arOverdue.length > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <div>
                            <p className="font-medium text-destructive">{arOverdue.length} AR invoices overdue</p>
                            <p className="text-sm text-muted-foreground">
                              Total: <CurrencyDisplay amount={arOverdueAmount} />
                            </p>
                          </div>
                        </div>
                      )}
                      {apOverdue.length > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-medium text-orange-600">{apOverdue.length} AP invoices overdue</p>
                            <p className="text-sm text-muted-foreground">
                              Total: <CurrencyDisplay amount={apOverdueAmount} />
                            </p>
                          </div>
                        </div>
                      )}
                      {arOverdue.length === 0 && apOverdue.length === 0 && (
                        <p className="text-sm text-muted-foreground">No overdue accounts</p>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="coa">
                <ChartOfAccountsView />
              </TabsContent>

              <TabsContent value="journal">
                <JournalEntriesView />
              </TabsContent>

              <TabsContent value="recurring">
                <RecurringEntriesView />
              </TabsContent>

              <TabsContent value="periods">
                <FinancialPeriodsView />
              </TabsContent>

              <TabsContent value="currencies">
                <CurrencyManagementView />
              </TabsContent>

              <TabsContent value="period-closing">
                <PeriodClosingChecklistView />
              </TabsContent>

              <TabsContent value="approvals">
                <PendingApprovalsView />
              </TabsContent>
            </Tabs>
          )}

          {/* Accounts Receivable Module */}
          {activeModule === "ar" && (
            <Tabs defaultValue="customers" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="receipts">Receipts</TabsTrigger>
                  <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
                  <TabsTrigger value="advances">Advance Allocations</TabsTrigger>
                  <TabsTrigger value="ageing">Ageing Report</TabsTrigger>
                  <TabsTrigger value="bad-debts">Bad Debt Provisions</TabsTrigger>
                  <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="customers">
                <CustomerMasterView />
              </TabsContent>

              <TabsContent value="invoices">
                <AccountsReceivableView />
              </TabsContent>

              <TabsContent value="receipts">
                <ARReceiptsView />
              </TabsContent>

              <TabsContent value="credit-notes">
                <ARCreditNotesView />
              </TabsContent>

              <TabsContent value="advances">
                <AdvanceAllocationForm type="ar" />
              </TabsContent>

              <TabsContent value="ageing">
                <ARAgeingReport />
              </TabsContent>

              <TabsContent value="bad-debts">
                <BadDebtProvisionView />
              </TabsContent>

              <TabsContent value="reconciliation">
                <ARReconciliationView />
              </TabsContent>
            </Tabs>
          )}

          {/* Accounts Payable Module */}
          {activeModule === "ap" && (
            <Tabs defaultValue="vendors" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="debit-notes">Debit Notes</TabsTrigger>
                  <TabsTrigger value="advances">Advance Allocations</TabsTrigger>
                  <TabsTrigger value="ageing">Ageing Report</TabsTrigger>
                  <TabsTrigger value="wht">WHT Certificates</TabsTrigger>
                  <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
                  <TabsTrigger value="vendor-performance">Vendor Performance</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="vendors">
                <VendorMasterView />
              </TabsContent>

              <TabsContent value="invoices">
                <AccountsPayableView />
              </TabsContent>

              <TabsContent value="payments">
                <APPaymentsView />
              </TabsContent>

              <TabsContent value="debit-notes">
                <APDebitNotesView />
              </TabsContent>

              <TabsContent value="advances">
                <AdvanceAllocationForm type="ap" />
              </TabsContent>

              <TabsContent value="ageing">
                <APAgeingReport />
              </TabsContent>

              <TabsContent value="wht">
                <WHTCertificateView />
              </TabsContent>

              <TabsContent value="reconciliation">
                <APReconciliationView />
              </TabsContent>

              <TabsContent value="vendor-performance">
                <VendorPerformanceView />
              </TabsContent>
            </Tabs>
          )}

          {/* Expenses Module */}
          {activeModule === "expenses" && (
            <Tabs defaultValue="requests" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="requests">Expense Requests</TabsTrigger>
                  <TabsTrigger value="company">Company Expenses</TabsTrigger>
                  <TabsTrigger value="petty-cash">Petty Cash</TabsTrigger>
                  <TabsTrigger value="iou">IOUs</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="requests">
                <ExpenseReviewView />
              </TabsContent>

              <TabsContent value="company">
                <CompanyExpensesView />
              </TabsContent>

              <TabsContent value="petty-cash">
                <PettyCashView />
              </TabsContent>

              <TabsContent value="iou">
                <IOUManagementView />
              </TabsContent>
            </Tabs>
          )}

          {/* Inventory Module */}
          {activeModule === "inventory" && (
            <Tabs defaultValue="items" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="stock">Stock Levels</TabsTrigger>
                  <TabsTrigger value="batch-serial">Batch/Serial Tracking</TabsTrigger>
                  <TabsTrigger value="ageing">Inventory Ageing</TabsTrigger>
                  <TabsTrigger value="reconciliation">Stock Reconciliation</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="items">
                <InventoryView />
              </TabsContent>

              <TabsContent value="stock">
                <InventoryView />
              </TabsContent>

              <TabsContent value="batch-serial">
                <BatchSerialTrackingView />
              </TabsContent>

              <TabsContent value="ageing">
                <InventoryAgeingView />
              </TabsContent>

              <TabsContent value="reconciliation">
                <StockReconciliationView />
              </TabsContent>
            </Tabs>
          )}

          {/* Procurement Module */}
          {activeModule === "procurement" && (
            <Tabs defaultValue="requisitions" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="requisitions">Purchase Requisitions</TabsTrigger>
                  <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
                  <TabsTrigger value="grn">Goods Receipt Notes</TabsTrigger>
                  <TabsTrigger value="matching">Invoice Matching</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="requisitions">
                <PurchaseRequisitionView />
              </TabsContent>

              <TabsContent value="orders">
                <PurchaseOrderView />
              </TabsContent>

              <TabsContent value="grn">
                <GoodsReceiptNoteView />
              </TabsContent>

              <TabsContent value="matching">
                <InvoiceMatchingView />
              </TabsContent>
            </Tabs>
          )}

          {/* Banking Module */}
          {activeModule === "banking" && (
            <Tabs defaultValue="accounts" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="cashbook">Cashbook</TabsTrigger>
                  <TabsTrigger value="cheques">Cheque Register</TabsTrigger>
                  <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger>
                  <TabsTrigger value="transfers">Fund Transfers</TabsTrigger>
                  <TabsTrigger value="payment-batches">Payment Batches</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="accounts">
                <BankingView />
              </TabsContent>

              <TabsContent value="transactions">
                <BankingView />
              </TabsContent>

              <TabsContent value="cashbook">
                <CashbookView />
              </TabsContent>

              <TabsContent value="cheques">
                <ChequeRegisterView />
              </TabsContent>

              <TabsContent value="reconciliation">
                <BankReconciliationWorksheet />
              </TabsContent>

              <TabsContent value="transfers">
                <FundTransferForm />
              </TabsContent>

              <TabsContent value="payment-batches">
                <PaymentBatchView />
              </TabsContent>
            </Tabs>
          )}

          {/* Fixed Assets Module */}
          {activeModule === "assets" && (
            <Tabs defaultValue="register" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="register">Asset Register</TabsTrigger>
                  <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
                  <TabsTrigger value="revaluations">Revaluations</TabsTrigger>
                  <TabsTrigger value="transfers">Transfers</TabsTrigger>
                  <TabsTrigger value="disposals">Disposals</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="register">
                <FixedAssetsView />
              </TabsContent>

              <TabsContent value="depreciation">
                <DepreciationRunView />
              </TabsContent>

              <TabsContent value="revaluations">
                <AssetRevaluationForm />
              </TabsContent>

              <TabsContent value="transfers">
                <AssetTransferForm />
              </TabsContent>

              <TabsContent value="disposals">
                <AssetDisposalForm />
              </TabsContent>
            </Tabs>
          )}

          {/* Reports Module */}
          {activeModule === "reports" && (
            <Tabs defaultValue="trial-balance" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="fleet-costs">Fleet Operating Costs</TabsTrigger>
                  <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
                  <TabsTrigger value="statements">Financial Statements</TabsTrigger>
                  <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                  <TabsTrigger value="segments">Segment Reports</TabsTrigger>
                  <TabsTrigger value="tax">Tax Reports</TabsTrigger>
                  <TabsTrigger value="sscl">SSCL</TabsTrigger>
                  <TabsTrigger value="tax-returns">Tax Returns</TabsTrigger>
                  <TabsTrigger value="audit">Audit & Logs</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="fleet-costs">
                <VehicleOperatingCostView />
              </TabsContent>

              <TabsContent value="trial-balance">
                <TrialBalanceView />
              </TabsContent>

              <TabsContent value="statements">
                <FinancialStatementsView />
              </TabsContent>

              <TabsContent value="cashflow">
                <CashFlowView />
              </TabsContent>

              <TabsContent value="segments">
                <SegmentReportView />
              </TabsContent>

              <TabsContent value="tax">
                <TaxManagementView />
              </TabsContent>

              <TabsContent value="sscl">
                <SSCLTransactionsView />
              </TabsContent>

              <TabsContent value="tax-returns">
                <TaxReturnGeneratorView />
              </TabsContent>

              <TabsContent value="audit">
                <AuditReportsView />
              </TabsContent>
            </Tabs>
          )}

          {/* Settings Module */}
          {activeModule === "settings" && (
            <Tabs defaultValue="companies" className="space-y-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="companies">Companies</TabsTrigger>
                  <TabsTrigger value="module-integration">Module Integration</TabsTrigger>
                  <TabsTrigger value="templates">Document Templates</TabsTrigger>
                  <TabsTrigger value="costing">Costing & Budget</TabsTrigger>
                  <TabsTrigger value="approval-config">Approval Workflow</TabsTrigger>
                  <TabsTrigger value="user-activity">User Activity</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="data-import">Data Import</TabsTrigger>
                  <TabsTrigger value="reconciliation">Balance Reconciliation</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="companies">
                <CompanySettingsView />
              </TabsContent>

              <TabsContent value="module-integration">
                <ModuleIntegrationView />
              </TabsContent>

              <TabsContent value="templates">
                <DocumentTemplateManager />
              </TabsContent>

              <TabsContent value="costing">
                <CostingBudgetView />
              </TabsContent>

              <TabsContent value="approval-config">
                <ApprovalConfigView />
              </TabsContent>

              <TabsContent value="user-activity">
                <UserActivityView />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationsView />
              </TabsContent>

              <TabsContent value="data-import">
                <DataImportWizard />
              </TabsContent>

              <TabsContent value="reconciliation">
                <BalanceReconciliationTool />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AppLayout>
    </PageAccessGuard>
  );
};

export default Accounting;
