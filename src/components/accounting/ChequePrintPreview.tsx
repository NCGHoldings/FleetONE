import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";

interface ChequePrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: {
    cheque_number: string;
    cheque_date: string;
    payee: string;
    amount: number;
    bank_account_name?: string;
    memo?: string;
    reference?: string;
  } | null;
}

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 ? " " + convert(n % 1000000) : "");
    return convert(Math.floor(n / 1000000000)) + " Billion" + (n % 1000000000 ? " " + convert(n % 1000000000) : "");
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = convert(intPart) + " Rupees";
  if (decPart > 0) result += " and " + convert(decPart) + " Cents";
  result += " Only";
  return result;
};

export const ChequePrintPreview = ({ open, onOpenChange, cheque }: ChequePrintPreviewProps) => {
  if (!cheque) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Cheque Print Preview</span>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Cheque Layout */}
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 print:border-none">
          <div className="space-y-6">
            {/* Date Line */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Bank</p>
                <p className="font-medium">{cheque.bank_account_name || "N/A"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
                <p className="font-mono text-lg font-bold tracking-widest">
                  {format(new Date(cheque.cheque_date), "dd / MM / yyyy")}
                </p>
              </div>
            </div>

            {/* Pay To */}
            <div className="border-b pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pay To The Order Of</p>
              <p className="text-xl font-semibold">{cheque.payee}</p>
            </div>

            {/* Amount in Words */}
            <div className="border-b pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Amount in Words</p>
              <p className="text-sm font-medium italic">{numberToWords(cheque.amount)}</p>
            </div>

            {/* Amount & Cheque Number */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Cheque No</p>
                <p className="font-mono text-lg font-bold">{cheque.cheque_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount</p>
                <div className="border-2 border-foreground rounded px-4 py-2">
                  <span className="text-2xl font-bold font-mono">
                    <CurrencyDisplay amount={cheque.amount} />
                  </span>
                </div>
              </div>
            </div>

            {/* Memo / Reference */}
            {(cheque.memo || cheque.reference) && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {cheque.memo && `Memo: ${cheque.memo}`}
                  {cheque.memo && cheque.reference && " | "}
                  {cheque.reference && `Ref: ${cheque.reference}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
