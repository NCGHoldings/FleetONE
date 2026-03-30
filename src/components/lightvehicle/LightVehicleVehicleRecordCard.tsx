import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Link2, Unlink, Palette, Hash, Settings } from 'lucide-react';
import { VehicleRecord } from '@/hooks/useLightVehicleVehicleDataManagement';

interface Props {
  vehicle: VehicleRecord;
  onMatch: () => void;
  onUnmatch: () => void;
}

export function LightVehicleVehicleRecordCard({ vehicle, onMatch, onUnmatch }: Props) {
  const getMatchBadge = () => {
    if (vehicle.is_matched) {
      return <Badge className="bg-green-500">Matched</Badge>;
    }
    switch (vehicle.match_status) {
      case 'auto_matched':
        return <Badge className="bg-blue-500">Auto Matched</Badge>;
      case 'manually_matched':
        return <Badge className="bg-purple-500">Manual</Badge>;
      case 'unmatched':
        return <Badge variant="destructive">Unmatched</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Car className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold">{vehicle.model}</p>
              {vehicle.vehicle_no && (
                <p className="text-xs text-muted-foreground">#{vehicle.vehicle_no}</p>
              )}
            </div>
          </div>
          {getMatchBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Engine & Chassis */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <Settings className="h-3 w-3" /> Engine No
            </p>
            <p className="font-mono text-xs truncate">{vehicle.engine_no || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <Hash className="h-3 w-3" /> Chassis No
            </p>
            <p className="font-mono text-xs truncate">{vehicle.chassis_no || '-'}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-2">
          {vehicle.seat_config && (
            <Badge variant="outline" className="text-xs">
              {vehicle.seat_config} Seats
            </Badge>
          )}
          {vehicle.color && (
            <Badge variant="outline" className="text-xs gap-1">
              <Palette className="h-3 w-3" />
              {vehicle.color}
            </Badge>
          )}
        </div>

        {/* Customer */}
        {vehicle.customer_name && (
          <div className="text-sm">
            <span className="text-muted-foreground">Customer: </span>
            <span className="font-medium">{vehicle.customer_name}</span>
          </div>
        )}

        {/* Linked Order */}
        {vehicle.order && (
          <div className="p-2 bg-green-500/10 rounded-md border border-green-500/20">
            <p className="text-xs text-muted-foreground">Linked to Order</p>
            <p className="font-medium text-green-600">{vehicle.order.order_no}</p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t">
          {!vehicle.is_matched ? (
            <Button variant="outline" size="sm" className="w-full" onClick={onMatch}>
              <Link2 className="h-4 w-4 mr-2" />
              Match to Order
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onUnmatch}>
              <Unlink className="h-4 w-4 mr-2" />
              Unmatch
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
