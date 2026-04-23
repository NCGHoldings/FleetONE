import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator, Clock, Timer, Percent, Calendar as CalendarIcon,
  X, Briefcase, DollarSign, Fuel, FileText, ChevronRight, Pause, Play, RotateCcw,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── LIVE CLOCK ───
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="text-center py-2">
      <p className="text-3xl font-mono font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
        {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

// ─── STOPWATCH / TIMER ───
function TimerWidget() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) { intervalRef.current = setInterval(() => setElapsed(p => p + 10), 10); }
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const fmt = (ms: number) => {
    const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  return (
    <div className="text-center py-2">
      <p className="text-3xl font-mono font-bold text-slate-800">{fmt(elapsed)}</p>
      <div className="flex justify-center gap-2 mt-3">
        <Button size="sm" variant={running ? "destructive" : "default"} onClick={() => setRunning(!running)}
          className={running ? "" : "bg-green-500 hover:bg-green-600 text-white"}>
          {running ? <><Pause className="w-3.5 h-3.5 mr-1" /> Pause</> : <><Play className="w-3.5 h-3.5 mr-1" /> Start</>}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setRunning(false); setElapsed(0); }}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}

// ─── CALCULATOR ───
function CalculatorWidget() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const input = (d: string) => {
    if (fresh) { setDisplay(d); setFresh(false); }
    else setDisplay(display === "0" && d !== "." ? d : display + d);
  };
  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); };
  const operate = (nextOp: string) => {
    const curr = parseFloat(display);
    if (prev !== null && op) {
      let result = prev;
      if (op === "+") result = prev + curr;
      if (op === "-") result = prev - curr;
      if (op === "×") result = prev * curr;
      if (op === "÷") result = curr !== 0 ? prev / curr : 0;
      setDisplay(String(parseFloat(result.toFixed(8))));
      setPrev(result);
    } else { setPrev(curr); }
    setOp(nextOp); setFresh(true);
  };
  const equals = () => { operate("="); setOp(null); };

  const btn = (label: string, action: () => void, cls?: string) => (
    <button onClick={action} className={`h-9 rounded-md text-sm font-medium transition-colors ${cls || "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}>
      {label}
    </button>
  );

  return (
    <div>
      <div className="bg-slate-800 text-white text-right p-3 rounded-lg mb-2 text-2xl font-mono truncate">{display}</div>
      <div className="grid grid-cols-4 gap-1">
        {btn("C", clear, "bg-red-100 hover:bg-red-200 text-red-700")}
        {btn("±", () => setDisplay(String(-parseFloat(display))))}
        {btn("%", () => setDisplay(String(parseFloat(display) / 100)))}
        {btn("÷", () => operate("÷"), "bg-indigo-100 hover:bg-indigo-200 text-indigo-700")}
        {btn("7", () => input("7"))} {btn("8", () => input("8"))} {btn("9", () => input("9"))}
        {btn("×", () => operate("×"), "bg-indigo-100 hover:bg-indigo-200 text-indigo-700")}
        {btn("4", () => input("4"))} {btn("5", () => input("5"))} {btn("6", () => input("6"))}
        {btn("-", () => operate("-"), "bg-indigo-100 hover:bg-indigo-200 text-indigo-700")}
        {btn("1", () => input("1"))} {btn("2", () => input("2"))} {btn("3", () => input("3"))}
        {btn("+", () => operate("+"), "bg-indigo-100 hover:bg-indigo-200 text-indigo-700")}
        {btn("0", () => input("0"), "col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-800")}
        {btn(".", () => { if (!display.includes(".")) input("."); })}
        {btn("=", equals, "bg-indigo-500 hover:bg-indigo-600 text-white")}
      </div>
    </div>
  );
}

// ─── LOAN CALCULATOR ───
function LoanCalculatorWidget() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("5");

  const P = parseFloat(principal) || 0;
  const annualRate = parseFloat(rate) || 0;
  const N = (parseFloat(years) || 0) * 12;
  const r = annualRate / 100 / 12;

  let monthly = 0;
  let totalPaid = 0;
  let totalInterest = 0;

  if (P > 0 && r > 0 && N > 0) {
    monthly = P * (r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    totalPaid = monthly * N;
    totalInterest = totalPaid - P;
  }

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Loan Amount</Label>
          <Input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Rate (%/yr)</Label>
          <Input type="number" value={rate} onChange={e => setRate(e.target.value)} className="h-8 text-sm" step="0.1" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Years</Label>
          <Input type="number" value={years} onChange={e => setYears(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      {monthly > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
          <p className="text-xs text-muted-foreground">Monthly Payment</p>
          <p className="text-2xl font-bold text-indigo-600">{fmt(monthly)}</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div><span className="text-muted-foreground">Total Paid:</span> <span className="font-medium">{fmt(totalPaid)}</span></div>
            <div><span className="text-muted-foreground">Total Interest:</span> <span className="font-medium text-red-500">{fmt(totalInterest)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FUEL COST ESTIMATOR ───
function FuelEstimatorWidget() {
  const [distance, setDistance] = useState("100");
  const [consumption, setConsumption] = useState("12");
  const [pricePerLitre, setPricePerLitre] = useState("420");

  const d = parseFloat(distance) || 0;
  const c = parseFloat(consumption) || 0;
  const p = parseFloat(pricePerLitre) || 0;
  const litres = c > 0 ? (d / c) : 0;
  const cost = litres * p;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Distance (km)</Label>
          <Input type="number" value={distance} onChange={e => setDistance(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">km/L</Label>
          <Input type="number" value={consumption} onChange={e => setConsumption(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Price/L</Label>
          <Input type="number" value={pricePerLitre} onChange={e => setPricePerLitre(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      {litres > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Fuel Needed</p>
              <p className="text-lg font-bold text-green-600">{litres.toFixed(1)} L</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold text-green-600">{cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUICK NOTES (notepad) ───
function QuickNotesWidget() {
  const [note, setNote] = useState(() => localStorage.getItem("quicktools_note") || "");
  const save = (v: string) => { setNote(v); localStorage.setItem("quicktools_note", v); };
  return (
    <div>
      <textarea
        value={note} onChange={e => save(e.target.value)}
        placeholder="Quick scratchpad — auto-saved to your browser..."
        className="w-full h-32 p-3 text-sm border rounded-lg resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <p className="text-[10px] text-muted-foreground mt-1">Auto-saved locally</p>
    </div>
  );
}

// ─── PERCENTAGE CALCULATOR ───
function PercentageWidget() {
  const [base, setBase] = useState("1000");
  const [pct, setPct] = useState("15");
  const b = parseFloat(base) || 0;
  const p = parseFloat(pct) || 0;
  const result = (b * p) / 100;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Amount</Label>
          <Input type="number" value={base} onChange={e => setBase(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Percentage (%)</Label>
          <Input type="number" value={pct} onChange={e => setPct(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-100">
        <p className="text-xs text-muted-foreground">{pct}% of {b.toLocaleString()}</p>
        <p className="text-2xl font-bold text-amber-600">{result.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
}

// ─── MARGIN / MARKUP CALCULATOR ───
function MarginCalculatorWidget() {
  const [cost, setCost] = useState("800");
  const [selling, setSelling] = useState("1000");
  const c = parseFloat(cost) || 0;
  const s = parseFloat(selling) || 0;
  const profit = s - c;
  const margin = s > 0 ? (profit / s) * 100 : 0;
  const markup = c > 0 ? (profit / c) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Cost Price</Label>
          <Input type="number" value={cost} onChange={e => setCost(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Selling Price</Label>
          <Input type="number" value={selling} onChange={e => setSelling(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100 text-center">
          <p className="text-[10px] text-muted-foreground">Profit</p>
          <p className="text-sm font-bold text-blue-600">{profit.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2.5 border border-green-100 text-center">
          <p className="text-[10px] text-muted-foreground">Margin</p>
          <p className="text-sm font-bold text-green-600">{margin.toFixed(1)}%</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-100 text-center">
          <p className="text-[10px] text-muted-foreground">Markup</p>
          <p className="text-sm font-bold text-purple-600">{markup.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// ─── TOOL DEFINITIONS ───
const TOOLS = [
  { id: "clock",    label: "Date & Time",       icon: <Clock className="w-4 h-4" />,        color: "text-blue-500",   component: <ClockWidget /> },
  { id: "timer",    label: "Stopwatch",          icon: <Timer className="w-4 h-4" />,        color: "text-green-500",  component: <TimerWidget /> },
  { id: "calc",     label: "Calculator",         icon: <Calculator className="w-4 h-4" />,   color: "text-slate-600",  component: <CalculatorWidget /> },
  { id: "pct",      label: "Percentage",          icon: <Percent className="w-4 h-4" />,      color: "text-amber-500",  component: <PercentageWidget /> },
  { id: "loan",     label: "Loan Calculator",    icon: <DollarSign className="w-4 h-4" />,   color: "text-indigo-500", component: <LoanCalculatorWidget /> },
  { id: "margin",   label: "Margin & Markup",    icon: <TrendingUp className="w-4 h-4" />,   color: "text-purple-500", component: <MarginCalculatorWidget /> },
  { id: "fuel",     label: "Fuel Estimator",     icon: <Fuel className="w-4 h-4" />,          color: "text-emerald-500",component: <FuelEstimatorWidget /> },
  { id: "notes",    label: "Quick Notes",        icon: <FileText className="w-4 h-4" />,     color: "text-orange-500", component: <QuickNotesWidget /> },
];

// ─── MAIN WIDGET ───
export function QuickToolsWidget() {
  const [open, setOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeToolData = TOOLS.find(t => t.id === activeTool);

  return (
    <div ref={panelRef} className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
      {/* Expanded Panel — opens to the left */}
      <div className={`absolute right-10 top-1/2 -translate-y-1/2 transition-all duration-300 origin-right ${open
          ? "opacity-100 scale-100 translate-x-0"
          : "opacity-0 scale-90 translate-x-4 pointer-events-none"}`}>
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/15 border border-slate-200 w-72 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            {activeTool ? (
              <button onClick={() => setActiveTool(null)} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                {activeToolData?.label}
              </button>
            ) : (
              <span className="text-xs font-semibold">⚡ Quick Tools</span>
            )}
            <button onClick={() => { setOpen(false); setActiveTool(null); }} className="hover:opacity-80 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-2.5 max-h-80 overflow-auto">
            {activeTool ? (
              <div className="animate-in slide-in-from-right-5 duration-200">{activeToolData?.component}</div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {TOOLS.map(tool => (
                  <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                    className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 transition-all text-left group border border-transparent hover:border-slate-200">
                    <div className={`p-1.5 rounded-md bg-slate-50 group-hover:bg-white transition-colors ${tool.color}`}>
                      {tool.icon}
                    </div>
                    <span className="text-[11px] font-medium text-slate-700">{tool.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right-edge vertical tab handle */}
      <button
        onClick={() => { setOpen(!open); if (open) setActiveTool(null); }}
        className={`flex items-center gap-1 px-1.5 py-3 rounded-l-lg shadow-lg transition-all duration-300 border border-r-0
          ${open
            ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-600"
            : "bg-gradient-to-b from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-indigo-400/30 hover:px-2.5"
          }`}
        title="Quick Tools"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        <Briefcase className="w-3.5 h-3.5 rotate-90" />
        <span className="text-[10px] font-semibold tracking-wide">Tools</span>
      </button>
    </div>
  );
}

