import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Settings2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  if (num === 0) return "RUPEES ZERO ONLY";
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " AND " + convert(n % 100) : "");
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " THOUSAND" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " MILLION" + (n % 1000000 ? " " + convert(n % 1000000) : "");
    return convert(Math.floor(n / 1000000000)) + " BILLION" + (n % 1000000000 ? " " + convert(n % 1000000000) : "");
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = "RUPEES " + convert(intPart);
  if (decPart > 0) result += " AND CENTS " + convert(decPart);
  result += " ONLY";
  return result;
};

// Split amount words into two lines if too long
const splitAmountWords = (words: string): [string, string] => {
  if (words.length <= 55) return [words, ""];
  const mid = words.lastIndexOf(" ", 55);
  if (mid === -1) return [words, ""];
  return [words.substring(0, mid), words.substring(mid + 1)];
};

// Format date as DD/MM/YYYY digits array
const getDateDigits = (dateStr: string): string[] => {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return [...dd, ...mm, ...yyyy]; // 8 digits
  } catch {
    return ["0", "0", "0", "0", "0", "0", "0", "0"];
  }
};

const formatAmount = (amount: number): string => {
  return amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const STORAGE_KEY = "cheque-print-offsets";

export const ChequePrintPreview = ({ open, onOpenChange, cheque }: ChequePrintPreviewProps) => {
  const [showCalibration, setShowCalibration] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [acPayee, setAcPayee] = useState(false);

  // Load offsets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        setOffsetX(x || 0);
        setOffsetY(y || 0);
      }
    } catch {}
  }, []);

  // Save offsets
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: offsetX, y: offsetY }));
  }, [offsetX, offsetY]);

  // Auto A/C Payee for amounts over 500,000
  useEffect(() => {
    if (cheque && cheque.amount >= 500000) {
      setAcPayee(true);
    }
  }, [cheque]);

  if (!cheque) return null;

  const handlePrint = () => {
    window.print();
  };

  const dateDigits = getDateDigits(cheque.cheque_date);
  const amountWords = numberToWords(cheque.amount);
  const [line1, line2] = splitAmountWords(amountWords);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-0 overflow-visible">
        {/* Header - hidden in print */}
        <div className="cheque-no-print p-4 pb-2 flex items-center justify-between border-b">
          <DialogHeader>
            <DialogTitle>Cheque Print Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCalibration(!showCalibration)}
              title="Calibration Settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print Cheque
            </Button>
          </div>
        </div>

        {/* Calibration Controls - hidden in print */}
        {showCalibration && (
          <div className="cheque-no-print px-4 py-3 border-b bg-muted/50 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Horizontal Offset: {offsetX}mm</Label>
                <Slider
                  value={[offsetX]}
                  onValueChange={([v]) => setOffsetX(v)}
                  min={-10}
                  max={10}
                  step={0.5}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Vertical Offset: {offsetY}mm</Label>
                <Slider
                  value={[offsetY]}
                  onValueChange={([v]) => setOffsetY(v)}
                  min={-10}
                  max={10}
                  step={0.5}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={acPayee} onCheckedChange={setAcPayee} id="ac-payee" />
              <Label htmlFor="ac-payee" className="text-xs">A/C Payee Only Crossing</Label>
            </div>
          </div>
        )}

        {/* Cheque Layout - exact Sri Lankan dimensions */}
        <div className="p-4 cheque-no-print-wrapper">
          <div
            id="cheque-print-area"
            className="cheque-body"
            style={{
              width: "175mm",
              height: "75mm",
              position: "relative",
              border: "1px dashed hsl(var(--border))",
              overflow: "hidden",
              margin: "0 auto",
              background: "transparent",
              fontFamily: "'Courier New', monospace",
            }}
          >
            {/* Inner offset wrapper */}
            <div
              style={{
                position: "absolute",
                top: `${offsetY}mm`,
                left: `${offsetX}mm`,
                width: "175mm",
                height: "75mm",
              }}
            >
              {/* A/C Payee Only Crossing */}
              {acPayee && (
                <div
                  style={{
                    position: "absolute",
                    top: "2mm",
                    left: "2mm",
                    width: "28mm",
                    height: "18mm",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      borderLeft: "2px solid #000",
                      borderRight: "2px solid #000",
                      transform: "skewX(-15deg)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%) rotate(-15deg)",
                      fontSize: "6px",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px",
                    }}
                  >
                    A/C PAYEE ONLY
                  </span>
                </div>
              )}

              {/* Date Digits - top right */}
              <div
                style={{
                  position: "absolute",
                  top: "8mm",
                  left: "120mm",
                  display: "flex",
                  gap: "1mm",
                }}
              >
                {dateDigits.map((digit, i) => (
                  <div
                    key={i}
                    style={{
                      width: "5.5mm",
                      height: "7mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      borderBottom: "1px solid #999",
                      marginRight: i === 1 || i === 3 ? "2mm" : "0",
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>

              {/* Payee Line */}
              <div
                style={{
                  position: "absolute",
                  top: "22mm",
                  left: "15mm",
                  width: "145mm",
                  fontSize: "13px",
                  fontWeight: "bold",
                  borderBottom: "1px solid #999",
                  paddingBottom: "1mm",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {cheque.payee.toUpperCase()}
              </div>

              {/* Amount in Words - Line 1 */}
              <div
                style={{
                  position: "absolute",
                  top: "32mm",
                  left: "5mm",
                  width: "130mm",
                  fontSize: "10px",
                  fontWeight: "bold",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "1mm",
                  lineHeight: "1.2",
                }}
              >
                {line1}
              </div>

              {/* Amount in Words - Line 2 */}
              <div
                style={{
                  position: "absolute",
                  top: "40mm",
                  left: "5mm",
                  width: "130mm",
                  fontSize: "10px",
                  fontWeight: "bold",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "1mm",
                  lineHeight: "1.2",
                }}
              >
                {line2}
              </div>

              {/* Amount in Figures Box */}
              <div
                style={{
                  position: "absolute",
                  top: "30mm",
                  left: "140mm",
                  width: "32mm",
                  height: "10mm",
                  border: "1.5px solid #000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "0 2mm",
                }}
              >
                Rs. {formatAmount(cheque.amount)}
              </div>

              {/* MICR zone - bottom blank strip */}
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "0",
                  width: "100%",
                  height: "12mm",
                  borderTop: "1px dashed #ccc",
                }}
              />
            </div>
          </div>
        </div>

        {/* Print-only styles */}
        <style>{`
          @media print {
            /* Hide everything except cheque */
            body * {
              visibility: hidden !important;
            }
            #cheque-print-area,
            #cheque-print-area * {
              visibility: visible !important;
            }
            #cheque-print-area {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 175mm !important;
              height: 75mm !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
            }
            .cheque-no-print,
            .cheque-no-print-wrapper > *:not(#cheque-print-area),
            [role="dialog"] > *:not(.cheque-no-print-wrapper):not(:has(#cheque-print-area)) {
              display: none !important;
            }
            @page {
              size: 175mm 75mm;
              margin: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
