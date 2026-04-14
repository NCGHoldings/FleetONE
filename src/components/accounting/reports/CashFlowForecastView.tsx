import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Calendar, AlertTriangle } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format, addDays, addMonths } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";

const COLLECTION_RATES = {
  optimistic: 0.9,
  realistic: 0.75,
  pessimistic: 0.5,
};

export const CashFlowForecastView = () => {
  const { selectedCompany } = useCompany();

  // Fetch bank accounts for current balance
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank_accounts_forecast", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("bank_accounts")
        .select("current_balance")
        .eq("company_id", selectedCompany.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch AR invoices for receivables
  const { data: arInvoices } = useQuery({
    queryKey: ["ar_invoices_forecast", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("ar_invoices")
        .select("due_date, balance")
        .eq("company_id", selectedCompany.id)
        .neq("status", "paid")
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch AP invoices for payables
  const { data: apInvoices } = useQuery({
    queryKey: ["ap_invoices_forecast", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("ap_invoices")
        .select("due_date, balance")
        .eq("company_id", selectedCompany.id)
        .neq("status", "paid")
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Calculate current cash position
  const currentCash = useMemo(() => {
    return bankAccounts?.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0) || 0;
  }, [bankAccounts]);

  const totalReceivables = useMemo(() => {
    return arInvoices?.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
  }, [arInvoices]);

  const totalPayables = useMemo(() => {
    return apInvoices?.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
  }, [apInvoices]);

  // Generate forecast data for next 90 days
  const forecastData = useMemo(() => {
    const today = new Date();
    const data: any[] = [];
    
    for (let i = 0; i <= 90; i += 7) {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Calculate expected collections up to this date
      const expectedCollections = arInvoices?.filter((inv: any) => 
        new Date(inv.due_date) <= date
      ).reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
      
      // Calculate expected payments up to this date
      const expectedPayments = apInvoices?.filter((inv: any) => 
        new Date(inv.due_date) <= date
      ).reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;

      data.push({
        date: format(date, "MMM dd"),
        optimistic: currentCash + (expectedCollections * COLLECTION_RATES.optimistic) - expectedPayments,
        realistic: currentCash + (expectedCollections * COLLECTION_RATES.realistic) - expectedPayments,
        pessimistic: currentCash + (expectedCollections * COLLECTION_RATES.pessimistic) - expectedPayments,
      });
    }
    
    return data;
  }, [currentCash, arInvoices, apInvoices]);

  // Calculate 30/60/90 day projections
  const projections = useMemo(() => {
    const today = new Date();
    
    const calculate = (days: number) => {
      const targetDate = addDays(today, days);
      const collections = arInvoices?.filter((inv: any) => 
        new Date(inv.due_date) <= targetDate
      ).reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
      
      const payments = apInvoices?.filter((inv: any) => 
        new Date(inv.due_date) <= targetDate
      ).reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;

      return {
        optimistic: currentCash + (collections * COLLECTION_RATES.optimistic) - payments,
        realistic: currentCash + (collections * COLLECTION_RATES.realistic) - payments,
        pessimistic: currentCash + (collections * COLLECTION_RATES.pessimistic) - payments,
      };
    };

    return {
      day30: calculate(30),
      day60: calculate(60),
      day90: calculate(90),
    };
  }, [currentCash, arInvoices, apInvoices]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cash Flow Forecast</h2>
        <p className="text-muted-foreground">Project your cash position over the next 90 days</p>
      </div>

      {/* Current Position Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Cash</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={currentCash} />
            </div>
            <p className="text-xs text-muted-foreground">Total bank balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expected Inflows</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              <CurrencyDisplay amount={totalReceivables} />
            </div>
            <p className="text-xs text-muted-foreground">Outstanding receivables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expected Outflows</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <CurrencyDisplay amount={totalPayables} />
            </div>
            <p className="text-xs text-muted-foreground">Outstanding payables</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>90-Day Cash Flow Projection</CardTitle>
          <CardDescription>Three scenarios based on collection rates (90%, 75%, 50%)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => [`LKR ${value.toLocaleString()}`, ""]}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  name="Optimistic (90%)"
                  stroke="hsl(142 76% 36%)"
                  fill="hsl(142 76% 36% / 0.2)"
                />
                <Area
                  type="monotone"
                  dataKey="realistic"
                  name="Realistic (75%)"
                  stroke="hsl(221 83% 53%)"
                  fill="hsl(221 83% 53% / 0.2)"
                />
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  name="Pessimistic (50%)"
                  stroke="hsl(0 84% 60%)"
                  fill="hsl(0 84% 60% / 0.2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Projection Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "30-Day Projection", data: projections.day30 },
          { label: "60-Day Projection", data: projections.day60 },
          { label: "90-Day Projection", data: projections.day90 },
        ].map((proj) => (
          <Card key={proj.label}>
            <CardHeader>
              <CardTitle className="text-base">{proj.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Optimistic</span>
                <span className={`font-medium ${proj.data.optimistic >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  <CurrencyDisplay amount={proj.data.optimistic} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Realistic</span>
                <span className={`font-medium ${proj.data.realistic >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  <CurrencyDisplay amount={proj.data.realistic} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pessimistic</span>
                <span className={`font-medium ${proj.data.pessimistic >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  <CurrencyDisplay amount={proj.data.pessimistic} />
                </span>
              </div>
              {proj.data.pessimistic < 0 && (
                <div className="flex items-center gap-2 pt-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Cash shortfall risk</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
