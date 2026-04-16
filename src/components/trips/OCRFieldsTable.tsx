import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Field {
  name: string;
  value: number;
  confidence?: number;
}

interface OCRFieldsTableProps {
  title: string;
  fields: Record<string, number>;
  isEditing: boolean;
  onFieldChange?: (fieldName: string, value: number) => void;
}

export const OCRFieldsTable = ({ title, fields, isEditing, onFieldChange }: OCRFieldsTableProps) => {
  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return null;
    if (confidence >= 80) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (confidence >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const total = Object.values(fields).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Field</TableHead>
            <TableHead className="text-right">Amount (LKR)</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(fields).map(([fieldName, value]) => (
            <TableRow key={fieldName}>
              <TableCell className="font-medium text-sm">{fieldName}</TableCell>
              <TableCell className="text-right">
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => onFieldChange?.(fieldName, parseFloat(e.target.value) || 0)}
                    className="text-right h-8"
                  />
                ) : (
                  <span className="font-mono">{formatAmount(value)}</span>
                )}
              </TableCell>
              <TableCell>
                {getConfidenceIcon(85)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right font-mono">{formatAmount(total)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
