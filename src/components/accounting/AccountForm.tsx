import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanyCreateAccount } from "@/hooks/useCompanyMutations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

const accountSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  account_name: z.string().min(1, "Account name is required"),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"], {
    required_error: "Please select an account type",
  }),
  parent_account_id: z.string().optional(),
  is_header: z.boolean().default(false),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  onSuccess: () => void;
}

interface ParentAccount {
  id: string;
  account_code: string;
  account_name: string;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  level5: string | null;
  account_level: number | null;
}

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

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
    case 2:
      result.level2 = accountName;
      result.level3 = null;
      result.level4 = null;
      result.level5 = null;
      break;
    case 3:
      result.level3 = accountName;
      result.level4 = null;
      result.level5 = null;
      break;
    case 4:
      result.level4 = accountName;
      result.level5 = null;
      break;
    case 5:
      result.level5 = accountName;
      break;
  }

  return result;
};

export const AccountForm = ({ onSuccess }: AccountFormProps) => {
  const { selectedCompanyId } = useCompany();
  const createAccount = useCompanyCreateAccount();

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_code: "",
      account_name: "",
      account_type: undefined,
      parent_account_id: "_none",
      is_header: false,
      description: "",
    },
  });

  // Fetch ALL accounts for parent selection (with level info)
  const { data: parentAccounts } = useQuery({
    queryKey: ["chart-of-accounts-all", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, level1, level2, level3, level4, level5, account_level")
        .eq("company_id", selectedCompanyId)
        .order("account_code");
      
      if (error) throw error;
      return data as ParentAccount[];
    },
    enabled: !!selectedCompanyId,
  });

  const onSubmit = (data: AccountFormData) => {
    // Convert "_none" placeholder to undefined for database
    const parentId = data.parent_account_id === "_none" || !data.parent_account_id 
      ? undefined 
      : data.parent_account_id;
    
    // Find the selected parent account to derive level fields
    const selectedParent = parentId 
      ? parentAccounts?.find(acc => acc.id === parentId) || null
      : null;
    
    // Derive level fields based on parent
    const derivedLevels = deriveLevelFields(data.account_name, selectedParent);
    
    createAccount.mutate(
      {
        account_code: data.account_code,
        account_name: data.account_name,
        account_type: data.account_type,
        parent_account_id: parentId,
        is_header: data.is_header,
        description: data.description,
        // Level fields for tree structure
        level1: derivedLevels.level1,
        level2: derivedLevels.level2,
        level3: derivedLevels.level3,
        level4: derivedLevels.level4,
        level5: derivedLevels.level5,
        account_level: derivedLevels.accountLevel,
        gl_code: data.account_code,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess();
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="account_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Code *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 1000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="account_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cash on Hand" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Account (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? "_none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">No Parent (Top Level)</SelectItem>
                  {parentAccounts?.filter(account => account.id && account.id.trim() !== '').map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
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
          name="is_header"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Header Account</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Header accounts group other accounts and cannot have direct transactions
                </p>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Account description..." 
                  {...field} 
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={createAccount.isPending}>
            {createAccount.isPending ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
