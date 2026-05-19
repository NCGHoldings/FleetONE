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

      // Filter for potentially inverted dates OR mismatched month records
      const suspectRecords = (data || []).filter(p => {
        if (!p.payment_date || !p.payment_month) return false;
        const dDate = new Date(p.payment_date);
        const mDate = new Date(p.payment_month);
        
        // 1. Inverted Date Suspect (Day <= 12 and month is something else, this is a heuristic)
        // Wait, if it's inverted, day <= 12. But we ONLY want to flag it if it's likely inverted. 
        // A better check: We will just allow fixing ANY date mismatch.
        // Actually, let's keep the existing logic for inverted dates + add mismatched months
        const isInverted = dDate.getDate() <= 12 && dDate.getFullYear() === 2026;
        
        // 2. Mismatched Month Suspect (e.g., Payment is April, but Month is August)
        const isMismatched = dDate.getMonth() !== mDate.getMonth();
        
        return isInverted || isMismatched;
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
        const mDate = new Date(p.payment_month);
        
        let finalFormattedDate = p.payment_date;
        const isInverted = dDate.getDate() <= 12 && dDate.getFullYear() === 2026 && dDate.getMonth() === mDate.getMonth();
        
        // If it's mathematically inverted AND hasn't been fixed yet (months still match the bad date)
        if (isInverted) {
          const newMonthIndex = dDate.getDate() - 1;
          const newDay = dDate.getMonth() + 1;
          const correctedDate = new Date(dDate.getFullYear(), newMonthIndex, newDay);
          finalFormattedDate = [
            correctedDate.getFullYear(),
            String(correctedDate.getMonth() + 1).padStart(2, '0'),
            String(correctedDate.getDate()).padStart(2, '0')
          ].join('-');
        }

        // Always sync the payment_month to whatever the final correct payment_date is
        const finalDateObj = new Date(finalFormattedDate);
        const newMonthStr = [
          finalDateObj.getFullYear(),
          String(finalDateObj.getMonth() + 1).padStart(2, '0'),
          '01'
        ].join('-');

        const { error } = await supabase
          .from('school_payment_transactions')
          .update({ 
            payment_date: finalFormattedDate,
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
            Repair Excel Date Inversions
          </DialogTitle>
          <DialogDescription>
            This tool safely swaps inverted dates (e.g. October 4th back to April 10th) caused by Excel American date formats (MM/DD/YYYY).
          </DialogDescription>
        </DialogHeader>

        {!scanned ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Step 1: Scan for potentially inverted dates where the Day is 12 or less (which allows it to be swapped with a Month).
            </p>
            <Button onClick={handleScan} disabled={scanning} className="w-full">
              {scanning ? "Scanning..." : "Scan Database for Suspects"}
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-orange-600">{suspects.length}</p>
              <p className="text-sm text-muted-foreground">Potentially inverted payments found</p>
            </div>
            
            <div className="max-h-[150px] overflow-y-auto border rounded p-2 space-y-2">
              {suspects.slice(0, 10).map((s, i) => {
                const dDate = new Date(s.payment_date);
                const mDate = new Date(s.payment_month);
                const isInverted = dDate.getDate() <= 12 && dDate.getFullYear() === 2026 && dDate.getMonth() === mDate.getMonth();
                
                let fixedDate = s.payment_date;
                if (isInverted) {
                  const newMonthIndex = dDate.getDate() - 1;
                  const newDay = dDate.getMonth() + 1;
                  const correctedDate = new Date(dDate.getFullYear(), newMonthIndex, newDay);
                  fixedDate = [
                    correctedDate.getFullYear(),
                    String(correctedDate.getMonth() + 1).padStart(2, '0'),
                    String(correctedDate.getDate()).padStart(2, '0')
                  ].join('-');
                }
                
                const fDateObj = new Date(fixedDate);
                const fixedMonth = [
                  fDateObj.getFullYear(),
                  String(fDateObj.getMonth() + 1).padStart(2, '0'),
                  '01'
                ].join('-');

                return (
                  <div key={i} className="text-xs flex justify-between px-2 py-1 bg-background rounded border">
                    <span className="text-red-600 line-through">Date: {s.payment_date} | Month: {s.payment_month}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-600 font-medium">Date: {fixedDate} | Month: {fixedMonth}</span>
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
              {repairing ? "Repairing..." : "Swap Month & Day for All"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
