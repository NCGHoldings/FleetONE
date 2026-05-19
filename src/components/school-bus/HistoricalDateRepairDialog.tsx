import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function HistoricalDateRepairDialog({ branchId, onComplete }: { branchId: string, onComplete: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [suspects, setSuspects] = useState<any[]>([]);
  const [scanned, setScanned] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase
        .from('school_payment_transactions')
        .select('*, school_students!inner(branch_id)')
        .eq('school_students.branch_id', branchId);

      if (error) throw error;

      // Filter for records where the payment_month doesn't match the payment_date
      const suspectRecords = (data || []).filter(p => {
        if (!p.payment_date || !p.payment_month) return false;
        const dDate = new Date(p.payment_date);
        const mDate = new Date(p.payment_month);
        
        return dDate.getMonth() !== mDate.getMonth() || dDate.getFullYear() !== mDate.getFullYear();
      });

      setSuspects(suspectRecords);
      setScanned(true);
    } catch (error: any) {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleRepair = async () => {
    if (suspects.length === 0) return;
    setRepairing(true);
    let successCount = 0;
    
    try {
      for (const p of suspects) {
        const dDate = new Date(p.payment_date);
        const finalFormattedDate = p.payment_date;

        // Sync the payment_month to whatever the final correct payment_date is
        const newMonthStr = [
          dDate.getFullYear(),
          String(dDate.getMonth() + 1).padStart(2, '0'),
          '01'
        ].join('-');

        const { error } = await supabase
          .from('school_payment_transactions')
          .update({ 
            payment_month: newMonthStr 
          })
          .eq('id', p.id);
          
        if (!error) {
          // Sync General Ledger, AR Receipts, and Bank Transactions
          if (p.journal_entry_id) {
            await supabase.from('journal_entries').update({ entry_date: finalFormattedDate }).eq('id', p.journal_entry_id);
            await supabase.from('ar_receipts').update({ receipt_date: finalFormattedDate }).eq('journal_entry_id', p.journal_entry_id);
            
            const sourceIds = [p.journal_entry_id];
            if (p.ar_receipt_id) sourceIds.push(p.ar_receipt_id);
            await supabase.from('bank_transactions').update({ transaction_date: finalFormattedDate }).in('source_id', sourceIds);
          }
          successCount++;
        }
      }
      
      toast({
        title: "Repair Complete",
        description: `Successfully repaired ${successCount} inverted dates.`,
      });
      setOpen(false);
      onComplete();
    } catch (error: any) {
      toast({
        title: "Repair failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100">
          <Wrench className="w-4 h-4 mr-2" />
          Repair Inverted Dates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Sync Background Dates
          </DialogTitle>
          <DialogDescription>
            This tool safely synchronizes any background mismatches between the displayed Payment Date and the system's ledger/month values.
          </DialogDescription>
        </DialogHeader>

        {!scanned ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Step 1: Scan for records where the internal Payment Month is out of sync with the visible Payment Date.
            </p>
            <Button onClick={handleScan} disabled={scanning} className="w-full">
              {scanning ? "Scanning..." : "Scan for Mismatched Dates"}
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-orange-600">{suspects.length}</p>
              <p className="text-sm text-muted-foreground">Out of sync records found</p>
            </div>
            
            <div className="max-h-[150px] overflow-y-auto border rounded p-2 space-y-2">
              {suspects.slice(0, 10).map((s, i) => {
                const dDate = new Date(s.payment_date);
                const fixedMonth = [
                  dDate.getFullYear(),
                  String(dDate.getMonth() + 1).padStart(2, '0'),
                  '01'
                ].join('-');

                return (
                  <div key={i} className="text-xs flex justify-between px-2 py-1 bg-background rounded border">
                    <span className="text-red-600 line-through">Month: {s.payment_month}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-600 font-medium">Month: {fixedMonth}</span>
                  </div>
                );
              })}
              {suspects.length > 10 && (
                <div className="text-xs text-center text-muted-foreground pt-1">
                  + {suspects.length - 10} more
                </div>
              )}
              {suspects.length === 0 && (
                <div className="text-xs text-center text-muted-foreground">
                  No suspect dates found.
                </div>
              )}
            </div>

            <Button 
              onClick={handleRepair} 
              disabled={repairing || suspects.length === 0} 
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {repairing ? "Syncing..." : "Sync All Background Dates"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
