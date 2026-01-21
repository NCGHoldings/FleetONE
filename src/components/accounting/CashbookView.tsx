import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Search, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { useBankTransactions, useBankAccounts } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const CashbookView = () => {
  const { data: transactions, isLoading } = useBankTransactions();
  const { data: bankAccounts } = useBankAccounts();
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchTerm, setSearchTerm] = useState("");

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);

    return transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      const matchesMonth = transactionDate >= monthStart && transactionDate <= monthEnd;
      const matchesAccount = selectedAccount === "all" || t.bank_account_id === selectedAccount;
      const matchesSearch = !searchTerm || 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMonth && matchesAccount && matchesSearch;
    }).sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
  }, [transactions, selectedMonth, selectedAccount, searchTerm]);

  // Calculate running balance and totals
  const { transactionsWithBalance, summary } = useMemo(() => {
    let balance = 0;
    let totalReceipts = 0;
    let totalPayments = 0;

    const withBalance = filteredTransactions.map(t => {
      const debit = t.debit_amount || 0;
      const credit = t.credit_amount || 0;
      totalReceipts += credit;
      totalPayments += debit;
      balance += credit - debit;
      return { ...t, runningBalance: balance };
    });

    return {
      transactionsWithBalance: withBalance,
      summary: { totalReceipts, totalPayments, netMovement: totalReceipts - totalPayments },
    };
  }, [filteredTransactions]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><p className="text-muted-foreground">Loading cashbook...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cashbook</h2>
          <p className="text-sm text-muted-foreground">
            Cash and bank transaction register
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <h3 className="text-xl font-bold"><CurrencyDisplay amount={0} /></h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Receipts</p>
              <h3 className="text-xl font-bold text-green-600"><CurrencyDisplay amount={summary.totalReceipts} /></h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <h3 className="text-xl font-bold text-red-600"><CurrencyDisplay amount={summary.totalPayments} /></h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Closing Balance</p>
              <h3 className="text-xl font-bold text-primary"><CurrencyDisplay amount={summary.netMovement} /></h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-9" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {bankAccounts?.map(acc => (
              <SelectItem key={acc.id} value={acc.id}>{acc.account_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cashbook Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-2 font-semibold">Date</th>
                <th className="text-left py-3 px-2 font-semibold">Description</th>
                <th className="text-left py-3 px-2 font-semibold">Reference</th>
                <th className="text-left py-3 px-2 font-semibold">Account</th>
                <th className="text-right py-3 px-2 font-semibold text-green-600">Receipts (Cr)</th>
                <th className="text-right py-3 px-2 font-semibold text-red-600">Payments (Dr)</th>
                <th className="text-right py-3 px-2 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactionsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions for selected period
                  </td>
                </tr>
              ) : (
                transactionsWithBalance.map(t => {
                  const account = bankAccounts?.find(a => a.id === t.bank_account_id);
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2"><DateDisplay date={t.transaction_date} /></td>
                      <td className="py-3 px-2">{t.description || "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">{t.reference || "—"}</td>
                      <td className="py-3 px-2 text-xs">
                        {account?.account_name || "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-green-600">
                        {t.credit_amount ? <CurrencyDisplay amount={t.credit_amount} /> : "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-red-600">
                        {t.debit_amount ? <CurrencyDisplay amount={t.debit_amount} /> : "—"}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${t.runningBalance >= 0 ? "" : "text-destructive"}`}>
                        <CurrencyDisplay amount={t.runningBalance} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td colSpan={4} className="py-3 px-2">Period Totals</td>
                <td className="py-3 px-2 text-right text-green-600">
                  <CurrencyDisplay amount={summary.totalReceipts} />
                </td>
                <td className="py-3 px-2 text-right text-red-600">
                  <CurrencyDisplay amount={summary.totalPayments} />
                </td>
                <td className="py-3 px-2 text-right">
                  <CurrencyDisplay amount={summary.netMovement} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
