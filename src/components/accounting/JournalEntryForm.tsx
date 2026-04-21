import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AccountSelector } from "./shared/AccountSelector";
import { Plus, Trash2, Calculator } from "lucide-react";
import { useCreateJournalEntry } from "@/hooks/useAccountingMutations";
import { formatLKR } from "@/lib/accounting-utils";
import { cn } from "@/lib/utils";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { Loader2 } from "lucide-react";

const lineSchema = z.object({
  account_id: z.string().min(1, "Account is required"),
  description: z.string().optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

const formSchema = z.object({
  entry_number: z.string().optional(),
  entry_date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  lines: z.array(lineSchema).min(2, "At least 2 lines required"),
});

type FormValues = z.infer<typeof formSchema>;

interface JournalEntryFormProps {
  onSuccess?: () => void;
}

export const JournalEntryForm = ({ onSuccess }: JournalEntryFormProps) => {
  const createEntry = useCreateJournalEntry();
  const generateNumber = useGenerateNumber();
  const [isGenerating, setIsGenerating] = useState(true);
  const submitLock = useRef(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_number: "",
      entry_date: new Date().toISOString().split("T")[0],
      description: "",
      reference: "",
      lines: [
        { account_id: "", description: "", debit: 0, credit: 0 },
        { account_id: "", description: "", debit: 0, credit: 0 },
      ],
    },
  });

  // Note: Auto-generate entry number exactly on save to prevent skipped sequences on cancel.

  const lines = form.watch("lines");
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const difference = totalDebit - totalCredit;

  const addLine = () => {
    const currentLines = form.getValues("lines");
    form.setValue("lines", [...currentLines, { account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    const currentLines = form.getValues("lines");
    if (currentLines.length > 2) {
      form.setValue("lines", currentLines.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isBalanced) return;
    if (submitLock.current) return;
    submitLock.current = true;

    const validLines = data.lines
      .filter(line => line.account_id && (line.debit > 0 || line.credit > 0))
      .map(line => ({
        account_id: line.account_id,
        description: line.description,
        debit_amount: line.debit,
        credit_amount: line.credit,
      }));

    const finalEntryNumber = data.entry_number || await generateNumber("journal");

    try {
      await createEntry.mutateAsync({
        entry_number: finalEntryNumber,
        entry_date: data.entry_date,
        description: data.description,
        reference: data.reference,
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines: validLines,
      });

      onSuccess?.();
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="entry_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry #</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      {...field} 
                      readOnly 
                      className="font-mono bg-muted" 
                      placeholder="Auto-generated on save"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entry_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input placeholder="Optional reference" {...field} />
                </FormControl>
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
                <Textarea placeholder="Describe the journal entry..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Entry Lines</h3>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Add Line
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
              <div className="col-span-4">Account</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2 text-right">Debit</div>
              <div className="col-span-2 text-right">Credit</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.account_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AccountSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select account"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Line description" 
                            {...field} 
                            className="min-h-[36px] resize-none overflow-hidden text-sm py-2"
                            rows={1}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.debit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="text-right"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.credit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="text-right"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 2}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7 text-right font-semibold">Totals:</div>
              <div className="col-span-2 text-right font-mono font-semibold">
                {formatLKR(totalDebit)}
              </div>
              <div className="col-span-2 text-right font-mono font-semibold">
                {formatLKR(totalCredit)}
              </div>
              <div className="col-span-1"></div>
            </div>
            
            <div className={cn(
              "mt-2 p-2 rounded-md flex items-center gap-2 justify-center",
              isBalanced ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
            )}>
              <Calculator className="h-4 w-4" />
              {isBalanced ? (
                <span>Entry is balanced ✓</span>
              ) : (
                <span>Out of balance by {formatLKR(Math.abs(difference))}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isBalanced || createEntry.isPending}>
            {createEntry.isPending ? "Creating..." : "Create Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
