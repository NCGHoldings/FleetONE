import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Plus, Calculator, Save, AlertCircle, ShieldOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/accounting/shared/CurrencyDisplay';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  section_type: z.enum(['Buses', 'Spare Parts', 'Items']),
  project_id: z.string().optional(),
  grn_id: z.string().min(1, 'Goods Receipt Note is required'),
  allocation_method: z.enum(['by_value', 'by_quantity', 'by_weight', 'by_volume']),
  charges: z.array(z.object({
    description: z.string().min(1, 'Description required'),
    supplier_id: z.string().optional(),
    expense_account_id: z.string().optional(),
    currency_code: z.string().min(1, 'Currency required').default('LKR'),
    exchange_rate: z.number().min(0.0001, 'Invalid rate').default(1.0),
    base_amount: z.number().min(0.01, 'Must be positive'),
    amount: z.number() // Calculated
  })).min(1, 'At least one charge is required')
});

type FormData = z.infer<typeof formSchema>;

interface GRNItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  is_duty_exempt: boolean;
  allocatable_value: number; // The value used for math distribution
  allocatable_quantity: number;
  allocatedAmount?: number;
  landedUnitPrice?: number;
}

export function LandedCostVoucherForm({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [grnItems, setGrnItems] = useState<GRNItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      section_type: 'Items',
      allocation_method: 'by_value',
      charges: [{ description: 'Sea Freight', supplier_id: '', expense_account_id: '', currency_code: 'LKR', exchange_rate: 1.0, base_amount: 0, amount: 0 }]
    }
  });

  const { fields: charges, append, remove } = useFieldArray({
    control: form.control,
    name: "charges"
  });

  const watchedCompanyId = form.watch('company_id');
  const watchedGrnId = form.watch('grn_id');
  const watchedAllocationMethod = form.watch('allocation_method');
  const watchedCharges = form.watch('charges');

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  useEffect(() => {
    if (watchedCompanyId) {
      loadCompanyDependentData(watchedCompanyId);
      form.setValue('project_id', '');
      form.setValue('grn_id', '');
      setGrnItems([]);
    }
  }, [watchedCompanyId]);

  useEffect(() => {
    if (watchedGrnId) {
      loadGRNItems(watchedGrnId);
    } else {
      setGrnItems([]);
    }
  }, [watchedGrnId]);

  // Update calculated charge amounts real-time
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name?.startsWith('charges.') && (name.endsWith('.base_amount') || name.endsWith('.exchange_rate'))) {
        const indexMatch = name.match(/charges\.(\d+)\./);
        if (indexMatch) {
          const idx = parseInt(indexMatch[1]);
          const charge = value.charges?.[idx];
          if (charge) {
            const calculated = (charge.base_amount || 0) * (charge.exchange_rate || 1.0);
            if (charge.amount !== calculated) {
               form.setValue(`charges.${idx}.amount`, calculated);
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const loadInitialData = async () => {
    try {
      const [
        { data: cData }, 
        { data: sData }, 
        { data: aData }
      ] = await Promise.all([
        (supabase as any).from('companies').select('id, name').order('name'),
        (supabase as any).from('suppliers').select('id, supplier_name').order('supplier_name'),
        (supabase as any).from('chart_of_accounts').select('id, account_code, account_name').eq('account_type', 'Liability').order('account_code')
      ]);
      setCompanies(cData || []);
      setSuppliers(sData || []);
      setAccounts(aData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCompanyDependentData = async (companyId: string) => {
    try {
      const [{ data: pData }, { data: gData }] = await Promise.all([
        (supabase as any).from('projects').select('id, project_name').order('project_name'),
        (supabase as any).from('goods_receipt_notes').select('id, grn_number').eq('company_id', companyId).eq('status', 'Received').order('grn_number', { ascending: false })
      ]);
      setProjects(pData || []);
      setGrns(gData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadGRNItems = async (grnId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('grn_items')
        .select(`
          id, quantity, unit_price,
          items (id, name)
        `)
        .eq('grn_id', grnId);
        
      if (error) throw error;
      
      const formattedItems = data?.map(d => ({
        id: d.id,
        item_id: d.items?.id || '',
        item_name: d.items?.name || 'Unknown Item',
        quantity: d.quantity || 0,
        unit_price: d.unit_price || 0,
        total_value: (d.quantity || 0) * (d.unit_price || 0),
        is_duty_exempt: false,
        allocatable_value: (d.quantity || 0) * (d.unit_price || 0),
        allocatable_quantity: d.quantity || 0
      })) || [];
      
      setGrnItems(formattedItems);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load GRN items', variant: 'destructive' });
    }
  };

  const toggleExemption = (index: number) => {
    const updated = [...grnItems];
    const isNowExempt = !updated[index].is_duty_exempt;
    updated[index].is_duty_exempt = isNowExempt;
    updated[index].allocatable_value = isNowExempt ? 0 : updated[index].total_value;
    updated[index].allocatable_quantity = isNowExempt ? 0 : updated[index].quantity;
    setGrnItems(updated);
  };

  // --- Enterprise Allocation Engine Math ---
  const totalCharges = watchedCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalAllocatableQuantity = grnItems.reduce((sum, item) => sum + item.allocatable_quantity, 0);
  const totalAllocatableValue = grnItems.reduce((sum, item) => sum + item.allocatable_value, 0);

  const calculatedItems = grnItems.map(item => {
    let allocatedAmount = 0;
    
    if (totalCharges > 0 && !item.is_duty_exempt) {
      if (watchedAllocationMethod === 'by_quantity' && totalAllocatableQuantity > 0) {
        allocatedAmount = totalCharges * (item.allocatable_quantity / totalAllocatableQuantity);
      } else if (watchedAllocationMethod === 'by_value' && totalAllocatableValue > 0) {
        allocatedAmount = totalCharges * (item.allocatable_value / totalAllocatableValue);
      }
    }

    const landedUnitPrice = item.unit_price + (allocatedAmount / (item.quantity || 1));

    return {
      ...item,
      allocatedAmount,
      landedUnitPrice
    };
  });

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      // Create Voucher
      const { data: voucher, error: vError } = await supabase
        .from('landed_cost_vouchers')
        .insert({
          company_id: values.company_id,
          project_id: values.project_id || null,
          section_type: values.section_type,
          grn_id: values.grn_id,
          allocation_method: values.allocation_method,
          total_additional_cost: totalCharges,
          status: 'draft',
          posting_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
        
      if (vError) throw vError;

      // Create Phase 2 Enterprise Charges
      const { error: cError } = await supabase
        .from('landed_cost_charges')
        .insert(values.charges.map(c => ({
          voucher_id: voucher.id,
          charge_type: c.description,
          supplier_id: c.supplier_id || null,
          expense_account_id: c.expense_account_id || null,
          currency_code: c.currency_code,
          exchange_rate: c.exchange_rate,
          base_amount: c.base_amount,
          amount: c.amount
        })));
        
      if (cError) throw cError;

      // Create Allocated Items with Exemption Data
      const { error: iError } = await supabase
        .from('landed_cost_items')
        .insert(calculatedItems.map(item => ({
          voucher_id: voucher.id,
          item_id: item.item_id,
          original_qty: item.quantity,
          original_unit_cost: item.unit_price,
          allocated_cost: item.allocatedAmount,
          new_unit_cost: item.landedUnitPrice,
          is_duty_exempt: item.is_duty_exempt
        })));

      if (iError) throw iError;

      toast({ title: 'Success', description: 'Enterprise Landed Cost Voucher drafted.' });
      onSuccess();
      onOpenChange(false);
      form.reset();
      setGrnItems([]);
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Validation Error', 
        description: err.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <Badge className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-200" variant="outline">Phase 2 Engine</Badge>
          <DialogTitle className="text-xl">Enterprise Landed Cost Mapping</DialogTitle>
          <DialogDescription>Distribute freight, customs, and vendor liabilities across shipments with precision math.</DialogDescription>
        </div>

        <ScrollArea className="flex-1 px-6 py-4 bg-muted/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Header Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <FormField control={form.control} name="company_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select Co." /></SelectTrigger>
                      <SelectContent>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="section_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Type <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Buses">Buses</SelectItem>
                        <SelectItem value="Spare Parts">Spare Parts</SelectItem>
                        <SelectItem value="Items">General Items</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="grn_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source GRN <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchedCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Select GRN..." /></SelectTrigger>
                      <SelectContent>
                        {grns.map(g => <SelectItem key={g.id} value={g.id}>{g.grn_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="allocation_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apportion Math</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="by_value">By Value</SelectItem>
                        <SelectItem value="by_quantity">By Quantity</SelectItem>
                        <SelectItem value="by_weight">By Weight (CBM)</SelectItem>
                        <SelectItem value="by_volume">By Volume</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Enterprise Charges Grid */}
              <Card className="border-primary/20 shadow-sm overflow-visible">
                <CardHeader className="pb-3 px-4 pt-4">
                  <CardTitle className="text-sm">Financial Charge Mappings</CardTitle>
                  <CardDescription>Link foreign currency costs to distinct vendors and GL Clearing accounts.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/4">Charge Type</TableHead>
                          <TableHead className="w-1/5">Vendor / Payee</TableHead>
                          <TableHead className="w-1/5">GL Clearing A/C</TableHead>
                          <TableHead className="w-24">Curr.</TableHead>
                          <TableHead className="w-24">Ex. Rate</TableHead>
                          <TableHead className="text-right">Base Amount</TableHead>
                          <TableHead className="text-right bg-primary/5">Local Cost</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {charges.map((charge, index) => (
                          <TableRow key={charge.id}>
                            <TableCell>
                              <FormField control={form.control} name={`charges.${index}.description`} render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="Freight / Customs..." {...field} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`charges.${index}.supplier_id`} render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                                    <SelectTrigger><SelectValue placeholder="Vendor..." /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-- No Vendor --</SelectItem>
                                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`charges.${index}.expense_account_id`} render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                                    <SelectTrigger><SelectValue placeholder="GL Account..." /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-- Select GL --</SelectItem>
                                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`charges.${index}.currency_code`} render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="USD" {...field} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`charges.${index}.exchange_rate`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" step="0.0001" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 1)} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`charges.${index}.base_amount`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" step="0.01" className="text-right" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell className="bg-primary/5 font-semibold text-right align-middle">
                              <CurrencyDisplay amount={form.watch(`charges.${index}.amount`)} />
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ description: '', supplier_id: '', expense_account_id: '', currency_code: 'LKR', exchange_rate: 1.0, base_amount: 0, amount: 0 })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Additional Charge Line
                  </Button>
                  <div className="flex justify-end pt-4 border-t mt-4 text-base font-bold text-primary">
                    Total Local Charges: <span className="ml-4"><CurrencyDisplay amount={totalCharges} /></span>
                  </div>
                </CardContent>
              </Card>

              {/* Allocation Engine Rules */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 px-4 pt-4 bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      Dynamic Item Apportionment
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldOff className="h-3 w-3" /> Toggle exempt items to exclude them from calculations.
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {calculatedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
                      <AlertCircle className="h-8 w-8 mb-2 opacity-50 text-amber-500" />
                      <p>Select a GRN to analyze its items.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16 text-center text-xs">Exempt</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Org. Unit</TableHead>
                            <TableHead className="text-right">Org. Total</TableHead>
                            <TableHead className="text-right bg-primary/5 text-primary">Allocated (+)</TableHead>
                            <TableHead className="text-right bg-green-50 text-green-700">Landed Unit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculatedItems.map((item, index) => (
                            <TableRow key={item.id} className={item.is_duty_exempt ? 'opacity-60 bg-muted/30' : ''}>
                              <TableCell className="text-center">
                                <Switch checked={item.is_duty_exempt} onCheckedChange={() => toggleExemption(index)} />
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.item_name}
                                {item.is_duty_exempt && <Badge variant="secondary" className="ml-2 text-[10px]">Excluded</Badge>}
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right"><CurrencyDisplay amount={item.unit_price} /></TableCell>
                              <TableCell className="text-right"><CurrencyDisplay amount={item.total_value} /></TableCell>
                              <TableCell className="text-right font-medium text-primary bg-primary/5">
                                <CurrencyDisplay amount={item.allocatedAmount} />
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-700 bg-green-50">
                                <CurrencyDisplay amount={item.landedUnitPrice} />
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell></TableCell>
                            <TableCell>NET TOTALS</TableCell>
                            <TableCell className="text-right">{totalAllocatableQuantity} <span className="font-normal text-xs text-muted-foreground">(Alloc.)</span></TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right"><CurrencyDisplay amount={totalAllocatableValue} /></TableCell>
                            <TableCell className="text-right bg-primary/10 text-primary">
                              <CurrencyDisplay amount={totalCharges} />
                            </TableCell>
                            <TableCell className="text-right bg-green-100 text-green-800">
                              <CurrencyDisplay amount={totalAllocatableValue + totalCharges} />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </form>
          </Form>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || calculatedItems.length === 0}>
            {isSubmitting ? 'Processing...' : 'Generate Financial Draft'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
