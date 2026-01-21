import { AppLayout } from "@/components/layout/AppLayout";
import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { ChartOfAccountsView } from "@/components/accounting/ChartOfAccountsView";
import { JournalEntriesView } from "@/components/accounting/JournalEntriesView";
import { AccountsPayableView } from "@/components/accounting/AccountsPayableView";
import { AccountsReceivableView } from "@/components/accounting/AccountsReceivableView";
import { FinancialStatementsView } from "@/components/accounting/FinancialStatementsView";
import { TaxManagementView } from "@/components/accounting/TaxManagementView";
import { CustomerMasterView } from "@/components/accounting/CustomerMasterView";
import { VendorMasterView } from "@/components/accounting/VendorMasterView";
import { BankingView } from "@/components/accounting/BankingView";
import { FixedAssetsView } from "@/components/accounting/FixedAssetsView";
import { CostingBudgetView } from "@/components/accounting/CostingBudgetView";
import { AuditReportsView } from "@/components/accounting/AuditReportsView";
import { useAccountingSummary, useARInvoices, useAPInvoices, useJournalEntries } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const Accounting = () => {
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

  return (
    <PageAccessGuard pageId="accounting">
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Accounting & General Ledger</h1>
            <p className="text-muted-foreground mt-2">
              Complete accounting management system with chart of accounts, journal entries, AP/AR, and financial statements
            </p>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
              <TabsTrigger value="journal">Journal Entries</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
              <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
              <TabsTrigger value="banking">Banking</TabsTrigger>
              <TabsTrigger value="assets">Fixed Assets</TabsTrigger>
              <TabsTrigger value="costing">Costing & Budget</TabsTrigger>
              <TabsTrigger value="tax">Tax Management</TabsTrigger>
              <TabsTrigger value="statements">Statements</TabsTrigger>
              <TabsTrigger value="audit">Audit & Reports</TabsTrigger>
            </TabsList>

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

            <TabsContent value="customers">
              <CustomerMasterView />
            </TabsContent>

            <TabsContent value="vendors">
              <VendorMasterView />
            </TabsContent>

            <TabsContent value="ar">
              <AccountsReceivableView />
            </TabsContent>

            <TabsContent value="ap">
              <AccountsPayableView />
            </TabsContent>

            <TabsContent value="banking">
              <BankingView />
            </TabsContent>

            <TabsContent value="assets">
              <FixedAssetsView />
            </TabsContent>

            <TabsContent value="costing">
              <CostingBudgetView />
            </TabsContent>

            <TabsContent value="tax">
              <TaxManagementView />
            </TabsContent>

            <TabsContent value="statements">
              <FinancialStatementsView />
            </TabsContent>

            <TabsContent value="audit">
              <AuditReportsView />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </PageAccessGuard>
  );
};

export default Accounting;
