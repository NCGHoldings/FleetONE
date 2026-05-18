import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, BarChart3, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BusFinancial {
  routeId: string;
  routeName: string;
  busRegNo: string;
  income: number;
  fuel: number;
  maintenance: number;
  driverSalary: number;
  caretakerSalary: number;
  parking: number;
  otherExpenses: number;
  leaseInstallment: number;
  totalDirectExpenses: number;
  directProfit: number;
  netProfit: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899"];

export default function SchoolBranchReports() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busData, setBusData] = useState<BusFinancial[]>([]);
  const [branchName, setBranchName] = useState("");
  const [unmatchedStats, setUnmatchedStats] = useState({ count: 0, amount: 0 });

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const periodStart = useMemo(() => startOfMonth(new Date(selectedYear, selectedMonth)), [selectedMonth, selectedYear]);
  const periodEnd = useMemo(() => endOfMonth(new Date(selectedYear, selectedMonth)), [selectedMonth, selectedYear]);

  useEffect(() => {
    if (branchId) fetchData();
  }, [branchId, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch branch name
      const { data: branch } = await supabase
        .from("school_branches")
        .select("branch_name")
        .eq("id", branchId!)
        .single();
      if (branch) setBranchName(branch.branch_name);

      // Fetch routes for branch
      const { data: routes } = await supabase
        .from("school_routes")
        .select("*")
        .eq("branch_id", branchId!)
        .eq("is_active", true);

      if (!routes || routes.length === 0) {
        setBusData([]);
        setLoading(false);
        return;
      }

      const routeIds = routes.map(r => r.id);
      const fromStr = format(periodStart, "yyyy-MM-dd");
      const toStr = format(periodEnd, "yyyy-MM-dd");

      // Fetch all data in parallel using robust GL and Transaction tables
      const [transactionsRes, expensesRes, staffRes, busesRes, importsRes] = await Promise.all([
        supabase
          .from("school_ar_invoices")
          .select(`
            amount, 
            invoice_month,
            school_students!inner(bus_reg_no, route, branch_id),
            ar_invoices!inner(id)
          `)
          .eq("school_students.branch_id", branchId!)
          .gte("invoice_month", fromStr)
          .lte("invoice_month", toStr)
          .in("status", ["posted", "paid", "partial"])
          .limit(10000),
        supabase
          .from("journal_entry_lines")
          .select(`
            debit, 
            credit, 
            bus_id, 
            journal_entries!inner(entry_date, status), 
            chart_of_accounts!inner(account_name, account_type)
          `)
          .eq("journal_entries.status", "posted")
          .gte("journal_entries.entry_date", fromStr)
          .lte("journal_entries.entry_date", toStr)
          .eq("chart_of_accounts.account_type", "expense")
          .not("bus_id", "is", null),
        supabase
          .from("staff_registry")
          .select("staff_type, monthly_salary, assigned_bus")
          .not("assigned_bus", "is", null)
          .eq("is_active", true),
        supabase
          .from("buses")
          .select("id, bus_no"),
        supabase
          .from("school_payment_imports")
          .select(`
            id,
            school_payment_import_items ( amount, match_status )
          `)
          .eq("branch_id", branchId!)
      ]);

      const transactions = transactionsRes.data || [];
      const expenses = expensesRes.data || [];
      const staff = staffRes.data || [];
      const busesList = busesRes.data || [];
      const importsList = importsRes.data || [];

      let branchUnmatchedAmount = 0;
      let branchUnmatchedCount = 0;
      importsList.forEach(imp => {
        if (imp.school_payment_import_items) {
          imp.school_payment_import_items.forEach((item: any) => {
            if (item.match_status === 'unmatched' || item.match_status === 'posted_unmatched') {
              branchUnmatchedCount += 1;
              branchUnmatchedAmount += Number(item.amount) || 0;
            }
          });
        }
      });
      setUnmatchedStats({ count: branchUnmatchedCount, amount: branchUnmatchedAmount });

      // Helper to find bus_no from bus_id
      const getBusNo = (busId: string | null) => {
        if (!busId) return null;
        const bus = busesList.find(b => b.id === busId);
        return bus ? bus.bus_no : null;
      };

      const normalizeReg = (val: string | null | undefined) => {
        if (!val) return "";
        return val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      };

      // Build per-bus financials
      const financials: BusFinancial[] = routes.map(route => {
        const normRouteBus = normalizeReg(route.bus_reg_no);
        
        // 1. Income from accrued AR Invoices
        const routeInvoices = transactions.filter(inv => {
           const student = Array.isArray(inv.school_students) ? inv.school_students[0] : inv.school_students;
           if (!student) return false;
           return student.route === route.route_name || normalizeReg(student.bus_reg_no) === normRouteBus;
        });
        const income = routeInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

        // 2. Expenses from actual General Ledger entries tied to the bus
        const routeExpenses = expenses.filter(e => {
           const busNo = getBusNo(e.bus_id);
           return normRouteBus && normalizeReg(busNo) === normRouteBus;
        });
        
        let fuel = 0, maintenance = 0, parking = 0, lease = 0, other = 0;
        
        routeExpenses.forEach(e => {
           const amount = (Number(e.debit) || 0) - (Number(e.credit) || 0);
           const acct = Array.isArray(e.chart_of_accounts) ? e.chart_of_accounts[0] : e.chart_of_accounts;
           const acctName = (acct?.account_name || "").toLowerCase();
           
           if (acctName.includes("fuel")) fuel += amount;
           else if (acctName.includes("maintenance") || acctName.includes("repair")) maintenance += amount;
           else if (acctName.includes("parking")) parking += amount;
           else if (acctName.includes("lease")) lease += amount;
           else other += amount;
        });

        // 3. Staff costs (recurring configs)
        const routeStaff = staff.filter(s => normRouteBus && s.assigned_bus && normalizeReg(s.assigned_bus) === normRouteBus);
        const driverSalary = routeStaff.filter(s => s.staff_type === "driver").reduce((s, st) => s + Number(st.monthly_salary || 0), 0);
        const caretakerSalary = routeStaff.filter(s => s.staff_type === "caretaker" || s.staff_type === "conductor").reduce((s, st) => s + Number(st.monthly_salary || 0), 0);

        const totalDirectExpenses = fuel + maintenance + driverSalary + caretakerSalary + parking + other;
        const directProfit = income - totalDirectExpenses;
        const netProfit = directProfit - lease;

        return {
          routeId: route.id,
          routeName: route.route_name,
          busRegNo: route.bus_reg_no || "N/A",
          income,
          fuel,
          maintenance,
          driverSalary,
          caretakerSalary,
          parking,
          otherExpenses: other,
          leaseInstallment: lease,
          totalDirectExpenses,
          directProfit,
          netProfit,
        };
      });

      setBusData(financials);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({ title: "Error", description: "Failed to load report data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Totals
  const totals = useMemo(() => {
    return busData.reduce(
      (t, b) => ({
        income: t.income + b.income,
        fuel: t.fuel + b.fuel,
        maintenance: t.maintenance + b.maintenance,
        driverSalary: t.driverSalary + b.driverSalary,
        caretakerSalary: t.caretakerSalary + b.caretakerSalary,
        parking: t.parking + b.parking,
        otherExpenses: t.otherExpenses + b.otherExpenses,
        leaseInstallment: t.leaseInstallment + b.leaseInstallment,
        totalDirectExpenses: t.totalDirectExpenses + b.totalDirectExpenses,
        directProfit: t.directProfit + b.directProfit,
        netProfit: t.netProfit + b.netProfit,
      }),
      { income: 0, fuel: 0, maintenance: 0, driverSalary: 0, caretakerSalary: 0, parking: 0, otherExpenses: 0, leaseInstallment: 0, totalDirectExpenses: 0, directProfit: 0, netProfit: 0 }
    );
  }, [busData]);

  // Chart data
  const incomeVsExpenseData = useMemo(() => busData.map(b => ({
    name: b.busRegNo,
    Income: b.income,
    Expenses: b.totalDirectExpenses,
  })), [busData]);

  const expenseBreakdownData = useMemo(() => busData.map(b => ({
    name: b.busRegNo,
    Fuel: b.fuel,
    Maintenance: b.maintenance,
    "Driver Salary": b.driverSalary,
    "Caretaker Salary": b.caretakerSalary,
    Parking: b.parking,
    Other: b.otherExpenses,
  })), [busData]);

  const profitData = useMemo(() => busData.map(b => ({
    name: b.busRegNo,
    "Net Profit": b.netProfit,
    fill: b.netProfit >= 0 ? "#10b981" : "#ef4444",
  })), [busData]);

  const pieData = useMemo(() => {
    const cats = [
      { name: "Fuel", value: totals.fuel },
      { name: "Maintenance", value: totals.maintenance },
      { name: "Driver Salary", value: totals.driverSalary },
      { name: "Caretaker Salary", value: totals.caretakerSalary },
      { name: "Parking", value: totals.parking },
      { name: "Other", value: totals.otherExpenses },
    ];
    return cats.filter(c => c.value > 0);
  }, [totals]);

  const fmtCurrency = (v: number) => `LKR ${v.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Excel Export
  const exportExcel = () => {
    const rows = [
      { label: "School Bus Income", key: "income", isHeader: false },
      { label: "", key: "spacer1", isHeader: false },
      { label: "EXPENSES", key: "expHeader", isHeader: true },
      { label: "Fuel Expenses", key: "fuel", isHeader: false },
      { label: "Maintenance Expenses", key: "maintenance", isHeader: false },
      { label: "Driver Salary", key: "driverSalary", isHeader: false },
      { label: "Caretaker Salary", key: "caretakerSalary", isHeader: false },
      { label: "Parking Fee", key: "parking", isHeader: false },
      { label: "Other Expenses", key: "otherExpenses", isHeader: false },
      { label: "Total Direct Expenses", key: "totalDirectExpenses", isHeader: true },
      { label: "Total Direct Profit", key: "directProfit", isHeader: true },
      { label: "", key: "spacer2", isHeader: false },
      { label: "Lease Installment", key: "leaseInstallment", isHeader: false },
      { label: "Total Net Profit", key: "netProfit", isHeader: true },
    ];

    const wsData: any[][] = [];
    // Title
    wsData.push([`${branchName} Branch - Profit & Loss Statement`]);
    wsData.push([`For the month of ${MONTHS[selectedMonth]} ${selectedYear}`]);
    wsData.push([]);

    // Header row
    const headerRow = ["Description", ...busData.map(b => `${b.routeName}\n${b.busRegNo}`), "TOTAL"];
    wsData.push(headerRow);

    // Data rows
    rows.forEach(row => {
      if (row.key.startsWith("spacer")) {
        wsData.push([]);
        return;
      }
      const dataRow: any[] = [row.label];
      if (row.key === "expHeader") {
        busData.forEach(() => dataRow.push(""));
        dataRow.push("");
      } else {
        busData.forEach(b => dataRow.push((b as any)[row.key] || 0));
        dataRow.push((totals as any)[row.key] || 0);
      }
      wsData.push(dataRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1a365d" } }, alignment: { horizontal: "center" } };
    const profitStyle = (v: number) => ({
      font: { bold: true, color: { rgb: v >= 0 ? "166534" : "991B1B" } },
      fill: { fgColor: { rgb: v >= 0 ? "dcfce7" : "fee2e2" } },
      numFmt: '#,##0.00',
    });

    // Set column widths
    ws["!cols"] = [{ wch: 25 }, ...busData.map(() => ({ wch: 18 })), { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L Report");
    XLSX.writeFile(wb, `${branchName}_PnL_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
    toast({ title: "Exported", description: "Excel report downloaded successfully" });
  };

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`${branchName} Branch - P&L Statement`, 14, 20);
    doc.setFontSize(11);
    doc.text(`For the month of ${MONTHS[selectedMonth]} ${selectedYear}`, 14, 28);

    const headers = ["Description", ...busData.map(b => b.busRegNo), "TOTAL"];
    const lineItems = [
      ["School Bus Income", ...busData.map(b => fmtCurrency(b.income)), fmtCurrency(totals.income)],
      ["Fuel Expenses", ...busData.map(b => fmtCurrency(b.fuel)), fmtCurrency(totals.fuel)],
      ["Maintenance", ...busData.map(b => fmtCurrency(b.maintenance)), fmtCurrency(totals.maintenance)],
      ["Driver Salary", ...busData.map(b => fmtCurrency(b.driverSalary)), fmtCurrency(totals.driverSalary)],
      ["Caretaker Salary", ...busData.map(b => fmtCurrency(b.caretakerSalary)), fmtCurrency(totals.caretakerSalary)],
      ["Parking Fee", ...busData.map(b => fmtCurrency(b.parking)), fmtCurrency(totals.parking)],
      ["Other Expenses", ...busData.map(b => fmtCurrency(b.otherExpenses)), fmtCurrency(totals.otherExpenses)],
      ["Total Direct Expenses", ...busData.map(b => fmtCurrency(b.totalDirectExpenses)), fmtCurrency(totals.totalDirectExpenses)],
      ["Direct Profit", ...busData.map(b => fmtCurrency(b.directProfit)), fmtCurrency(totals.directProfit)],
      ["Lease Installment", ...busData.map(b => fmtCurrency(b.leaseInstallment)), fmtCurrency(totals.leaseInstallment)],
      ["Net Profit", ...busData.map(b => fmtCurrency(b.netProfit)), fmtCurrency(totals.netProfit)],
    ];

    autoTable(doc, {
      head: [headers],
      body: lineItems,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 54, 93] },
      didParseCell: (data: any) => {
        if (data.row.index === 8 || data.row.index === 10) {
          const val = data.row.index === 8 ? totals.directProfit : totals.netProfit;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = val >= 0 ? [220, 252, 231] : [254, 226, 226];
        }
      },
    });

    doc.save(`${branchName}_PnL_${MONTHS[selectedMonth]}_${selectedYear}.pdf`);
    toast({ title: "Exported", description: "PDF report downloaded successfully" });
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading P&L report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/school-bus/branch/${branchId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{branchName} Branch — P&L Report</h1>
            <p className="text-muted-foreground">
              For the month of {MONTHS[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="text-sm font-medium mb-1 block">Month</label>
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Year</label>
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData} size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-xs text-muted-foreground">Total Income</div>
                <div className="text-lg font-bold text-green-600">{fmtCurrency(totals.income)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-xs text-muted-foreground">Total Expenses</div>
                <div className="text-lg font-bold text-red-600">{fmtCurrency(totals.totalDirectExpenses)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Direct Profit</div>
            <div className={`text-lg font-bold ${totals.directProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtCurrency(totals.directProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Net Profit</div>
            <div className={`text-lg font-bold ${totals.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtCurrency(totals.netProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Unidentified Funds
                </div>
                <div className="text-lg font-bold text-amber-600">{fmtCurrency(unmatchedStats.amount)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Count</div>
                <div className="text-sm font-bold text-amber-700">{unmatchedStats.count}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excel-Style P&L Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit & Loss — Bus-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left p-3 sticky left-0 bg-primary z-10 min-w-[200px]">Description</th>
                  {busData.map(b => (
                    <th key={b.routeId} className="text-right p-3 min-w-[140px]">
                      <div className="font-semibold">{b.routeName}</div>
                      <div className="text-xs opacity-80">{b.busRegNo}</div>
                    </th>
                  ))}
                  <th className="text-right p-3 min-w-[140px] bg-primary/90 font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {/* Income */}
                <PnLRow label="School Bus Income" values={busData.map(b => b.income)} total={totals.income} className="font-semibold bg-green-50 dark:bg-green-950/20" />

                {/* Expense Header */}
                <tr className="bg-muted/50">
                  <td colSpan={busData.length + 2} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground sticky left-0">
                    Expenses
                  </td>
                </tr>
                <PnLRow label="Fuel Expenses" values={busData.map(b => b.fuel)} total={totals.fuel} />
                <PnLRow label="Maintenance Expenses" values={busData.map(b => b.maintenance)} total={totals.maintenance} />
                <PnLRow label="Driver Salary" values={busData.map(b => b.driverSalary)} total={totals.driverSalary} />
                <PnLRow label="Caretaker Salary" values={busData.map(b => b.caretakerSalary)} total={totals.caretakerSalary} />
                <PnLRow label="Parking Fee" values={busData.map(b => b.parking)} total={totals.parking} />
                <PnLRow label="Other Expenses" values={busData.map(b => b.otherExpenses)} total={totals.otherExpenses} />

                {/* Direct Expenses Total */}
                <PnLRow label="Total Direct Expenses" values={busData.map(b => b.totalDirectExpenses)} total={totals.totalDirectExpenses} className="font-bold border-t-2 border-border bg-muted/30" negative />

                {/* Direct Profit */}
                <PnLRow label="Total Direct Profit" values={busData.map(b => b.directProfit)} total={totals.directProfit} className="font-bold" profit />

                {/* Spacer */}
                <tr><td colSpan={busData.length + 2} className="p-1"></td></tr>

                {/* Lease */}
                <PnLRow label="Lease Installment" values={busData.map(b => b.leaseInstallment)} total={totals.leaseInstallment} />

                {/* Net Profit */}
                <PnLRow label="Total Net Profit" values={busData.map(b => b.netProfit)} total={totals.netProfit} className="font-bold text-base border-t-2 border-double border-border" profit />
              </tbody>
            </table>
          </div>
          {busData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No routes found for this branch. Add routes and expenses to see the P&L report.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      {busData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income vs Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown Stacked */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expense Breakdown by Bus</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Fuel" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Maintenance" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Driver Salary" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Caretaker Salary" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="Parking" stackId="a" fill="#06b6d4" />
                  <Bar dataKey="Other" stackId="a" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit/Loss Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Net Profit / Loss by Bus</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                  <Bar dataKey="Net Profit" radius={[4, 4, 0, 0]}>
                    {profitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Category Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expense Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`pie-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// P&L Table Row Component
function PnLRow({
  label,
  values,
  total,
  className = "",
  profit = false,
  negative = false,
}: {
  label: string;
  values: number[];
  total: number;
  className?: string;
  profit?: boolean;
  negative?: boolean;
}) {
  const fmt = (v: number) => v.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const colorClass = (v: number) => {
    if (profit) return v >= 0 ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30" : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
    if (negative) return "text-red-600 dark:text-red-400";
    return "";
  };

  return (
    <tr className={`border-b border-border/50 hover:bg-muted/20 ${className} ${profit ? colorClass(total) : ""}`}>
      <td className="p-2 pl-4 sticky left-0 bg-background z-10">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`p-2 text-right tabular-nums ${profit ? colorClass(v) : negative ? colorClass(v) : ""}`}>
          {fmt(v)}
        </td>
      ))}
      <td className={`p-2 text-right tabular-nums font-bold ${profit ? colorClass(total) : negative ? colorClass(total) : ""}`}>
        {fmt(total)}
      </td>
    </tr>
  );
}
