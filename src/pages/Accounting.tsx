import { AppLayout } from "@/components/layout/AppLayout";
import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, DollarSign, TrendingUp } from "lucide-react";
import { ChartOfAccountsView } from "@/components/accounting/ChartOfAccountsView";
import { JournalEntriesView } from "@/components/accounting/JournalEntriesView";
import { AccountsPayableView } from "@/components/accounting/AccountsPayableView";
import { AccountsReceivableView } from "@/components/accounting/AccountsReceivableView";
import { FinancialStatementsView } from "@/components/accounting/FinancialStatementsView";
import { TaxManagementView } from "@/components/accounting/TaxManagementView";
import { CustomerMasterView } from "@/components/accounting/CustomerMasterView";
import { VendorMasterView } from "@/components/accounting/VendorMasterView";

const Accounting = () => {
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
              <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
              <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
              <TabsTrigger value="tax">Tax Management</TabsTrigger>
              <TabsTrigger value="statements">Financial Statements</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Assets</p>
                      <h3 className="text-2xl font-bold mt-2">LKR 0.00</h3>
                    </div>
                    <DollarSign className="h-10 w-10 text-primary" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Liabilities</p>
                      <h3 className="text-2xl font-bold mt-2">LKR 0.00</h3>
                    </div>
                    <FileText className="h-10 w-10 text-destructive" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <h3 className="text-2xl font-bold mt-2">LKR 0.00</h3>
                    </div>
                    <TrendingUp className="h-10 w-10 text-green-600" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <h3 className="text-2xl font-bold mt-2">LKR 0.00</h3>
                    </div>
                    <BookOpen className="h-10 w-10 text-orange-600" />
                  </div>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Journal Entries</h3>
                  <p className="text-sm text-muted-foreground">No recent entries</p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Overdue Accounts</h3>
                  <p className="text-sm text-muted-foreground">No overdue accounts</p>
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

            <TabsContent value="ap">
              <AccountsPayableView />
            </TabsContent>

            <TabsContent value="ar">
              <AccountsReceivableView />
            </TabsContent>

            <TabsContent value="tax">
              <TaxManagementView />
            </TabsContent>

            <TabsContent value="statements">
              <FinancialStatementsView />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </PageAccessGuard>
  );
};

export default Accounting;
