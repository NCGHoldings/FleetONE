// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { OldSalesRecord } from '@/hooks/useLightVehicleOldSalesManagement';

interface MissingField {
  key: keyof OldSalesRecord;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'email' | 'tel';
}

interface LightVehicleOldSalesConvertModalProps {
  record: OldSalesRecord | null;
  open: boolean;
  onClose: () => void;
  onConvert: (additionalData: Partial<OldSalesRecord>) => Promise<void>;
  onCreateOrder?: (additionalData: Partial<OldSalesRecord>) => Promise<void>;
  conversionType: 'quotation' | 'order';
}

// Fields required for quotation creation
const REQUIRED_FIELDS: MissingField[] = [
  { key: 'customer_phone', label: 'Customer Phone', required: true, type: 'tel' },
  { key: 'customer_email', label: 'Customer Email', required: false, type: 'email' },
  { key: 'bus_model', label: 'Bus Model', required: true, type: 'text' },
  { key: 'base_price', label: 'Unit Price (LKR)', required: true, type: 'number' },
  { key: 'quantity', label: 'Quantity', required: true, type: 'number' },
  { key: 'final_price', label: 'Total Price (LKR)', required: true, type: 'number' },
];

const isFieldEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && (value.trim() === '' || value.trim() === '-')) return true;
  if (typeof value === 'number' && (value === 0 || isNaN(value))) return true;
  return false;
};

export const LightVehicleOldSalesConvertModal: React.FC<LightVehicleOldSalesConvertModalProps> = ({
  record,
  open,
  onClose,
  onConvert,
  onCreateOrder,
  conversionType
}) => {
  const [formData, setFormData] = useState<Partial<OldSalesRecord>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine which fields are missing
  const getMissingFields = (): MissingField[] => {
    if (!record) return [];
    return REQUIRED_FIELDS.filter(field => isFieldEmpty(record[field.key]));
  };

  const missingFields = getMissingFields();
  const hasExistingData = record && !missingFields.some(f => f.required);

  // Initialize form data with existing values
  useEffect(() => {
    if (record) {
      const initialData: Partial<OldSalesRecord> = {};
      REQUIRED_FIELDS.forEach(field => {
        const value = record[field.key];
        if (!isFieldEmpty(value)) {
          initialData[field.key] = value as never;
        }
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [record]);

  const handleInputChange = (key: keyof OldSalesRecord, value: string) => {
    const field = REQUIRED_FIELDS.find(f => f.key === key);
    let parsedValue: string | number = value;
    
    if (field?.type === 'number') {
      parsedValue = value ? parseFloat(value) : 0;
    }
    
    setFormData(prev => ({ ...prev, [key]: parsedValue }));
    
    // Clear error when user types
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    missingFields.forEach(field => {
      if (field.required && isFieldEmpty(formData[field.key])) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });

    // Additional validation
    if (formData.customer_email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.customer_email as string)) {
      newErrors.customer_email = 'Invalid email format';
    }

    if (formData.customer_phone && !/^[\d\s+()-]+$/.test(formData.customer_phone as string)) {
      newErrors.customer_phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (conversionType === 'order' && onCreateOrder) {
        await onCreateOrder(formData);
      } else {
        await onConvert(formData);
      }
      onClose();
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (!amount || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {conversionType === 'order' ? (
              <ShoppingCart className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            {missingFields.length > 0 ? 'Complete Missing Information' : 'Confirm Conversion'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Record Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{record.quotation_no}</span>
              <Badge variant="outline">{record.quotation_status || 'Pending'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {record.customer_name} {record.company_name && `• ${record.company_name}`}
            </p>
          </div>

          {/* Missing Fields Warning */}
          {missingFields.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Required information missing
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please fill in the fields below to continue with the conversion.
                </p>
              </div>
            </div>
          )}

          {/* Form Fields for Missing Data */}
          {missingFields.length > 0 && (
            <div className="space-y-4">
              {missingFields.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.key]?.toString() || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className={errors[field.key] ? 'border-destructive' : ''}
                  />
                  {errors[field.key] && (
                    <p className="text-xs text-destructive">{errors[field.key]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Existing Data Summary */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Existing Data:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {!isFieldEmpty(record.bus_model) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>Model: {record.bus_model}</span>
                </div>
              )}
              {!isFieldEmpty(record.quantity) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>Qty: {record.quantity}</span>
                </div>
              )}
              {!isFieldEmpty(record.final_price) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>Price: {formatCurrency(record.final_price)}</span>
                </div>
              )}
              {!isFieldEmpty(record.customer_phone) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>Phone: {record.customer_phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Converting...' : conversionType === 'order' ? 'Create Order' : 'Convert to Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
