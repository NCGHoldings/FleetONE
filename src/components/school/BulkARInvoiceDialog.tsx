import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, FileSpreadsheet, Users, DollarSign, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useStudentsForBulkAR, useGenerateBulkARInvoices, useBranchFinanceSettings } from "@/hooks/useSchoolBusFinance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface BulkARInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
}

export function BulkARInvoiceDialog({ open, onOpenChange, branchId, branchName }: BulkARInvoiceDialogProps) {
  const [invoiceMonth, setInvoiceMonth] = useState<Date>(new Date());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"select" | "confirm" | "processing" | "complete">("select");

  const { data: students, isLoading: studentsLoading } = useStudentsForBulkAR(branchId);
  const { data: settings, isLoading: settingsLoading } = useBranchFinanceSettings(branchId);
  const generateBulkAR = useGenerateBulkARInvoices();

  // useBranchFinanceSettings now handles cross-company fallback internally
  const effectiveSettings = settings;

  // Select all students by default when dialog opens
  useEffect(() => {
    if (open && students) {
      setSelectedStudents(new Set(students.map((s) => s.id)));
      setStep("select");
    }
  }, [open, students]);

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === students?.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students?.map((s) => s.id) || []));
    }
  };

  const selectedStudentsList = students?.filter((s) => selectedStudents.has(s.id)) || [];
  const totalAmount = selectedStudentsList.reduce((sum, s) => sum + (s.current_amount_due || s.fixed_monthly_amount || 0), 0);

  const handleGenerateInvoices = async () => {
    if (!effectiveSettings) {
      return;
    }

    setStep("processing");

    try {
      await generateBulkAR.mutateAsync({
        branchId,
        invoiceMonth,
        students: selectedStudentsList.map((s) => ({
          id: s.id,
          student_name: s.student_name,
          payment_balance: s.payment_balance,
          current_amount_due: s.current_amount_due,
          fixed_monthly_amount: s.fixed_monthly_amount,
        })),
        settings: effectiveSettings,
      });

      setStep("complete");
    } catch (error) {
      setStep("select");
    }
  };

  const handleClose = () => {
    setStep("select");
    onOpenChange(false);
  };

  const isSettingsConfigured = effectiveSettings?.trade_receivable_account_id && effectiveSettings?.sbs_collection_account_id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Generate AR Invoices - {branchName}
          </DialogTitle>
          <DialogDescription>
            Create AR invoices for all active students with amount due
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <>
            {/* Settings Warning */}
            {!isSettingsConfigured && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Finance Settings Not Configured</p>
                  <p className="text-sm text-muted-foreground">
                    Please configure Trade Receivables and SBS Collection accounts in <strong>School Bus → Settings → Finance</strong> tab before generating invoices.
                    Without these settings, invoices cannot be posted to the General Ledger.
                  </p>
                </div>
              </div>
            )}

            {/* Invoice Month Selector */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">Invoice Month:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(invoiceMonth, "MMMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={invoiceMonth}
                    onSelect={(date) => date && setInvoiceMonth(date)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-2xl font-bold">{students?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Selected</p>
                      <p className="text-2xl font-bold">{selectedStudents.size}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">LKR {totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-hidden border rounded-lg">
              <div className="p-3 bg-muted border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={students?.length > 0 && selectedStudents.size === students.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedStudents.size} of {students?.length || 0} selected
                </span>
              </div>
              <ScrollArea className="h-[250px]">
                {studentsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : students?.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No active students with amount due
                  </div>
                ) : (
                  <div className="divide-y">
                    {students?.map((student) => (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer",
                          selectedStudents.has(student.id) && "bg-primary/5"
                        )}
                        onClick={() => toggleStudent(student.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedStudents.has(student.id)}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <div>
                            <p className="font-medium">{student.student_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.admission_no} • Grade {student.grade}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            LKR {(student.current_amount_due || student.fixed_monthly_amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Amount Due</p>
                          {student.payment_balance < 0 && (
                            <p className="text-xs text-destructive">
                              Balance: LKR {Math.abs(student.payment_balance).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={selectedStudents.size === 0 || !isSettingsConfigured}
              >
                Continue to Preview
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h3 className="font-semibold">Confirm Invoice Generation</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Invoice Month:</span>
                    <span className="ml-2 font-medium">{format(invoiceMonth, "MMMM yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Students:</span>
                    <span className="ml-2 font-medium">{selectedStudents.size}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="ml-2 font-medium">LKR {totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto-Post:</span>
                    <span className="ml-2">
                      {effectiveSettings?.auto_post_invoices ? (
                        <Badge variant="default" className="bg-green-500">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {effectiveSettings?.auto_post_invoices && (
                <div className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-semibold text-sm">Journal Entry to be Created:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span>DR: Trade Receivables</span>
                      <span className="font-mono font-semibold">LKR {totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span>CR: SBS Collection Revenue</span>
                      <span className="font-mono font-semibold">LKR {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={handleGenerateInvoices}>
                Generate {selectedStudents.size} Invoices
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Generating AR Invoices...</p>
            <p className="text-sm text-muted-foreground">
              Creating {selectedStudents.size} invoices and posting to GL
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-lg font-medium">Invoices Generated Successfully!</p>
            <p className="text-sm text-muted-foreground">
              {selectedStudents.size} AR invoices have been created for {branchName}
            </p>
            <p className="text-sm text-muted-foreground">
              Total Amount: LKR {totalAmount.toLocaleString()}
            </p>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
