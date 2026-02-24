import { Building2, ChevronDown, Check, Bus, Car, Truck, Briefcase, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/contexts/CompanyContext";

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

export const CompanySwitcher = () => {
  const { 
    selectedCompanyId, 
    selectedCompany, 
    companies, 
    parentCompanies,
    getSubCompaniesFor,
    setSelectedCompanyId, 
    isLoading 
  } = useCompany();

  // Debug logging
  console.log("CompanySwitcher - isLoading:", isLoading, "companies:", companies?.length);

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-[220px]">
        <Building2 className="h-4 w-4 mr-2 animate-pulse" />
        Loading companies...
      </Button>
    );
  }

  if (!companies || companies.length === 0) {
    console.warn("CompanySwitcher - No companies available");
    return (
      <Button variant="outline" disabled className="w-[220px]">
        <Building2 className="h-4 w-4 mr-2" />
        No companies available
      </Button>
    );
  }

  // Build hierarchical structure
  const renderHierarchy = () => {
    const items: React.ReactNode[] = [];
    
    // First render parent companies and their children
    parentCompanies.forEach((parent, index) => {
      if (index > 0) {
        items.push(<DropdownMenuSeparator key={`sep-${parent.id}`} />);
      }
      
      // Parent company as SELECTABLE item (not just header)
      const subCompanies = getSubCompaniesFor(parent.id);
      
      // Always make parent company selectable
      items.push(
        <DropdownMenuItem
          key={parent.id}
          onClick={() => setSelectedCompanyId(parent.id)}
          className={`flex items-center justify-between cursor-pointer ${subCompanies.length > 0 ? 'font-semibold' : ''}`}
        >
          <div className="flex items-center gap-2">
            {getBusinessUnitIcon(parent.business_unit_type)}
            <span>{parent.name}</span>
          </div>
          {selectedCompanyId === parent.id && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
      );
      
      // Render sub-companies with indentation
      if (subCompanies.length > 0) {
        subCompanies.forEach((sub) => {
          items.push(
            <DropdownMenuItem
              key={sub.id}
              onClick={() => setSelectedCompanyId(sub.id)}
              className="flex items-center justify-between cursor-pointer pl-8"
            >
              <div className="flex items-center gap-2">
                {getBusinessUnitIcon(sub.business_unit_type)}
                <span className="font-medium">{sub.name}</span>
              </div>
              {selectedCompanyId === sub.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        });
      }
    });
    
    return items;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[240px] justify-between">
          <div className="flex items-center gap-2 truncate">
            {getBusinessUnitIcon(selectedCompany?.business_unit_type)}
            <span className="truncate">{selectedCompany?.name || "Select Company"}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderHierarchy()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
