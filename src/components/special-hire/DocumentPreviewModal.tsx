import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Save, 
  Download, 
  AlertTriangle, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { DocumentType, DocumentVersion, useDocumentFlow } from '@/hooks/useDocumentFlow';
import { ChangeImpactPreview } from './ChangeImpactPreview';
import { QuotationPreview } from './QuotationPreview';
import { AdvanceReceiptPreview } from './AdvanceReceiptPreview';
import { BalanceInvoicePreview } from './BalanceInvoicePreview';
import { PostTripAdjustmentPreview } from './PostTripAdjustmentPreview';
import { format } from 'date-fns';
import { sectionBasedPDF } from '@/lib/pdf-multi-page';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  quotationData: any;
  existingVersion?: DocumentVersion;
  mode: 'view' | 'edit';
  onSave?: () => void;
}

// Editable fields configuration per document type
const editableFieldsConfig: Record<DocumentType, Array<{ 
  key: string; 
  label: string; 
  type: 'text' | 'number' | 'date' | 'textarea';
  section: string;
}>> = {
  quotation: [
    { key: 'customer_name', label: 'Customer Name', type: 'text', section: 'Customer Details' },
    { key: 'customer_phone', label: 'Phone Number', type: 'text', section: 'Customer Details' },
    { key: 'customer_email', label: 'Email', type: 'text', section: 'Customer Details' },
    { key: 'company_name', label: 'Company Name', type: 'text', section: 'Customer Details' },
    { key: 'pickup_location', label: 'Pickup Location', type: 'text', section: 'Trip Details' },
    { key: 'drop_location', label: 'Drop Location', type: 'text', section: 'Trip Details' },
    { key: 'pickup_datetime', label: 'Pickup Date/Time', type: 'date', section: 'Trip Details' },
    { key: 'drop_datetime', label: 'Drop Date/Time', type: 'date', section: 'Trip Details' },
    { key: 'gross_revenue', label: 'Hire Charge (LKR)', type: 'number', section: 'Pricing' },
    { key: 'fuel_cost_fuel_only', label: 'Fuel Cost (LKR)', type: 'number', section: 'Pricing' },
    { key: 'discount_amount_lkr', label: 'Discount (LKR)', type: 'number', section: 'Pricing' },
  ],
  advance_receipt: [
    { key: 'amount', label: 'Advance Amount (LKR)', type: 'number', section: 'Payment' },
    { key: 'payment_method', label: 'Payment Method', type: 'text', section: 'Payment' },
    { key: 'reference', label: 'Reference', type: 'text', section: 'Payment' },
  ],
  balance_invoice: [
    { key: 'balance_amount', label: 'Balance Amount (LKR)', type: 'number', section: 'Payment' },
    { key: 'driver_name', label: 'Driver Name', type: 'text', section: 'Trip Assignment' },
    { key: 'conductor_name', label: 'Conductor Name', type: 'text', section: 'Trip Assignment' },
    { key: 'vehicle_no', label: 'Vehicle Number', type: 'text', section: 'Trip Assignment' },
    { key: 'notes', label: 'Notes', type: 'textarea', section: 'Additional' },
  ],
  post_trip_adjustment: [
    { key: 'actual_km', label: 'Actual KM Traveled', type: 'number', section: 'Distance' },
    { key: 'extra_km_charge', label: 'Extra KM Charge/km (LKR)', type: 'number', section: 'Charges' },
    { key: 'additional_notes', label: 'Adjustment Notes', type: 'textarea', section: 'Notes' },
  ],
  sales_receipt: [
    { key: 'amount', label: 'Amount (LKR)', type: 'number', section: 'Payment' },
    { key: 'reference', label: 'Reference', type: 'text', section: 'Payment' },
  ]
};

