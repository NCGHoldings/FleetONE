import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowRight, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FlowStep = ({ title, description, variant = "default" }: { title: string; description: string; variant?: "default" | "success" | "warning" | "guard" }) => {
  const colors = {
    default: "bg-muted border-border",
    success: "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800",
    guard: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800",
  };
  const icons = {
    default: null,
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    guard: <Shield className="h-4 w-4 text-blue-600" />,
  };
  return (
    <div className={`rounded-lg border-2 p-3 ${colors[variant]} text-center min-w-[180px]`}>
      <div className="flex items-center justify-center gap-1.5 font-semibold text-sm">{icons[variant]} {title}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
};

const Arrow = ({ direction = "down" }: { direction?: "down" | "right" }) =>
  direction === "right" ? <ArrowRight className="h-5 w-5 text-muted-foreground mx-1 shrink-0" /> : <ArrowDown className="h-5 w-5 text-muted-foreground my-1" />;

export default function InvoiceGLFlowDiagram() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">AR & AP Invoice → GL Posting Flow</h2>

      {/* AR Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">AR Invoice</Badge>
            Accounts Receivable — GL Posting at Creation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-0">
            <FlowStep title="Create AR Invoice" description="Manual / School Bus / Special Hire" />
            <Arrow direction="right" />
            <FlowStep title="Resolve Customer Category" description="3-tier: Line → Category → Global" />
            <Arrow direction="right" />
            <FlowStep title="Post to GL" description="DR Trade Receivable / CR Sales Revenue" variant="success" />
            <Arrow direction="right" />
            <FlowStep title="Link journal_entry_id" description="Back to ar_invoices record" variant="success" />
          </div>
        </CardContent>
      </Card>

      {/* AP Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">AP Invoice</Badge>
            Accounts Payable — GL Posting at Creation + Approval Guard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Creation flow */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">At Creation (Auto)</p>
            <div className="flex flex-wrap items-center gap-0">
              <FlowStep title="Create AP Invoice" description="Manual / Expense Conversion" />
              <Arrow direction="right" />
              <FlowStep title="Resolve Vendor Category" description="3-tier: Line → Vendor Cat → Global" />
              <Arrow direction="right" />
              <FlowStep title="Post to GL" description="DR Expense / CR Trade Payable" variant="success" />
              <Arrow direction="right" />
              <FlowStep title="Link journal_entry_id" description="Back to ap_invoices record" variant="success" />
            </div>
          </div>

          {/* Approval flow */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">At Approval (Guard)</p>
            <div className="flex flex-wrap items-center gap-0">
              <FlowStep title="Approve AP Invoice" description="Maker-Checker workflow" />
              <Arrow direction="right" />
              <FlowStep title="Check journal_entry_id" description="Already posted at creation?" variant="guard" />
              <Arrow direction="right" />
              <FlowStep title="If NULL → Post GL" description="Legacy invoices only" variant="warning" />
              <Arrow direction="right" />
              <FlowStep title="If EXISTS → Skip" description="No double-posting" variant="guard" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3-tier Resolution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3-Tier GL Account Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-0">
            <FlowStep title="1. Invoice Line" description="account_id on each line item" />
            <Arrow direction="right" />
            <FlowStep title="2. Category Mapping" description="vendor_categories.expense_account_id / customer_categories" />
            <Arrow direction="right" />
            <FlowStep title="3. Global GL Settings" description="gl_settings: trade_payable, default_expense" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Priority: Line-level overrides Category, which overrides Global. First non-null value wins.</p>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">GL Posted?</th>
                  <th className="text-left p-2">Uses Category?</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { action: "AR Invoice Create (manual)", gl: "Yes", cat: "Yes (customer)", status: "correct" },
                  { action: "AP Invoice Create (manual)", gl: "Yes", cat: "Yes (vendor)", status: "correct" },
                  { action: "AP Invoice Approve", gl: "Guard check", cat: "Yes (vendor)", status: "correct" },
                  { action: "AR Receipt", gl: "Yes", cat: "Bank + Receivable", status: "correct" },
                  { action: "AP Payment", gl: "Yes", cat: "Bank + Payable", status: "correct" },
                ].map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">{row.action}</td>
                    <td className="p-2"><Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">{row.gl}</Badge></td>
                    <td className="p-2">{row.cat}</td>
                    <td className="p-2"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
