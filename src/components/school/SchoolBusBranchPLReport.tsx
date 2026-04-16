import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileSpreadsheet, Download, TrendingUp, TrendingDown, 
  Bus, Calendar, ArrowLeft, Loader2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import * as XLSX from "xlsx";

interface Props {
  branchId: string;
  branchName: string;
  branchCode: string;
  onBack: () => void;
}

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface BusPL {
  busId: string;
  busNo: string;
  routeName: string;
  income: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  driverSalary: number;
  caretakerSalary: number;
  parkingFee: number;
  otherExpenses: number;
  totalDirectExpenses: number;
  directProfit: number;
  leaseInstallment: number;
  totalNetProfit: number;
}

const EXPENSE_ROWS = [
  { key: "fuelExpenses" as const, label: "Fuel expenses" },
  { key: "maintenanceExpenses" as const, label: "Maintenance expenses" },
  { key: "driverSalary" as const, label: "Driver salary" },
  { key: "caretakerSalary" as const, label: "Caretaker salary" },
  { key: "parkingFee" as const, label: "Parking fee" },
  { key: "otherExpenses" as const, label: "Other expenses" },
];

const SchoolBusBranchPLReport = ({ branchId, branchName, branchCode, onBack }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const monthDate = useMemo(() => new Date(selectedMonth + "-01"), [selectedMonth]);
  const monthStart = useMemo(() => format(startOfMonth(monthDate), "yyyy-MM-dd"), [monthDate]);
  const monthEnd = useMemo(() => format(endOfMonth(monthDate), "yyyy-MM-dd"), [monthDate]);
  const monthLabel = useMemo(() => format(monthDate, "MMMM yyyy"), [monthDate]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      options.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  // ===== FETCH BUSES FOR THIS BRANCH =====
  const { data: buses = [] } = useQuery({
    queryKey: ["branch-buses-pl", branchId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fleet_buses")
        .select("id, bus_number, route_name, lease_monthly_amount")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .order("bus_number");
      return data || [];
    },
  });

  // ===== FETCH INCOME (school_payment_transactions) =====
  const { data: incomeData = [] } = useQuery({
    queryKey: ["sbs-income-pl", branchId, monthStart, monthEnd],
    queryFn: async () => {
      // Get income per bus: join students → route → bus
      const { data } = await (supabase as any)
        .from("school_payment_transactions")
        .select("amount_paid, student:school_bus_students(bus_id)")
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)
        .eq("student.branch_id", branchId);
      return data || [];
    },
  });

  // ===== FETCH EXPENSES (daily_bus_expenses) =====
  const { data: expenseData = [], isLoading } = useQuery({
    queryKey: ["sbs-expenses-pl", branchId, monthStart, monthEnd],
    queryFn: async () => {
      const busIds = buses.map((b: any) => b.id);
      if (busIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from("daily_bus_expenses")
        .select("bus_id, fuel_cost, salary, food, parking, body_wash, police, repair, tyre_tube, highway_charges, short_misc, runner, other, emission_fitness, permits_renewal, staff_accommodation, accident_compensation, log_sheet, vehicle_hire, ntc, temporary_permit, legal_court")
        .in("bus_id", busIds)
        .gte("expense_date", monthStart)
        .lte("expense_date", monthEnd);
      return data || [];
    },
    enabled: buses.length > 0,
  });

  // ===== COMPUTE P&L PER BUS =====
  const busPLData: BusPL[] = useMemo(() => {
    return buses.map((bus: any) => {
      // Compute income for this bus
      const busIncome = incomeData
        .filter((p: any) => p.student?.bus_id === bus.id)
        .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

      // Compute expenses for this bus
      const busExpenses = expenseData.filter((e: any) => e.bus_id === bus.id);
      
      const fuelExpenses = busExpenses.reduce((s: number, e: any) => s + (e.fuel_cost || 0), 0);
      const maintenanceExpenses = busExpenses.reduce((s: number, e: any) => 
        s + (e.repair || 0) + (e.tyre_tube || 0) + (e.body_wash || 0) + (e.emission_fitness || 0), 0);
      const driverSalary = busExpenses.reduce((s: number, e: any) => s + (e.salary || 0), 0);
      const caretakerSalary = busExpenses.reduce((s: number, e: any) => s + (e.food || 0), 0); // caretaker payments often in food category
      const parkingFee = busExpenses.reduce((s: number, e: any) => s + (e.parking || 0), 0);
      const otherExpenses = busExpenses.reduce((s: number, e: any) => 
        s + (e.police || 0) + (e.highway_charges || 0) + (e.short_misc || 0) + 
        (e.runner || 0) + (e.other || 0) + (e.permits_renewal || 0) + 
        (e.staff_accommodation || 0) + (e.accident_compensation || 0) + 
        (e.log_sheet || 0) + (e.vehicle_hire || 0) + (e.ntc || 0) + 
        (e.temporary_permit || 0) + (e.legal_court || 0), 0);

      const totalDirectExpenses = fuelExpenses + maintenanceExpenses + driverSalary + caretakerSalary + parkingFee + otherExpenses;
      const directProfit = busIncome - totalDirectExpenses;
      const leaseInstallment = bus.lease_monthly_amount || 0;
      const totalNetProfit = directProfit - leaseInstallment;

      return {
        busId: bus.id,
        busNo: bus.bus_number || "Unknown",
        routeName: bus.route_name || "",
        income: busIncome,
        fuelExpenses,
        maintenanceExpenses,
        driverSalary,
        caretakerSalary,
        parkingFee,
        otherExpenses,
        totalDirectExpenses,
        directProfit,
        leaseInstallment,
        totalNetProfit,
      };
    });
  }, [buses, incomeData, expenseData]);

  // ===== TOTALS COLUMN =====
  const totals = useMemo(() => {
    const t = {
      income: 0, fuelExpenses: 0, maintenanceExpenses: 0, driverSalary: 0,
      caretakerSalary: 0, parkingFee: 0, otherExpenses: 0,
      totalDirectExpenses: 0, directProfit: 0, leaseInstallment: 0, totalNetProfit: 0,
    };
    busPLData.forEach(b => {
      t.income += b.income;
      t.fuelExpenses += b.fuelExpenses;
      t.maintenanceExpenses += b.maintenanceExpenses;
      t.driverSalary += b.driverSalary;
      t.caretakerSalary += b.caretakerSalary;
      t.parkingFee += b.parkingFee;
      t.otherExpenses += b.otherExpenses;
      t.totalDirectExpenses += b.totalDirectExpenses;
      t.directProfit += b.directProfit;
      t.leaseInstallment += b.leaseInstallment;
      t.totalNetProfit += b.totalNetProfit;
    });
    return t;
  }, [busPLData]);

  // ===== EXPORT TO EXCEL =====
  const handleExport = () => {
    const headerRow = ["", ...busPLData.map(b => b.busNo), "Total"];
    const subHeader = ["", ...busPLData.map(b => branchCode), ""];
    
    const rows = [
      [`For the month of ${monthLabel}`],
      [],
      ["", `${branchName} branch`],
      headerRow,
      subHeader,
      [],
      ["School bus income", ...busPLData.map(b => b.income), totals.income],
      [],
      ["Total income", ...busPLData.map(b => b.income), totals.income],
      [],
      ["Fuel expenses", ...busPLData.map(b => b.fuelExpenses), totals.fuelExpenses],
      ["Maintenance expenses", ...busPLData.map(b => b.maintenanceExpenses), totals.maintenanceExpenses],
      ["Driver salary", ...busPLData.map(b => b.driverSalary), totals.driverSalary],
      ["Caretaker salary", ...busPLData.map(b => b.caretakerSalary), totals.caretakerSalary],
      ["Parking fee", ...busPLData.map(b => b.parkingFee), totals.parkingFee],
      ["Other expenses", ...busPLData.map(b => b.otherExpenses), totals.otherExpenses],
      [],
      ["Total direct expenses", ...busPLData.map(b => b.totalDirectExpenses), totals.totalDirectExpenses],
      [],
      ["Total direct profit", ...busPLData.map(b => b.directProfit), totals.directProfit],
      [],
      ["Lease Installment", ...busPLData.map(b => b.leaseInstallment), totals.leaseInstallment],
      ["Total Net profit", ...busPLData.map(b => b.totalNetProfit), totals.totalNetProfit],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L Report");
    XLSX.writeFile(wb, `SBS_PL_${branchCode}_${selectedMonth}.xlsx`);
  };

  return (
    <Card className="overflow-hidden">
      {/* HEADER */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bus className="w-5 h-5 text-blue-600" />
                {branchName} Branch — P&L Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Per-bus profit & loss analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              {/* TABLE HEADER */}
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th colSpan={busPLData.length + 2} className="p-3 text-center text-sm font-bold">
                    For the month of {monthLabel}
                  </th>
                </tr>
                <tr className="bg-blue-50 dark:bg-blue-950/30">
                  <th className="p-2 text-left font-semibold border text-xs w-[180px]">{branchName} branch</th>
                  {busPLData.map(b => (
                    <th key={b.busId} className="p-2 text-center border text-xs font-bold min-w-[100px]">
                      <div>{b.busNo}</div>
                      <div className="font-normal text-muted-foreground">{branchCode}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center border text-xs font-bold bg-blue-100 dark:bg-blue-900/30 min-w-[120px]">Total</th>
                </tr>
              </thead>

              <tbody>
                {/* INCOME */}
                <tr className="bg-green-50 dark:bg-green-950/20">
                  <td className="p-2 border text-xs font-medium">School bus income</td>
                  {busPLData.map(b => (
                    <td key={b.busId} className="p-2 border text-right text-xs tabular-nums">{fmt(b.income)}</td>
                  ))}
                  <td className="p-2 border text-right text-xs font-bold tabular-nums bg-green-100 dark:bg-green-900/30">{fmt(totals.income)}</td>
                </tr>

                {/* TOTAL INCOME */}
                <tr className="bg-green-100 dark:bg-green-900/20 font-bold">
                  <td className="p-2 border text-xs">Total income</td>
                  {busPLData.map(b => (
                    <td key={b.busId} className="p-2 border text-right text-xs tabular-nums font-bold">{fmt(b.income)}</td>
                  ))}
                  <td className="p-2 border text-right text-xs font-bold tabular-nums bg-green-200 dark:bg-green-800/30">{fmt(totals.income)}</td>
                </tr>

                {/* SPACER */}
                <tr><td colSpan={busPLData.length + 2} className="h-1 border-0"></td></tr>

                {/* EXPENSES */}
                {EXPENSE_ROWS.map(row => (
                  <tr key={row.key} className="hover:bg-muted/30">
                    <td className="p-2 border text-xs">{row.label}</td>
                    {busPLData.map(b => (
                      <td key={b.busId} className="p-2 border text-right text-xs tabular-nums">{fmt(b[row.key])}</td>
                    ))}
                    <td className="p-2 border text-right text-xs font-semibold tabular-nums bg-muted/30">{fmt(totals[row.key])}</td>
                  </tr>
                ))}

                {/* SPACER */}
                <tr><td colSpan={busPLData.length + 2} className="h-1 border-0"></td></tr>

                {/* TOTAL DIRECT EXPENSES */}
                <tr className="bg-red-50 dark:bg-red-950/20 font-bold">
                  <td className="p-2 border text-xs font-bold">Total direct expenses</td>
                  {busPLData.map(b => (
                    <td key={b.busId} className="p-2 border text-right text-xs tabular-nums font-bold text-red-600">{fmt(b.totalDirectExpenses)}</td>
                  ))}
                  <td className="p-2 border text-right text-xs font-bold tabular-nums text-red-600 bg-red-100 dark:bg-red-800/20">{fmt(totals.totalDirectExpenses)}</td>
                </tr>

                {/* SPACER */}
                <tr><td colSpan={busPLData.length + 2} className="h-1 border-0"></td></tr>

                {/* TOTAL DIRECT PROFIT */}
                <tr className="font-bold" style={{ background: totals.directProfit >= 0 ? "hsl(142 76% 36% / 0.08)" : "hsl(0 72% 51% / 0.08)" }}>
                  <td className="p-2 border text-xs font-bold">Total direct profit</td>
                  {busPLData.map(b => (
                    <td key={b.busId} className={`p-2 border text-right text-xs tabular-nums font-bold ${b.directProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {b.directProfit < 0 && "("}
                      {fmt(Math.abs(b.directProfit))}
                      {b.directProfit < 0 && ")"}
                    </td>
                  ))}
                  <td className={`p-2 border text-right text-xs font-bold tabular-nums ${totals.directProfit >= 0 ? "text-green-600 bg-green-100 dark:bg-green-800/20" : "text-red-600 bg-red-100 dark:bg-red-800/20"}`}>
                    {totals.directProfit < 0 && "("}
                    {fmt(Math.abs(totals.directProfit))}
                    {totals.directProfit < 0 && ")"}
                  </td>
                </tr>

                {/* SPACER */}
                <tr><td colSpan={busPLData.length + 2} className="h-1 border-0"></td></tr>

                {/* LEASE INSTALLMENT */}
                <tr className="hover:bg-muted/30">
                  <td className="p-2 border text-xs">Lease Installment</td>
                  {busPLData.map(b => (
                    <td key={b.busId} className="p-2 border text-right text-xs tabular-nums">{fmt(b.leaseInstallment)}</td>
                  ))}
                  <td className="p-2 border text-right text-xs font-semibold tabular-nums bg-muted/30">{fmt(totals.leaseInstallment)}</td>
                </tr>

                {/* NET PROFIT */}
                <tr className="font-bold text-base" style={{ background: totals.totalNetProfit >= 0 ? "hsl(142 76% 36% / 0.12)" : "hsl(0 72% 51% / 0.12)" }}>
                  <td className="p-2 border font-bold text-xs">Total Net profit</td>
                  {busPLData.map(b => (
                    <td key={b.busId} className={`p-2 border text-right text-xs tabular-nums font-bold ${b.totalNetProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {b.totalNetProfit < 0 && "("}
                      {fmt(Math.abs(b.totalNetProfit))}
                      {b.totalNetProfit < 0 && ")"}
                    </td>
                  ))}
                  <td className={`p-2 border text-right text-xs font-bold tabular-nums ${totals.totalNetProfit >= 0 ? "text-green-700 bg-green-200 dark:bg-green-700/30" : "text-red-700 bg-red-200 dark:bg-red-700/30"}`}>
                    {totals.totalNetProfit < 0 && "("}
                    {fmt(Math.abs(totals.totalNetProfit))}
                    {totals.totalNetProfit < 0 && ")"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* SUMMARY CARDS */}
        {!isLoading && busPLData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-t">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="font-bold text-green-600">LKR {fmt(totals.income)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="font-bold text-red-600">LKR {fmt(totals.totalDirectExpenses)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Direct Profit</p>
              <p className={`font-bold ${totals.directProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                LKR {fmt(totals.directProfit)}
              </p>
            </div>
            <div className={`rounded-lg p-3 text-center ${totals.totalNetProfit >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`font-bold text-lg ${totals.totalNetProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                LKR {fmt(totals.totalNetProfit)}
              </p>
              {totals.totalNetProfit >= 0 ? 
                <TrendingUp className="w-4 h-4 mx-auto mt-1 text-green-600" /> :
                <TrendingDown className="w-4 h-4 mx-auto mt-1 text-red-600" />
              }
            </div>
          </div>
        )}

        {!isLoading && busPLData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bus className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-semibold">No buses found for this branch</p>
            <p className="text-sm">Add buses to Fleet Management to see P&L data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SchoolBusBranchPLReport };
