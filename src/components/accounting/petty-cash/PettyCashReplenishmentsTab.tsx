import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, Plus, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { 
  usePettyCashFunds, useAllPettyCashTransactions, useCreatePettyCashTransaction 
} from "@/hooks/usePettyCash";
import { useAllProfiles } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { PettyCashReimbursementDialog } from "./PettyCashReimbursementDialog";

export const PettyCashReplenishmentsTab = () => {
  const [showForm, setShowForm] = useState(false);

  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = useAllPettyCashTransactions({ transactionType: "replenishment" });
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
        <h3 className="font-semibold">Reimbursement History</h3>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Reimburse Fund
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>AP Ref</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reimbursements found</TableCell>
              </TableRow>
            ) : (
              transactions?.map((txn) => {
                const apRef = extractAPRef(txn.description);
                return (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{txn.fund?.fund_name || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      +<CurrencyDisplay amount={txn.amount} />
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Reimbursement Dialog */}
      <PettyCashReimbursementDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
      />
    </div>
  );
};
