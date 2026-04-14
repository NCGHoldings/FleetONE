// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Grid3X3, List, MoreHorizontal, Link2, Unlink, Search, Filter, Loader2, Car, RefreshCw } from 'lucide-react';
import { useLightVehicleVehicleDataManagement, VehicleRecord } from '@/hooks/useLightVehicleVehicleDataManagement';
import { LightVehicleVehicleRecordCard } from './LightVehicleVehicleRecordCard';
import { LightVehicleVehicleMatchingModal } from './LightVehicleVehicleMatchingModal';

interface Props {
  onRefresh: () => void;
}

export function LightVehicleVehicleRecords({ onRefresh }: Props) {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const { fetchVehicleRecords, unmatchVehicle, isLoading } = useLightVehicleVehicleDataManagement();

  const loadVehicles = async () => {
    const filters = statusFilter !== 'all' ? { matchStatus: statusFilter } : undefined;
    const data = await fetchVehicleRecords(filters);
    setVehicles(data);
  };

  useEffect(() => {
    loadVehicles();
  }, [statusFilter]);

  const filteredVehicles = vehicles.filter(v => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      v.model?.toLowerCase().includes(searchLower) ||
      v.engine_no?.toLowerCase().includes(searchLower) ||
      v.chassis_no?.toLowerCase().includes(searchLower) ||
      v.customer_name?.toLowerCase().includes(searchLower) ||
      v.color?.toLowerCase().includes(searchLower)
    );
  });

  const handleUnmatch = async (vehicleId: string) => {
    await unmatchVehicle(vehicleId);
    loadVehicles();
    onRefresh();
  };

  const getMatchBadge = (status: string, isMatched: boolean) => {
    if (isMatched) {
      return <Badge className="bg-green-500">Matched</Badge>;
    }
    switch (status) {
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

  if (isLoading && vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by model, engine, chassis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="auto_matched">Auto Matched</SelectItem>
              <SelectItem value="manually_matched">Manually Matched</SelectItem>
              <SelectItem value="unmatched">Unmatched</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVehicles}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredVehicles.length} of {vehicles.length} vehicles
      </p>

      {filteredVehicles.length === 0 ? (
        <Card className="p-12 text-center">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No vehicle records found</p>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Engine No</TableHead>
                  <TableHead>Chassis No</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map(vehicle => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.vehicle_no || '-'}</TableCell>
                    <TableCell className="font-medium">{vehicle.model}</TableCell>
                    <TableCell className="font-mono text-sm">{vehicle.engine_no || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{vehicle.chassis_no || '-'}</TableCell>
                    <TableCell>{vehicle.seat_config || '-'}</TableCell>
                    <TableCell>{vehicle.color || '-'}</TableCell>
                    <TableCell>{vehicle.customer_name || '-'}</TableCell>
                    <TableCell>{getMatchBadge(vehicle.match_status, vehicle.is_matched)}</TableCell>
                    <TableCell>
                      {vehicle.order ? (
                        <Badge variant="outline">{vehicle.order.order_no}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!vehicle.is_matched ? (
                            <DropdownMenuItem onClick={() => setSelectedVehicle(vehicle)}>
                              <Link2 className="h-4 w-4 mr-2" />
                              Match to Order
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUnmatch(vehicle.id)}>
                              <Unlink className="h-4 w-4 mr-2" />
                              Unmatch
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(vehicle => (
            <LightVehicleVehicleRecordCard
              key={vehicle.id}
              vehicle={vehicle}
              onMatch={() => setSelectedVehicle(vehicle)}
              onUnmatch={() => handleUnmatch(vehicle.id)}
            />
          ))}
        </div>
      )}

      {/* Matching Modal */}
      {selectedVehicle && (
        <LightVehicleVehicleMatchingModal
          vehicle={selectedVehicle}
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onSuccess={() => {
            setSelectedVehicle(null);
            loadVehicles();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
