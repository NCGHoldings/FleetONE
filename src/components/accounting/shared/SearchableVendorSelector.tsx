import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus } from "lucide-react";
import { useVendors } from "@/hooks/useAccountingData";
import { VendorForm } from "../VendorForm";

interface SearchableVendorSelectorProps {
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  showQuickAdd?: boolean;
  /** Also include customers in the dropdown for cross-entity payments */
  includeCustomers?: boolean;
  customers?: any[];
  valueType?: "id" | "name";
}

export const SearchableVendorSelector = ({
  value,
  onValueChange,
  placeholder = "Select vendor",
  showQuickAdd = true,
  includeCustomers = false,
  customers = [],
  valueType = "id",
}: SearchableVendorSelectorProps) => {
  const { data: vendors } = useVendors();
  const [search, setSearch] = useState("");
  const [showVendorForm, setShowVendorForm] = useState(false);

  const filteredVendors = useMemo(() => {
    const s = search.toLowerCase();
    return (vendors || []).filter((v: any) =>
      !s ||
      v.vendor_code?.toLowerCase().includes(s) ||
      v.vendor_name?.toLowerCase().includes(s)
    );
  }, [vendors, search]);

  const filteredCustomers = useMemo(() => {
    if (!includeCustomers) return [];
    const s = search.toLowerCase();
    return (customers || []).filter((c: any) =>
      !s ||
      c.customer_code?.toLowerCase().includes(s) ||
      c.customer_name?.toLowerCase().includes(s)
    );
  }, [customers, search, includeCustomers]);

  return (
    <>
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {/* Search bar */}
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-7 h-8 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Vendor entries */}
              {filteredVendors.length > 0 && includeCustomers && (
                <div className="px-2 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vendors</span>
                </div>
              )}
              {filteredVendors.map((vendor: any) => (
                <SelectItem key={vendor.id} value={valueType === "name" ? vendor.vendor_name : vendor.id}>
                  <div className="flex items-center gap-2 w-full pr-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{vendor.vendor_code}</span>
                    <span className="truncate">{vendor.vendor_name}</span>
                    {vendor.vendor_categories?.category_name && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto whitespace-nowrap bg-muted/50 font-normal">
                        {vendor.vendor_categories.category_name}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}

              {/* Customer entries (for cross-entity payments) */}
              {includeCustomers && filteredCustomers.length > 0 && (
                <>
                  <div className="px-2 py-1 mt-1 border-t">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Customers</span>
                  </div>
                  {filteredCustomers.map((customer: any) => (
                    <SelectItem key={`cust-${customer.id}`} value={valueType === "name" ? customer.customer_name : `customer:${customer.id}`}>
                      <div className="flex items-center gap-2 w-full pr-2">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30">
                          Customer
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">{customer.customer_code}</span>
                        <span className="truncate">{customer.customer_name}</span>
                        {customer.customer_categories?.category_name && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto whitespace-nowrap bg-muted/50 font-normal">
                            {customer.customer_categories.category_name}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}

              {filteredVendors.length === 0 && filteredCustomers.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        {showQuickAdd && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary hover:text-primary/80"
            onClick={() => setShowVendorForm(true)}
            title="Quick Add Vendor"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick Add Vendor Dialog */}
      <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm onSuccess={() => setShowVendorForm(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};
