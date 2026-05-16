/**
 * Searchable Account Selector for Finance Settings
 * Uses Popover + Command (cmdk) for fuzzy search by account code or name
 */

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type?: string;
}

interface SearchableFinanceAccountSelectorProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  accounts: Account[];
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableFinanceAccountSelector({
  value,
  onValueChange,
  accounts,
  placeholder = "Select account...",
  required = false,
  hasError = false,
  disabled = false,
  className,
}: SearchableFinanceAccountSelectorProps) {
  const [open, setOpen] = useState(false);

  // Filter out accounts with empty ids
  const filteredAccounts = useMemo(() => {
    return (accounts || []).filter(
      (account) => account.id && account.id.trim() !== ""
    );
  }, [accounts]);

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
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !value && "text-muted-foreground",
            hasError && "border-destructive",
            className
          )}
        >
          <span className="truncate text-left flex-1">
            {displayValue}
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
              {/* Not Configured Option */}
              <CommandItem
                value="__not_configured__"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
                className="cursor-pointer hover:bg-accent"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 flex-shrink-0",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground">-- Not Configured --</span>
              </CommandItem>
              
              {/* Account Options */}
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.account_code} ${account.account_name}`}
                  onSelect={() => {
                    onValueChange(account.id === value ? null : account.id);
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
}
