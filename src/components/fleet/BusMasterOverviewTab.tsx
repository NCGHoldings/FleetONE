import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { 
  Bus, User, MapPin, Gauge, Calendar, Shield, 
  FileText, AlertTriangle, CheckCircle, Clock,
  CreditCard, Phone, KeyRound, Tag, Building2
} from "lucide-react";
import { format } from "date-fns";

interface BusMasterOverviewTabProps {
  data: BusMasterData;
}

export const BusMasterOverviewTab = ({ data }: BusMasterOverviewTabProps) => {
  const { bus, trips, financials, service, documents } = data;
  const busAny = bus as any;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(amount);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-LK').format(num);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return 'N/A';
    try { return format(new Date(d), 'MMM dd, yyyy'); } catch { return d; }
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

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-sm">{value || 'N/A'}</p>
    </div>
  );

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
              <Bus className="h-4 w-4" /> Bus Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Bus Number" value={bus.bus_no} />
              <Field label="Model" value={bus.model} />
              <Field label="Vehicle Name" value={busAny.vehicle_name} />
              <Field label="Vehicle Brand" value={busAny.vehicle_brand} />
              <Field label="Year" value={bus.year} />
              <Field label="Capacity" value={bus.capacity ? `${bus.capacity} seats` : undefined} />
              <Field label="Registration" value={bus.registration_number} />
              <Field label="Route" value={bus.route} />
              <Field label="Chassis Number" value={bus.chassis_number} />
              <Field label="Engine Number" value={bus.engine_number} />
              <Field label="Usage Type" value={bus.type} />
              <Field label="Documents Status" value={busAny.documents_status} />
            </div>
          </CardContent>
        </Card>

        {/* Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4" /> Category & Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Category</p>
                {busAny.bus_categories?.name ? (
                  <Badge style={{ backgroundColor: busAny.bus_categories.color || undefined }} className="text-white mt-1">
                    {busAny.bus_categories.name}
                  </Badge>
                ) : <p className="font-medium text-sm text-muted-foreground">Uncategorized</p>}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Sub-Category</p>
                {busAny.bus_sub_categories?.name ? (
                  <Badge variant="outline" className="mt-1">{busAny.bus_sub_categories.name}</Badge>
                ) : <p className="font-medium text-sm text-muted-foreground">N/A</p>}
              </div>
              <Field label="Permit Category" value={busAny.permit_category} />
              <Field label="Ownership Type" value={busAny.ownership_type} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Owner Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> Owner Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <Field label="Owner Name" value={bus.owner_name} />
              <Field label="NIC / ID" value={bus.owner_nic} />
              <Field label="Address" value={bus.owner_address} />
            </div>
          </CardContent>
        </Card>

        {/* Permit & Licensing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Permit & Licensing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Permit No" value={busAny.permit_no} />
              <Field label="Permit Category" value={busAny.permit_category} />
              <Field label="Permit Expiry" value={formatDate(busAny.permit_expiry_date)} />
              <Field label="Revenue License Expiry" value={formatDate(documents.revenueLicenseExpiry)} />
              <Field label="Revenue Amount" value={busAny.revenue_amount ? formatCurrency(busAny.revenue_amount) : 'N/A'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Leasing & Finance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Leasing & Finance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Leasing Bank" value={busAny.leasing_bank} />
              <Field label="Leasing End Date" value={formatDate(busAny.leasing_end_date)} />
            </div>
          </CardContent>
        </Card>

        {/* Driver Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" /> Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Default Driver" value={busAny.default_driver_name} />
              <Field label="Phone" value={busAny.driver_phone} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance & Document Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Insurance & Document Status
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
                    {busAny.insurance_company ? `${busAny.insurance_company}` : ''}
                    {busAny.insurance_month ? ` (${busAny.insurance_month})` : ''}
                    {documents.insuranceExpiry ? ` — Expires: ${formatDate(documents.insuranceExpiry)}` : ' — No expiry set'}
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
                    {documents.revenueLicenseExpiry ? `Expires: ${formatDate(documents.revenueLicenseExpiry)}` : 'No expiry date set'}
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
            <Gauge className="h-4 w-4" /> Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Last Service</p>
              <p className="font-medium">{formatDate(service.lastServiceDate)}</p>
              {service.lastServiceMileage && (
                <p className="text-xs text-muted-foreground">at {formatNumber(service.lastServiceMileage)} km</p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Next Service Due</p>
              <p className="font-medium">{formatDate(service.nextServiceDate)}</p>
              {service.nextServiceMileage && (
                <p className="text-xs text-muted-foreground">at {formatNumber(service.nextServiceMileage)} km</p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Service Status</p>
              {service.overdueKm ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="font-medium text-red-500">Overdue by {formatNumber(service.overdueKm)} km</p>
                </div>
              ) : service.nextServiceMileage ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="font-medium text-green-600">{formatNumber(service.nextServiceMileage - (bus.current_mileage || 0))} km remaining</p>
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
