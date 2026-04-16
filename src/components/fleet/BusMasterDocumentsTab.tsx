import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { FileText, Shield, Calendar, AlertTriangle, CheckCircle, Clock, Upload } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface BusMasterDocumentsTabProps {
  data: BusMasterData;
}

export const BusMasterDocumentsTab = ({ data }: BusMasterDocumentsTabProps) => {
  const { documents, bus } = data;

  const getStatusColor = (status: 'valid' | 'expiring' | 'expired') => {
    switch (status) {
      case 'valid': return 'bg-green-500';
      case 'expiring': return 'bg-orange-500';
      case 'expired': return 'bg-red-500';
    }
  };

  const getStatusBg = (status: 'valid' | 'expiring' | 'expired') => {
    switch (status) {
      case 'valid': return 'bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'expiring': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200';
      case 'expired': return 'bg-red-50 dark:bg-red-900/20 border-red-200';
    }
  };

  const getStatusIcon = (status: 'valid' | 'expiring' | 'expired') => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'expiring': return <Clock className="h-6 w-6 text-orange-500" />;
      case 'expired': return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    return differenceInDays(new Date(expiryDate), new Date());
  };

  const insuranceDays = getDaysUntilExpiry(documents.insuranceExpiry);
  const licenseDays = getDaysUntilExpiry(documents.revenueLicenseExpiry);

  const documentItems = [
    {
      title: 'Insurance',
      icon: Shield,
      expiry: documents.insuranceExpiry,
      status: documents.insuranceStatus,
      days: insuranceDays
    },
    {
      title: 'Revenue License',
      icon: FileText,
      expiry: documents.revenueLicenseExpiry,
      status: documents.licenseStatus,
      days: licenseDays
    }
  ];

  const hasExpiredDocs = documents.insuranceStatus === 'expired' || documents.licenseStatus === 'expired';
  const hasExpiringDocs = documents.insuranceStatus === 'expiring' || documents.licenseStatus === 'expiring';

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {(hasExpiredDocs || hasExpiringDocs) && (
        <Card className={`border ${hasExpiredDocs ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${hasExpiredDocs ? 'text-red-500' : 'text-orange-500'}`} />
              <div>
                <p className={`font-medium ${hasExpiredDocs ? 'text-red-800 dark:text-red-200' : 'text-orange-800 dark:text-orange-200'}`}>
                  {hasExpiredDocs ? 'Documents Expired!' : 'Documents Expiring Soon'}
                </p>
                <p className={`text-sm ${hasExpiredDocs ? 'text-red-600 dark:text-red-300' : 'text-orange-600 dark:text-orange-300'}`}>
                  {hasExpiredDocs 
                    ? 'One or more documents have expired. Please renew immediately.'
                    : 'Some documents will expire within 30 days. Please plan for renewal.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {documentItems.map((doc) => {
          const Icon = doc.icon;
          return (
            <Card key={doc.title} className={`border ${getStatusBg(doc.status)}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${getStatusColor(doc.status)}/10`}>
                      <Icon className={`h-6 w-6 ${
                        doc.status === 'valid' ? 'text-green-600' :
                        doc.status === 'expiring' ? 'text-orange-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{doc.title}</h3>
                      {doc.expiry ? (
                        <>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            Expires: {format(new Date(doc.expiry), 'MMMM dd, yyyy')}
                          </p>
                          <p className={`text-sm font-medium mt-1 ${
                            doc.status === 'valid' ? 'text-green-600' :
                            doc.status === 'expiring' ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {doc.days !== null && (
                              doc.days >= 0 
                                ? `${doc.days} days remaining`
                                : `Expired ${Math.abs(doc.days)} days ago`
                            )}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          No expiry date set
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusIcon(doc.status)}
                    <Badge className={`${getStatusColor(doc.status)} text-white`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Document
                  </Button>
                  <Button variant="outline" size="sm">
                    Update Expiry
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Vehicle Registration Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Registration Number</p>
              <p className="font-medium">{bus.registration_number || 'Not specified'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Chassis Number</p>
              <p className="font-medium text-sm">{bus.chassis_number || 'Not specified'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Engine Number</p>
              <p className="font-medium text-sm">{bus.engine_number || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Document Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Insurance Certificate', status: documents.insuranceStatus !== 'expired' },
              { name: 'Revenue License', status: documents.licenseStatus !== 'expired' },
              { name: 'Fitness Certificate', status: true },
              { name: 'Route Permit', status: true },
              { name: 'Emission Test Certificate', status: true },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <span className="text-sm">{item.name}</span>
                {item.status ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
