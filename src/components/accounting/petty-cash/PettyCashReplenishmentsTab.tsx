import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowUpCircle, Plus, Loader2, Info, Printer, MoreHorizontal, Landmark, FileSpreadsheet, RefreshCw, Undo2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { 
  usePettyCashFunds, useAllPettyCashTransactions, useCreatePettyCashTransaction 
} from "@/hooks/usePettyCash";
import { useAllProfiles } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { PettyCashReimbursementDialog } from "./PettyCashReimbursementDialog";
import { PettyCashTopUpDialog } from "./PettyCashTopUpDialog";
import { FinanceDocumentPreviewModal } from "../shared/FinanceDocumentPreviewModal";
import { JournalEntryDetailDialog } from "../JournalEntryDetailDialog";
import { VehicleFinanceSettlement } from "../shared/VehicleFinanceSettlement";
import { VehicleModule } from "@/hooks/useVehicleSalesFinance";
import { reverseJournalEntry } from "@/hooks/useEditAccountingMutations";
import { supabase } from "@/integrations/supabase/client";
import { NCG_HOLDING_ID } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

export const PettyCashReplenishmentsTab = () => {
  const [showReimburseForm, setShowReimburseForm] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [jePreviewId, setJePreviewId] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [financeHubState, setFinanceHubState] = useState<{isOpen: boolean; orderId: string; module: VehicleModule | null}>({
    isOpen: false,
    orderId: "",
    module: null,
  });
  const queryClient = useQueryClient();

  const handleOpenFinanceHub = async (txn: any) => {
    const ref = txn.reference_number || txn.description;
    if (!ref) {
       toast({ title: "No Reference", description: "No order reference found on this transaction.", variant: "destructive" });
       return;
    }
    
    let module: VehicleModule | null = null;
    const bu = txn.fund?.business_unit_code;
    const refUpper = ref.toUpperCase();
    
    if (bu === 'YUT' || refUpper.includes('QUO-') || refUpper.includes('YUT-')) module = 'yutong';
    else if (bu === 'SPH' || refUpper.includes('SH-')) module = 'special_hire';
    else if (bu === 'SNT' || refUpper.includes('SNT-')) module = 'sinotruk';
    else if (bu === 'LTV' || refUpper.includes('LV-')) module = 'lightvehicle';
    else if (bu === 'SBO' || refUpper.includes('SB-')) module = 'school_bus';

    if (!module) {
        toast({ title: "Unknown Module", description: `Cannot determine business module from reference: ${ref}`, variant: "destructive" });
        return;
    }

    let orderTable = `${module}_orders`;
    let orderCol = module === 'special_hire' ? 'booking_reference' : 'order_no';
    
    const match = refUpper.match(/(QUO-[^\s\]]+|YUT-[^\s\]]+|SH-[^\s\]]+|SNT-[^\s\]]+|LV-[^\s\]]+|SB-[^\s\]]+)/);
    const searchRef = match ? match[1] : refUpper;

    try {
      const { data, error } = await supabase
        .from(orderTable)
        .select('id')
        .ilike(orderCol, `%${searchRef.trim()}%`)
        .maybeSingle();
      
      if (data?.id) {
        setFinanceHubState({ isOpen: true, orderId: data.id, module });
      } else {
        toast({ title: "Order Not Found", description: `Could not find a ${module} order matching ${searchRef}`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Lookup Error", description: err.message, variant: "destructive" });
    }
  };

  const handleReverse = async (txn: any) => {
    if (!txn.journal_entry_id) {
      toast({ title: "No GL Entry", description: "This transaction does not have an associated Journal Entry.", variant: "destructive" });
      return;
    }
    
    if (confirm("Are you sure you want to reverse this transaction? This will void the GL entry.")) {
      setIsReversing(true);
      try {
        const reversedId = await reverseJournalEntry(txn.journal_entry_id, txn.company_id || NCG_HOLDING_ID);
        if (!reversedId) throw new Error("Failed to reverse GL entry");

        const { error } = await supabase.from("petty_cash_transactions").update({ status: "void" }).eq("id", txn.id);
        if (error) throw error;
        
        toast({ title: "Success", description: "Transaction and GL entry reversed successfully." });
        queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to reverse transaction", variant: "destructive" });
      } finally {
        setIsReversing(false);
      }
    }
  };

  const handleViewJE = (txn: any) => {
    if (txn.journal_entry_id) {
      setJePreviewId(txn.journal_entry_id);
    } else {
      toast({ title: "No GL Entry", description: "This transaction is pending or has no GL entry.", variant: "destructive" });
    }
  };

  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = useAllPettyCashTransactions();
  const { data: allTransactions } = useAllPettyCashTransactions();
  const { data: bankAccounts } = useBankAccounts();
  const { data: profiles } = useAllProfiles();

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };


  // Extract AP Ref from description
  const extractAPRef = (description: string | null) => {
    if (!description) return null;
    const match1 = description.match(/\[AP:\s*(PC-REPL-\d+)\]/);
    if (match1) return match1[1];
    const match2 = description.match(/AP Payment:\s*(PAY-\d+|PC-REPL-\d+)/);
    if (match2) return match2[1];
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Petty Cash Finance Settlement Hub</h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTopUpForm(true)}>
            <ArrowUpCircle className="h-4 w-4 mr-2" /> Direct Top-Up
          </Button>
          <Button onClick={() => setShowReimburseForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Reimburse Fund
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>AP Ref</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No reimbursements found</TableCell>
              </TableRow>
            ) : (
              transactions?.map((txn: any) => {
                const apRef = extractAPRef(txn.description);
                return (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {txn.company ? (
                        <Badge variant="secondary" className="text-xs">{txn.company.short_code || txn.company.name}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{txn.fund?.fund_name || "-"}</TableCell>
                    <TableCell className={`text-right font-semibold ${txn.transaction_type === 'replenishment' ? 'text-green-600' : 'text-rose-600'}`}>
                      {txn.transaction_type === 'replenishment' ? '+' : '-'}<CurrencyDisplay amount={txn.amount} />
                    </TableCell>
                    <TableCell className="text-right"><CurrencyDisplay amount={txn.balance_after} /></TableCell>
                    <TableCell><Badge variant="outline">{txn.payment_method || "cash"}</Badge></TableCell>
                    <TableCell className="text-sm">{txn.reference_number || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {apRef ? (
                        <Badge variant="secondary" className="text-xs font-mono">{apRef}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {getCreatorName(txn.created_by)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={txn.description || ""}>
                      {txn.description?.replace(/\s*\[AP:.*?\]/, "")?.replace(/from AP Payment:.*?$/, "") || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions <MoreHorizontal className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setPreviewData(txn)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPreviewData(txn)}>
                            <Printer className="h-4 w-4 mr-2" /> Print Voucher
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenFinanceHub(txn)}>
                            <Landmark className="h-4 w-4 mr-2" /> Finance Hub
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewJE(txn)}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" /> View JE
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast({ title: "Sync Data", description: "Transaction already synced.", variant: "default" })}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Sync to GL
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleReverse(txn)} 
                            className="text-destructive focus:text-destructive"
                            disabled={isReversing || txn.status === 'void'}
                          >
                            {isReversing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
                            {txn.status === 'void' ? 'Already Reversed' : 'Reverse'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Reimbursement Dialog */}
      <PettyCashReimbursementDialog 
        open={showReimburseForm} 
        onOpenChange={setShowReimburseForm}
        onSuccessPrint={setPreviewData}
      />
      
      {/* Direct Top-Up Dialog */}
      <PettyCashTopUpDialog 
        open={showTopUpForm} 
        onOpenChange={setShowTopUpForm} 
      />

      {/* Print Document Modal */}
      <FinanceDocumentPreviewModal
        open={!!previewData}
        onOpenChange={(op) => !op && setPreviewData(null)}
        documentType="petty_cash_voucher"
        documentData={previewData}
      />

      {/* Real Journal Entry Detail Modal */}
      <JournalEntryDetailDialog
        entry={jePreviewId ? { id: jePreviewId } : null}
        open={!!jePreviewId}
        onOpenChange={(open) => !open && setJePreviewId(null)}
      />

      {/* Finance Settlement Hub Modal */}
      {financeHubState.module && (
        <VehicleFinanceSettlement
          isOpen={financeHubState.isOpen}
          onClose={() => setFinanceHubState(prev => ({ ...prev, isOpen: false }))}
          orderId={financeHubState.orderId}
          module={financeHubState.module}
        />
      )}
    </div>
  );
};
