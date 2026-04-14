import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Users, Clock, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Bay {
  id: string;
  bay_name: string;
  bay_number: string;
  capacity: number;
  default_workers: number;
  can_work_overtime: boolean;
  hourly_rate: number;
  overtime_rate_multiplier: number;
  is_active: boolean;
  current_maintenance_id?: string;
  current_maintenance?: any;
}

interface BayManagementProps {
  onBaySelect?: (bayId: string) => void;
  selectedBayId?: string;
}

export default function BayManagement({ onBaySelect, selectedBayId }: BayManagementProps) {
  const { hasRole } = useAuth();
  const [bays, setBays] = useState<Bay[]>([]);
  const [loading, setLoading] = useState(true);

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  useEffect(() => {
    fetchBays();
  }, []);

  const fetchBays = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_bays')
        .select(`
          *,
          current_maintenance:maintenance_records!current_bay_id(
            maintenance_no,
            timer_status,
            buses(bus_no)
          )
        `)
        .eq('is_active', true)
        .order('bay_number');

      if (error) throw error;
      setBays(data || []);
    } catch (error) {
      console.error('Error fetching bays:', error);
      toast.error('Failed to load bay information');
    } finally {
      setLoading(false);
    }
  };

  const getBayStatus = (bay: Bay) => {
    if (bay.current_maintenance_id) {
      const maintenance = bay.current_maintenance as any;
      return {
        status: 'occupied',
        label: 'Occupied',
        color: 'destructive',
        details: `${maintenance?.maintenance_no} - ${maintenance?.buses?.bus_no}`,
        timerStatus: maintenance?.timer_status
      };
    }
    return {
      status: 'available',
      label: 'Available',
      color: 'default',
      details: `Capacity: ${bay.capacity} vehicles`
    };
  };

  const assignToBay = async (bayId: string, maintenanceId: string) => {
    if (!isSupervisor) return;

    try {
      // Update bay with current maintenance
      const { error: bayError } = await supabase
        .from('maintenance_bays')
        .update({ current_maintenance_id: maintenanceId })
        .eq('id', bayId);

      if (bayError) throw bayError;

      // Update maintenance record with bay
      const { error: maintenanceError } = await supabase
        .from('maintenance_records')
        .update({ current_bay_id: bayId })
        .eq('id', maintenanceId);

      if (maintenanceError) throw maintenanceError;

      toast.success('Vehicle assigned to bay');
      fetchBays();
    } catch (error) {
      console.error('Error assigning to bay:', error);
      toast.error('Failed to assign vehicle to bay');
    }
  };

  const releaseBay = async (bayId: string) => {
    if (!isSupervisor) return;

    try {
      const bay = bays.find(b => b.id === bayId);
      if (!bay?.current_maintenance_id) return;

      // Update bay to clear current maintenance
      const { error: bayError } = await supabase
        .from('maintenance_bays')
        .update({ current_maintenance_id: null })
        .eq('id', bayId);

      if (bayError) throw bayError;

      // Update maintenance record to clear bay
      const { error: maintenanceError } = await supabase
        .from('maintenance_records')
        .update({ current_bay_id: null })
        .eq('id', bay.current_maintenance_id);

      if (maintenanceError) throw maintenanceError;

      toast.success('Bay released');
      fetchBays();
    } catch (error) {
      console.error('Error releasing bay:', error);
      toast.error('Failed to release bay');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Bays...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Workshop Bay Status</h3>
        {isSupervisor && (
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Manage Bays
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bays.map((bay) => {
          const bayStatus = getBayStatus(bay);
          const isSelected = selectedBayId === bay.id;
          
          return (
            <Card 
              key={bay.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary' : ''
              } ${bayStatus.status === 'occupied' ? 'border-red-200' : 'border-green-200'}`}
              onClick={() => onBaySelect?.(bay.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Bay {bay.bay_number} - {bay.bay_name}
                  </CardTitle>
                  <Badge variant={bayStatus.color as any}>
                    {bayStatus.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {bayStatus.details}
                </div>

                {bayStatus.timerStatus && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs capitalize">{bayStatus.timerStatus.replace('_', ' ')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{bay.default_workers} workers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    <span>₨{bay.hourly_rate}/hr</span>
                  </div>
                </div>

                {bay.can_work_overtime && (
                  <div className="text-xs text-orange-600">
                    Overtime Enabled ({bay.overtime_rate_multiplier}x)
                  </div>
                )}

                {isSupervisor && bayStatus.status === 'occupied' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      releaseBay(bay.id);
                    }}
                    className="w-full text-xs"
                  >
                    Release Bay
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {bays.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No active bays configured</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}