import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Wrench, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ServiceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: any;
}

export function ServiceHistoryModal({ open, onOpenChange, bus }: ServiceHistoryModalProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && bus) {
      fetchMaintenanceHistory();
    }
  }, [open, bus]);

  const fetchMaintenanceHistory = async () => {
    if (!bus) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          maintenance_parts (
            item_description,
            quantity,
            unit_cost,
            total_cost
          )
        `)
        .eq('bus_id', bus.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching maintenance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, label: "Pending", color: "bg-gray-100 text-gray-700" },
      in_progress: { variant: "warning" as const, label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
      completed: { variant: "success" as const, label: "Completed", color: "bg-green-100 text-green-700" },
      cancelled: { variant: "destructive" as const, label: "Cancelled", color: "bg-red-100 text-red-700" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: { color: "bg-blue-100 text-blue-700" },
      medium: { color: "bg-yellow-100 text-yellow-700" },
      high: { color: "bg-red-100 text-red-700" }
    };
    
    const config = variants[priority as keyof typeof variants] || variants.medium;
    return <Badge className={config.color}>{priority?.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Service History - {bus?.bus_no}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Service History - {bus?.bus_no}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {maintenanceRecords.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No maintenance records found for this bus.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {maintenanceRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{record.service_type}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {record.maintenance_no && `Service #${record.maintenance_no}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(record.status)}
                        {record.priority && getPriorityBadge(record.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Scheduled Date</p>
                          <p className="font-medium">
                            {record.scheduled_date ? new Date(record.scheduled_date).toLocaleDateString() : "-"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">
                            {record.actual_hours ? `${record.actual_hours}h` : 
                             record.estimated_hours ? `${record.estimated_hours}h (est.)` : "-"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Cost</p>
                          <p className="font-medium">
                            ₨ {record.actual_cost ? record.actual_cost.toLocaleString() : 
                                record.estimated_cost ? record.estimated_cost.toLocaleString() : "0"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Bay/Workshop</p>
                          <p className="font-medium">{record.bay_number || record.workshop || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {record.description && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-sm">{record.description}</p>
                      </div>
                    )}

                    {record.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{record.notes}</p>
                      </div>
                    )}

                    {record.maintenance_parts && record.maintenance_parts.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Parts Used</p>
                        <div className="space-y-2">
                          {record.maintenance_parts.map((part: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-muted/30 p-2 rounded">
                              <span>{part.item_description}</span>
                              <span className="text-muted-foreground">
                                {part.quantity} × ₨{part.unit_cost} = ₨{part.total_cost}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-4 pt-4 border-t">
                      <span>
                        Started: {record.start_date ? new Date(record.start_date).toLocaleDateString() : "-"}
                      </span>
                      <span>
                        Completed: {record.completion_date ? new Date(record.completion_date).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}