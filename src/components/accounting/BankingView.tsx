import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, ArrowUpDown, CheckCircle2, RefreshCw, Landmark, Pencil } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useBankAccounts, useBankTransactions, useBankReconciliations } from "@/hooks/useAccountingData";
import { useBankFees } from "@/hooks/useBankFees";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccountForm } from "./BankAccountForm";
import { BankTransactionForm } from "./BankTransactionForm";
import { BankReconciliationWorksheet } from "./BankReconciliationWorksheet";
import { InterBankTransferForm } from "./InterBankTransferForm";
import { InterBankTransferList } from "./InterBankTransferList";
import { BankFeeForm } from "./BankFeeForm";
import { BankFeesList } from "./BankFeesList";
import { ChequeBookManagement } from "./ChequeBookManagement";

export const BankingView = () => {
  const [selectedBankId, setSelectedBankId] = useState<string | undefined>();
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showBankFeeForm, setShowBankFeeForm] = useState(false);
  
  const { data: bankAccounts, isLoading: accountsLoading } = useBankAccounts();
  const { data: transactions } = useBankTransactions(selectedBankId);
  const { data: reconciliations } = useBankReconciliations(selectedBankId);

  const bankColumns = [
    {
      accessorKey: "account_code",
      header: "Code",
      cell: ({ row }: any) => <span className="font-mono">{row.original.account_code}</span>,
    },
    {
      accessorKey: "account_name",
      header: "Account Name",
    },
    {
      accessorKey: "bank_name",
      header: "Bank",
    },
    {
      accessorKey: "account_number",
      header: "Account #",
      cell: ({ row }: any) => <span className="font-mono">{row.original.account_number}</span>,
    },
    {
      accessorKey: "account_type",
      header: "Type",
      cell: ({ row }: any) => <Badge variant="outline">{row.original.account_type || "Current"}</Badge>,
    },
    {
      accessorKey: "current_balance",
      header: "Balance",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.current_balance || 0} />
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "gl_account_id",
      header: "GL Sync",
      cell: ({ row }: any) => (
        row.original.gl_account_id ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Unlinked
          </Badge>
        )
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditingBankAccount(row.original);
            setShowBankForm(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const transactionColumns = [
    {
      accessorKey: "transaction_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.transaction_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "transaction_type",
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant={row.original.debit_amount ? "destructive" : "default"}>
          {row.original.transaction_type}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }: any) => <span className="font-mono text-sm">{row.original.reference || "-"}</span>,
    },
    {
      accessorKey: "debit_amount",
      header: "Debit",
      cell: ({ row }: any) => (
        <span className="text-destructive">
          {row.original.debit_amount ? <CurrencyDisplay amount={row.original.debit_amount} /> : "-"}
        </span>
      ),
    },
    {
      accessorKey: "credit_amount",
      header: "Credit",
      cell: ({ row }: any) => (
        <span className="text-green-600">
          {row.original.credit_amount ? <CurrencyDisplay amount={row.original.credit_amount} /> : "-"}
        </span>
      ),
    },
    {
      accessorKey: "running_balance",
      header: "Balance",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.running_balance || 0} />
        </span>
      ),
    },
    {
      accessorKey: "is_reconciled",
      header: "Reconciled",
      cell: ({ row }: any) => (
        row.original.is_reconciled ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
  ];

  const reconciliationColumns = [
    {
      accessorKey: "reconciliation_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.reconciliation_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "statement_date",
      header: "Statement Date",
      cell: ({ row }: any) => format(new Date(row.original.statement_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "statement_balance",
      header: "Statement Balance",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.statement_balance} />,
    },
    {
      accessorKey: "book_balance",
      header: "Book Balance",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.book_balance} />,
    },
    {
      accessorKey: "difference",
      header: "Difference",
      cell: ({ row }: any) => {
        const diff = row.original.difference || 0;
        return (
          <span className={diff !== 0 ? "text-destructive font-semibold" : "text-green-600"}>
            <CurrencyDisplay amount={diff} />
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "completed" ? "default" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  const totalBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Bank Accounts</p>
          <h3 className="text-2xl font-bold mt-1">{bankAccounts?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Accounts</p>
          <h3 className="text-2xl font-bold mt-1">
            {bankAccounts?.filter((a) => a.is_active).length || 0}
          </h3>
        </Card>
        <Card className="p-4 col-span-2">
          <p className="text-sm text-muted-foreground">Total Cash & Bank Balance</p>
          <h3 className="text-2xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalBalance} />
          </h3>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="transfers">Fund Transfers</TabsTrigger>
          <TabsTrigger value="bank_fees">Bank Fees</TabsTrigger>
          <TabsTrigger value="cheque_books">Cheque Books</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Bank Accounts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage bank and cash accounts
                </p>
              </div>
              <Button onClick={() => setShowBankForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>

            <DataTable enableColumnFilters columns={bankColumns} data={bankAccounts || []} searchKey="account_name" variant="professional" />
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Bank Transactions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage bank transactions
                </p>
              </div>
              <div className="flex gap-3">
                <Select value={selectedBankId || "_all"} onValueChange={(val) => setSelectedBankId(val === "_all" ? undefined : val)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Accounts</SelectItem>
                    {bankAccounts?.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowTransactionForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            </div>

            <DataTable enableColumnFilters columns={transactionColumns} data={transactions || []} searchKey="description" variant="professional" />
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Inter-Bank Fund Transfers</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transfer funds between bank accounts with automatic GL posting
                  </p>
                </div>
                <Button onClick={() => setShowTransferForm(true)}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  New Transfer
                </Button>
              </div>
            </Card>
            <InterBankTransferList />
          </div>
        </TabsContent>

        <TabsContent value="bank_fees">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Bank Fees & Charges</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track bank charges linked to AP payments and AR receipts
                </p>
              </div>
              <Button onClick={() => setShowBankFeeForm(true)}>
                <Landmark className="h-4 w-4 mr-2" />
                Add Bank Fee
              </Button>
            </div>
            <BankFeesList />
          </Card>
        </TabsContent>

        <TabsContent value="cheque_books">
          <ChequeBookManagement />
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Bank Reconciliation</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Reconcile bank statements with book records
                </p>
              </div>
              <div className="flex gap-3">
                <Select value={selectedBankId || "_none"} onValueChange={(val) => setSelectedBankId(val === "_none" ? undefined : val)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select an account</SelectItem>
                    {bankAccounts?.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowReconciliation(true)} disabled={!selectedBankId}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Reconciliation
                </Button>
              </div>
            </div>

            <DataTable enableColumnFilters columns={reconciliationColumns} data={reconciliations || []} searchKey="status" variant="professional" />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <BankAccountForm
        open={showBankForm}
        onOpenChange={(open) => {
          setShowBankForm(open);
          if (!open) setEditingBankAccount(null);
        }}
        bankAccount={editingBankAccount}
      />
      <BankTransactionForm 
        open={showTransactionForm} 
        onOpenChange={setShowTransactionForm}
      />
      <InterBankTransferForm
        open={showTransferForm}
        onOpenChange={setShowTransferForm}
      />
      <BankFeeForm
        open={showBankFeeForm}
        onOpenChange={setShowBankFeeForm}
      />
    </div>
  );
};
