import { useChartOfAccounts } from "@/hooks/useAccountingData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  accountTypes?: string[];
  disabled?: boolean;
  className?: string;
}

export const AccountSelector = ({
  value,
  onValueChange,
  placeholder = "Select account",
  accountTypes,
  disabled = false,
  className,
}: AccountSelectorProps) => {
  const { data: accounts, isLoading } = useChartOfAccounts();

  const filteredAccounts = accountTypes
    ? accounts?.filter((acc) => accountTypes.includes(acc.account_type || ""))
    : accounts;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredAccounts
          ?.filter((account) => account.id && account.id.trim() !== "")
          ?.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <span className="font-mono text-xs text-muted-foreground mr-2">
                {account.account_code}
              </span>
              {account.account_name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};
