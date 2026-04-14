import { ReactNode } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { Building2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CompanyRequiredGuardProps {
  children: ReactNode;
}

export const CompanyRequiredGuard = ({ children }: CompanyRequiredGuardProps) => {
  const { isLoading, selectedCompanyId, companies } = useCompany();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (!selectedCompanyId || companies.length === 0) {
    return (
      <Card className="p-12 text-center space-y-4">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold">No Company Selected</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Please select a company from the dropdown above to view financial data. 
          If no companies appear, try refreshing the page.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
};
