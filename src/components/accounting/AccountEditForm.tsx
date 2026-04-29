import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCompanyUpdateAccount } from "@/hooks/useCompanyMutations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const accountSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  account_name: z.string().min(1, "Account name is required"),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"], {
    required_error: "Please select an account type",
  }),
  parent_account_id: z.string().optional(),
  is_header: z.boolean().default(false),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

interface AccountEditFormProps {
  account: {
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    parent_account_id?: string | null;
    is_header?: boolean | null;
    is_active?: boolean;
    description?: string | null;
  };
  onSuccess: () => void;
}

interface ParentAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string | null;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  level5: string | null;
  account_level: number | null;
}

// Derive level fields based on parent account
const deriveLevelFields = (
  accountName: string,
  parentAccount: ParentAccount | null
): {
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  level5: string | null;
  accountLevel: number;
} => {
  if (!parentAccount) {
    // No parent - this is a top-level (level 1) account
    return {
      level1: accountName,
      level2: null,
      level3: null,
      level4: null,
      level5: null,
      accountLevel: 1,
    };
  }

  // Determine parent's current level and place new account in next level
  const parentLevel = parentAccount.account_level || 1;
  const nextLevel = Math.min(parentLevel + 1, 5);

  const result = {
    level1: parentAccount.level1,
    level2: parentAccount.level2,
    level3: parentAccount.level3,
    level4: parentAccount.level4,
    level5: parentAccount.level5,
    accountLevel: nextLevel,
  };

  // Place the new account name in the appropriate level
  switch (nextLevel) {
    case 2: result.level2 = accountName; result.level3 = null; result.level4 = null; result.level5 = null; break;
    case 3: result.level3 = accountName; result.level4 = null; result.level5 = null; break;
    case 4: result.level4 = accountName; result.level5 = null; break;
    case 5: result.level5 = accountName; break;
  }

  return result;
};

export const AccountEditForm = ({ account, onSuccess }: AccountEditFormProps) => {
  const { selectedCompanyId } = useCompany();
  const updateAccount = useCompanyUpdateAccount();
  const [openCombobox, setOpenCombobox] = useState(false);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type as any,
      parent_account_id: account.parent_account_id || "_none",
      is_header: account.is_header ?? false,
      is_active: account.is_active ?? true,
      description: account.description || "",
    },
  });

  const { data: parentAccounts } = useQuery({
    queryKey: ["chart-of-accounts-all", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, account_type, level1, level2, level3, level4, level5, account_level")
        .eq("company_id", selectedCompanyId)
        .neq("id", account.id)
        .order("account_code");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  const onSubmit = (data: AccountFormData) => {
    const parentId = data.parent_account_id === "_none" || !data.parent_account_id
      ? null
      : data.parent_account_id;

    const selectedParent = parentId 
      ? (parentAccounts as ParentAccount[] | undefined)?.find(acc => acc.id === parentId) || null
      : null;
      
    // Derive level fields based on parent
    const derivedLevels = deriveLevelFields(data.account_name, selectedParent);

    updateAccount.mutate(
      {
        id: account.id,
        account_code: data.account_code,
        account_name: data.account_name,
        account_type: data.account_type,
        parent_account_id: parentId,
        is_header: data.is_header,
        is_active: data.is_active,
        description: data.description,
        level1: derivedLevels.level1,
        level2: derivedLevels.level2,
        level3: derivedLevels.level3,
        level4: derivedLevels.level4,
        level5: derivedLevels.level5,
        account_level: derivedLevels.accountLevel,
      },
      { onSuccess: () => { form.reset(); onSuccess(); } }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="account_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Account Code *</FormLabel>
              <FormControl><Input placeholder="e.g., 1000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="account_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="account_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Account Name *</FormLabel>
            <FormControl><Input placeholder="e.g., Cash on Hand" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="parent_account_id" render={({ field }) => {
          const selectedValue = field.value && field.value !== "_none" ? field.value : null;
          const selectedAccount = parentAccounts?.find(a => a.id === selectedValue);
          const displayValue = selectedAccount 
            ? `${selectedAccount.account_code} - ${selectedAccount.account_name}`
            : "No Parent (Top Level)";

          return (
            <FormItem className="flex flex-col">
              <FormLabel>Parent Account (Optional)</FormLabel>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className={cn(
                        "w-full justify-between font-normal",
                        !selectedValue && "text-muted-foreground"
                      )}
                    >
                      {displayValue}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-[100]" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="Search parent account..." />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>No account found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="no parent top level"
                          onSelect={() => {
                            field.onChange("_none");
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !selectedValue ? "opacity-100" : "opacity-0"
                            )}
                          />
                          No Parent (Top Level)
                        </CommandItem>
                        {parentAccounts?.filter(a => a.id && a.id.trim() !== '').map((a) => (
                          <CommandItem
                            key={a.id}
                            value={`${a.account_code} ${a.account_name}`}
                            onSelect={() => {
                              field.onChange(a.id);
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedValue === a.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {a.account_code} - {a.account_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          );
        }} />

        <FormField control={form.control} name="is_header" render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Header Account</FormLabel>
              <p className="text-sm text-muted-foreground">Header accounts group other accounts</p>
            </div>
          </FormItem>
        )} />

        <div className="flex items-center gap-2">
          <Switch
            id="is_active_edit"
            checked={form.watch("is_active")}
            onCheckedChange={(v) => form.setValue("is_active", v)}
          />
          <Label htmlFor="is_active_edit">Active</Label>
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl><Textarea placeholder="Account description..." {...field} rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={updateAccount.isPending}>
            {updateAccount.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
