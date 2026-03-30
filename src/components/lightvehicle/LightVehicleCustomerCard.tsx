import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CustomerCardProps {
  customerName: string;
  companyName: string | null;
  quotationCount: number;
  totalValue: number;
  latestQuotationDate: string | null;
  subCustomerNames: string[];
  onViewDetails: (customerName: string) => void;
  onLinkSubCustomer: (customerName: string) => void;
  canManageLinks: boolean;
}

export function LightVehicleCustomerCard({
  customerName,
  companyName,
  quotationCount,
  totalValue,
  latestQuotationDate,
  subCustomerNames,
  onViewDetails,
  onLinkSubCustomer,
  canManageLinks,
}: CustomerCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{customerName}</span>
            </div>
            <h3 className="font-semibold text-lg leading-tight">{companyName || customerName}</h3>
          </div>
          {subCustomerNames.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {subCustomerNames.length}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Quotations</p>
            <p className="text-2xl font-bold">{quotationCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {new Intl.NumberFormat('en-LK', {
                style: 'currency',
                currency: 'LKR',
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(totalValue)}
            </p>
          </div>
        </div>

        {latestQuotationDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3 w-3" />
            <span>Last: {format(new Date(latestQuotationDate), 'MMM dd, yyyy')}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onViewDetails(customerName)}
        >
          View Details
        </Button>
        {canManageLinks && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onLinkSubCustomer(customerName)}
          >
            Link Sub-Customer
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
