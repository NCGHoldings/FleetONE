import { useState, useEffect, useMemo, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { Bus, Wrench, DollarSign, Calendar, MoreHorizontal, Plus, Loader2, Eye, Edit, History, CalendarPlus, UserX, CreditCard, FileSpreadsheet, ExternalLink } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BusDetailsModal } from "@/components/fleet/BusDetailsModal";
import { EditBusModal } from "@/components/fleet/EditBusModal";
import { ServiceHistoryModal } from "@/components/fleet/ServiceHistoryModal";
import { ScheduleMaintenanceModal } from "@/components/fleet/ScheduleMaintenanceModal";
import { BusLoanModal } from "@/components/fleet/BusLoanModal";
import { BusLoanDashboardModal } from "@/components/fleet/BusLoanDashboardModal";
import { BusCategoryBadge } from "@/components/fleet/BusCategoryBadge";
import { BusMasterDataSheet } from "@/components/fleet/BusMasterDataSheet";
import { FleetAlertsPanel } from "@/components/fleet/FleetAlertsPanel";
import { FleetVehicleDataImport } from "@/components/fleet/FleetVehicleDataImport";
import { FleetFilterPanel, FleetFilters, defaultFilters } from "@/components/fleet/FleetFilterPanel";
import { Upload } from "lucide-react";
import { BusDocumentPreviewModal } from "@/components/fleet/BusDocumentPreviewModal";
import { useNavigate } from "react-router-dom";
import busDocsManifest from "@/data/bus_documents.json";

interface Fleet {
  id: string;
  bus_no: string;
  type: string;
  route?: string;
  model: string;
  year: number;
  capacity: number;
  status: "active" | "maintenance" | "idle" | "retired";
  last_service_date?: string;
  next_service_date?: string;
  current_mileage: number;
  avg_daily_revenue?: number;
  running_days?: number;
  total_revenue?: number;
  owner_name?: string;
  owner_nic?: string;
  owner_address?: string;
  registration_number?: string;
  engine_number?: string;
  chassis_number?: string;
  service_interval_km?: number;
  expected_km_per_liter?: number;
  last_service_mileage?: number;
  next_service_mileage?: number;
  insurance_expiry?: string;
  category_id?: string;
  sub_category_id?: string;
  category_assignment_source?: string;
  revenue_license_expiry?: string;
}

const getStatusBadge = (status: Fleet['status']) => {
  const variants = {
    active: { variant: "success" as const, label: "Active" },
    maintenance: { variant: "warning" as const, label: "Maintenance" },
    idle: { variant: "secondary" as const, label: "Idle" },
    retired: { variant: "destructive" as const, label: "Retired" }
  };
  
  const config = variants[status];
  return <Badge className={`status-${config.variant.replace('secondary', 'neutral').replace('destructive', 'error')}`}>{config.label}</Badge>;
};

