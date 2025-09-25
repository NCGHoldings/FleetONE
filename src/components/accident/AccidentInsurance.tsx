import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Car, Plus, FileText, Upload, Download, AlertTriangle, DollarSign, Shield, MapPin, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO } from "date-fns";
import { AccidentDetailsModal } from "@/components/accident/AccidentDetailsModal";
import { AccidentImportModal } from "@/components/accident/AccidentImportModal";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccidentRecord {
  id: string;
  no: number;
  vehicle_number: string;
  accident_date: string;
  bl_number?: string;
  details_of_accident?: string;
  estimate_amount?: number;
  approved_amount?: number;
  process_details?: string;
  accident_mark: boolean;
  salvage: boolean;
  salvage_disposition?: string;
  salvage_value?: number;
  salvage_sale_date?: string;
  reported_by?: string;
  location?: string;
  insurer_claim_ref?: string;
  status: string;
  created_at: string;
  updated_at: string;
  accident_documents?: { count: number };
}

export function AccidentInsurance() {
  const { hasRole } = useAuth();
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccident, setSelectedAccident] = useState<AccidentRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [statusFilter, setStatusFilter] = useState("");
  const [salvageFilter, setSalvageFilter] = useState("");
  const [accidentMarkFilter, setAccidentMarkFilter] = useState("");

  const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const fetchAccidents = async () => {
    try {
      const response = await supabase.functions.invoke('accident-records', {
        method: 'GET',
        body: {
          vehicleNumber: searchQuery,
          startDate: dateRange?.from?.toISOString().split('T')[0],
          endDate: dateRange?.to?.toISOString().split('T')[0],
          status: statusFilter || undefined,
          salvage: salvageFilter || undefined,
          accidentMark: accidentMarkFilter || undefined,
        }
      });

      if (response.error) throw response.error;
      setAccidents(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching accidents:', error);
      toast.error('Failed to load accident records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccidents();
  }, [searchQuery, dateRange, statusFilter, salvageFilter, accidentMarkFilter]);

  const handleRowClick = (accident: AccidentRecord) => {
    setSelectedAccident(accident);
    setIsDetailsModalOpen(true);
  };

  const handleImportSuccess = () => {
    fetchAccidents();
    setIsImportModalOpen(false);
  };

  const exportCSV = () => {
    const headers = [
      'NO', 'Vehicle Number', 'Accident Date', 'BL Number', 'Details',
      'Estimate Amount', 'Approved Amount', 'Status', 'Salvage', 'Location', 'Reported By'
    ];
    
    const csvContent = [
      headers.join(','),
      ...accidents.map(acc => [
        acc.no,
        acc.vehicle_number,
        acc.accident_date,
        acc.bl_number || '',
        (acc.details_of_accident || '').replace(/,/g, ';'),
        acc.estimate_amount || '',
        acc.approved_amount || '',
        acc.status,
        acc.salvage ? 'Yes' : 'No',
        (acc.location || '').replace(/,/g, ';'),
        (acc.reported_by || '').replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accident-records-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Accident records exported successfully');
  };

  const columns: ColumnDef<AccidentRecord>[] = [
    {
      accessorKey: "no",
      header: "No",
      cell: ({ row }) => <span className="font-mono">{row.getValue("no")}</span>
    },
    {
      accessorKey: "vehicle_number",
      header: "Vehicle Number",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("vehicle_number")}</span>
        </div>
      )
    },
    {
      accessorKey: "accident_date",
      header: "Accident Date",
      cell: ({ row }) => {
        const date = row.getValue("accident_date") as string;
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(parseISO(date), 'MMM dd, yyyy')}
          </div>
        );
      }
    },
    {
      accessorKey: "bl_number",
      header: "BL Number",
      cell: ({ row }) => row.getValue("bl_number") || '-'
    },
    {
      accessorKey: "estimate_amount",
      header: "Estimate",
      cell: ({ row }) => {
        const amount = row.getValue("estimate_amount") as number;
        return amount ? `LKR ${amount.toLocaleString()}` : '-';
      }
    },
    {
      accessorKey: "approved_amount",
      header: "Approved",
      cell: ({ row }) => {
        const amount = row.getValue("approved_amount") as number;
        return amount ? `LKR ${amount.toLocaleString()}` : '-';
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={
            status === 'Closed' ? 'default' :
            status === 'Settlement' ? 'secondary' :
            status === 'Approved' ? 'outline' :
            'destructive'
          }>
            {status}
          </Badge>
        );
      }
    },
    {
      accessorKey: "salvage",
      header: "Salvage",
      cell: ({ row }) => {
        const salvage = row.getValue("salvage") as boolean;
        return (
          <Badge variant={salvage ? "secondary" : "outline"}>
            {salvage ? "Yes" : "No"}
          </Badge>
        );
      }
    },
    {
      accessorKey: "accident_mark",
      header: "Accident Mark",
      cell: ({ row }) => {
        const mark = row.getValue("accident_mark") as boolean;
        return (
          <Badge variant={mark ? "destructive" : "outline"}>
            {mark ? "Yes" : "No"}
          </Badge>
        );
      }
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.getValue("location") as string;
        return location ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-32">{location}</span>
          </div>
        ) : '-';
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRowClick(row.original)}
        >
          <FileText className="h-4 w-4 mr-2" />
          View
        </Button>
      )
    }
  ];

  // Calculate KPIs
  const totalAccidents = accidents.length;
  const activeAccidents = accidents.filter(a => a.status !== 'Closed').length;
  const salvageAccidents = accidents.filter(a => a.salvage).length;
  const totalEstimate = accidents.reduce((sum, a) => sum + (a.estimate_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-destructive via-destructive to-orange-600 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
              <Car className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Accident Insurance</h1>
              <p className="text-white/90 mt-2">
                Track and manage vehicle accident claims and related documentation
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {isAdmin && (
              <>
                <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="secondary"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur transition-all duration-200"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import Accidents
                    </Button>
                  </DialogTrigger>
                  <AccidentImportModal 
                    open={isImportModalOpen}
                    onOpenChange={setIsImportModalOpen}
                    onSuccess={handleImportSuccess}
                  />
                </Dialog>
              </>
            )}
            
            <Button 
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur"
              onClick={exportCSV}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-4 right-4 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>
        <div className="absolute bottom-4 left-1/4 h-24 w-24 rounded-full bg-orange-400/20 blur-lg"></div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <EnhancedSearch
                onSearch={setSearchQuery}
                placeholder="Search vehicle number, BL number..."
                searchKeys={["vehicle_number", "bl_number", "location"]}
              />
            </div>
            
            <DateRangePicker onDateRangeChange={setDateRange} />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Reported">Reported</SelectItem>
                <SelectItem value="Estimate">Estimate</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Settlement">Settlement</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={salvageFilter} onValueChange={setSalvageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Salvage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={accidentMarkFilter} onValueChange={setAccidentMarkFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Marks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Accidents</CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalAccidents}</div>
            <p className="text-xs text-blue-600">All recorded accidents</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Active Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{activeAccidents}</div>
            <p className="text-xs text-yellow-600">Open/In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Salvage Cases</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{salvageAccidents}</div>
            <p className="text-xs text-purple-600">Vehicles with salvage</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Estimates</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              LKR {totalEstimate.toLocaleString()}
            </div>
            <p className="text-xs text-green-600">Estimated claims value</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading accident records...</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Accident Records</CardTitle>
            <CardDescription>
              Manage vehicle accident claims and documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={accidents}
              searchKeys={["vehicle_number", "bl_number", "location", "reported_by"]}
              title="Accident Records"
            />
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedAccident && (
        <AccidentDetailsModal
          accident={selectedAccident}
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          onUpdate={fetchAccidents}
        />
      )}
    </div>
  );
}