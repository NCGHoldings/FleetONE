import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  Receipt,
  Calculator,
  FileCheck,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { DocumentType } from '@/hooks/useDocumentFlow';
import { cn } from '@/lib/utils';

interface ChangeImpactPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  changedFields: string[];
  changes: Record<string, { old: any; new: any }>;
  onConfirm: () => void;
}

const documentLabels: Record<DocumentType, { label: string; icon: React.ReactNode }> = {
  quotation: { label: 'Quotation', icon: <FileText className="h-4 w-4" /> },
  advance_receipt: { label: 'Advance Receipt', icon: <Receipt className="h-4 w-4" /> },
  balance_invoice: { label: 'Balance Invoice', icon: <FileCheck className="h-4 w-4" /> },
  post_trip_adjustment: { label: 'Post-Trip Adjustment', icon: <Calculator className="h-4 w-4" /> },
  sales_receipt: { label: 'Sales Receipt', icon: <Receipt className="h-4 w-4" /> }
};

// Define field impact relationships
const fieldImpacts: Record<string, { affectedDocuments: DocumentType[]; description: string }> = {
  gross_revenue: {
    affectedDocuments: ['quotation', 'advance_receipt', 'balance_invoice'],
    description: 'Changing the hire charge will update all related documents'
  },
  fuel_cost_fuel_only: {
    affectedDocuments: ['quotation', 'balance_invoice'],
    description: 'Fuel cost changes will affect total amounts'
  },
  discount_amount_lkr: {
    affectedDocuments: ['quotation', 'balance_invoice'],
    description: 'Discount changes will recalculate final amounts'
  },
  customer_name: {
    affectedDocuments: ['quotation', 'advance_receipt', 'balance_invoice'],
    description: 'Customer name will be updated across all documents'
  },
  customer_email: {
    affectedDocuments: ['quotation', 'advance_receipt', 'balance_invoice'],
    description: 'Customer email will be updated for future communications'
  },
  pickup_location: {
    affectedDocuments: ['quotation', 'balance_invoice'],
    description: 'Trip details will be updated'
  },
  drop_location: {
    affectedDocuments: ['quotation', 'balance_invoice'],
    description: 'Trip details will be updated'
  }
};

export function ChangeImpactPreview({
  isOpen,
  onClose,
  documentType,
  changedFields,
  changes,
  onConfirm
}: ChangeImpactPreviewProps) {
  // Calculate affected documents
  const affectedDocs = new Set<DocumentType>();
  const warnings: string[] = [];
  let requiresReapproval = false;

  changedFields.forEach(field => {
    const impact = fieldImpacts[field];
    if (impact) {
      impact.affectedDocuments.forEach(doc => affectedDocs.add(doc));
      warnings.push(impact.description);
    }

    // Check if amount-related fields changed
    if (['gross_revenue', 'fuel_cost_fuel_only', 'discount_amount_lkr'].includes(field)) {
      requiresReapproval = true;
    }
  });

  // Always include current document
  affectedDocs.add(documentType);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return value.toLocaleString();
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Change Impact Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* What's Changed */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Changes Made ({changedFields.length} field{changedFields.length > 1 ? 's' : ''})
              </h4>
              <div className="space-y-2">
                {Object.entries(changes).map(([field, { old, new: newVal }]) => (
                  <div 
                    key={field}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    <span className="font-medium capitalize">
                      {field.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground line-through">
                        {formatValue(old)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-primary">
                        {formatValue(newVal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Affected Documents */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3">Documents That Will Be Affected</h4>
              <div className="grid grid-cols-2 gap-2">
                {Array.from(affectedDocs).map(doc => {
                  const docInfo = documentLabels[doc];
                  const isCurrent = doc === documentType;
                  
                  return (
                    <div 
                      key={doc}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border",
                        isCurrent ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      {docInfo.icon}
                      <span className="flex-1">{docInfo.label}</span>
                      {isCurrent ? (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Will Update</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-400">Important Notes</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {[...new Set(warnings)].map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Re-approval Warning */}
          {requiresReapproval && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Re-approval May Be Required</AlertTitle>
              <AlertDescription>
                You are changing financial fields. The customer may need to re-approve the quotation.
                A new version number will be assigned.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Ready to Apply Changes?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A new version will be created, and you can always restore previous versions from the history.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm & Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