const FleetManagementComponent = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<Fleet | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [serviceHistoryModalOpen, setServiceHistoryModalOpen] = useState(false);
  const [scheduleMaintenanceModalOpen, setScheduleMaintenanceModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanDashboardModalOpen, setLoanDashboardModalOpen] = useState(false);
  const [masterDataSheetOpen, setMasterDataSheetOpen] = useState(false);
  const [vehicleImportOpen, setVehicleImportOpen] = useState(false);
  const [docPreviewModalOpen, setDocPreviewModalOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FleetFilters>({ ...defaultFilters });
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();


  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const [catRes, subCatRes] = await Promise.all([
        supabase.from("bus_categories").select("id, name").order("name"),
        supabase.from("bus_sub_categories").select("id, name").order("name"),
      ]);
      if (catRes.data) setCategoryOptions(catRes.data);
      if (subCatRes.data) setSubCategoryOptions(subCatRes.data);
    };
    fetchCategories();
  }, []);

  // Compute distinct values from data
  const distinctTypes = useMemo(() => [...new Set(data.map((b) => b.type).filter(Boolean))].sort(), [data]);
  const distinctModels = useMemo(() => [...new Set(data.map((b) => b.model).filter(Boolean))].sort(), [data]);
  const distinctYears = useMemo(() => [...new Set(data.map((b) => b.year).filter(Boolean))], [data]);
  const distinctRoutes = useMemo(() => [...new Set(data.map((b) => b.route).filter((r): r is string => !!r))].sort(), [data]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length) count++;
    if (filters.subCategories.length) count++;
    if (filters.types.length) count++;
    if (filters.models.length) count++;
    if (filters.years.length) count++;
    if (filters.statuses.length) count++;
    if (filters.routes.length) count++;
    if (filters.insuranceExpiry) count++;
    if (filters.licenseExpiry) count++;
    if (filters.mileageMin || filters.mileageMax) count++;
    if (filters.runningDaysMin || filters.runningDaysMax) count++;
    if (filters.revenueMin || filters.revenueMax) count++;
    return count;
  }, [filters]);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = data;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (filters.categories.length)
      result = result.filter((b) => b.category_id && filters.categories.includes(b.category_id));
    if (filters.subCategories.length)
      result = result.filter((b) => b.sub_category_id && filters.subCategories.includes(b.sub_category_id));
    if (filters.statuses.length)
      result = result.filter((b) => filters.statuses.includes(b.status));
    if (filters.types.length)
      result = result.filter((b) => filters.types.includes(b.type));
    if (filters.models.length)
      result = result.filter((b) => filters.models.includes(b.model));
    if (filters.years.length)
      result = result.filter((b) => filters.years.includes(b.year));
    if (filters.routes.length)
      result = result.filter((b) => b.route && filters.routes.includes(b.route));

    // Insurance expiry filter
    if (filters.insuranceExpiry) {
      result = result.filter((b) => {
        if (!b.insurance_expiry) return filters.insuranceExpiry === "expired";
        const exp = new Date(b.insurance_expiry);
        switch (filters.insuranceExpiry) {
          case "expired": return exp < now;
          case "expiring_30": return exp >= now && exp <= in30Days;
          case "this_month": return exp.getMonth() === now.getMonth() && exp.getFullYear() === now.getFullYear();
          case "valid": return exp > in30Days;
          default: return true;
        }
      });
    }

    // License expiry filter
    if (filters.licenseExpiry) {
      result = result.filter((b) => {
        if (!b.revenue_license_expiry) return filters.licenseExpiry === "expired";
        const exp = new Date(b.revenue_license_expiry);
        switch (filters.licenseExpiry) {
          case "expired": return exp < now;
          case "expiring_30": return exp >= now && exp <= in30Days;
          case "this_month": return exp.getMonth() === now.getMonth() && exp.getFullYear() === now.getFullYear();
          case "valid": return exp > in30Days;
          default: return true;
        }
      });
    }

    // Range filters
    if (filters.mileageMin) result = result.filter((b) => b.current_mileage >= Number(filters.mileageMin));
    if (filters.mileageMax) result = result.filter((b) => b.current_mileage <= Number(filters.mileageMax));
    if (filters.runningDaysMin) result = result.filter((b) => (b.running_days || 0) >= Number(filters.runningDaysMin));
    if (filters.runningDaysMax) result = result.filter((b) => (b.running_days || 0) <= Number(filters.runningDaysMax));
    if (filters.revenueMin) result = result.filter((b) => (b.avg_daily_revenue || 0) >= Number(filters.revenueMin));
    if (filters.revenueMax) result = result.filter((b) => (b.avg_daily_revenue || 0) <= Number(filters.revenueMax));

    return result;
  }, [data, filters]);

  // Multi-key search function
  const customSearch = useCallback((items: Fleet[], query: string) => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((b) =>
      b.bus_no?.toLowerCase().includes(q) ||
      b.type?.toLowerCase().includes(q) ||
      b.route?.toLowerCase().includes(q) ||
      b.model?.toLowerCase().includes(q) ||
      b.owner_name?.toLowerCase().includes(q)
    );
  }, []);

  const handleOpenDocPreview = (bus: Fleet) => {
    setSelectedBus(bus);
    setDocPreviewModalOpen(true);
  };

  const handleOpenMasterDataSheet = (busId: string) => {
    setSelectedBusId(busId);
    setMasterDataSheetOpen(true);
  };

  const handleViewInDailyTrips = (busNo: string) => {
    navigate(`/daily-trips?bus=${busNo}`);
  };

  const handleViewDetails = (bus: Fleet) => {
    setSelectedBus(bus);
    setDetailsModalOpen(true);
  };

  const handleEditBus = (bus: Fleet) => {
    setSelectedBus(bus);
    setEditModalOpen(true);
  };

  const handleServiceHistory = (bus: Fleet) => {
    setSelectedBus(bus);
    setServiceHistoryModalOpen(true);
  };

  const handleScheduleMaintenance = (bus: Fleet) => {
    setSelectedBus(bus);
    setScheduleMaintenanceModalOpen(true);
  };

  const handleManageLoan = async (bus: Fleet) => {
    setSelectedBus(bus);
    
    // Check if bus has active loan
    const { data: loanData } = await supabase
      .from("bus_loans")
      .select("id")
      .eq("bus_id", bus.id)
      .eq("status", "active")
      .maybeSingle();

    if (loanData) {
      setLoanDashboardModalOpen(true);
    } else {
      setLoanModalOpen(true);
    }
  };

  const handleDeactivate = (bus: Fleet) => {
    setSelectedBus(bus);
    setDeactivateDialogOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!selectedBus) return;

    try {
      const { error } = await supabase
        .from('buses')
        .update({ 
          status: selectedBus.status === 'retired' ? 'active' : 'retired',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBus.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bus ${selectedBus.status === 'retired' ? 'activated' : 'deactivated'} successfully.`,
      });

      fetchFleet();
      setDeactivateDialogOpen(false);
      setSelectedBus(null);
    } catch (error) {
      console.error('Error updating bus status:', error);
      toast({
        title: "Error",
        description: "Failed to update bus status.",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Fleet>[] = [
    {
      accessorKey: "bus_no",
      header: "Bus No.",
      cell: ({ row }) => {
        const bus = row.original;
        
        // Find if this bus has documents in the manifest
        const docMap = busDocsManifest as Record<string, string[]>;
        let match = docMap[bus.bus_no];
        if (!match) {
          const withoutSpaces = bus.bus_no.replace(/\s+/g, '');
          const keyMatch = Object.keys(docMap).find(k => k.replace(/\s+/g, '') === withoutSpaces);
          if (keyMatch) match = docMap[keyMatch];
        }

        const docCount = match?.length || 0;

        return (
          <div className="flex flex-col gap-1.5 items-start">
            <span className="font-semibold">{bus.bus_no}</span>
            {docCount > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs py-0 h-5 bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20 cursor-pointer flex items-center gap-1"
                onClick={() => handleOpenDocPreview(bus)}
              >
                📎 {docCount} Docs
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category_id",
      header: "Category",
      cell: ({ row }) => (
        <BusCategoryBadge 
          categoryId={row.original.category_id} 
          subCategoryId={row.original.sub_category_id}
          size="sm"
        />
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "route",
      header: "Route",
      cell: ({ row }) => row.getValue("route") || "-",
    },
    {
      accessorKey: "model",
      header: "Model",
    },
    {
      accessorKey: "year",
      header: "Year",
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => `${row.getValue("capacity")} seats`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "current_mileage",
      header: "Mileage (km)",
      cell: ({ row }) => {
        const mileage = row.getValue("current_mileage") as number;
        return mileage.toLocaleString();
      },
    },
    {
      accessorKey: "running_days",
      header: "Running Days",
      cell: ({ row }) => {
        const days = row.getValue("running_days") as number;
        return days || 0;
      },
    },
    {
      accessorKey: "avg_daily_revenue",
      header: "Avg Daily Revenue (₨)",
      cell: ({ row }) => {
        const revenue = row.getValue("avg_daily_revenue") as number;
        return revenue ? `₨ ${revenue.toLocaleString()}` : "-";
      },
    },
    {
      accessorKey: "next_service_date",
      header: "Next Service",
      cell: ({ row }) => {
        const date = row.getValue("next_service_date");
        return date ? new Date(date as string).toLocaleDateString() : "-";
      },
    },
    {
      accessorKey: "next_service_mileage",
      header: "Service Status",
      cell: ({ row }) => {
        const bus = row.original;
        const currentMileage = bus.current_mileage || 0;
        const nextServiceMileage = bus.next_service_mileage;
        
        if (!nextServiceMileage) {
          return <Badge variant="secondary">Not Set</Badge>;
        }
        
        const kmRemaining = nextServiceMileage - currentMileage;
        
        // Color coding based on km remaining
        if (kmRemaining <= 0) {
          return (
            <Badge className="bg-red-500 text-white hover:bg-red-600">
              Overdue by {Math.abs(kmRemaining).toLocaleString()} km
            </Badge>
          );
        } else if (kmRemaining <= 200) {
          return (
            <Badge className="bg-orange-500 text-white hover:bg-orange-600">
              Due in {kmRemaining.toLocaleString()} km
            </Badge>
          );
        } else if (kmRemaining <= 500) {
          return (
            <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
              {kmRemaining.toLocaleString()} km remaining
            </Badge>
          );
        } else {
          return (
            <Badge className="bg-green-500 text-white hover:bg-green-600">
              {kmRemaining.toLocaleString()} km remaining
            </Badge>
          );
        }
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const fleet = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleOpenMasterDataSheet(fleet.id)} className="gap-2 font-medium text-primary">
                <FileSpreadsheet className="w-4 h-4" />
                View Full Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewInDailyTrips(fleet.bus_no)} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View in Daily Trips
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleViewDetails(fleet)} className="gap-2">
                <Eye className="w-4 h-4" />
                Quick View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditBus(fleet)} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Bus
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleServiceHistory(fleet)} className="gap-2">
                <History className="w-4 h-4" />
                Service History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleScheduleMaintenance(fleet)} className="gap-2">
                <CalendarPlus className="w-4 h-4" />
                Schedule Maintenance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleManageLoan(fleet)} className="gap-2">
                <CreditCard className="w-4 h-4" />
                Manage Loan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeactivate(fleet)} 
                className={`gap-2 ${fleet.status === 'retired' ? 'text-success' : 'text-destructive'}`}
              >
                <UserX className="w-4 h-4" />
                {fleet.status === 'retired' ? 'Activate' : 'Deactivate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];


  useEffect(() => {
    fetchFleet();
  }, []);

  // Auto-sync fleet data from daily trips and update buses
  const syncFleetData = async () => {
    try {
      // Get all distinct bus IDs from daily_trips
      const { data: tripBuses, error: tripError } = await supabase
        .from('daily_trips')
        .select('bus_id')
        .not('bus_id', 'is', null);

      if (tripError) {
        console.error('Error fetching trip buses:', tripError);
        return;
      }

      // Get unique bus IDs
      const uniqueBusIds = [...new Set(tripBuses?.map(trip => trip.bus_id) || [])];

      // Check if these buses exist in buses table, if not create them
      for (const busId of uniqueBusIds) {
        if (!busId) continue;
        
        const { data: existingBus } = await supabase
          .from('buses')
          .select('id')
          .eq('id', busId)
          .maybeSingle();

        if (!existingBus) {
          // Auto-create bus entry with bus_id
          const { error: insertError } = await supabase
            .from('buses')
            .insert({
              id: busId,
              bus_no: `BUS-${busId.slice(-8)}`, // Generate bus number from ID
              type: 'Normal',
              model: 'Unknown',
              year: new Date().getFullYear(),
              capacity: 50,
              status: 'active',
              current_mileage: 0,
              service_interval_km: 10000,
              expected_km_per_liter: 8.0,
            });

          if (insertError) {
            console.error('Error auto-creating bus:', insertError);
          } else {
            console.log(`Auto-created bus with ID: ${busId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in syncFleetData:', error);
    }
  };

  const fetchFleet = async () => {
    try {
      setLoading(true);

      // First sync any new buses from daily_trips
      await syncFleetData();

      // Fetch all buses with their details
      const { data: buses, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_no');

      if (error) {
        console.error('Error fetching fleet:', error);
        toast({
          title: "Error",
          description: "Failed to load fleet data.",
          variant: "destructive",
        });
        return;
      }

      // Get all driver allocations with notes for fallback bus_no matching
      const { data: allocations } = await supabase
        .from('driver_allocations')
        .select('trip_id, notes, bus_id');

      // Get all daily trips for comprehensive matching
      const { data: allDailyTrips } = await supabase
        .from('daily_trips')
        .select('*');

      // For each bus, get the latest data from daily_trips
      const busesWithMetrics = await Promise.all(
        buses?.map(async (bus) => {
          try {
            console.log(`🔍 Processing bus: ${bus.bus_no} (ID: ${bus.id})`);

            // Method 1: Direct bus_id matching (Primary)
            const latestTrip = await supabase
              .from('daily_trips')
              .select('odometer_end, trip_date, created_at, trip_no')
              .eq('bus_id', bus.id)
              .not('odometer_end', 'is', null)
              .order('trip_date', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const allTrips = await supabase
              .from('daily_trips')
              .select('income, trip_date, route_id, route_label, routes(route_name)')
              .eq('bus_id', bus.id)
              .not('income', 'is', null);

            // Method 2: Fallback - Match by bus_no from driver_allocations notes
            if ((!latestTrip.data || !allTrips.data?.length) && allocations) {
              console.log(`🔄 Fallback: Matching ${bus.bus_no} by notes...`);
              
              // Find allocations that mention this bus_no in notes
              const matchingAllocations = allocations.filter(allocation => {
                try {
                  const notes = typeof allocation.notes === 'string' 
                    ? JSON.parse(allocation.notes) 
                    : allocation.notes;
                  return notes?.bus_no === bus.bus_no;
                } catch {
                  return false;
                }
              });

              if (matchingAllocations.length > 0) {
                console.log(`📋 Found ${matchingAllocations.length} matching allocations for ${bus.bus_no}`);
                
                // Get trips for these allocations
                const tripIds = matchingAllocations.map(a => a.trip_id);
                const matchingTrips = allDailyTrips?.filter(trip => 
                  tripIds.includes(trip.trip_no)
                ) || [];

                if (matchingTrips.length > 0) {
                  // Get latest trip with odometer_end
                  const tripsWithOdo = matchingTrips
                    .filter(trip => trip.odometer_end != null)
                    .sort((a, b) => {
                      const dateA = new Date(a.trip_date + ' ' + (a.created_at || ''));
                      const dateB = new Date(b.trip_date + ' ' + (b.created_at || ''));
                      return dateB.getTime() - dateA.getTime();
                    });

                  if (tripsWithOdo.length > 0) {
                    latestTrip.data = tripsWithOdo[0];
                    console.log(`🎯 Found odometer reading: ${tripsWithOdo[0].odometer_end}km for ${bus.bus_no}`);
                  }

                  // Update allTrips data - transform to match expected structure
                  allTrips.data = matchingTrips
                    .filter(trip => trip.income != null)
                    .map(trip => ({
                      income: trip.income || 0,
                      trip_date: trip.trip_date,
                      route_id: trip.route_id || '',
                      route_label: trip.route_label || '',
                      routes: { route_name: `Route-${trip.route_id?.slice(0, 8) || 'Unknown'}` }
                    }));
                }
              }
            }

            // Update mileage if we have a newer reading
            let currentMileage = bus.current_mileage || 0;
            if (latestTrip.data?.odometer_end && latestTrip.data.odometer_end > currentMileage) {
              currentMileage = latestTrip.data.odometer_end;
              
              // Update in database
              await supabase
                .from('buses')
                .update({ current_mileage: currentMileage })
                .eq('id', bus.id);
              
              console.log(`📈 Updated ${bus.bus_no} mileage: ${currentMileage}km`);
            }

            // Calculate metrics
            const totalRevenue = allTrips.data?.reduce((sum, trip) => sum + (trip.income || 0), 0) || 0;
            const uniqueTripDates = [...new Set(allTrips.data?.map(trip => trip.trip_date) || [])];
            const runningDays = uniqueTripDates.length;
            const avgDailyRevenue = runningDays > 0 ? totalRevenue / runningDays : 0;

            // Get most common route
            const routeNames = allTrips.data?.map(trip => trip.routes?.route_name || trip.route_label).filter(Boolean) || [];
            const mostCommonRoute = routeNames.length > 0 
              ? routeNames.sort((a, b) => 
                  routeNames.filter(v => v === a).length - routeNames.filter(v => v === b).length
                ).pop()
              : null;

            console.log(`✅ ${bus.bus_no}: Mileage=${currentMileage}, Revenue=${totalRevenue}, Days=${runningDays}`);

            return {
              ...bus,
              route: mostCommonRoute || bus.route,
              current_mileage: currentMileage,
              avg_daily_revenue: Math.round(avgDailyRevenue),
              total_revenue: totalRevenue,
              running_days: runningDays,
            } as Fleet;

          } catch (busError) {
            console.error(`Error processing bus ${bus.bus_no}:`, busError);
            return {
              ...bus,
              running_days: 0,
              avg_daily_revenue: 0,
              total_revenue: 0,
            } as Fleet;
          }
        }) || []
      );

      setData(busesWithMetrics);
      
      // Check for unlinked data and report
      const busesWithData = busesWithMetrics.filter(bus => bus.current_mileage > 0 || bus.running_days > 0);
      const busesWithoutData = busesWithMetrics.filter(bus => bus.current_mileage === 0 && bus.running_days === 0);
      
      toast({
        title: "✅ Fleet Data Updated",
        description: `Updated ${busesWithData.length}/${busesWithMetrics.length} buses with trip data. ${busesWithoutData.length} buses need data linkage.`,
      });

      // Log buses without data for debugging
      if (busesWithoutData.length > 0) {
        console.log('🔍 Buses without linked trip data:', busesWithoutData.map(b => b.bus_no));
      }

    } catch (error) {
      console.error('Error in fetchFleet:', error);
      toast({
        title: "Error",
        description: "Failed to load fleet data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    console.log("Exporting fleet data...");
    // Export logic will be implemented here
  };

  const handleAddBus = () => {
    console.log("Adding new bus...");
    // Add bus logic will be implemented here
  };

  // Calculate KPIs
  const totalBuses = data.length;
  const activeBuses = data.filter(bus => bus.status === 'active').length;
  const maintenanceBuses = data.filter(bus => bus.status === 'maintenance').length;
  const totalRevenue = data.reduce((sum, bus) => sum + (bus.avg_daily_revenue || 0), 0);
  const avgMileage = data.reduce((sum, bus, _, arr) => sum + bus.current_mileage / arr.length, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fleet Management</h1>
            <p className="text-muted-foreground">Monitor and manage your bus fleet</p>
          </div>
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-muted/20 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-accent-hover to-primary p-8 text-accent-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <Bus className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Fleet Management
              </h1>
              <p className="text-accent-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Auto-synced fleet data with real-time metrics
              </p>
            </div>
          </div>
          <div className="flex gap-2 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              onClick={() => setVehicleImportOpen(true)} 
              className="gap-2 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300"
            >
              <Upload className="w-4 h-4" />
              Import Vehicle Data
            </Button>
            <Button 
              onClick={handleAddBus} 
              className="gap-2 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300"
            >
              <Plus className="w-4 h-4 animate-pulse-subtle" />
              Add New Bus
            </Button>
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Total Buses"
              value={totalBuses.toString()}
              icon={<Bus className="w-5 h-5 group-hover:animate-wiggle" />}
              description="Fleet size"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Active Buses"
              value={activeBuses.toString()}
              change={totalBuses > 0 ? `${((activeBuses / totalBuses) * 100).toFixed(0)}%` : "0%"}
              changeType="positive"
              icon={<Bus className="w-5 h-5 group-hover:animate-bounce-subtle" />}
              description="On road now"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="In Maintenance"
              value={maintenanceBuses.toString()}
              icon={<Wrench className="w-5 h-5 group-hover:animate-pulse-subtle" />}
              description="Under service"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Total Revenue"
              value={`₨ ${data.reduce((sum, bus) => sum + (bus.total_revenue || 0), 0).toLocaleString()}`}
              icon={<DollarSign className="w-5 h-5 group-hover:animate-bounce-notification" />}
              description="Fleet total"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.5s' }}>
          <div className="professional-card hover:shadow-info transition-all duration-500 group">
            <KPICard
              title="Avg Daily Revenue"
              value={`₨ ${totalRevenue.toLocaleString()}`}
              icon={<Calendar className="w-5 h-5 group-hover:animate-pulse-subtle" />}
              description="Per bus daily"
            />
          </div>
        </div>
      </div>

      {/* Fleet Alerts Panel */}
      <FleetAlertsPanel onBusClick={handleOpenMasterDataSheet} />

      {/* Filter Panel */}
      <FleetFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        categories={categoryOptions}
        subCategories={subCategoryOptions}
        distinctTypes={distinctTypes}
        distinctModels={distinctModels}
        distinctYears={distinctYears}
        distinctRoutes={distinctRoutes}
        activeFilterCount={activeFilterCount}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        customSearch={customSearch}
        searchKeys={["bus_no", "type", "route", "model", "owner"]}
        title={`Fleet Overview (${filteredData.length}${filteredData.length !== data.length ? ` of ${data.length}` : ""} buses)`}
        onExport={handleExport}
      />

      {/* Bus Master Data Sheet */}
      <BusMasterDataSheet
        busId={selectedBusId}
        open={masterDataSheetOpen}
        onClose={() => {
          setMasterDataSheetOpen(false);
          setSelectedBusId(null);
        }}
      />

      {/* Vehicle Data Import */}
      <FleetVehicleDataImport
        open={vehicleImportOpen}
        onOpenChange={setVehicleImportOpen}
        onSuccess={fetchFleet}
      />

      {/* Modals */}
      <BusDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        bus={selectedBus}
        onOpenLoanDashboard={() => {
          setDetailsModalOpen(false);
          setLoanDashboardModalOpen(true);
        }}
      />

      <EditBusModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        bus={selectedBus}
        onSuccess={fetchFleet}
      />

      <ServiceHistoryModal
        open={serviceHistoryModalOpen}
        onOpenChange={setServiceHistoryModalOpen}
        bus={selectedBus}
      />

      <ScheduleMaintenanceModal
        open={scheduleMaintenanceModalOpen}
        onOpenChange={setScheduleMaintenanceModalOpen}
        bus={selectedBus}
        onSuccess={fetchFleet}
      />

      <BusLoanModal
        open={loanModalOpen}
        onOpenChange={setLoanModalOpen}
        busId={selectedBus?.id || ""}
        busNumber={selectedBus?.bus_no || ""}
        onSuccess={fetchFleet}
      />

      <BusLoanDashboardModal
        open={loanDashboardModalOpen}
        onOpenChange={setLoanDashboardModalOpen}
        busId={selectedBus?.id || ""}
        busNumber={selectedBus?.bus_no || ""}
      />

      <BusDocumentPreviewModal
        open={docPreviewModalOpen}
        onOpenChange={setDocPreviewModalOpen}
        busNo={selectedBus?.bus_no || ""}
      />

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBus?.status === 'retired' ? 'Activate Bus' : 'Deactivate Bus'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBus?.status === 'retired' 
                ? `Are you sure you want to activate bus ${selectedBus?.bus_no}? This will make it available for operations.`
                : `Are you sure you want to deactivate bus ${selectedBus?.bus_no}? This will remove it from active operations.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>
              {selectedBus?.status === 'retired' ? 'Activate' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default function FleetManagement() {
  return <FleetManagementComponent />;
}