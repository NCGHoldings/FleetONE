import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Grid3X3, List, MoreHorizontal, Link2, Unlink, Search, Filter, Loader2, Car, RefreshCw, Check, X, LayoutGrid } from 'lucide-react';
import { useYutongVehicleDataManagement, VehicleRecord } from '@/hooks/useYutongVehicleDataManagement';
import { YutongVehicleRecordCard } from './YutongVehicleRecordCard';
import { YutongVehicleMatchingModal } from './YutongVehicleMatchingModal';
import { YutongFocChecklistModal, BOOLEAN_CHECKLIST, TEXT_CHECKLIST, isTruthy } from './YutongFocChecklistModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (val: any) => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

interface Props {
  onRefresh: () => void;
}

export function YutongVehicleRecords({ onRefresh }: Props) {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [selectedFocVehicle, setSelectedFocVehicle] = useState<VehicleRecord | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const { fetchVehicleRecords, unmatchVehicle, isLoading } = useYutongVehicleDataManagement();

  const [visibleGroups, setVisibleGroups] = useState({
    core: true,
    registry: true,
    financials: true,
    foc: false // FOC hidden by default for cleaner initial view
  });

  const loadVehicles = async () => {
    const filters = statusFilter !== 'all' ? { matchStatus: statusFilter } : undefined;
    const data = await fetchVehicleRecords(filters);
    setVehicles(data);
  };

  useEffect(() => {
    loadVehicles();
  }, [statusFilter]);

  const filteredVehicles = vehicles.filter(v => {
    // Column-wise filters
    for (const [key, filterValue] of Object.entries(columnFilters)) {
      if (!filterValue) continue;
      const lowerFilter = filterValue.toLowerCase();
      let cellValue = '';
      if (key === 'address') cellValue = v.raw_data?._address || '';
      else if (key === 'registration_no') cellValue = v.raw_data?._registration_no || '';
      else cellValue = (v as any)[key] || '';
      
      if (!String(cellValue).toLowerCase().includes(lowerFilter)) {
        return false;
      }
    }

    // Global search
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      v.model?.toLowerCase().includes(searchLower) ||
      v.engine_no?.toLowerCase().includes(searchLower) ||
      v.chassis_no?.toLowerCase().includes(searchLower) ||
      v.customer_name?.toLowerCase().includes(searchLower) ||
      v.color?.toLowerCase().includes(searchLower) ||
      String(v.engine_capacity || '').toLowerCase().includes(searchLower) ||
      String(v.raw_data?._address || '').toLowerCase().includes(searchLower) ||
      String(v.raw_data?._registration_no || '').toLowerCase().includes(searchLower) ||
      String(v.raw_data?._invoice_amount || '').toLowerCase().includes(searchLower) ||
      String(v.raw_data?._total_amount || '').toLowerCase().includes(searchLower)
    );
  });

  const handleUnmatch = async (vehicleId: string) => {
    await unmatchVehicle(vehicleId);
    loadVehicles();
    onRefresh();
  };

  const handleInlineChecklistUpdate = async (vehicleId: string, currentChecklist: any, key: string, value: any) => {
    const updatedChecklist = { ...(currentChecklist || {}), [key]: value };
    
    // Optimistic update locally
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, service_checklist: updatedChecklist } : v
    ));

    try {
      const { error } = await supabase
        .from('yutong_vehicle_records')
        .update({ service_checklist: updatedChecklist })
        .eq('id', vehicleId);
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating checklist inline:', err);
      toast.error('Failed to update checklist item');
      // Revert on failure
      loadVehicles();
    }
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
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by model, chassis, address, amounts..."
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
          {viewMode === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuCheckboxItem
                  checked={visibleGroups.core}
                  onCheckedChange={(c) => setVisibleGroups(p => ({ ...p, core: c }))}
                >
                  Core Details
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleGroups.registry}
                  onCheckedChange={(c) => setVisibleGroups(p => ({ ...p, registry: c }))}
                >
                  Registration & Address
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleGroups.financials}
                  onCheckedChange={(c) => setVisibleGroups(p => ({ ...p, financials: c }))}
                >
                  Financials
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleGroups.foc}
                  onCheckedChange={(c) => setVisibleGroups(p => ({ ...p, foc: c }))}
                >
                  FOC Checklist
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

      {viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-20 align-top pt-3">
                    <div className="flex flex-col space-y-2">
                      <span>No</span>
                      <Input placeholder="Filter..." value={columnFilters.vehicle_no || ''} onChange={(e) => setColumnFilters(p => ({...p, vehicle_no: e.target.value}))} className="h-7 text-xs px-2 w-16" />
                    </div>
                  </TableHead>
                  <TableHead className="sticky left-20 bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[120px] align-top pt-3">
                    <div className="flex flex-col space-y-2">
                      <span>Model</span>
                      <Input placeholder="Filter..." value={columnFilters.model || ''} onChange={(e) => setColumnFilters(p => ({...p, model: e.target.value}))} className="h-7 text-xs px-2 w-full" />
                    </div>
                  </TableHead>
                  {visibleGroups.core && (
                    <>
                      <TableHead className="align-top pt-3 min-w-[140px]">
                        <div className="flex flex-col space-y-2">
                          <span>Engine No</span>
                          <Input placeholder="Filter..." value={columnFilters.engine_no || ''} onChange={(e) => setColumnFilters(p => ({...p, engine_no: e.target.value}))} className="h-7 text-xs px-2 w-full" />
                        </div>
                      </TableHead>
                      <TableHead className="align-top pt-3 min-w-[140px]">
                        <div className="flex flex-col space-y-2">
                          <span>Chassis No</span>
                          <Input placeholder="Filter..." value={columnFilters.chassis_no || ''} onChange={(e) => setColumnFilters(p => ({...p, chassis_no: e.target.value}))} className="h-7 text-xs px-2 w-full" />
                        </div>
                      </TableHead>
                      <TableHead className="align-top pt-3">Seat</TableHead>
                      <TableHead className="align-top pt-3">Color</TableHead>
                      <TableHead className="align-top pt-3 min-w-[150px]">
                        <div className="flex flex-col space-y-2">
                          <span>Customer</span>
                          <Input placeholder="Filter..." value={columnFilters.customer_name || ''} onChange={(e) => setColumnFilters(p => ({...p, customer_name: e.target.value}))} className="h-7 text-xs px-2 w-full" />
                        </div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap align-top pt-3">Engine Cap.</TableHead>
                    </>
                  )}
                  {visibleGroups.registry && (
                    <>
                      <TableHead className="whitespace-nowrap align-top pt-3 min-w-[150px]">
                        <div className="flex flex-col space-y-2">
                          <span>Address</span>
                          <Input placeholder="Filter..." value={columnFilters.address || ''} onChange={(e) => setColumnFilters(p => ({...p, address: e.target.value}))} className="h-7 text-xs px-2 w-full" />
                        </div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap align-top pt-3 min-w-[120px]">
                        <div className="flex flex-col space-y-2">
                          <span>Reg No</span>
                          <Input placeholder="Filter..." value={columnFilters.registration_no || ''} onChange={(e) => setColumnFilters(p => ({...p, registration_no: e.target.value}))} className="h-7 text-xs px-2 w-full" />
                        </div>
                      </TableHead>
                    </>
                  )}
                  {visibleGroups.financials && (
                    <>
                      <TableHead className="whitespace-nowrap text-right align-top pt-3">Invoice Amt</TableHead>
                      <TableHead className="text-right align-top pt-3">VAT</TableHead>
                      <TableHead className="whitespace-nowrap text-right align-top pt-3">Total Amt</TableHead>
                    </>
                  )}
                  <TableHead className="align-top pt-3">Status</TableHead>
                  <TableHead className="align-top pt-3">Order</TableHead>
                  {visibleGroups.foc && BOOLEAN_CHECKLIST.map(item => (
                    <TableHead key={item.key} className="whitespace-nowrap text-center align-top pt-3">{item.label}</TableHead>
                  ))}
                  {visibleGroups.foc && TEXT_CHECKLIST.map(item => (
                    <TableHead key={item.key} className="whitespace-nowrap align-top pt-3">{item.label}</TableHead>
                  ))}
                  <TableHead className="sticky right-0 bg-background z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="h-48 text-center">
                      <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No vehicle records found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map(vehicle => (
                  <TableRow key={vehicle.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-20">{vehicle.vehicle_no || '-'}</TableCell>
                    <TableCell className="sticky left-20 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium min-w-[120px]">{vehicle.model}</TableCell>
                    
                    {visibleGroups.core && (
                      <>
                        <TableCell className="font-mono text-sm">{vehicle.engine_no || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{vehicle.chassis_no || '-'}</TableCell>
                        <TableCell>{vehicle.seat_config || '-'}</TableCell>
                        <TableCell>{vehicle.color || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={vehicle.customer_name || ''}>{vehicle.customer_name || '-'}</TableCell>
                        <TableCell>{vehicle.engine_capacity || '-'}</TableCell>
                      </>
                    )}

                    {visibleGroups.registry && (
                      <>
                        <TableCell className="max-w-[200px] truncate" title={vehicle.raw_data?._address}>{vehicle.raw_data?._address || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm">{vehicle.raw_data?._registration_no || '-'}</TableCell>
                      </>
                    )}

                    {visibleGroups.financials && (
                      <>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(vehicle.raw_data?._invoice_amount)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(vehicle.raw_data?._vat)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(vehicle.raw_data?._total_amount)}</TableCell>
                      </>
                    )}

                    <TableCell>{getMatchBadge(vehicle.match_status, vehicle.is_matched)}</TableCell>
                    <TableCell>
                      {vehicle.order ? (
                        <Badge variant="outline">{vehicle.order.order_no}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {visibleGroups.foc && BOOLEAN_CHECKLIST.map(item => {
                      const val = vehicle.service_checklist ? vehicle.service_checklist[item.key] : null;
                      const checked = isTruthy(val);
                      return (
                        <TableCell key={item.key} className="text-center">
                          <Checkbox 
                            checked={checked}
                            onCheckedChange={(c) => handleInlineChecklistUpdate(vehicle.id, vehicle.service_checklist, item.key, c === true)}
                            className="mx-auto"
                          />
                        </TableCell>
                      );
                    })}

                    {visibleGroups.foc && TEXT_CHECKLIST.map(item => {
                      const val = vehicle.service_checklist ? vehicle.service_checklist[item.key] : null;
                      return (
                        <TableCell key={item.key} className="min-w-[150px]">
                          <Input 
                            value={val || ''}
                            onChange={(e) => handleInlineChecklistUpdate(vehicle.id, vehicle.service_checklist, item.key, e.target.value)}
                            placeholder={item.label}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                      );
                    })}

                    <TableCell className="sticky right-0 bg-background z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] w-14">
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
                          <DropdownMenuItem onClick={() => setSelectedFocVehicle(vehicle)}>
                            <List className="h-4 w-4 mr-2" />
                            FOC Checklist
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        filteredVehicles.length === 0 ? (
          <Card className="p-12 text-center">
            <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No vehicle records found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map(vehicle => (
            <YutongVehicleRecordCard
              key={vehicle.id}
              vehicle={vehicle}
              onMatch={() => setSelectedVehicle(vehicle)}
              onUnmatch={() => handleUnmatch(vehicle.id)}
              onFoc={() => setSelectedFocVehicle(vehicle)}
            />
          ))}
          </div>
        )
      )}

      {/* Matching Modal */}
      {selectedVehicle && (
        <YutongVehicleMatchingModal
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
      {/* FOC Checklist Modal */}
      {selectedFocVehicle && (
        <YutongFocChecklistModal
          vehicle={selectedFocVehicle}
          isOpen={!!selectedFocVehicle}
          onClose={() => setSelectedFocVehicle(null)}
          onSuccess={() => {
            setSelectedFocVehicle(null);
            loadVehicles();
          }}
        />
      )}
    </div>
  );
}
