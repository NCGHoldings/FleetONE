import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Calendar, RotateCcw, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useRecurringEntries, useChartOfAccounts } from "@/hooks/useAccountingData";
import { useCreateRecurringEntry, useRunRecurringEntry, useToggleRecurringEntry } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format, addDays, addMonths, addQuarters, addYears } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const recurringSchema = z.object({
  entry_name: z.string().min(1, "Entry name is required"),
  description: z.string().min(1, "Description is required"),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  debit_account_id: z.string().min(1, "Debit account is required"),
  credit_account_id: z.string().min(1, "Credit account is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

type RecurringFormData = z.infer<typeof recurringSchema>;

export const RecurringEntriesView = () => {
  const { data: entries, isLoading } = useRecurringEntries();
  const { data: accounts } = useChartOfAccounts();
  const createEntry = useCreateRecurringEntry();
  const runEntry = useRunRecurringEntry();
  const toggleEntry = useToggleRecurringEntry();
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      entry_name: "",
      description: "",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      amount: 0,
      debit_account_id: "",
      credit_account_id: "",
    },
  });

  const handleToggle = async (entryId: string, currentStatus: boolean) => {
    try {
      await toggleEntry.mutateAsync({
        entryId,
        isActive: !currentStatus,
      });
      toast({
        title: currentStatus ? "Entry Paused" : "Entry Activated",
        description: `Recurring entry has been ${currentStatus ? 'paused' : 'activated'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle entry status.",
        variant: "destructive",
      });
    }
  };

  const handleRunNow = async (entryId: string) => {
    try {
      await runEntry.mutateAsync(entryId);
      toast({
        title: "Entry Processed",
        description: "Recurring journal entry has been posted to the GL.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process recurring entry.",
        variant: "destructive",
      });
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800",
      weekly: "bg-green-100 text-green-800",
      monthly: "bg-purple-100 text-purple-800",
      quarterly: "bg-orange-100 text-orange-800",
      yearly: "bg-red-100 text-red-800",
    };
    return (
      <Badge variant="outline" className={colors[frequency] || ""}>
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </Badge>
    );
  };

  const getNextRunDate = (lastRun: string | null, frequency: string) => {
    const base = lastRun ? new Date(lastRun) : new Date();
    switch (frequency) {
      case "daily": return addDays(base, 1);
      case "weekly": return addDays(base, 7);
      case "monthly": return addMonths(base, 1);
      case "quarterly": return addQuarters(base, 1);
      case "yearly": return addYears(base, 1);
      default: return addMonths(base, 1);
    }
  };

  const columns = [
    {
      accessorKey: "entry_name",
      header: "Template Name",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.entry_name || row.original.template_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }: any) => getFrequencyBadge(row.original.frequency),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.amount || 0} />
        </span>
      ),
    },
    {
      accessorKey: "last_run_date",
      header: "Last Run",
      cell: ({ row }: any) => 
        row.original.last_run_date 
          ? format(new Date(row.original.last_run_date), "MMM dd, yyyy")
          : "Never",
    },
    {
      accessorKey: "next_run_date",
      header: "Next Run",
      cell: ({ row }: any) => {
        const nextRun = row.original.next_run_date 
          ? new Date(row.original.next_run_date)
          : getNextRunDate(row.original.last_run_date, row.original.frequency);
        return format(nextRun, "MMM dd, yyyy");
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Paused"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleRunNow(row.original.id)}
            disabled={!row.original.is_active || runEntry.isPending}
            title="Run Now"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${runEntry.isPending ? 'animate-spin' : ''}`} />
            Run Now
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => handleToggle(row.original.id, row.original.is_active)}
            disabled={toggleEntry.isPending}
            title={row.original.is_active ? "Pause" : "Activate"}
          >
            {row.original.is_active ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = entries?.filter(e => e.is_active).length || 0;
  const totalMonthlyAmount = entries
    ?.filter(e => e.is_active && e.frequency === "monthly")
    .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

  const onSubmit = async (data: RecurringFormData) => {
    await createEntry.mutateAsync({
      entry_name: data.entry_name,
      description: data.description,
      frequency: data.frequency,
      amount: data.amount,
      start_date: data.start_date,
      end_date: data.end_date,
      debit_account_id: data.debit_account_id,
      credit_account_id: data.credit_account_id,
    });
    setShowForm(false);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recurring Journal Entries</h2>
          <p className="text-sm text-muted-foreground">
            Automate regular journal entries
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Recurring Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Templates</p>
          <h3 className="text-2xl font-bold mt-1">{entries?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Templates</p>
          <h3 className="text-2xl font-bold text-green-600 mt-1">{activeCount}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Monthly Automation</p>
          <h3 className="text-xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalMonthlyAmount} />
          </h3>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Auto-posting</p>
              <p className="text-lg font-bold text-green-600">Enabled</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Templates Table */}
      <Card className="p-6">
        <DataTable enableColumnFilters
          columns={columns}
          data={entries || []}
          searchKey="entry_name"
        />
      </Card>

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Recurring Entry Template</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="entry_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Rent Payment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Journal entry description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="debit_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Debit Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_code} - {acc.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="credit_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_code} - {acc.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEntry.isPending}>
                  {createEntry.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
