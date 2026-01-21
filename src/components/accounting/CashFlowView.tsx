import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useARReceipts, useAPPayments, useBankTransactions, useAccountingSummary } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export const CashFlowView = () => {
  const { data: arReceipts } = useARReceipts();
  const { data: apPayments } = useAPPayments();
  const { data: bankTransactions } = useBankTransactions();
  const { data: summary } = useAccountingSummary();

  const cashFlowData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Filter transactions for current month
    const monthReceipts = arReceipts?.filter(r => {
      const date = new Date(r.receipt_date);
      return date >= currentMonthStart && date <= currentMonthEnd;
    }) || [];

    const monthPayments = apPayments?.filter(p => {
      const date = new Date(p.payment_date);
      return date >= currentMonthStart && date <= currentMonthEnd;
    }) || [];

    // Operating Activities
    const operatingInflows = monthReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const operatingOutflows = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netOperating = operatingInflows - operatingOutflows;

    // For demo purposes, estimate investing and financing activities
    // In a real system, these would come from specific transaction types
    const investingOutflows = 0; // Asset purchases would go here
    const investingInflows = 0; // Asset sales would go here
    const netInvesting = investingInflows - investingOutflows;

    const financingInflows = 0; // Loans received, equity injections
    const financingOutflows = 0; // Loan repayments, dividends
    const netFinancing = financingInflows - financingOutflows;

    const netCashChange = netOperating + netInvesting + netFinancing;

    // Opening balance (simplified - would need historical data)
    const openingBalance = summary?.totalAssets || 0;
    const closingBalance = openingBalance + netCashChange;

    return {
      period: format(now, "MMMM yyyy"),
      operating: {
        inflows: operatingInflows,
        outflows: operatingOutflows,
        net: netOperating,
        details: {
          customerReceipts: operatingInflows,
          supplierPayments: operatingOutflows,
          employeePayments: 0,
          otherOperating: 0,
        },
      },
      investing: {
        inflows: investingInflows,
        outflows: investingOutflows,
        net: netInvesting,
        details: {
          assetPurchases: 0,
          assetSales: 0,
        },
      },
      financing: {
        inflows: financingInflows,
        outflows: financingOutflows,
        net: netFinancing,
        details: {
          loanProceeds: 0,
          loanRepayments: 0,
          dividends: 0,
        },
      },
      netCashChange,
      openingBalance,
      closingBalance,
    };
  }, [arReceipts, apPayments, summary]);

  const CashFlowSection = ({ 
    title, 
    data, 
    icon: Icon,
    color 
  }: { 
    title: string; 
    data: { inflows: number; outflows: number; net: number; details: Record<string, number> };
    icon: any;
    color: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-6 w-6 ${color}`} />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">
        {Object.entries(data.details).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </span>
            <span className={value >= 0 ? "text-green-600" : "text-destructive"}>
              <CurrencyDisplay amount={value} />
            </span>
          </div>
        ))}
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Net {title}</span>
          <span className={data.net >= 0 ? "text-green-600" : "text-destructive"}>
            <CurrencyDisplay amount={data.net} />
          </span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cash Flow Statement</h2>
          <p className="text-sm text-muted-foreground">
            For the period ending {cashFlowData.period}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Opening Cash</p>
          <h3 className="text-xl font-bold mt-1">
            <CurrencyDisplay amount={cashFlowData.openingBalance} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Cash Inflows</p>
          <h3 className="text-xl font-bold text-green-600 mt-1">
            <CurrencyDisplay amount={cashFlowData.operating.inflows} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Cash Outflows</p>
          <h3 className="text-xl font-bold text-destructive mt-1">
            <CurrencyDisplay amount={cashFlowData.operating.outflows} />
          </h3>
        </Card>
        <Card className="p-4 bg-primary/5">
          <p className="text-sm text-muted-foreground">Closing Cash</p>
          <h3 className="text-xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={cashFlowData.closingBalance} />
          </h3>
        </Card>
      </div>

      {/* Cash Flow Sections */}
      <div className="grid gap-6 md:grid-cols-3">
        <CashFlowSection
          title="Operating Activities"
          data={cashFlowData.operating}
          icon={DollarSign}
          color="text-blue-600"
        />
        <CashFlowSection
          title="Investing Activities"
          data={cashFlowData.investing}
          icon={TrendingDown}
          color="text-orange-600"
        />
        <CashFlowSection
          title="Financing Activities"
          data={cashFlowData.financing}
          icon={TrendingUp}
          color="text-purple-600"
        />
      </div>

      {/* Net Change Summary */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Net from Operating</p>
            <h3 className={`text-xl font-bold ${cashFlowData.operating.net >= 0 ? "text-green-600" : "text-destructive"}`}>
              <CurrencyDisplay amount={cashFlowData.operating.net} />
            </h3>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net from Investing</p>
            <h3 className={`text-xl font-bold ${cashFlowData.investing.net >= 0 ? "text-green-600" : "text-destructive"}`}>
              <CurrencyDisplay amount={cashFlowData.investing.net} />
            </h3>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net from Financing</p>
            <h3 className={`text-xl font-bold ${cashFlowData.financing.net >= 0 ? "text-green-600" : "text-destructive"}`}>
              <CurrencyDisplay amount={cashFlowData.financing.net} />
            </h3>
          </div>
          <div className="border-l pl-6">
            <p className="text-sm text-muted-foreground">Net Cash Change</p>
            <h3 className={`text-2xl font-bold ${cashFlowData.netCashChange >= 0 ? "text-green-600" : "text-destructive"}`}>
              <CurrencyDisplay amount={cashFlowData.netCashChange} />
            </h3>
          </div>
        </div>
      </Card>

      {/* Reconciliation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Cash Reconciliation</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span>Opening Cash Balance</span>
            <span className="font-semibold">
              <CurrencyDisplay amount={cashFlowData.openingBalance} />
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Add: Net Cash from Operations</span>
            <span className={cashFlowData.operating.net >= 0 ? "text-green-600" : "text-destructive"}>
              <CurrencyDisplay amount={cashFlowData.operating.net} />
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Add: Net Cash from Investing</span>
            <span className={cashFlowData.investing.net >= 0 ? "text-green-600" : "text-destructive"}>
              <CurrencyDisplay amount={cashFlowData.investing.net} />
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Add: Net Cash from Financing</span>
            <span className={cashFlowData.financing.net >= 0 ? "text-green-600" : "text-destructive"}>
              <CurrencyDisplay amount={cashFlowData.financing.net} />
            </span>
          </div>
          <div className="flex justify-between py-3 bg-muted/50 rounded-lg px-4 font-bold">
            <span>Closing Cash Balance</span>
            <span className="text-primary">
              <CurrencyDisplay amount={cashFlowData.closingBalance} />
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
