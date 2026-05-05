const fs = require('fs');

let content = fs.readFileSync('src/components/accounting/APInvoiceForm.tsx', 'utf-8');

// 1. We need to import forwardRef, useImperativeHandle
content = content.replace(
  'import { useState, useEffect, useRef } from "react";',
  'import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";'
);

// 2. Rename APInvoiceForm to SingleAPInvoiceForm and add forwardRef
// Look for `export const APInvoiceForm = ({ open, onOpenChange, editingInvoice }: APInvoiceFormProps) => {`
content = content.replace(
  /export const APInvoiceForm = \(\{ open, onOpenChange, editingInvoice \}: APInvoiceFormProps\) => \{/,
  `export interface SingleInvoiceData {
  formValues: InvoiceFormData;
  lines: InvoiceLine[];
  allocations: any[];
  routeId: string;
  busId: string;
  schoolRouteId: string;
}

interface SingleAPInvoiceFormProps {
  initialData?: SingleInvoiceData;
  editingInvoice?: any;
  isActive: boolean;
  onDataChange?: (data: SingleInvoiceData) => void;
}

const SingleAPInvoiceForm = forwardRef(({ initialData, editingInvoice, isActive, onDataChange }: SingleAPInvoiceFormProps, ref) => {`
);

// 3. We need to modify the defaultValues and state initializers to use `initialData`
// Find `const form = useForm<InvoiceFormData>({ ... defaultValues: { ... } });`
const formInitRegex = /const form = useForm<InvoiceFormData>\(\{[\s\S]*?defaultValues: \{([\s\S]*?)\},[\s\S]*?\}\);/;
content = content.replace(formInitRegex, (match, defaultValues) => {
  return `const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData?.formValues || {
${defaultValues}
    },
  });`;
});

// Update state initializers
content = content.replace(
  /const \[lines, setLines\] = useState<InvoiceLine\[\]>\(\[\s*\{[^\}]+\}\s*\]\);/,
  `const [lines, setLines] = useState<InvoiceLine[]>(initialData?.lines || [{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }]);`
);

