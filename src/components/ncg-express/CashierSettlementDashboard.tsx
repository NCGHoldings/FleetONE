import { useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2, Save, Wallet, AlertCircle, CheckCircle2, Search,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown, Globe, Banknote, Receipt, Pencil
} from "lucide-react";
import { useCashReconciliation, CashSettlementRow, TripDetail } from "@/hooks/useCashReconciliation";
import { useBankDeposits } from "@/hooks/useBankDeposits";
import { useAllPettyCashTransactions, usePettyCashFunds, useIOURecords } from "@/hooks/usePettyCash";
import { startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CashierSettlementDashboardProps {
  date: Date;
}

function fmt(n: number) {
  return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Inline Trip Revenue Editor ──
function TripEditor({ trip, onSave, onCancel }: {
  trip: TripDetail;
  onSave: (incomeDetails: any) => void;
  onCancel: () => void;
}) {
  const inc = trip.income_details || {};

  const [income, setIncome] = useState({
    bus_collection: Number(inc.bus_collection || inc.daily_collection || 0),
    call_booking: Number(inc.call_booking || inc.call_collection || 0),
    agent_booking: Number(inc.agent_booking || inc.agent_collection || 0),
    luggage_income: Number(inc.luggage_income || inc.luggage_collection || 0),
    special_income: Number(inc.special_income || inc.miscellaneous_income || inc.missional || 0),
    others: Number(inc.others || 0),
  });

  const totalRev = Object.values(income).reduce((s, v) => s + v, 0);

  return (
    <div className="border rounded-lg p-4 bg-background space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-sm">
          {trip.trip_no} {trip.route_label ? `• ${trip.route_label}` : ''}
        </h5>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(income)}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        </div>
      </div>

      <h6 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Revenue per Trip (₨)</h6>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Bus Collection 💵</Label>
          <Input type="number" value={income.bus_collection} onChange={e => setIncome({...income, bus_collection: parseFloat(e.target.value) || 0})} className="h-8 text-sm font-mono" />
        </div>
        <div>
          <Label className="text-xs">Luggage Income</Label>
          <Input type="number" value={income.luggage_income} onChange={e => setIncome({...income, luggage_income: parseFloat(e.target.value) || 0})} className="h-8 text-sm font-mono" />
        </div>
        <div>
          <Label className="text-xs text-purple-600">📱 Call Booking (Online)</Label>
          <Input type="number" value={income.call_booking} onChange={e => setIncome({...income, call_booking: parseFloat(e.target.value) || 0})} className="h-8 text-sm font-mono border-purple-200 dark:border-purple-800" />
        </div>
        <div>
          <Label className="text-xs text-purple-600">🏢 Agent Booking (Online)</Label>
          <Input type="number" value={income.agent_booking} onChange={e => setIncome({...income, agent_booking: parseFloat(e.target.value) || 0})} className="h-8 text-sm font-mono border-purple-200 dark:border-purple-800" />
        </div>
        <div>
          <Label className="text-xs">Special Income</Label>
          <Input type="number" value={income.special_income} onChange={e => setIncome({...income, special_income: parseFloat(e.target.value) || 0})} className="h-8 text-sm font-mono" />
        </div>
        <div>
          <Label className="text-xs">Others</Label>
          <Input type="number" value={income.others} onChange={e => setIncome({...income, others: parseFloat(e.target.value) || 0})} className="h-8 text-sm font-mono" />
        </div>
      </div>
      <div className="text-sm font-semibold text-right text-green-600">Total Revenue: ₨ {fmt(totalRev)}</div>
    </div>
  );
}

// ── Main Dashboard ──
export function CashierSettlementDashboard({ date }: CashierSettlementDashboardProps) {
  const { data, summary, loading, error, refetch, saveSettlement, saveTripDetails } = useCashReconciliation(date);
  const { deposits, totalUnsettledCash, loading: depositsLoading, recordDeposit } = useBankDeposits(date);
  
  const { data: pcFunds } = usePettyCashFunds();
  const { data: pcTxns } = useAllPettyCashTransactions({ 
    dateFrom: startOfDay(date).toISOString(), 
    dateTo: endOfDay(date).toISOString() 
  });
  const { data: ious } = useIOURecords({ 
    dateFrom: startOfDay(date).toISOString(), 
    dateTo: endOfDay(date).toISOString() 
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editActual, setEditActual] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBus, setExpandedBus] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  // Bank deposit form
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [depositBank, setDepositBank] = useState("BOC Main Branch");
  const [isDepositing, setIsDepositing] = useState(false);

  const handleEdit = (row: CashSettlementRow) => {
    setEditingId(row.bus_id);
    setEditActual(row.actual_cash > 0 ? row.actual_cash : Math.max(0, row.expected_cash));
    setEditNotes(row.notes || "");
  };

  const handleSave = async (row: CashSettlementRow) => {
    try {
      setIsSaving(true);
      const diff = editActual - row.expected_cash;
      await saveSettlement({
        ...row,
        actual_cash: editActual,
        shortage: diff < 0 ? Math.abs(diff) : 0,
        overage: diff > 0 ? diff : 0,
        notes: editNotes,
        status: "Settled",
      });
      toast.success(`Settlement saved for Bus ${row.bus_no}`);
      setEditingId(null);
      refetch();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTripDetails = async (tripId: string, incomeDetails: any) => {
    try {
      await saveTripDetails(tripId, incomeDetails);
      toast.success("Trip details saved!");
      setEditingTripId(null);
      refetch();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  const handleBankDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Enter a valid amount"); return;
    }
    try {
      setIsDepositing(true);
      await recordDeposit({
        amount: Number(depositAmount),
        bank_account_gl: depositBank,
        reference_no: depositRef,
        status: 'Completed'
      });
      toast.success("Bank deposit recorded!");
      setDepositAmount(""); setDepositRef("");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setIsDepositing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-md">Failed to load: {error.message}</div>;
  }

  const filteredData = data.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return row.bus_no.toLowerCase().includes(q) || row.status.toLowerCase().includes(q);
  });

  const s = summary;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Daily Cash Management — {format(date, "PPP")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter revenue & expenses → Settle cash → Deposit to bank — all in one place
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Search bus..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="text-lg font-bold font-mono">LKR {fmt(s.total_revenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                <Banknote className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Cash Revenue</span>
              </div>
              <p className="text-lg font-bold font-mono">LKR {fmt(s.total_cash_revenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
                <Globe className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Online Bookings</span>
              </div>
              <p className="text-lg font-bold font-mono">LKR {fmt(s.total_online_revenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                <TrendingDown className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Total Expenses</span>
              </div>
              <p className="text-lg font-bold font-mono">LKR {fmt(s.total_expenses)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                <Wallet className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Expected Cash</span>
              </div>
              <p className="text-lg font-bold font-mono">LKR {fmt(s.total_expected_cash)}</p>
            </CardContent>
          </Card>
          <Card className={cn("bg-gradient-to-br border", s.total_shortages > 0 ? "from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 border-red-200" : "from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200")}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 mb-1">
                <Receipt className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wider">{s.settled_count}/{s.bus_count} Settled</span>
              </div>
              <p className="text-lg font-bold font-mono">
                {s.total_shortages > 0 ? `-${fmt(s.total_shortages)}` : s.total_overages > 0 ? `+${fmt(s.total_overages)}` : "✓ OK"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Bus Table ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            Bus-by-Bus Cash Management
            <Badge variant="outline" className="ml-auto text-xs">Click ▸ to expand and enter trip details</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Online</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Expected Cash</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(row => {
                  const isEditing = editingId === row.bus_id;
                  const isExpanded = expandedBus === row.bus_id;
                  const hasData = row.total_revenue > 0 || row.total_expenses > 0;

                  return (
                    <Collapsible key={row.bus_id} open={isExpanded} onOpenChange={() => setExpandedBus(isExpanded ? null : row.bus_id)} asChild>
                      <>
                        <TableRow className={cn(
                          "transition-colors",
                          isExpanded && "bg-muted/30",
                          !hasData && "opacity-60"
                        )}>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">{row.bus_no}</div>
                            <div className="text-xs text-muted-foreground">{row.trip_count} trip{row.trip_count !== 1 ? 's' : ''}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600 dark:text-green-400 font-semibold">{row.total_revenue > 0 ? fmt(row.total_revenue) : <span className="text-muted-foreground text-xs">Not entered</span>}</TableCell>
                          <TableCell className="text-right font-mono text-purple-600 dark:text-purple-400">{row.online_revenue > 0 ? fmt(row.online_revenue) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-red-600 dark:text-red-400">{row.total_expenses > 0 ? fmt(row.total_expenses) : '—'}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{hasData ? fmt(row.expected_cash) : '—'}</TableCell>

                          {isEditing ? (
                            <TableCell colSpan={2} className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Input type="number" value={editActual} onChange={e => setEditActual(parseFloat(e.target.value) || 0)} className="w-28 text-right font-mono h-8" autoFocus />
                                <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..." className="w-32 text-sm h-8" />
                              </div>
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-right font-mono font-semibold">
                                {row.status === "Settled" ? fmt(row.actual_cash) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.status === "Settled" ? (
                                  row.shortage > 0 ? (
                                    <Badge variant="destructive" className="font-mono text-xs">-{fmt(row.shortage)}</Badge>
                                  ) : row.overage > 0 ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-mono text-xs">+{fmt(row.overage)}</Badge>
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
                                  )
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            </>
                          )}

                          <TableCell>
                            <Badge variant={row.status === "Settled" ? "default" : "outline"} className={cn("text-xs", row.status === "Settled" && "bg-green-600")}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={isSaving}>Cancel</Button>
                                <Button size="sm" onClick={() => handleSave(row)} disabled={isSaving}>
                                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <Button variant={row.status === "Settled" ? "ghost" : "default"} size="sm" onClick={() => handleEdit(row)} disabled={!hasData}>
                                {row.status === "Settled" ? "Edit" : "Settle"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* ── Expanded Trip Details ── */}
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/10 hover:bg-muted/20">
                            <TableCell colSpan={10} className="p-4">
                              <div className="space-y-3">
                                {/* Trip Revenue Cards */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider">📊 Trip Revenue</h4>
                                  {row.trips.map(trip => (
                                    <div key={trip.id}>
                                      {editingTripId === trip.id ? (
                                        <TripEditor
                                          trip={trip}
                                          onSave={(inc) => handleSaveTripDetails(trip.id, inc)}
                                          onCancel={() => setEditingTripId(null)}
                                        />
                                      ) : (
                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                          <div className="flex items-center gap-4 flex-wrap">
                                            <div>
                                              <span className="font-semibold text-sm">{trip.trip_no}</span>
                                              {trip.route_label && <span className="text-xs text-muted-foreground ml-2">• {trip.route_label}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                              <span className="text-green-600 font-mono">₨{fmt(trip.total_revenue)}</span>
                                              {trip.online_revenue > 0 && <span className="text-purple-600 font-mono text-xs">(Online: ₨{fmt(trip.online_revenue)})</span>}
                                            </div>
                                          </div>
                                          <Button variant="outline" size="sm" onClick={() => setEditingTripId(trip.id)}>
                                            <Pencil className="h-3 w-3 mr-1" />
                                            {trip.total_revenue > 0 ? "Edit" : "Enter Revenue"}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Bus-Level Expense Breakdown */}
                                {row.total_expenses > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider">📤 Daily Expenses (from Expense Sheet)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border rounded-lg bg-background">
                                      {Object.entries(row.expense_breakdown)
                                        .filter(([, v]) => v > 0)
                                        .map(([key, val]) => (
                                          <div key={key} className="flex justify-between text-sm">
                                            <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                                            <span className="font-mono text-red-600">₨{fmt(val)}</span>
                                          </div>
                                        ))}
                                      <div className="col-span-full border-t pt-1 flex justify-between font-semibold text-sm">
                                        <span>Total Expenses</span>
                                        <span className="font-mono text-red-600">₨{fmt(row.total_expenses)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Cash Flow Summary */}
                                <div className="flex flex-wrap gap-4 p-3 bg-primary/5 rounded-lg text-sm">
                                  <span>💵 Cash Revenue: <strong className="font-mono">₨{fmt(row.cash_revenue)}</strong></span>
                                  {row.online_revenue > 0 && <span>📱 Online: <strong className="font-mono text-purple-600">₨{fmt(row.online_revenue)}</strong></span>}
                                  {row.total_expenses > 0 && <span>📤 Expenses: <strong className="font-mono text-red-600">₨{fmt(row.total_expenses)}</strong></span>}
                                  <span className="font-bold">→ Expected Cash: <strong className="font-mono text-primary">₨{fmt(row.expected_cash)}</strong></span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}

                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {searchQuery ? "No matching buses found." : "No trips found for this date."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Bank Deposit ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" /> Cash in Hand (Till)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-primary mb-1">LKR {fmt(totalUnsettledCash > 0 ? totalUnsettledCash : 0)}</p>
            <p className="text-xs text-muted-foreground">Accumulated physical cash minus previous bank deposits</p>
            
            {/* Cash Flow Cross Check */}
            <div className="mt-4 p-3 bg-muted rounded-md space-y-2 text-sm border">
              <div className="flex justify-between font-semibold mb-1 border-b pb-1">
                <span>Daily Finance Cross-Check</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Bus Expected Cash</span>
                <span className="font-mono">LKR {fmt(summary.total_expected_cash)}</span>
              </div>
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span>Total Settled IOUs</span>
                <span className="font-mono">+ LKR {fmt((ious || []).filter(i => i.status === "settled").reduce((sum, i) => sum + i.amount, 0))}</span>
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>New IOUs Issued</span>
                <span className="font-mono">- LKR {fmt((ious || []).filter(i => i.status !== "settled").reduce((sum, i) => sum + i.amount, 0))}</span>
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>PC Disbursements</span>
                <span className="font-mono">- LKR {fmt((pcTxns || []).filter(t => t.transaction_type === "disbursement").reduce((sum, t) => sum + t.amount, 0))}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="flex gap-2">
                <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount" className="font-mono flex-1" />
                <Button variant="outline" size="sm" onClick={() => setDepositAmount(String(totalUnsettledCash))}>Max</Button>
              </div>
              <div className="flex gap-2">
                <Input value={depositBank} onChange={e => setDepositBank(e.target.value)} placeholder="Bank Account" className="flex-1" />
                <Input value={depositRef} onChange={e => setDepositRef(e.target.value)} placeholder="Slip Ref #" className="flex-1" />
              </div>
              <Button className="w-full" onClick={handleBankDeposit} disabled={isDepositing || totalUnsettledCash <= 0}>
                {isDepositing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Bank Deposit
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Bank Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No deposits yet today.</p>
            ) : (
              <div className="space-y-2">
                {deposits.map(dep => (
                  <div key={dep.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{dep.bank_account_gl}</p>
                      <p className="text-xs text-muted-foreground">Ref: {dep.reference_no || '—'}</p>
                    </div>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">LKR {fmt(dep.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Petty Cash & IOU Settlement Hub View ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
        {/* Petty Cash Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Petty Cash Flows (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {(!pcTxns || pcTxns.length === 0) ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No petty cash transactions today.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {pcTxns.map(txn => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm border-l-4" style={{borderLeftColor: txn.transaction_type === 'disbursement' ? 'rgb(220 38 38)' : 'rgb(22 163 74)'}}>
                    <div>
                      <p className="font-semibold">{txn.fund?.fund_name || 'General Fund'} <Badge variant="outline" className="ml-1 text-[10px] h-4 leading-3 uppercase">{txn.transaction_type}</Badge></p>
                      <p className="text-xs text-muted-foreground">{txn.description || txn.expense_category || 'No details'}</p>
                    </div>
                    <span className={cn("font-mono font-semibold", txn.transaction_type === 'disbursement' ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                      {txn.transaction_type === 'disbursement' ? '-' : '+'}LKR {fmt(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t space-y-2">
              <h5 className="text-xs font-semibold uppercase text-muted-foreground">Current Float Balances</h5>
              <div className="grid grid-cols-2 gap-2">
                {(pcFunds || []).map(f => (
                  <div key={f.id} className="p-2 border rounded text-xs flex justify-between bg-background">
                    <span className="truncate mr-2">{f.fund_name}</span>
                    <span className="font-mono font-semibold">₨{fmt(f.current_balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IOU Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Staff IOUs & Advances (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {(!ious || ious.length === 0) ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No IOUs issued or settled today.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {ious.map(iou => (
                  <div key={iou.id} className="flex flex-col gap-1 p-3 bg-muted/50 rounded-lg text-sm border-l-4" style={{borderLeftColor: iou.status === 'settled' ? 'rgb(22 163 74)' : 'rgb(234 179 8)'}}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{iou.staff?.staff_name || iou.staff_name_draft || 'Unknown Staff'} <Badge variant="outline" className="ml-1 text-[10px] h-4 leading-3">{iou.iou_number}</Badge></p>
                      <span className="font-mono font-semibold text-primary">LKR {fmt(iou.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{iou.purpose || 'No purpose stated'}</p>
                      <Badge className="text-[10px] h-4 py-0" variant={iou.status === 'settled' ? 'default' : 'secondary'}>{iou.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
