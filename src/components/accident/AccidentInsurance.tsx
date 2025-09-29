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
import { Car, Plus, FileText, Upload, Download, AlertTriangle, DollarSign, Shield, MapPin, Calendar, Grid, List } from "lucide-react";
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

interface BusStatistic {
  busNumber: string;
  count: number;
  totalEstimate: number;
  totalApproved: number;
  latestAccident: string;
  statusArray: string[];
}

export function AccidentInsurance() {
  const { hasRole } = useAuth();
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccident, setSelectedAccident] = useState<AccidentRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [insertingBulkData, setInsertingBulkData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [statusFilter, setStatusFilter] = useState("");
  const [salvageFilter, setSalvageFilter] = useState("");
  const [accidentMarkFilter, setAccidentMarkFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "bus-cards">("table");
  const [selectedBusNumber, setSelectedBusNumber] = useState<string | null>(null);

  const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const fetchAccidents = async () => {
    try {
      // Build URL with search parameters for the function
      const params = new URLSearchParams();
      if (searchQuery) params.append('vehicleNumber', searchQuery);
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
      if (statusFilter) params.append('status', statusFilter);
      if (salvageFilter) params.append('salvage', salvageFilter);
      if (accidentMarkFilter) params.append('accidentMark', accidentMarkFilter);

      const url = `https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-records${params.toString() ? '?' + params.toString() : ''}`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAccidents(result.data || []);
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

  // Get unique bus numbers with accident counts
  const getBusStatistics = (): BusStatistic[] => {
    const busStats = accidents.reduce((acc, accident) => {
      const busNumber = accident.vehicle_number;
      if (!acc[busNumber]) {
        acc[busNumber] = {
          count: 0,
          totalEstimate: 0,
          totalApproved: 0,
          latestAccident: accident.accident_date,
          statuses: new Set()
        };
      }
      acc[busNumber].count++;
      acc[busNumber].totalEstimate += accident.estimate_amount || 0;
      acc[busNumber].totalApproved += accident.approved_amount || 0;
      acc[busNumber].statuses.add(accident.status);
      
      if (new Date(accident.accident_date) > new Date(acc[busNumber].latestAccident)) {
        acc[busNumber].latestAccident = accident.accident_date;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(busStats).map(([busNumber, stats]) => ({
      busNumber,
      count: stats.count,
      totalEstimate: stats.totalEstimate,
      totalApproved: stats.totalApproved,
      latestAccident: stats.latestAccident,
      statusArray: Array.from(stats.statuses) as string[]
    })).sort((a, b) => b.count - a.count);
  };

  // Filter accidents by selected bus
  const getFilteredAccidents = () => {
    if (selectedBusNumber) {
      return accidents.filter(acc => acc.vehicle_number === selectedBusNumber);
    }
    return accidents;
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

  const insertBulkData = async () => {
    setInsertingBulkData(true);
    try {
      const bulkData = [
        { no: 1, vehicle_number: 'NC 8759', accident_date: '2023-01-05', bl_number: 'BL1990945', details_of_accident: 'side glass damage-Puttalama', estimate_amount: null, approved_amount: null, process_details: 'Estimate ,Finall bill and ARI Pending' },
        { no: 2, vehicle_number: 'NC 8759', accident_date: '2023-08-24', bl_number: 'BL 2079809', details_of_accident: 'face pannel, aluminium molding, Arachchikattuwa- Hit Mahindra lorry', estimate_amount: null, approved_amount: null, process_details: 'Estimate, Final Bill, ARI pending' },
        { no: 3, vehicle_number: 'NC 8759', accident_date: '2024-08-30', bl_number: 'BL 2212240', details_of_accident: 'Passenger door glass damage', estimate_amount: 285000, approved_amount: null, process_details: 'under engineering dept' },
        { no: 4, vehicle_number: 'NC 8759', accident_date: '2025-07-15', bl_number: null, details_of_accident: 'Left side front body damage', estimate_amount: null, approved_amount: null, process_details: null },
        { no: 5, vehicle_number: 'NC 8759', accident_date: '2025-07-29', bl_number: 'BL 2316740', details_of_accident: 'Left side mirror damage', estimate_amount: null, approved_amount: null, process_details: null },
        { no: 6, vehicle_number: 'NC 8759', accident_date: '2025-09-08', bl_number: null, details_of_accident: 'Front Buffer damage', estimate_amount: null, approved_amount: null, process_details: null },
        { no: 7, vehicle_number: 'NC 8759', accident_date: '2024-12-21', bl_number: null, details_of_accident: null, estimate_amount: null, approved_amount: null, process_details: null },
        { no: 8, vehicle_number: 'NC 8760', accident_date: '2023-09-29', bl_number: 'BL 2094683', details_of_accident: '2 Glasses side damage-piolgaovita', estimate_amount: 635000, approved_amount: null, process_details: 'Estimate ,Finall bill and ARI Pending' },
        { no: 9, vehicle_number: 'NC 8760', accident_date: '2025-02-13', bl_number: 'BL 2263757', details_of_accident: 'FRONT BUFFER DAMAGE', estimate_amount: 585000, approved_amount: null, process_details: null },
        { no: 10, vehicle_number: 'NC 8760', accident_date: '2024-05-24', bl_number: 'BL2181639', details_of_accident: 'passenger main door glass damage', estimate_amount: 225000, approved_amount: null, process_details: 'JOB COMPLETD,ARI ,FINAL BILL PENDING' },
        { no: 11, vehicle_number: 'NC 8760', accident_date: '2025-08-18', bl_number: 'BL 2322886', details_of_accident: 'TWO SIDE GLASS DAMAGE', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPLETD,ARI ,FINAL BILL PENDING' },
        { no: 12, vehicle_number: 'NC 8760', accident_date: '2024-05-30', bl_number: 'BL 2183188', details_of_accident: 'passenger door glass damage', estimate_amount: 232200, approved_amount: null, process_details: 'JOB NOT COMPLETED,FINALL BILL,ARI PENDING' },
        { no: 13, vehicle_number: 'ND 9155', accident_date: '2024-07-04', bl_number: null, details_of_accident: null, estimate_amount: null, approved_amount: null, process_details: null },
        { no: 14, vehicle_number: 'ND 9155', accident_date: '2025-04-05', bl_number: null, details_of_accident: 'front wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'REJECT CLAIM SLIC' },
        { no: 15, vehicle_number: 'ND 4890', accident_date: '2023-01-14', bl_number: 'BL 1994467', details_of_accident: 'Hit by stone fron wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPELETED PAYMNET PENDING' },
        { no: 16, vehicle_number: 'ND 4890', accident_date: '2024-06-14', bl_number: 'BL-2187725', details_of_accident: 'rear side right side body damage and buffer', estimate_amount: 57000, approved_amount: null, process_details: 'JOB COMPLETED processing unit' },
        { no: 17, vehicle_number: 'ND 4890', accident_date: '2024-06-25', bl_number: 'BL 2190929', details_of_accident: 'front face damage', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPELETED PAYMNET PENDING' },
        { no: 18, vehicle_number: 'ND 4890', accident_date: '2025-06-25', bl_number: 'cop A', details_of_accident: 'Right side body damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd estimate,Final bill,Ari' },
        { no: 19, vehicle_number: 'ND 4890', accident_date: '2024-11-11', bl_number: 'cop', details_of_accident: 'front buffr /LH face pannel', estimate_amount: null, approved_amount: null, process_details: 'job completed Payement pending' },
        { no: 20, vehicle_number: 'NE 5585', accident_date: '2025-04-05', bl_number: 'BL 2279776', details_of_accident: 'front wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'job completed Payement pending' },
        { no: 21, vehicle_number: 'ND 5265', accident_date: '2024-11-22', bl_number: null, details_of_accident: 'RIGHT SIDE FRONT BUFFER DAMAGE HIT A DOG', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPELETED ,ESTIMAT,FINAL BILL PENDING' },
        { no: 22, vehicle_number: 'ND 5265', accident_date: '2023-12-31', bl_number: 'BL 2133730', details_of_accident: 'HIT A MOTOR BIKE FRONT FACE DAMAGE', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPLETD,ARI ,FINAL BILL PENDING' },
        { no: 23, vehicle_number: 'NE 1269', accident_date: '2025-03-23', bl_number: 'BL 2295003', details_of_accident: 'rear side buffer damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 24, vehicle_number: 'NE 1269', accident_date: '2023-10-11', bl_number: 'BL 2099364', details_of_accident: 'Wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleated' },
        { no: 25, vehicle_number: 'NE 0762', accident_date: '2025-05-03', bl_number: 'BL 2288646', details_of_accident: 'front wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 26, vehicle_number: 'NE 0762', accident_date: '2025-05-08', bl_number: 'BL 2290047', details_of_accident: 'Left side front body damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 27, vehicle_number: 'NE 2062', accident_date: '2024-01-17', bl_number: '2140831', details_of_accident: 'hood body damage', estimate_amount: null, approved_amount: null, process_details: 'JOB NOT COMPLETED ,Estimate, Final bill, ARI, Job not completed' },
        { no: 28, vehicle_number: 'NE 2062', accident_date: '2024-03-01', bl_number: 'BL 2156074', details_of_accident: 'Right sidee roof damage rear side', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPLETED,Estimate, Final Bill, ARI pending' },
        { no: 29, vehicle_number: 'NC 8756', accident_date: '2024-02-26', bl_number: 'BL 2267844', details_of_accident: 'TWO SIDE GLASS DAMAGE', estimate_amount: null, approved_amount: null, process_details: null },
        { no: 30, vehicle_number: 'NC 8756', accident_date: '2025-05-10', bl_number: 'BL 2290862', details_of_accident: 'FRONT HEAVY DAMAGE SALIYAPURA', estimate_amount: null, approved_amount: null, process_details: null },
        { no: 31, vehicle_number: 'NB 7782', accident_date: '2024-02-28', bl_number: 'cop ( 167472)', details_of_accident: 'Rear side body and buffer damage', estimate_amount: null, approved_amount: null, process_details: ',Estimate,ARI,Final Bill,ARI' },
        { no: 32, vehicle_number: 'NB7377', accident_date: '2025-05-31', bl_number: 'cop A', details_of_accident: 'left side windscreen damage', estimate_amount: null, approved_amount: null, process_details: 'JOB COMPELETED ,ESTIMAT,FINAL BILL PENDING' },
        { no: 33, vehicle_number: 'NB7377', accident_date: '2024-10-10', bl_number: 'Coperative', details_of_accident: 'rear side damage hit the loarry', estimate_amount: null, approved_amount: null, process_details: 'job completed, Final bill,ARI, ARI Pending' },
        { no: 34, vehicle_number: 'NC 7632', accident_date: '2024-06-05', bl_number: 'BL 2185188', details_of_accident: 'Left side front face damage', estimate_amount: 56500, approved_amount: null, process_details: 'processing unit' },
        { no: 35, vehicle_number: 'NC 7632', accident_date: '2024-04-16', bl_number: 'BL 2170074', details_of_accident: 'RIGHT SIDE FRONT BUFFER AND SIGNAL LIGHT', estimate_amount: null, approved_amount: null, process_details: 'Estimate pending' },
        { no: 36, vehicle_number: 'NE 2063', accident_date: '2024-03-18', bl_number: 'BL 2161233', details_of_accident: 'Left side front buffer damage', estimate_amount: null, approved_amount: null, process_details: 'job not completed,stimate Final bill ari pending' },
        { no: 37, vehicle_number: 'NE 2063', accident_date: '2024-04-08', bl_number: 'BL 2167855', details_of_accident: 'front wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'document handed over job not complete estimate pending' },
        { no: 38, vehicle_number: 'NE 2152', accident_date: '2024-05-17', bl_number: 'BL 2179383', details_of_accident: 'Left side front face damage', estimate_amount: 28500, approved_amount: null, process_details: 'job completed,ARI FINALL BILL PENDING' },
        { no: 39, vehicle_number: 'NE 2068', accident_date: '2024-06-13', bl_number: 'BL 2187346', details_of_accident: 'rear side buffer damage', estimate_amount: null, approved_amount: null, process_details: 'job not completed,Estimate Final bill ari pending' },
        { no: 40, vehicle_number: 'NE 2061', accident_date: '2024-05-07', bl_number: 'BL 2176314', details_of_accident: 'rear side left side body and light damage', estimate_amount: null, approved_amount: null, process_details: 'Estimate pending' },
        { no: 41, vehicle_number: 'NE 2058', accident_date: '2024-08-05', bl_number: 'BL 2203890', details_of_accident: 'Left side front buffer damage', estimate_amount: null, approved_amount: null, process_details: 'job not completed ,estimate ,final bill pending' },
        { no: 42, vehicle_number: 'NE 2091', accident_date: '2024-09-18', bl_number: 'BL 2217738', details_of_accident: 'REAR SIDE SIGNAL LIGHT DAMAGE RIGHT SIDE', estimate_amount: null, approved_amount: null, process_details: 'Job not compleated' },
        { no: 43, vehicle_number: 'NE 0480', accident_date: '2024-09-15', bl_number: 'Allianz', details_of_accident: 'Wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 44, vehicle_number: 'ND 9817', accident_date: '2024-10-19', bl_number: 'BL 2227409', details_of_accident: 'LEFT SIDE HEAD LAMB AND CORNER DAMAGAE', estimate_amount: null, approved_amount: null, process_details: 'Estimate, final bill pending' },
        { no: 45, vehicle_number: 'NE 2147', accident_date: '2025-07-24', bl_number: 'BL 2315207', details_of_accident: null, estimate_amount: null, approved_amount: null, process_details: 'processing unit' },
        { no: 46, vehicle_number: 'NE 2147', accident_date: '2025-08-28', bl_number: 'BL 2325681', details_of_accident: null, estimate_amount: null, approved_amount: null, process_details: 'Estimate ,Finall bill and ARI Pending' },
        { no: 47, vehicle_number: 'NE 2147', accident_date: '2025-03-26', bl_number: 'BL 2276470', details_of_accident: 'front right side damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd estimate,Final bill,Ari' },
        { no: 48, vehicle_number: 'ND 5262', accident_date: '2025-05-30', bl_number: 'BL 2297257', details_of_accident: 'Right side glass damage', estimate_amount: 125000, approved_amount: null, process_details: 'JOB COMPELETED PAYMNET PENDING' },
        { no: 49, vehicle_number: 'ND 5262', accident_date: '2025-06-14', bl_number: 'SLIC', details_of_accident: 'Right side body damage', estimate_amount: null, approved_amount: null, process_details: 'final bill pending' },
        { no: 50, vehicle_number: 'ND 5262', accident_date: '2025-04-27', bl_number: 'BL 2286840', details_of_accident: 'Roof Top Winshield Damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleated' },
        { no: 51, vehicle_number: 'NE 2260', accident_date: '2025-04-04', bl_number: 'BL 2279555', details_of_accident: 'Left side front buffer damage', estimate_amount: 20500, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 52, vehicle_number: 'NE 2273', accident_date: '2025-05-21', bl_number: 'PEOPLE', details_of_accident: 'Left side roof damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 53, vehicle_number: 'NB 8118', accident_date: '2025-07-21', bl_number: 'SLIC', details_of_accident: 'front wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd estimate,Final bill,Ari' },
        { no: 54, vehicle_number: 'ND 6932', accident_date: '2025-07-22', bl_number: 'cop', details_of_accident: 'FRONT DAMAGE 2HEAD LAMP,BONNET PANEL,L/H WIND SCREEN', estimate_amount: null, approved_amount: null, process_details: null },
        { no: 55, vehicle_number: 'ND 6056', accident_date: '2025-06-20', bl_number: 'cop A', details_of_accident: 'uper wind screen damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 56, vehicle_number: 'NE 2152', accident_date: '2025-07-25', bl_number: 'BL 2315709', details_of_accident: 'Right side body damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' },
        { no: 57, vehicle_number: 'NE 2201', accident_date: '2025-08-01', bl_number: 'SLIC', details_of_accident: 'left side body damage', estimate_amount: null, approved_amount: null, process_details: 'Job not compleatd' }
      ];

      let successCount = 0;
      let errorCount = 0;

      for (const record of bulkData) {
        try {
          // Remove the 'no' field since it's auto-generated by the database
          const { no, ...recordWithoutNo } = record;
          
          const { error } = await supabase.functions.invoke('accident-records', {
            method: 'POST',
            body: recordWithoutNo
          });
          
          if (error) {
            console.error('Error inserting record:', record.no, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error inserting record:', record.no, error);
          errorCount++;
        }
      }

      toast.success(`Bulk data insertion completed! ${successCount} records added successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}.`);
      fetchAccidents(); // Refresh the data
    } catch (error) {
      console.error('Error in bulk data insertion:', error);
      toast.error('Failed to insert bulk data');
    } finally {
      setInsertingBulkData(false);
    }
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
            <span>{format(parseISO(date), 'MMM dd, yyyy')}</span>
          </div>
        );
      }
    },
    {
      accessorKey: "bl_number",
      header: "BL Number",
      cell: ({ row }) => {
        const blNumber = row.getValue("bl_number") as string;
        return blNumber ? (
          <span className="font-mono text-sm">{blNumber}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      }
    },
    {
      accessorKey: "details_of_accident",
      header: "Details Of Accident",
      cell: ({ row }) => {
        const details = row.getValue("details_of_accident") as string;
        return details ? (
          <div className="max-w-48 truncate" title={details}>
            {details}
          </div>
        ) : '-';
      }
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
      header: "Approved Amount",
      cell: ({ row }) => {
        const amount = row.getValue("approved_amount") as number;
        return amount ? `LKR ${amount.toLocaleString()}` : '-';
      }
    },
    {
      accessorKey: "process_details",
      header: "Details of Process",
      cell: ({ row }) => {
        const details = row.getValue("process_details") as string;
        return details ? (
          <div className="max-w-48 truncate" title={details}>
            {details}
          </div>
        ) : '-';
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

  // KPI calculations
  const displayedAccidents = getFilteredAccidents();
  const totalAccidents = displayedAccidents.length;
  const activeClaims = displayedAccidents.filter(acc => acc.status !== 'Closed').length;
  const salvageCases = displayedAccidents.filter(acc => acc.salvage).length;
  const totalEstimateAmount = displayedAccidents.reduce((sum, acc) => sum + (acc.estimate_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-destructive via-destructive to-orange-600 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
            
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-white/10 rounded-lg p-1 backdrop-blur">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setViewMode("table");
                  setSelectedBusNumber(null);
                }}
                className="text-white hover:text-gray-900"
              >
                <List className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === "bus-cards" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("bus-cards")}
                className="text-white hover:text-gray-900"
              >
                <Grid className="h-4 w-4 mr-1" />
                Bus Cards
              </Button>
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
                
                <Button 
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur transition-all duration-200"
                  onClick={insertBulkData}
                  disabled={insertingBulkData}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {insertingBulkData ? 'Adding Data...' : 'Add Bulk Data'}
                </Button>
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

      {/* Filters Section - Only show for table view */}
      {viewMode === "table" && (
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
      )}

      {/* Selected Bus Filter Display */}
      {selectedBusNumber && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-primary">Viewing accidents for bus: {selectedBusNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Showing {getFilteredAccidents().length} accident record(s)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBusNumber(null)}
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Accidents</CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalAccidents}</div>
            <p className="text-xs text-blue-600">
              {selectedBusNumber ? `For ${selectedBusNumber}` : 'All recorded accidents'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Active Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{activeClaims}</div>
            <p className="text-xs text-yellow-600">Open/In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Salvage Cases</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{salvageCases}</div>
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
              LKR {totalEstimateAmount.toLocaleString()}
            </div>
            <p className="text-xs text-green-600">Estimated claims value</p>
          </CardContent>
        </Card>
      </div>

      {/* Content based on view mode */}
      {viewMode === "bus-cards" ? (
        <div className="space-y-6">
          {/* Bus Cards Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Accident Records by Vehicle
              </CardTitle>
              <CardDescription>
                Click on any bus card to view all accidents for that vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getBusStatistics().map((bus) => (
                  <Card
                    key={bus.busNumber}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBusNumber === bus.busNumber 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedBusNumber(bus.busNumber)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{bus.busNumber}</h3>
                          <p className="text-sm text-muted-foreground">Vehicle Number</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Accidents:</span>
                          <Badge variant={bus.count > 5 ? "destructive" : bus.count > 2 ? "secondary" : "default"}>
                            {bus.count}
                          </Badge>
                        </div>
                        
                        {bus.totalEstimate > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Est. Amount:</span>
                            <span className="text-sm font-medium">
                              LKR {bus.totalEstimate.toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Latest:</span>
                          <span className="text-sm">
                            {format(parseISO(bus.latestAccident), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bus.statusArray.slice(0, 2).map((status: string) => (
                            <Badge key={status} variant="outline" className="text-xs">
                              {status}
                            </Badge>
                          ))}
                          {bus.statusArray.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{bus.statusArray.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Accident Records
              {selectedBusNumber && (
                <Badge variant="secondary" className="ml-2">
                  {selectedBusNumber}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedBusNumber 
                ? `Accident records for vehicle ${selectedBusNumber}`
                : "Comprehensive list of all vehicle accident records and insurance claims"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={getFilteredAccidents()}
                searchKeys={["vehicle_number", "bl_number", "location", "reported_by"]}
                title="Accident Records"
              />
            )}
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
