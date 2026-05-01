import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { usePostPaymentToGL, usePostGroupedPaymentToGL } from "@/hooks/useSchoolBusFinance";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";

export function FinanceImportApprovalDialog() {
  const [open, setOpen] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [importData, setImportData] = useState<any>(null);
  const [matchedItems, setMatchedItems] = useState<any[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [suspenseAccounts, setSuspenseAccounts] = useState<any[]>([]);
  const [selectedSuspenseAccountId, setSelectedSuspenseAccountId] = useState<string>("");
  const [selectedOverrideBankAccountId, setSelectedOverrideBankAccountId] = useState<string>("");
  const [bankAccountName, setBankAccountName] = useState<string>("Bank GL");

  const { toast } = useToast();
  const postPaymentToGL = usePostPaymentToGL();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();

  useEffect(() => {
    const handleOpen = (e: CustomEvent<{ importId: string }>) => {
      setImportId(e.detail.importId);
      setOpen(true);
      fetchImportDetails(e.detail.importId);
    };

    window.addEventListener("openFinanceApproval", handleOpen as EventListener);
    return () => window.removeEventListener("openFinanceApproval", handleOpen as EventListener);
  }, []);

  useEffect(() => {
    if (open) {
      fetchSuspenseAccounts();
    }
  }, [open]);

  const fetchSuspenseAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type')
      .in('account_type', ['asset', 'liability', 'equity'])
      .eq('company_id', getEffectiveCompanyId())
      .order('account_name');
      
    if (data) {
      setSuspenseAccounts(data);
    }
  };

  const fetchImportDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data: imp } = await supabase
        .from("school_payment_imports")
        .select("*")
        .eq("id", id)
        .single();
      
      if (imp) {
        setImportData(imp);
        
        // Fetch branch's bank account mapping
        const { data: settings, error: settingsError } = await supabase
          .from("school_bus_finance_settings")
          .select(`
            branch_gl_account_id,
            cash_account_id,
            branch_gl:chart_of_accounts!school_bus_finance_settings_branch_gl_account_id_fkey(account_name),
            cash_gl:chart_of_accounts!school_bus_finance_settings_cash_account_id_fkey(account_name)
          `)
          .eq("branch_id", imp.branch_id)
          .not("branch_gl_account_id", "is", null)
          .limit(1)
          .maybeSingle();

        if (settingsError) {
          console.warn("Error fetching branch finance settings:", settingsError);
        }

        if (settings?.branch_gl?.account_name) {
          setBankAccountName(settings.branch_gl.account_name);
        } else if (settings?.cash_gl?.account_name) {
          setBankAccountName(settings.cash_gl.account_name);
        } else {
          // Fallback if no specific branch_gl_account_id is found, try fetching any setting for this branch
          const { data: fallbackSettings } = await supabase
            .from("school_bus_finance_settings")
            .select(`
              cash_account_id,
              cash_gl:chart_of_accounts!school_bus_finance_settings_cash_account_id_fkey(account_name)
            `)
            .eq("branch_id", imp.branch_id)
            .not("cash_account_id", "is", null)
            .limit(1)
            .maybeSingle();
            
          if (fallbackSettings?.cash_gl?.account_name) {
            setBankAccountName(fallbackSettings.cash_gl.account_name);
          } else {
            setBankAccountName("Bank GL");
          }
        }
      }

      const { data: items } = await supabase
        .from("school_payment_import_items")
        .select("*")
        .eq("import_id", id);

      if (items) {
        setMatchedItems(items.filter(i => i.match_status === 'ready_for_finance'));
        setUnmatchedItems(items.filter(i => i.match_status === 'unmatched'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const postGroupedPaymentToGL = usePostGroupedPaymentToGL();
  
  const handleApprove = async () => {
    if (unmatchedItems.length > 0 && !selectedSuspenseAccountId) {
      toast({
        title: "Suspense Account Required",
        description: "Please select a GL account for unmatched transactions.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // 1. Process Matched Items
      if (matchedItems.length > 0) {
        const studentIds = [...new Set(matchedItems.flatMap(item => item.matched_student_ids || []))];
        const { data: students } = await supabase
          .from('school_students')
          .select('id, fixed_monthly_amount, payment_balance, current_amount_due, branch_id, student_name')
          .in('id', studentIds);

        const studentMap = new Map(students?.map(s => [s.id, s]) || []);

        for (const item of matchedItems) {
          const matchedStudentIds = item.matched_student_ids || [];
          const paymentDate = new Date(item.txn_date);
          const paymentMonth = paymentDate.toISOString().slice(0, 7) + '-01';

          const studentDetails = matchedStudentIds.map((id: string) => studentMap.get(id)).filter(Boolean);
          const studentDues = studentDetails.map((student: any) => ({
            student,
            due: student.current_amount_due || student.fixed_monthly_amount || 0
          }));
          
          const totalDue = studentDues.reduce((sum: number, s: any) => sum + s.due, 0);
          
          const allocations = studentDues.map((s: any) => {
            let allocated = 0;
            if (totalDue === 0) {
              allocated = item.amount / matchedStudentIds.length;
            } else {
              allocated = s.due; 
            }
            return { student: s.student, due: s.due, allocated };
          });

          const totalAllocated = allocations.reduce((sum: number, a: any) => sum + a.allocated, 0);
          const difference = item.amount - totalAllocated;

          if (difference !== 0 && totalDue !== 0 && matchedStudentIds.length > 0) {
            const differencePerStudent = difference / matchedStudentIds.length;
            allocations.forEach((a: any) => {
              a.allocated += differencePerStudent;
            });
          }

          const itemTransactions = allocations.map(({ student, allocated }: any) => {
            const fixedAmount = student.fixed_monthly_amount || 0;
            const balanceBefore = student.payment_balance || 0;
            const balanceAfter = balanceBefore + allocated;
            
            return {
              student_id: student.id,
              payment_date: item.txn_date,
              payment_month: paymentMonth,
              amount_paid: allocated,
              fixed_amount: fixedAmount,
              difference: allocated - (student.current_amount_due || fixedAmount),
              payment_balance_before: balanceBefore,
              payment_balance_after: balanceAfter,
              payment_method: 'Bank Transfer',
              reference_no: `IMPORT-${importId?.slice(0, 8)}`,
              notes: `Auto-imported from bank statement: ${item.description}`,
            };
          });

          // Insert AR transactions for this specific bank statement item
          const { data: insertedPayments, error: txError } = await supabase
            .from('school_payment_transactions')
            .insert(itemTransactions)
            .select();

          if (txError) throw txError;

          if (insertedPayments && insertedPayments.length > 0) {
            const branchId = studentDetails[0]?.branch_id || importData.branch_id;
            
            // Build the grouped allocations payload
            const glAllocations = insertedPayments.map(txn => {
              const student = studentMap.get(txn.student_id);
              return {
                paymentId: txn.id,
                amount: txn.amount_paid,
                studentName: student?.student_name || 'Student',
                studentId: txn.student_id,
                fixedAmount: student?.fixed_monthly_amount || 0,
                overpaymentAmount: txn.difference > 0 ? txn.difference : undefined,
                previousBalance: student?.payment_balance || 0,
              };
            });

            try {
              await postGroupedPaymentToGL.mutateAsync({
                totalAmount: item.amount,
                branchId: branchId,
                paymentMethod: 'Bank Transfer',
                referenceNo: `IMPORT-${importId?.slice(0, 8)}`,
                description: item.description,
                allocations: glAllocations,
                customBankAccountId: selectedOverrideBankAccountId || undefined,
              });
            } catch (glError) {
              console.error("Grouped GL posting failed for item", item.id, glError);
            }
          }

          // Update student balances
          for (const txn of itemTransactions) {
            await supabase
              .from('school_students')
              .update({ payment_balance: txn.payment_balance_after })
              .eq('id', txn.student_id);
            
            // Update map to keep running balance accurate within the same batch
            const student = studentMap.get(txn.student_id);
            if (student) {
               student.payment_balance = txn.payment_balance_after;
               // current_amount_due logic update is simplified here, assume payment_balance holds credit
            }
          }
        }

        // Mark as finalized
        await supabase
          .from('school_payment_import_items')
          .update({ match_status: 'manual_matched' })
          .in('id', matchedItems.map(i => i.id));
      }

      // 2. Process Unmatched Items (Post to Suspense)
      if (unmatchedItems.length > 0 && selectedSuspenseAccountId) {
        for (const item of unmatchedItems) {
          try {
            await postPaymentToGL.mutateAsync({
              paymentId: item.id, // Using item ID as a pseudo-payment ID for now
              amount: item.amount,
              branchId: importData.branch_id,
              studentName: 'Unmatched Deposit',
              paymentMethod: 'Bank Transfer',
              referenceNo: item.description,
              fixedAmount: item.amount,
              customArAccountId: selectedSuspenseAccountId, // Divert from standard AR to Suspense
              customBankAccountId: selectedOverrideBankAccountId || undefined // Override bank if selected
            });
            
            await supabase
              .from('school_payment_import_items')
              .update({ 
                match_status: 'posted_unmatched',
                notes: `Suspense COA: ${selectedSuspenseAccountId}` 
              })
              .eq('id', item.id);
          } catch (e) {
            console.error("Failed to post suspense entry", e);
          }
        }
      }

      // 3. Mark Batch as Completed
      await supabase
        .from('school_payment_imports')
        .update({ status: 'completed' })
        .eq('id', importId);

      toast({ title: "Success", description: "Import batch approved and posted to GL." });
      setOpen(false);
      window.dispatchEvent(new Event("schoolPaymentImportUpdated"));
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve import batch.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Finance Approval: Bank Statement Import</DialogTitle>
          <DialogDescription>
            Review the matched transactions and assign unmatched funds to a suspense account before posting.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-green-50/50">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                  <CheckCircle className="h-4 w-4" /> Matched Payments
                </div>
                <p className="text-2xl font-bold">{matchedItems.length}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  LKR {matchedItems.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Ready to post to AR</p>
              </div>

              <div className="p-4 border rounded-lg bg-amber-50/50">
                <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" /> Unmatched Payments
                </div>
                <p className="text-2xl font-bold">{unmatchedItems.length}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  LKR {unmatchedItems.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Requires Suspense Account</p>
              </div>
            </div>

            {matchedItems.length > 0 && (
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex flex-col gap-3 mb-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Summary of Matched Payments</Label>
                    <div className="text-xs bg-muted px-2 py-1 rounded">
                      <strong>DR:</strong> {selectedOverrideBankAccountId ? suspenseAccounts.find(a => a.id === selectedOverrideBankAccountId)?.account_name : bankAccountName} &nbsp;|&nbsp; <strong>CR:</strong> Accounts Receivable (AR)
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                    <Label className="text-sm font-medium text-blue-900">Override Receiving Bank (Optional)</Label>
                    <p className="text-xs text-blue-700">Select an account here if this statement belongs to an old/different bank account rather than the default branch account.</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between mt-1 bg-white"
                        >
                          {selectedOverrideBankAccountId
                            ? suspenseAccounts.find((acc) => acc.id === selectedOverrideBankAccountId)?.account_name
                            : `Default (${bankAccountName})`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[600px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search Asset Account..." />
                          <CommandList>
                            <CommandEmpty>No accounts found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => setSelectedOverrideBankAccountId("")}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !selectedOverrideBankAccountId ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Use Default Branch Account
                              </CommandItem>
                              {suspenseAccounts.filter(a => a.account_type === 'asset').map((acc) => (
                                <CommandItem
                                  key={acc.id}
                                  value={`${acc.account_code} ${acc.account_name}`}
                                  onSelect={() => {
                                    setSelectedOverrideBankAccountId(acc.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedOverrideBankAccountId === acc.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {acc.account_code} - {acc.account_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="max-h-[200px] overflow-y-auto border rounded divide-y bg-background">
                  {matchedItems.map(item => (
                    <div key={item.id} className="p-3 flex justify-between text-sm hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.txn_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-700">LKR {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">{item.match_confidence}% Match</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unmatchedItems.length > 0 && (
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Suspense GL Account (For Unmatched Funds)</Label>
                  <div className="text-xs bg-muted px-2 py-1 rounded">
                    <strong>DR:</strong> {selectedOverrideBankAccountId ? suspenseAccounts.find(a => a.id === selectedOverrideBankAccountId)?.account_name : bankAccountName} &nbsp;|&nbsp; <strong>CR:</strong> Suspense Account
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Unmatched transactions will be posted here to keep the bank GL balanced. When these are matched later, this account will be reversed.
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedSuspenseAccountId
                        ? suspenseAccounts.find((acc) => acc.id === selectedSuspenseAccountId)?.account_name
                        : "Select GL Account..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[600px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search GL Account..." />
                      <CommandList>
                        <CommandEmpty>No accounts found.</CommandEmpty>
                        <CommandGroup>
                          {suspenseAccounts.map((acc) => (
                            <CommandItem
                              key={acc.id}
                              value={`${acc.account_code} ${acc.account_name}`}
                              onSelect={() => {
                                setSelectedSuspenseAccountId(acc.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSuspenseAccountId === acc.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {acc.account_code} - {acc.account_name} ({acc.account_type})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>Cancel</Button>
          <Button onClick={handleApprove} disabled={loading || processing}>
            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Approve & Post to GL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
