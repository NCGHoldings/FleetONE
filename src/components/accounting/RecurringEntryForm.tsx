import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountSelector } from "./shared/AccountSelector";
import { useCreateRecurringEntry } from "@/hooks/useAccountingMutations";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  entry_name: z.string().min(1, "Entry name is required"),
  description: z.string().min(1, "Description is required"),
  frequency: z.string().min(1, "Frequency is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  debit_account_id: z.string().min(1, "Debit account is required"),
  credit_account_id: z.string().min(1, "Credit account is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface RecurringEntryFormProps {
  onSuccess?: () => void;
}

export const RecurringEntryForm = ({ onSuccess }: RecurringEntryFormProps) => {
  const createEntry = useCreateRecurringEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_name: "",
      description: "",
      frequency: "monthly",
      amount: 0,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      debit_account_id: "",
      credit_account_id: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createEntry.mutateAsync({
        entry_name: data.entry_name,
        description: data.description,
        frequency: data.frequency,
        amount: data.amount,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        debit_account_id: data.debit_account_id,
        credit_account_id: data.credit_account_id,
      });
      form.reset();
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="entry_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Monthly Rent" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
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
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter description for the journal entry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (LKR)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="debit_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Debit Account</FormLabel>
                <FormControl>
                  <AccountSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select debit account"
                  />
                </FormControl>
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
                <FormControl>
                  <AccountSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select credit account"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Recurring Entry
          </Button>
        </div>
      </form>
    </Form>
  );
};
