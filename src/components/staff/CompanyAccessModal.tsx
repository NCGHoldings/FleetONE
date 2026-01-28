import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Building, Bus, Car, Truck, Briefcase } from "lucide-react";
import { useCompanyAccess } from "@/hooks/useCompanyAccess";
import { useCompany, NCG_HOLDING_ID, NCG_EXPRESS_ID } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface CompanyAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName?: string;
}

// Get icon based on business unit type
const getBusinessUnitIcon = (type: string | null | undefined) => {
  switch (type) {
    case "school_bus":
      return <Bus className="h-4 w-4 text-amber-500" />;
    case "special_hire":
      return <Car className="h-4 w-4 text-blue-500" />;
    case "yutong":
    case "sinotruck":
      return <Truck className="h-4 w-4 text-green-500" />;
    case "light_vehicle":
      return <Car className="h-4 w-4 text-purple-500" />;
    case "holding":
      return <Building className="h-4 w-4 text-gray-500" />;
    default:
      return <Briefcase className="h-4 w-4 text-muted-foreground" />;
  }
};

export function CompanyAccessModal({ open, onOpenChange, userId, userName }: CompanyAccessModalProps) {
  const { companies, getSubCompaniesFor } = useCompany();
  
  const {
    hasAccess,
    setAccess,
    bulkSetAccess,
    savePermissions,
    isSaving,
    isDirty,
  } = useCompanyAccess({ userId: userId || undefined });

  // Find NCG Express and NCG Holding
  const ncgExpress = companies.find(c => c.id === NCG_EXPRESS_ID);
  const ncgHolding = companies.find(c => c.id === NCG_HOLDING_ID);
  const ncgHoldingSubCompanies = useMemo(() => 
    ncgHolding ? getSubCompaniesFor(ncgHolding.id) : [],
    [ncgHolding, getSubCompaniesFor]
  );

  // Toggle all for a group
  const toggleAllNCGHolding = (value: boolean) => {
    const ids = [
      ...(ncgHolding ? [ncgHolding.id] : []),
      ...ncgHoldingSubCompanies.map(c => c.id)
    ];
    bulkSetAccess(ids, value);
  };

  const toggleAllNCGExpress = (value: boolean) => {
    if (ncgExpress) {
      setAccess(ncgExpress.id, value);
    }
  };

  const handleSave = async () => {
    const result = await savePermissions();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Company access updated successfully");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Access{userName ? ` — ${userName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* NCG Express Section */}
            {ncgExpress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">NCG Express</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAllNCGExpress(true)}>
                      Select
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAllNCGExpress(false)}>
                      Clear
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Standalone company with separate Chart of Accounts and General Ledger
                </p>
                
                <label className="flex items-center gap-3 rounded-md border p-4 hover:bg-accent/10 cursor-pointer transition-colors">
                  <Checkbox
                    checked={hasAccess(ncgExpress.id)}
                    onCheckedChange={(v) => setAccess(ncgExpress.id, !!v)}
                  />
                  <div className="flex items-center gap-2">
                    {getBusinessUnitIcon(ncgExpress.business_unit_type)}
                    <div>
                      <div className="font-medium">{ncgExpress.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ncgExpress.short_code || 'NCG Express'}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            )}

            <Separator />

            {/* NCG Holding Section */}
            {ncgHolding && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">NCG Holding</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAllNCGHolding(true)}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAllNCGHolding(false)}>
                      Clear
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Parent company with consolidated COA. Sub-companies share the GL but are filtered by business unit.
                </p>

                {/* NCG Holding Parent */}
                <label className="flex items-center gap-3 rounded-md border p-4 hover:bg-accent/10 cursor-pointer transition-colors bg-muted/30">
                  <Checkbox
                    checked={hasAccess(ncgHolding.id)}
                    onCheckedChange={(v) => setAccess(ncgHolding.id, !!v)}
                  />
                  <div className="flex items-center gap-2">
                    {getBusinessUnitIcon(ncgHolding.business_unit_type)}
                    <div>
                      <div className="font-medium">{ncgHolding.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Parent Company — View All Consolidated Data
                      </div>
                    </div>
                  </div>
                </label>

                {/* Sub-companies */}
                {ncgHoldingSubCompanies.length > 0 && (
                  <div className="ml-6 space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Sub-Companies:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ncgHoldingSubCompanies.map((company) => (
                        <label 
                          key={company.id}
                          className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent/10 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={hasAccess(company.id)}
                            onCheckedChange={(v) => setAccess(company.id, !!v)}
                          />
                          <div className="flex items-center gap-2">
                            {getBusinessUnitIcon(company.business_unit_type)}
                            <div>
                              <div className="font-medium text-sm">{company.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {company.short_code || company.company_code}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state if no companies */}
            {!ncgExpress && !ncgHolding && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No companies configured in the system.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {isDirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
