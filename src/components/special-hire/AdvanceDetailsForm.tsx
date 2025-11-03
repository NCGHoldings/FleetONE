import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AdvanceDetailsSignatureModal from './AdvanceDetailsSignatureModal';
import { FileSignature, Save, Eye } from 'lucide-react';
import type { AdvanceDetailsRecord } from '@/hooks/useAdvanceDetails';

const formSchema = z.object({
  driverName: z.string().min(1, 'Driver name is required'),
  driverContact: z.string().min(1, 'Driver contact is required'),
  driverMealAllowance: z.string().min(0),
  driverSalary: z.string().min(0),
  driverHighwayCharges: z.string().min(0),
  driverOtherCharges: z.string().min(0),
  conductorName: z.string().optional(),
  conductorContact: z.string().optional(),
  conductorMealAllowance: z.string().min(0).optional(),
  conductorSalary: z.string().min(0).optional(),
  preparedBy: z.string().min(1, 'Prepared by is required'),
  checkedBy: z.string().optional(),
  authorizedBy: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdvanceDetailsFormProps {
  quotationNo: string;
  hireDate: Date;
  pickupLocation: string;
  dropLocation: string;
  numberOfDays: number;
  existingData?: AdvanceDetailsRecord;
  onSaveDraft: (data: any) => void;
  onPreview: (data: any) => void;
  disabled?: boolean;
}

export default function AdvanceDetailsForm({
  quotationNo,
  hireDate,
  pickupLocation,
  dropLocation,
  numberOfDays,
  existingData,
  onSaveDraft,
  onPreview,
  disabled = false,
}: AdvanceDetailsFormProps) {
  const [signatureModal, setSignatureModal] = useState<{
    open: boolean;
    field: string;
    title: string;
  }>({ open: false, field: '', title: '' });

  const [signatures, setSignatures] = useState<{
    preparedBy?: { data: string; type: string };
  }>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      driverName: existingData?.driverName || '',
      driverContact: existingData?.driverContact || '',
      driverMealAllowance: existingData?.driverMealAllowance?.toString() || '0',
      driverSalary: existingData?.driverSalary?.toString() || '0',
      driverHighwayCharges: existingData?.driverHighwayCharges?.toString() || '0',
      driverOtherCharges: existingData?.driverOtherCharges?.toString() || '0',
      conductorName: existingData?.conductorName || '',
      conductorContact: existingData?.conductorContact || '',
      conductorMealAllowance: existingData?.conductorMealAllowance?.toString() || '0',
      conductorSalary: existingData?.conductorSalary?.toString() || '0',
      preparedBy: existingData?.preparedBy || '',
      checkedBy: existingData?.checkedBy || '',
      authorizedBy: existingData?.authorizedBy || '',
      notes: existingData?.notes || '',
    },
  });

  useEffect(() => {
    if (existingData) {
      setSignatures({
        preparedBy: existingData.preparedBySignature,
      });
    }
  }, [existingData]);

  const calculateTotal = (values: FormValues) => {
    const driverTotal =
      parseFloat(values.driverMealAllowance || '0') +
      parseFloat(values.driverSalary || '0') +
      parseFloat(values.driverHighwayCharges || '0') +
      parseFloat(values.driverOtherCharges || '0');

    const conductorTotal =
      parseFloat(values.conductorMealAllowance || '0') +
      parseFloat(values.conductorSalary || '0');

    return driverTotal + conductorTotal;
  };

  const watchedValues = form.watch();
  const totalAmount = calculateTotal(watchedValues);

  const openSignatureModal = (field: string, title: string) => {
    setSignatureModal({ open: true, field, title });
  };

  const handleSignatureSave = (field: string, data: { data: string; type: string }) => {
    setSignatures((prev) => ({ ...prev, [field]: data }));
    setSignatureModal({ open: false, field: '', title: '' });
  };

  const prepareFormData = (values: FormValues) => {
    return {
      quotationNo,
      hireDate,
      pickupLocation,
      dropLocation,
      numberOfDays,
      driverName: values.driverName,
      driverContact: values.driverContact,
      driverMealAllowance: parseFloat(values.driverMealAllowance || '0'),
      driverSalary: parseFloat(values.driverSalary || '0'),
      driverHighwayCharges: parseFloat(values.driverHighwayCharges || '0'),
      driverOtherCharges: parseFloat(values.driverOtherCharges || '0'),
      conductorName: values.conductorName,
      conductorContact: values.conductorContact,
      conductorMealAllowance: parseFloat(values.conductorMealAllowance || '0'),
      conductorSalary: parseFloat(values.conductorSalary || '0'),
      preparedBy: values.preparedBy,
      preparedBySignature: signatures.preparedBy,
      checkedBy: values.checkedBy,
      authorizedBy: values.authorizedBy,
      totalAmount,
      notes: values.notes,
    };
  };

  const handleSaveDraft = () => {
    const data = prepareFormData(form.getValues());
    onSaveDraft(data);
  };

  const handlePreview = () => {
    const data = prepareFormData(form.getValues());
    onPreview(data);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-muted/50">
        <h3 className="font-semibold mb-3">Trip Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Quotation No:</span>
            <p className="font-medium">{quotationNo}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date of Hire:</span>
            <p className="font-medium">{new Date(hireDate).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Pickup:</span>
            <p className="font-medium">{pickupLocation}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Drop:</span>
            <p className="font-medium">{dropLocation}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Number of Days:</span>
            <p className="font-medium">{numberOfDays}</p>
          </div>
        </div>
      </Card>

      <Form {...form}>
        <div className="space-y-6">
          {/* Driver Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Driver Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverMealAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Allowance (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverHighwayCharges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Highway Charges (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverOtherCharges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Charges (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Conductor Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Conductor/Assistant Details (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="conductorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conductorContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conductorMealAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Allowance (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conductorSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Authorization */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Authorization</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="preparedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prepared By *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => openSignatureModal('preparedBy', 'Prepared By Signature')}
                  disabled={disabled}
                >
                  <FileSignature className="w-4 h-4 mr-2" />
                  {signatures.preparedBy ? 'Update' : 'Add'} Signature
                </Button>
                {signatures.preparedBy && (
                  <p className="text-sm text-green-600 mt-1">✓ Signature captured</p>
                )}
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="checkedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checked By</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="authorizedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authorized By</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Total Amount */}
          <Card className="p-6 bg-primary/10 border-primary">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold text-primary">
                LKR {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </Card>

          {/* Action Buttons */}
          {!disabled && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleSaveDraft}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button type="button" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                Preview PDF
              </Button>
            </div>
          )}
        </div>
      </Form>

      <AdvanceDetailsSignatureModal
        open={signatureModal.open}
        onClose={() => setSignatureModal({ open: false, field: '', title: '' })}
        onSave={(data) => handleSignatureSave(signatureModal.field, data)}
        title={signatureModal.title}
      />
    </div>
  );
}
