import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { 
  Bus, User, MapPin, Gauge, Calendar, Shield, 
  FileText, AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import { format } from "date-fns";

interface BusMasterOverviewTabProps {
  data: BusMasterData;
}

export const BusMasterOverviewTab = ({ data }: BusMasterOverviewTabProps) => {
  const { bus, trips, financials, service, documents } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK').format(num);
  };

  const getStatusColor = (status: 'valid' | 'expiring' | 'expired') => {
    switch (status) {
      case 'valid': return 'bg-green-500';
      case 'expiring': return 'bg-orange-500';
      case 'expired': return 'bg-red-500';
    }
  };

  const getStatusIcon = (status: 'valid' | 'expiring' | 'expired') => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Trips</p>
                <p className="text-xl font-bold">{formatNumber(trips.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Gauge className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Mileage</p>
                <p className="text-xl font-bold">{formatNumber(bus.current_mileage || 0)} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Running Days</p>
                <p className="text-xl font-bold">{formatNumber(financials.runningDays)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Distance</p>
                <p className="text-xl font-bold">{formatNumber(trips.totalDistance)} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Bus Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bus className="h-4 w-4" />
              Bus Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Bus Number</p>
                <p className="font-medium">{bus.bus_no}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Model</p>
                <p className="font-medium">{bus.model}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Year</p>
                <p className="font-medium">{bus.year}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Capacity</p>
                <p className="font-medium">{bus.capacity} seats</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registration</p>
                <p className="font-medium">{bus.registration_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Route</p>
                <p className="font-medium">{bus.route || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Chassis Number</p>
                <p className="font-medium text-xs">{bus.chassis_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Engine Number</p>
                <p className="font-medium text-xs">{bus.engine_number || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Owner Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Owner Name</p>
                <p className="font-medium">{bus.owner_name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">NIC</p>
                <p className="font-medium">{bus.owner_nic || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Address</p>
                <p className="font-medium text-xs">{bus.owner_address || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Insurance</p>
                  <p className="text-xs text-muted-foreground">
                    {documents.insuranceExpiry 
                      ? `Expires: ${format(new Date(documents.insuranceExpiry), 'MMM dd, yyyy')}`
                      : 'No expiry date set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(documents.insuranceStatus)}
                <Badge className={`${getStatusColor(documents.insuranceStatus)} text-white`}>
                  {documents.insuranceStatus}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Revenue License</p>
                  <p className="text-xs text-muted-foreground">
                    {documents.revenueLicenseExpiry 
                      ? `Expires: ${format(new Date(documents.revenueLicenseExpiry), 'MMM dd, yyyy')}`
                      : 'No expiry date set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(documents.licenseStatus)}
                <Badge className={`${getStatusColor(documents.licenseStatus)} text-white`}>
                  {documents.licenseStatus}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Last Service</p>
              <p className="font-medium">
                {service.lastServiceDate 
                  ? format(new Date(service.lastServiceDate), 'MMM dd, yyyy')
                  : 'No record'}
              </p>
              {service.lastServiceMileage && (
                <p className="text-xs text-muted-foreground">
                  at {formatNumber(service.lastServiceMileage)} km
                </p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Next Service Due</p>
              <p className="font-medium">
                {service.nextServiceDate 
                  ? format(new Date(service.nextServiceDate), 'MMM dd, yyyy')
                  : 'Not scheduled'}
              </p>
              {service.nextServiceMileage && (
                <p className="text-xs text-muted-foreground">
                  at {formatNumber(service.nextServiceMileage)} km
                </p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Service Status</p>
              {service.overdueKm ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="font-medium text-red-500">
                    Overdue by {formatNumber(service.overdueKm)} km
                  </p>
                </div>
              ) : service.nextServiceMileage ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="font-medium text-green-600">
                    {formatNumber(service.nextServiceMileage - (bus.current_mileage || 0))} km remaining
                  </p>
                </div>
              ) : (
                <p className="font-medium text-muted-foreground">Not configured</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
