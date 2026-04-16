import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Building2, Download, Loader2, MapPin, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { usePettyCashFunds, useAllPettyCashTransactions } from "@/hooks/usePettyCash";
import { EXPENSE_CATEGORIES, BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PettyCashReportsTab = () => {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [reportType, setReportType] = useState("branch");

  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = useAllPettyCashTransactions({
    dateFrom: dateFrom + "T00:00:00",
    dateTo: dateTo + "T23:59:59",
  });

  const { data: branches } = useQuery({
    queryKey: ["school-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_branches").select("id, branch_name").eq("is_active", true).order("branch_name");
      if (error) throw error;
      return data;
    },
  });

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getUnitLabel = (value: string) => {
    return BUSINESS_UNITS.find((u) => u.value === value)?.label || value;
  };

  // Branch-wise summary
  const branchSummary = () => {
    if (!funds) return [];
    const map = new Map<string, { name: string; totalBalance: number; disbursed: number; replenished: number; fundCount: number }>();
    
    for (const f of funds) {
      const branchName = f.branch?.branch_name || "Unassigned";
      const key = f.branch_id || "none";
      const existing = map.get(key) || { name: branchName, totalBalance: 0, disbursed: 0, replenished: 0, fundCount: 0 };
      existing.totalBalance += f.current_balance;
      existing.fundCount += 1;
      map.set(key, existing);
    }

    for (const t of (transactions || [])) {
      const fund = funds.find((f) => f.id === t.petty_cash_fund_id);
      const key = fund?.branch_id || "none";
      const existing = map.get(key);
      if (existing) {
        if (t.transaction_type === "disbursement") existing.disbursed += t.amount;
        else existing.replenished += t.amount;
      }
    }

    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  };

  // Section-wise (business unit) summary
  const sectionSummary = () => {
    if (!funds) return [];
    const map = new Map<string, { unit: string; totalBalance: number; disbursed: number; replenished: number; fundCount: number }>();
    
    for (const f of funds) {
      const key = f.business_unit_code;
      const existing = map.get(key) || { unit: key, totalBalance: 0, disbursed: 0, replenished: 0, fundCount: 0 };
      existing.totalBalance += f.current_balance;
      existing.fundCount += 1;
      map.set(key, existing);
    }

    for (const t of (transactions || [])) {
      const fund = funds.find((f) => f.id === t.petty_cash_fund_id);
      const key = fund?.business_unit_code || "Unknown";
      const existing = map.get(key);
      if (existing) {
        if (t.transaction_type === "disbursement") existing.disbursed += t.amount;
        else existing.replenished += t.amount;
      }
    }

    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  };

  // Category-wise spending
  const categorySummary = () => {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of (transactions || [])) {
      if (t.transaction_type !== "disbursement") continue;
      const cat = t.expense_category || "uncategorized";
      const existing = map.get(cat) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += t.amount;
      map.set(cat, existing);
    }
    return Array.from(map.entries())
      .map(([cat, v]) => ({ category: cat, ...v }))
      .sort((a, b) => b.total - a.total);
  };

  // Fund utilization
  const fundUtilization = () => {
    if (!funds) return [];
    return funds.map((f) => {
      const fundTxns = (transactions || []).filter((t) => t.petty_cash_fund_id === f.id);
      const disbursed = fundTxns.filter((t) => t.transaction_type === "disbursement").reduce((s, t) => s + t.amount, 0);
      const replenished = fundTxns.filter((t) => t.transaction_type === "replenishment").reduce((s, t) => s + t.amount, 0);
      const utilization = f.opening_balance > 0 ? (disbursed / f.opening_balance) * 100 : 0;
      return { ...f, disbursed, replenished, utilization };
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">Report</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="branch">Branch-wise</SelectItem>
                <SelectItem value="section">Section-wise</SelectItem>
                <SelectItem value="category">Category-wise</SelectItem>
                <SelectItem value="utilization">Fund Utilization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {reportType === "branch" && (
            <Card>
              <div className="p-4 border-b flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Branch-wise Summary</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Funds</TableHead>
                    <TableHead className="text-right">Total Balance</TableHead>
                    <TableHead className="text-right">Disbursed</TableHead>
                    <TableHead className="text-right">Replenished</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchSummary().map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.fundCount}</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={row.totalBalance} /></TableCell>
                      <TableCell className="text-right text-destructive"><CurrencyDisplay amount={row.disbursed} /></TableCell>
                      <TableCell className="text-right text-green-600"><CurrencyDisplay amount={row.replenished} /></TableCell>
                      <TableCell className="text-right font-semibold">
                        <CurrencyDisplay amount={row.replenished - row.disbursed} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {reportType === "section" && (
            <Card>
              <div className="p-4 border-b flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Section-wise Summary</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Unit</TableHead>
                    <TableHead className="text-right">Funds</TableHead>
                    <TableHead className="text-right">Total Balance</TableHead>
                    <TableHead className="text-right">Disbursed</TableHead>
                    <TableHead className="text-right">Replenished</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionSummary().map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{getUnitLabel(row.unit)}</TableCell>
                      <TableCell className="text-right">{row.fundCount}</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={row.totalBalance} /></TableCell>
                      <TableCell className="text-right text-destructive"><CurrencyDisplay amount={row.disbursed} /></TableCell>
                      <TableCell className="text-right text-green-600"><CurrencyDisplay amount={row.replenished} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {reportType === "category" && (
            <Card>
              <div className="p-4 border-b flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Category-wise Spending</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySummary().map((row) => (
                    <TableRow key={row.category}>
                      <TableCell className="font-medium">{getCategoryLabel(row.category)}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        <CurrencyDisplay amount={row.total} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {categorySummary().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No disbursements in this period</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {reportType === "utilization" && (
            <Card>
              <div className="p-4 border-b flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Fund Utilization Report</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Disbursed</TableHead>
                    <TableHead className="text-right">Replenished</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Utilization %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundUtilization().map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.fund_name}</TableCell>
                      <TableCell><Badge variant="outline">{row.business_unit_code}</Badge></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={row.opening_balance} /></TableCell>
                      <TableCell className="text-right text-destructive"><CurrencyDisplay amount={row.disbursed} /></TableCell>
                      <TableCell className="text-right text-green-600"><CurrencyDisplay amount={row.replenished} /></TableCell>
                      <TableCell className="text-right font-semibold"><CurrencyDisplay amount={row.current_balance} /></TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.utilization > 80 ? "destructive" : row.utilization > 50 ? "secondary" : "outline"}>
                          {row.utilization.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