content = content.replace(
  /const \[costAllocations, setCostAllocations\] = useState<Array<\{[^>]+>>\(\[\]\);/,
  `const [costAllocations, setCostAllocations] = useState<Array<{id: string; unit_code: string; amount: number; percentage: number;}>>(initialData?.allocations || []);`
);

content = content.replace(
  /const \[selectedRouteId, setSelectedRouteId\] = useState<string>\(""\);/,
  `const [selectedRouteId, setSelectedRouteId] = useState<string>(initialData?.routeId || "");`
);

content = content.replace(
  /const \[selectedBusId, setSelectedBusId\] = useState<string>\(""\);/,
  `const [selectedBusId, setSelectedBusId] = useState<string>(initialData?.busId || "");`
);

content = content.replace(
  /const \[selectedSchoolRouteId, setSelectedSchoolRouteId\] = useState<string>\(""\);/,
  `const [selectedSchoolRouteId, setSelectedSchoolRouteId] = useState<string>(initialData?.schoolRouteId || "");`
);

// Add useImperativeHandle right before `const applyWht`
content = content.replace(
  /const applyWht = form.watch\("apply_wht"\);/,
  `useImperativeHandle(ref, () => ({
    validateAndGetData: async () => {
      const isValid = await form.trigger();
      if (!isValid) return null;
      return {
        formValues: form.getValues(),
        lines,
        allocations: costAllocations,
        routeId: selectedRouteId,
        busId: selectedBusId,
        schoolRouteId: selectedSchoolRouteId,
        netPayable,
        whtAmount,
        grossTotal,
        totalTax,
        subtotal
      };
    }
  }));

  // Auto-sync data to parent when active
  useEffect(() => {
    if (isActive && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange({
          formValues: form.getValues(),
          lines,
          allocations: costAllocations,
          routeId: selectedRouteId,
          busId: selectedBusId,
          schoolRouteId: selectedSchoolRouteId
        });
      });
      return () => subscription.unsubscribe();
    }
  }, [isActive, form.watch, lines, costAllocations, selectedRouteId, selectedBusId, selectedSchoolRouteId]);

  const applyWht = form.watch("apply_wht");`
);

// Fix the useEffect that relies on `open` prop, which we removed from SingleAPInvoiceForm
content = content.replace(
  /useEffect\(\(\) => \{\s*if \(!open\) return;\s*if \(editingInvoice\) \{/g,
  `useEffect(() => {
    if (editingInvoice) {`
);

// Strip out the Dialog wrappers from SingleAPInvoiceForm
// Replace the return block
const returnRegex = /return \([\s\S]*?<DialogContent[^>]*>[\s\S]*?<DialogHeader>[\s\S]*?<\/DialogHeader>([\s\S]*?)<DialogFooter>[\s\S]*?<\/DialogFooter>[\s\S]*?<\/DialogContent>[\s\S]*?<\/Dialog>;/m;

const match = content.match(returnRegex);
if (match) {
  const formContent = match[1];
  // Since we are moving Dialog outside, we just return the form content
  content = content.replace(returnRegex, `return (<div className={cn("space-y-6", !isActive && "hidden")}>${formContent}</div>);`);
} else {
  console.log("Could not find the Dialog wrappers to strip!");
}

// Strip out the onSubmit function since submission will be handled by the parent
// We need to remove the `onSubmit={form.handleSubmit(onSubmit)}` from the form tag
content = content.replace(/<form onSubmit=\{form\.handleSubmit\(onSubmit\)\} className="space-y-6">/, `<form className="space-y-6">`);

// Actually, we can just remove the whole onSubmit function and the submit buttons from SingleAPInvoiceForm
const onSubmitRegex = /const onSubmit = async \(data: InvoiceFormData\) => \{[\s\S]*?finally \{\s*submitLock.current = false;\s*\}\s*\};/;
content = content.replace(onSubmitRegex, '');


// Append the new Multi-Copy Wrapper Component
content += `

export const APInvoiceForm = ({ open, onOpenChange, editingInvoice }: APInvoiceFormProps) => {
  const [numCopies, setNumCopies] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [copiesData, setCopiesData] = useState<SingleInvoiceData[]>([]);
  const formRefs = useRef<any[]>([]);

  const createInvoice = useCreateAPInvoice();
  const updateInvoice = useUpdateAPInvoice();
  const createPayment = useCreateAPPayment();
  const generatePayNum = useGenerateNumber();
  const { getEffectiveCompanyId } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingInvoice) {
        setNumCopies(1);
        setCopiesData([]);
      } else {
        setNumCopies(1);
        setActiveTab(0);
        setCopiesData([
          {
            formValues: {
              invoice_number: "",
              vendor_bill_number: "",
              vendor_id: "",
              invoice_date: format(new Date(), "yyyy-MM-dd"),
              due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
              apply_wht: false,
              wht_rate: 5,
              notes: "",
            },
            lines: [{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }],
            allocations: [],
            routeId: "",
            busId: "",
            schoolRouteId: ""
          }
        ]);
      }
    }
  }, [open, editingInvoice]);

  const handleNumCopiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val > 0 && val <= 20) {
      setNumCopies(val);
      setCopiesData(prev => {
        const newData = [...prev];
        // If increasing copies, duplicate the currently active copy's data to the new ones
        const templateData = prev[activeTab] || prev[0];
        
        while (newData.length < val) {
          // Deep clone the template data
          newData.push(JSON.parse(JSON.stringify(templateData)));
        }
        // If decreasing, truncate
        if (newData.length > val) {
          newData.length = val;
          if (activeTab >= val) setActiveTab(val - 1);
        }
        return newData;
      });
    }
  };

  const handleDataChange = (index: number, data: SingleInvoiceData) => {
    setCopiesData(prev => {
      const newData = [...prev];
      newData[index] = data;
      return newData;
    });
  };

  const handleSaveAll = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Validate all forms
      const validatedData = [];
      for (let i = 0; i < numCopies; i++) {
        const ref = formRefs.current[i];
        if (ref) {
          const data = await ref.validateAndGetData();
          if (!data) {
            toast.error(\`Please fix the errors in Copy \${i + 1}\`);
            setActiveTab(i);
            setIsSubmitting(false);
            return;
          }
          validatedData.push(data);
        }
      }

      // 2. Submit all sequentially
      let successCount = 0;
      for (let i = 0; i < validatedData.length; i++) {
        const data = validatedData[i];
        
        const lineData = data.lines
          .filter((l: any) => l.description.trim() || l.unit_price > 0)
          .map((l: any) => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_amount: (l.quantity * l.unit_price * l.tax_rate) / 100,
            tax_code: l.tax_code,
            line_total: l.line_total,
            account_id: l.account_id,
          }));

        if (editingInvoice) {
          await updateInvoice.mutateAsync({
            id: editingInvoice.id,
            data: {
              invoice_number: data.formValues.invoice_number,
              vendor_bill_number: data.formValues.vendor_bill_number || undefined,
              vendor_id: data.formValues.vendor_id,
              invoice_date: data.formValues.invoice_date,
              due_date: data.formValues.due_date,
              subtotal: data.subtotal,
              total_amount: data.grossTotal,
              tax_amount: data.totalTax,
              wht_amount: data.whtAmount,
              notes: data.formValues.notes,
              route_id: data.routeId || undefined,
              bus_id: data.busId || undefined,
              school_route_id: data.schoolRouteId || undefined,
            },
            lines: lineData,
          });
        } else {
          // New Invoice creation
          let finalInvoiceNumber = data.formValues.invoice_number;
          if (!finalInvoiceNumber) {
            const year = new Date().getFullYear();
            const prefix = \`AP-INV-\${year}-\`;
            let query = supabase.from("ap_invoices").select("invoice_number").ilike("invoice_number", \`\${prefix}%\`).order("invoice_number", { ascending: false }).limit(1);
            const effectiveCompanyId = getEffectiveCompanyId?.() || undefined;
            if (effectiveCompanyId) query = query.eq("company_id", effectiveCompanyId);
            const { data: latestInvoice } = await query.maybeSingle();
            let nextSeq = 1;
            if (latestInvoice?.invoice_number) {
               const match = latestInvoice.invoice_number.match(/(\\d+)$/);
               if (match) nextSeq = parseInt(match[1], 10) + 1;
            }
            finalInvoiceNumber = \`\${prefix}\${String(nextSeq).padStart(4, "0")}\`;
          }

          const validAllocations = data.allocations.filter((a: any) => a.unit_code && a.amount > 0).map((a: any) => ({ unit_code: a.unit_code, amount: a.amount }));

          await createInvoice.mutateAsync({
            invoice_number: finalInvoiceNumber,
            vendor_bill_number: data.formValues.vendor_bill_number || undefined,
            vendor_id: data.formValues.vendor_id,
            invoice_date: data.formValues.invoice_date,
            due_date: data.formValues.due_date,
            subtotal: data.subtotal,
            total_amount: data.grossTotal,
            tax_amount: data.totalTax,
            wht_amount: data.whtAmount,
            notes: data.formValues.notes,
            route_id: data.routeId || undefined,
            bus_id: data.busId || undefined,
            school_route_id: data.schoolRouteId || undefined,
            lines: lineData,
            cost_allocations: validAllocations.length > 0 ? validAllocations : undefined,
          });
        }
        successCount++;
      }
      
      toast.success(\`Successfully saved \${successCount} invoice(s)\`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(\`Failed to save invoices: \${error.message}\`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle>{editingInvoice ? "Edit AP Invoice" : "Record AP Invoice (Vendor Bill)"}</DialogTitle>
            
            {!editingInvoice && (
              <div className="flex items-center gap-2 pr-6">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Number of Copies:</span>
                <Input 
                  type="number" 
                  min={1} 
                  max={20} 
                  value={numCopies} 
                  onChange={handleNumCopiesChange}
                  className="w-20 h-8"
                />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {!editingInvoice && numCopies > 1 && (
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
              {Array.from({ length: numCopies }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2",
                    activeTab === i 
                      ? "bg-background border-primary text-primary" 
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  Copy {i + 1}
                </button>
              ))}
            </div>
          )}

          {editingInvoice ? (
             <SingleAPInvoiceForm 
               ref={el => formRefs.current[0] = el}
               editingInvoice={editingInvoice}
               isActive={true}
             />
          ) : (
            copiesData.map((data, i) => (
              <SingleAPInvoiceForm 
                key={i}
                ref={el => formRefs.current[i] = el}
                initialData={data}
                isActive={activeTab === i}
                onDataChange={(newData) => handleDataChange(i, newData)}
              />
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center"><Check className="h-4 w-4 mr-2 animate-spin" /> Saving...</span>
            ) : (
              <span className="flex items-center"><Check className="h-4 w-4 mr-2" /> Save {numCopies > 1 ? \`All (\${numCopies})\` : 'Invoice'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
`;

fs.writeFileSync('src/components/accounting/APInvoiceForm.tsx', content);
console.log('Refactoring complete');
