import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, MapPin, User, Calendar, DollarSign, 
  Truck, Route, Shield, AlertTriangle, CheckCircle, Bus,
  Download, History, File, Clock
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface RoutePermit {
  id: string;
  permit_no: string;
  route_name: string;
  temporary_route_name?: string;
  via?: string;
  route_numbers?: string[];
  ntc_number?: string;
  owner_name: string;
  owner_address?: string;
  owner_nic?: string;
  service_type?: string;
  seats?: number;
  max_fare?: number;
  approved_maximum_fare?: number;
  allocated_bus_number?: string;
  issue_date: string;
  expiry_date: string;
  annual_fee?: number;
  permit_status: string;
  permit_active_inactive?: string;
  operation_status: string;
  bus_id?: string;
  route_id?: string;
  buses?: {
    bus_no: string;
    registration_number: string;
  };
  routes?: {
    route_no: string;
    route_name: string;
  };
}

interface RoutePermitDetailsModalProps {
  permit: RoutePermit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoutePermitDetailsModal({ permit, open, onOpenChange }: RoutePermitDetailsModalProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);

  useEffect(() => {
    if (permit && open) {
      fetchDocuments(permit.id);
      fetchChangeHistory(permit.id);
    }
  }, [permit, open]);

  const fetchDocuments = async (permitId: string) => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('linked_table', 'route_permits')
      .eq('linked_row_id', permitId)
      .order('uploaded_at', { ascending: false });
    setDocuments(data || []);
  };

  const fetchChangeHistory = async (permitId: string) => {
    const { data } = await (supabase as any)
      .from('route_permit_change_history')
      .select('*')
      .eq('permit_id', permitId)
      .order('changed_at', { ascending: false });
    setChangeHistory(data || []);
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      window.open(doc.file_url, '_blank');
    }
  };

  if (!permit) return null;

  const getExpiryStatus = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring-soon';
    return 'valid';
  };

  const getStatusBadge = (status: string, type: 'permit' | 'operation') => {
    if (type === 'permit') {
      const expiryStatus = getExpiryStatus(permit.expiry_date);
      return (
        <Badge 
          variant={
            expiryStatus === 'expired' || status === 'suspended' ? 'destructive' : 
            expiryStatus === 'expiring-soon' ? 'secondary' : 
            'default'
          }
          className="flex items-center gap-1"
        >
          {expiryStatus === 'expired' ? (
            <>
              <AlertTriangle className="h-3 w-3" />
              Expired
            </>
          ) : expiryStatus === 'expiring-soon' ? (
            <>
              <Calendar className="h-3 w-3" />
              Expiring Soon
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3" />
              {status}
            </>
          )}
        </Badge>
      );
    }
    
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>
        {status}
      </Badge>
    );
  };

  const getChangeTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      created: 'default',
      updated: 'secondary',
      renewed: 'default',
      status_change: 'outline',
      document_uploaded: 'outline',
    };
    return <Badge variant={(variants[type] || 'secondary') as any}>{type.replace('_', ' ')}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Route Permit Details - {permit.permit_no}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Basic Route Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                Route Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Permit Number</span>
                  <p className="font-mono text-sm">{permit.permit_no}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Permanent Route</span>
                  <p className="text-sm">{permit.route_name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Temporary Route Name</span>
                  <p className="text-sm">{permit.temporary_route_name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Via</span>
                  <p className="text-sm">{permit.via || '-'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Route Numbers</span>
                  <p className="text-sm">{permit.route_numbers?.join(', ') || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">NTC Approved Service Type</span>
                  <p className="text-sm">{permit.service_type || permit.ntc_number || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Allocated Bus Number</span>
                  <p className="text-sm font-mono">
                    {permit.allocated_bus_number || permit.buses?.bus_no || '-'}
                    {permit.buses?.registration_number && (
                      <span className="text-muted-foreground ml-2">({permit.buses.registration_number})</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Linked System Route</span>
                  <p className="text-sm">
                    {permit.routes ? `${permit.routes.route_no} - ${permit.routes.route_name}` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner/Operator Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner/Operator Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Name of the Owner/Operator</span>
                  <p className="text-sm font-medium">{permit.owner_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Permit Holder NIC</span>
                  <p className="text-sm font-mono">{permit.owner_nic || '-'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Permit Holder Address</span>
                  <p className="text-sm">{permit.owner_address || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service & Capacity Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-4 w-4" />
                Service & Capacity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Approved Seating Capacity</span>
                  <p className="text-sm font-medium">{permit.seats || '-'} seats</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Service Type</span>
                  <Badge variant="outline" className="mt-1">
                    {permit.service_type || permit.ntc_number || 'Regular'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Approved Maximum Fare</span>
                  <p className="text-sm font-medium">
                    {permit.approved_maximum_fare || permit.max_fare ? 
                      `LKR ${permit.approved_maximum_fare || permit.max_fare}` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Annual Fee</span>
                  <p className="text-sm">
                    {permit.annual_fee ? `LKR ${permit.annual_fee.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Permit Status</span>
                  <div className="mt-1">
                    {getStatusBadge(permit.permit_active_inactive || permit.permit_status, 'permit')}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Active in Operation</span>
                  <div className="mt-1">
                    {getStatusBadge(permit.operation_status, 'operation')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Legal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance & Legal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Issue Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {permit.issue_date ? format(parseISO(permit.issue_date), 'MMM dd, yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Expiry Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {permit.expiry_date ? format(parseISO(permit.expiry_date), 'MMM dd, yyyy') : '-'}
                    </p>
                    {permit.expiry_date && (() => {
                      const status = getExpiryStatus(permit.expiry_date);
                      return (
                        <>
                          {status === 'expired' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {status === 'expiring-soon' && <Calendar className="h-4 w-4 text-accent-foreground" />}
                          {status === 'valid' && <CheckCircle className="h-4 w-4 text-primary" />}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Days Until Expiry</span>
                  <p className="text-sm">
                    {permit.expiry_date ? (
                      (() => {
                        const days = differenceInDays(parseISO(permit.expiry_date), new Date());
                        return days < 0 ? 
                          <span className="text-destructive font-medium">Expired {Math.abs(days)} days ago</span> :
                          <span className={days <= 30 ? "text-accent-foreground font-medium" : "text-primary"}>{days} days remaining</span>;
                      })()
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Validity Period</span>
                  <p className="text-sm">
                    {permit.issue_date && permit.expiry_date ? (
                      `${format(parseISO(permit.issue_date), 'MMM yyyy')} - ${format(parseISO(permit.expiry_date), 'MMM yyyy')}`
                    ) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          {permit.annual_fee && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Annual Fee</span>
                    <p className="text-lg font-semibold text-primary">
                      LKR {permit.annual_fee.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Maximum Fare</span>
                    <p className="text-lg font-semibold">
                      LKR {(permit.approved_maximum_fare || permit.max_fare || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Permit Documents
              </CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? 's' : ''} attached
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.uploaded_at ? format(parseISO(doc.uploaded_at), 'MMM dd, yyyy HH:mm') : '-'}
                            {doc.file_size && ` · ${(doc.file_size / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Change History
              </CardTitle>
              <CardDescription>
                Audit trail of all permit changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changeHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No change history recorded</p>
              ) : (
                <div className="space-y-4">
                  {changeHistory.map((entry) => (
                    <div key={entry.id} className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />
                      <div className="flex items-center gap-2 mb-1">
                        {getChangeTypeBadge(entry.change_type)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {entry.changed_at ? format(parseISO(entry.changed_at), 'MMM dd, yyyy HH:mm') : '-'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{entry.description}</p>
                      {entry.changes && Array.isArray(entry.changes) && entry.changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {entry.changes.map((change: any, idx: number) => (
                            <div key={idx} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                              <span className="text-muted-foreground">{change.field}:</span>{' '}
                              <span className="text-destructive line-through">{change.old_value || '(empty)'}</span>{' → '}
                              <span className="text-primary">{change.new_value || '(empty)'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
