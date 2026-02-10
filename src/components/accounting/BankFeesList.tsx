import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { useBankFeesByPayment, useBankFeesByReceipt, usePostBankFee } from "@/hooks/useBankFees";
import { format } from "date-fns";
import { Loader2, CheckCircle } from "lucide-react";

interface BankFeesListProps {
  apPaymentId?: string;
  arReceiptId?: string;
}

export const BankFeesList = ({ apPaymentId, arReceiptId }: BankFeesListProps) => {
  const { data: paymentFees } = useBankFeesByPayment(apPaymentId);
  const { data: receiptFees } = useBankFeesByReceipt(arReceiptId);
  const postBankFee = usePostBankFee();

  const fees = apPaymentId ? paymentFees : receiptFees;

  if (!fees?.length) {
    return <p className="text-sm text-muted-foreground py-2">No bank fees recorded</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fees.map((fee) => (
          <TableRow key={fee.id}>
            <TableCell>{format(new Date(fee.fee_date), "MMM dd, yyyy")}</TableCell>
            <TableCell className="capitalize">{fee.fee_type?.replace("_", " ")}</TableCell>
            <TableCell className="text-muted-foreground">{fee.description || "-"}</TableCell>
            <TableCell className="text-right font-semibold">
              <CurrencyDisplay amount={fee.amount} />
            </TableCell>
            <TableCell>
              <Badge variant={fee.status === "posted" ? "default" : "outline"}>
                {fee.status === "posted" ? "Posted" : "Draft"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {fee.status === "draft" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => postBankFee.mutate(fee.id)}
                  disabled={postBankFee.isPending}
                >
                  {postBankFee.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  Post
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
