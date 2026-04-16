import { useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Landmark, Plus, ArrowRight } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { toast } from "sonner";
import { useBankDeposits } from "@/hooks/useBankDeposits";

interface BankDepositDashboardProps {
  date: Date;
}

export function BankDepositDashboard({ date }: BankDepositDashboardProps) {
  const { deposits, totalUnsettledCash, loading, recordDeposit } = useBankDeposits(date);
  
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("BOC Main Branch");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    
    if (Number(depositAmount) > totalUnsettledCash) {
      toast.error("Deposit cannot exceed Cash in Hand balance!");
      return;
    }

    try {
      setIsSubmitting(true);
      await recordDeposit({
        amount: Number(depositAmount),
        bank_account_gl: bankAccount,
        reference_no: reference,
        notes: notes,
        status: 'Completed'
      });
      toast.success("Bank Deposit recorded successfully");
      
      // Reset form
      setDepositAmount("");
      setReference("");
      setNotes("");
    } catch (err: any) {
      toast.error("Failed to record deposit: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Bank Deposits - {format(date, "PPP")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sweep accumulated office cash into the corporate bank account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Current Cash in Hand</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-4xl font-bold font-mono text-primary">
                <CurrencyDisplay amount={totalUnsettledCash > 0 ? totalUnsettledCash : 0} />
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Total accumulated physical cash minus previous bank deposits.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record Bank Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Deposit Amount (₨)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="font-mono text-lg"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setDepositAmount(String(totalUnsettledCash))}
                  >
                    Max
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Input 
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                  placeholder="e.g. BOC Main Branch"
                />
              </div>

              <div className="space-y-2">
                <Label>Deposit Slip Reference No.</Label>
                <Input 
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Slip number or transaction ID"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional details"
                />
              </div>

              <Button 
                className="w-full mt-4" 
                onClick={handleDeposit}
                disabled={isSubmitting || totalUnsettledCash <= 0}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Confirm Deposit
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History for the day */}
        <Card>
          <CardHeader>
            <CardTitle>Deposits on {format(date, "PPP")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount (₨)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((dep) => (
                  <TableRow key={dep.id}>
                    <TableCell>
                      <div className="font-medium">{dep.reference_no || 'No Ref'}</div>
                      <div className="text-xs text-muted-foreground">{dep.notes}</div>
                    </TableCell>
                    <TableCell>{dep.bank_account_gl}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                      <CurrencyDisplay amount={dep.amount} />
                    </TableCell>
                  </TableRow>
                ))}
                {deposits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No deposits recorded for this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
