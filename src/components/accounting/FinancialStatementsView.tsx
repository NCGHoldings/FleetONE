import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CashFlowView } from "./CashFlowView";

export const FinancialStatementsView = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: accounts } = useQuery({
    queryKey: ["accounts-summary", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

  const calculateTotals = (accountType: string) => {
    if (!accounts) return 0;
    return accounts
      .filter(acc => acc.account_type === accountType && acc.is_active)
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  };

  const totalAssets = calculateTotals("asset");
  const totalLiabilities = calculateTotals("liability");
  const totalEquity = calculateTotals("equity");
  const totalRevenue = calculateTotals("revenue");
  const totalExpenses = calculateTotals("expense");
  const netIncome = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Financial Statements</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View profit & loss, balance sheet, and cash flow statements
            </p>
          </div>
          <div className="flex gap-4">
            <DateRangePicker
              onDateRangeChange={(range) => setDateRange(range || {})}
            />
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pl" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          </TabsList>

          <TabsContent value="pl">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Revenue</h3>
                <div className="space-y-2">
                  {accounts?.filter(acc => acc.account_type === "revenue" && acc.is_active).map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b">
                      <span>{acc.account_name}</span>
                      <span className="font-mono">
                        LKR {(acc.current_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Total Revenue</span>
                    <span className="font-mono">
                      LKR {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Expenses</h3>
                <div className="space-y-2">
                  {accounts?.filter(acc => acc.account_type === "expense" && acc.is_active).map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b">
                      <span>{acc.account_name}</span>
                      <span className="font-mono">
                        LKR {(acc.current_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Total Expenses</span>
                    <span className="font-mono">
                      LKR {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2">
                <div className="flex justify-between py-3 font-bold text-xl">
                  <span>Net Income</span>
                  <span className={`font-mono ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                    LKR {netIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bs">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Assets</h3>
                <div className="space-y-2">
                  {accounts?.filter(acc => acc.account_type === "asset" && acc.is_active).map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b">
                      <span>{acc.account_name}</span>
                      <span className="font-mono">
                        LKR {(acc.current_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Total Assets</span>
                    <span className="font-mono">
                      LKR {totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Liabilities</h3>
                <div className="space-y-2">
                  {accounts?.filter(acc => acc.account_type === "liability" && acc.is_active).map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b">
                      <span>{acc.account_name}</span>
                      <span className="font-mono">
                        LKR {(acc.current_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Total Liabilities</span>
                    <span className="font-mono">
                      LKR {totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Equity</h3>
                <div className="space-y-2">
                  {accounts?.filter(acc => acc.account_type === "equity" && acc.is_active).map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b">
                      <span>{acc.account_name}</span>
                      <span className="font-mono">
                        LKR {(acc.current_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Total Equity</span>
                    <span className="font-mono">
                      LKR {totalEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2">
                <div className="flex justify-between py-3 font-bold text-xl">
                  <span>Total Liabilities & Equity</span>
                  <span className="font-mono">
                    LKR {(totalLiabilities + totalEquity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cf">
            <CashFlowView />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