export function DocumentPreviewModal({
  isOpen,
  onClose,
  documentType,
  quotationData,
  existingVersion,
  mode: initialMode,
  onSave
}: DocumentPreviewModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [changeReason, setChangeReason] = useState('');
  const [showImpactPreview, setShowImpactPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const { saveDocumentVersion, calculateChangeImpact, updateDocumentStatus } = useDocumentFlow(quotationData.id);

  // Initialize data from quotation or existing version
  useEffect(() => {
    const initialData = existingVersion?.document_data || quotationData;
    setOriginalData(initialData);
    setEditedData({ ...initialData });
  }, [existingVersion, quotationData]);

  // Get changed fields
  const changedFields = useMemo(() => {
    const changes: string[] = [];
    Object.keys(editedData).forEach(key => {
      if (JSON.stringify(editedData[key]) !== JSON.stringify(originalData[key])) {
        changes.push(key);
      }
    });
    return changes;
  }, [editedData, originalData]);

  const hasChanges = changedFields.length > 0;

  // Group fields by section
  const fieldsBySection = useMemo(() => {
    const fields = editableFieldsConfig[documentType] || [];
    const sections: Record<string, typeof fields> = {};
    fields.forEach(field => {
      if (!sections[field.section]) {
        sections[field.section] = [];
      }
      sections[field.section].push(field);
    });
    return sections;
  }, [documentType]);

  // Recalculate customerTotalWithFuel when pricing fields change
  const recalculateCustomerTotal = (data: Record<string, any>): number => {
    const grossRevenue = Number(data.gross_revenue) || 0;
    const fuelCostTotal = Number(data.fuel_cost_fuel_only) || 0;
    const commissionPassThrough = Number(data.commission_pass_through_amount) || 0;
    const additionalCharges = Number(data.total_additional_charges) || 0;
    const discount = Number(data.discount_amount_lkr) || 0;
    const percentageAdjustment = Number(data.percentage_adjustment) || 0;

    const customerTotalBeforeAdjustment =
      grossRevenue + fuelCostTotal + commissionPassThrough + additionalCharges - discount;
    const adjustmentAmount = customerTotalBeforeAdjustment * (percentageAdjustment / 100);
    
    return Math.round(customerTotalBeforeAdjustment + adjustmentAmount);
  };

  const handleFieldChange = (key: string, value: any) => {
    const pricingFields = ['gross_revenue', 'fuel_cost_fuel_only', 'discount_amount_lkr', 'total_additional_charges', 'commission_pass_through_amount', 'percentage_adjustment'];
    
    setEditedData(prev => {
      const updated = { ...prev, [key]: value };
      
      // Recalculate customerTotalWithFuel if any pricing field changed
      if (pricingFields.includes(key)) {
        updated.customerTotalWithFuel = recalculateCustomerTotal(updated);
      }
      
      return updated;
    });
  };

  const handlePreviewImpact = () => {
    if (changedFields.length === 0) {
      toast.error('No changes to preview');
      return;
    }
    setShowImpactPreview(true);
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    if (!changeReason.trim()) {
      toast.error('Please provide a reason for the changes');
      return;
    }

    setSaving(true);
    try {
      await saveDocumentVersion(documentType, editedData, changeReason, originalData);
      toast.success('Document saved successfully');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      // Save as new version first if there are changes
      if (hasChanges) {
        await saveDocumentVersion(documentType, editedData, changeReason || 'Generated PDF', originalData);
      }
      
      // Generate PDF from the preview
      if (previewRef.current) {
        const pdf = await sectionBasedPDF(previewRef.current);

        // Download the PDF
        const fileName = `${documentType.replace(/_/g, '-')}-${quotationData.quotation_no || 'document'}.pdf`;
        pdf.save(fileName);
        
        toast.success('PDF generated and downloaded successfully');
      } else {
        toast.error('Preview not available for PDF generation');
      }
      
      onSave?.();
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Render the appropriate preview component based on document type
  const renderDocumentPreview = () => {
    switch (documentType) {
      case 'quotation':
        if (editedData.id) {
          return <QuotationPreview quotation={editedData as any} />;
        }
        break;
      case 'advance_receipt':
      case 'sales_receipt':
        return <AdvanceReceiptPreview data={editedData} />;
      case 'balance_invoice':
        return <BalanceInvoicePreview data={editedData} />;
      case 'post_trip_adjustment':
        return <PostTripAdjustmentPreview data={editedData} />;
    }
    
    // Fallback - shouldn't happen if data is properly loaded
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Document preview for {documentType.replace(/_/g, ' ')}</p>
        <p className="text-sm mt-2">Loading preview...</p>
      </div>
    );
  };

  const renderField = (field: typeof editableFieldsConfig.quotation[0]) => {
    const value = editedData[field.key] ?? '';
    const isChanged = changedFields.includes(field.key);

    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="flex items-center gap-2">
          {field.label}
          {isChanged && (
            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
              Changed
            </Badge>
          )}
        </Label>
        {field.type === 'textarea' ? (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            disabled={mode === 'view'}
            className={isChanged ? 'border-yellow-400' : ''}
          />
        ) : field.type === 'date' ? (
          <Input
            type="datetime-local"
            value={value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''}
            onChange={(e) => handleFieldChange(field.key, new Date(e.target.value).toISOString())}
            disabled={mode === 'view'}
            className={isChanged ? 'border-yellow-400' : ''}
          />
        ) : (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.key, 
              field.type === 'number' ? Number(e.target.value) : e.target.value
            )}
            disabled={mode === 'view'}
            className={isChanged ? 'border-yellow-400' : ''}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {mode === 'view' ? <Eye className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                  {documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {existingVersion && (
                    <Badge variant="outline">v{existingVersion.version_number}</Badge>
                  )}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {quotationData.quotation_no} • {quotationData.customer_name}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'view' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('view')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button
                  variant={mode === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('edit')}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Side - Edit Form (when in edit mode) */}
            {mode === 'edit' && (
              <div className="w-1/3 border-r overflow-hidden flex flex-col">
                <ScrollArea className="h-[65vh] p-4">
                  <div className="space-y-6">
                    {Object.entries(fieldsBySection).map(([section, fields]) => (
                      <Card key={section}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{section}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {fields.map(renderField)}
                        </CardContent>
                      </Card>
                    ))}

                    {/* Change Reason */}
                    {hasChanges && (
                      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              {changedFields.length} field{changedFields.length > 1 ? 's' : ''} changed
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Reason for changes *</Label>
                            <Textarea
                              value={changeReason}
                              onChange={(e) => setChangeReason(e.target.value)}
                              placeholder="Explain why these changes are needed..."
                              className="bg-white dark:bg-background"
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={handlePreviewImpact}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Preview Impact
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Right Side - Document Preview */}
            <div className={mode === 'edit' ? 'w-2/3' : 'w-full'}>
              <ScrollArea className="h-[65vh]">
                <div className="p-4">
                  <div ref={previewRef} className="bg-white rounded-lg border shadow-sm">
                    {renderDocumentPreview()}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {existingVersion && (
                  <span>Last updated: {format(new Date(existingVersion.updated_at), 'dd MMM yyyy, HH:mm')}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                {mode === 'edit' && hasChanges && (
                  <Button 
                    variant="secondary"
                    onClick={handleSaveChanges}
                    disabled={saving || !changeReason.trim()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                )}
                <Button onClick={handleGeneratePDF} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Generate PDF
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impact Preview Modal */}
      <ChangeImpactPreview
        isOpen={showImpactPreview}
        onClose={() => setShowImpactPreview(false)}
        documentType={documentType}
        changedFields={changedFields}
        changes={changedFields.reduce((acc, field) => {
          acc[field] = { old: originalData[field], new: editedData[field] };
          return acc;
        }, {} as Record<string, { old: any; new: any }>)}
        onConfirm={() => {
          setShowImpactPreview(false);
          handleSaveChanges();
        }}
      />
    </>
  );
}
