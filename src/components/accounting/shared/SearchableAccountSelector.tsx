import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChartOfAccounts } from "@/hooks/useAccountingData";

interface SearchableAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  accountTypes?: string[];
  disabled?: boolean;
  className?: string;
}

export const SearchableAccountSelector = ({
  value,
  onValueChange,
  placeholder = "Select account...",
  accountTypes,
  disabled = false,
  className,
}: SearchableAccountSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { data: accounts, isLoading } = useChartOfAccounts();

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    
    let result = accounts.filter(
      (account) => account.id && account.id.trim() !== ""
    );
    
    if (accountTypes && accountTypes.length > 0) {
      result = result.filter((acc) => {
        if (!acc.account_type) return false;
        const accType = acc.account_type.toLowerCase();
        return accountTypes.some(t => accType.includes(t.toLowerCase()));
      });
    }
    
    return result;
  }, [accounts, accountTypes]);

  const selectedAccount = useMemo(() => {
    return filteredAccounts.find((account) => account.id === value);
  }, [filteredAccounts, value]);

  const displayValue = selectedAccount
    ? `${selectedAccount.account_code} - ${selectedAccount.account_name}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {isLoading ? "Loading..." : displayValue}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 z-[100] bg-popover border shadow-lg" 
        align="start"
        sideOffset={4}
      >
        <Command className="bg-popover" shouldFilter={true}>
          <div className="flex items-center border-b px-3">
            <CommandInput 
              placeholder="Search by code or name..." 
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup>
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.account_code} ${account.account_name}`}
                  onSelect={() => {
                    onValueChange(account.id === value ? "" : account.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-accent"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-xs text-muted-foreground mr-2 flex-shrink-0">
                    {account.account_code}
                  </span>
                  <span className="truncate">{account.account_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
