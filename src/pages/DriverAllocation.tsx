import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, CheckCircle, MessageCircle, Plus, Send, ShieldAlert, Upload, Download, Edit, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface AllocationRow {
  id: string;
  trip_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status: string;
  bus_no?: string;
  route_no?: string;
  route_name?: string;
  driver_name?: string;
  conductor_name?: string;
  driver_phone?: string;
  conductor_phone?: string;
  time?: string;
}

export default function DriverAllocation() {
  const { hasRole } = useAuth();
  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<AllocationRow | null>(null);

  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);

  const [form, setForm] = useState({
    trip_id: "",
    date: "",
    start_time: "06:00",
    end_time: "18:00",
    route_id: "",
    driver_id: "",
    conductor_id: "",
    bus_ids: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    trip_id: "",
    date: "",
    start_time: "",
    end_time: "",
    route_id: "",
    driver_id: "",
    conductor_id: "",
    bus_id: "",
    status: "",
  });

  useEffect(() => {
    document.title = "Driver Allocation | NCG Speed";
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = 'Assign drivers and conductors to trips with conflict checks';
      document.head.appendChild(m);
    } else {
      (meta as HTMLMetaElement).content = 'Assign drivers and conductors to trips with conflict checks';
    }
  }, []);

  useEffect(() => {
    fetchLists();
    fetchAllocations();
  }, []);

  const fetchLists = async () => {
    try {
      const [busesRes, routesRes, peopleRes] = await Promise.all([
        supabase.from('buses').select('id, bus_no'),
        supabase.from('routes').select('id, route_no, route_name'),
        supabase.from('profiles').select('user_id, first_name, last_name, phone'),
      ]);
      setBuses(busesRes.data || []);
      setRoutes(routesRes.data || []);
      setPeople(peopleRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed loading lists');
    }
  };

  const nameOf = (userId?: string) => {
    const p = people.find(p => p.user_id === userId);
    return p ? `${p.first_name} ${p.last_name}` : undefined;
  };
  const phoneOf = (userId?: string) => people.find(p => p.user_id === userId)?.phone;

  const safeParseJSON = (str?: string) => {
    try { return str ? JSON.parse(str) : null; } catch { return null; }
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_allocations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows: AllocationRow[] = (data || []).map((r: any) => {
        const meta = safeParseJSON(r.notes);
        return {
          id: r.id,
          trip_id: r.trip_id,
          date: r.allocation_date,
          start_time: r.start_time,
          end_time: r.end_time,
          status: r.status,
          bus_no: meta?.bus_no || buses.find(b => b.id === r.bus_id)?.bus_no,
          route_no: meta?.route_no || routes.find(rt => rt.id === r.route_id)?.route_no,
          route_name: meta?.route || routes.find(rt => rt.id === r.route_id)?.route_name,
          driver_name: meta?.driver || nameOf(r.driver_id),
          conductor_name: meta?.conductor || nameOf(r.conductor_id),
          driver_phone: meta?.whatsapp || phoneOf(r.driver_id),
          conductor_phone: phoneOf(r.conductor_id),
          time: meta?.time,
        };
      });

      setAllocations(rows);
    } catch (e) {
      console.error('fetchAllocations', e);
      toast.error('Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    if (!form.date || !form.start_time || !form.end_time) return [] as any[];
    const { data } = await supabase
      .from('driver_allocations')
      .select('*')
      .eq('allocation_date', form.date)
      .in('driver_id', [form.driver_id].filter(Boolean) as string[]);
    const overlaps = (data || []).filter((a: any) => (
      (a.start_time || '00:00') < form.end_time && (a.end_time || '23:59') > form.start_time
    ));
    return overlaps;
  };

  const generateTripId = async (tripDate: string) => {
    // Format: TYYYYMMDD-#### (e.g., T20250731-0001)
    const dateForId = tripDate.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
    const pattern = `T${dateForId}-%`;
    
    // Get the highest trip ID number for this specific date
    const { data } = await supabase
      .from('driver_allocations')
      .select('trip_id')
      .like('trip_id', pattern)
      .order('trip_id', { ascending: false })
      .limit(1);
    
    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastTripId = data[0].trip_id;
      const match = lastTripId.match(/T\d{8}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    return `T${dateForId}-${nextNumber.toString().padStart(4, '0')}`;
  };

  const parseTime = (timeStr: string) => {
    if (!timeStr) return null;
    // Handle formats like "7.15PM", "8:45PM", etc.
    const match = timeStr.match(/(\d+)[\.:]\s*(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return null;
  };

  const parseDate = (dateStr: any): string => {
    if (!dateStr) {
      console.warn('Empty date string, using current date');
      return new Date().toISOString().split('T')[0];
    }

    // Handle Excel serial date numbers (most common issue)
    if (typeof dateStr === 'number') {
      console.log('Processing Excel serial date:', dateStr);
      
      // Excel serial date: days since January 1, 1900
      // JavaScript Date: milliseconds since January 1, 1970
      // The difference is 25569 days (70 years * 365.25 days)
      
      // Convert Excel serial date to JavaScript date
      const jsDate = new Date((dateStr - 25569) * 86400 * 1000);
      
      // Adjust for timezone to get correct date
      const utcDate = new Date(jsDate.getTime() + jsDate.getTimezoneOffset() * 60000);
      
      if (!isNaN(utcDate.getTime())) {
        const result = utcDate.toISOString().split('T')[0];
        console.log('Converted Excel serial date:', dateStr, 'to:', result);
        return result;
      }
    }

    const dateString = dateStr.toString().trim();
    console.log('Parsing date string:', dateString);

    try {
      // Handle DD/MM/YYYY format (31/07/2025)
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          let day, month, year;
          
          // Check if first part is year (YYYY/MM/DD) or day (DD/MM/YYYY)
          if (parts[0].length === 4) {
            // YYYY/MM/DD
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
          } else {
            // DD/MM/YYYY or MM/DD/YYYY - assume DD/MM/YYYY for non-US format
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          }
          
          const result = `${year}-${month}-${day}`;
          console.log('Parsed date with / to:', result);
          return result;
        }
      }

      // Handle DD.MM.YYYY format
      if (dateString.includes('.')) {
        const parts = dateString.split('.');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          const result = `${year}-${month}-${day}`;
          console.log('Parsed DD.MM.YYYY to:', result);
          return result;
        }
      }

      // Handle DD-MM-YYYY format
      if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD (already correct)
            console.log('Date already in YYYY-MM-DD format:', dateString);
            return dateString;
          } else {
            // DD-MM-YYYY
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            const result = `${year}-${month}-${day}`;
            console.log('Parsed DD-MM-YYYY to:', result);
            return result;
          }
        }
      }

      // Try to parse as ISO date or other standard format
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const result = parsedDate.toISOString().split('T')[0];
        console.log('Parsed as standard date to:', result);
        return result;
      }

    } catch (error) {
      console.error('Error parsing date:', dateString, error);
    }

    // Final fallback: use current date
    console.warn('Could not parse date:', dateString, 'using current date');
    return new Date().toISOString().split('T')[0];
  };

  const findRouteByName = (routeName: string) => {
    if (!routeName) return null;
    const searchName = routeName.toLowerCase().trim();
    return routes.find(r => 
      r.route_name.toLowerCase().includes(searchName) ||
      r.route_no?.toLowerCase().includes(searchName) ||
      searchName.includes(r.route_name.toLowerCase())
    );
  };

  const findPersonByName = (name: string) => {
    if (!name || !name.trim()) return null;
    const searchName = name.toLowerCase().trim();
    
    console.log('Searching for person:', searchName);
    
    // Remove common prefixes/suffixes
    const cleanedName = searchName
      .replace(/^(mr|mrs|ms|dr|prof)\.?\s*/i, '')
      .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '');
    
    // Try exact full name match first
    let person = people.find(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      return fullName === cleanedName || 
             cleanedName === fullName;
    });
    
    if (person) {
      console.log('Found exact match:', person);
      return person;
    }
    
    // Try first name exact match
    person = people.find(p => {
      const firstName = p.first_name.toLowerCase();
      return firstName === cleanedName;
    });
    
    if (person) {
      console.log('Found first name match:', person);
      return person;
    }
    
    // Try last name exact match
    person = people.find(p => {
      const lastName = p.last_name.toLowerCase();
      return lastName === cleanedName;
    });
    
    if (person) {
      console.log('Found last name match:', person);
      return person;
    }
    
    // Try partial matches with full name
    person = people.find(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      return fullName.includes(cleanedName) || cleanedName.includes(fullName);
    });
    
    if (person) {
      console.log('Found partial full name match:', person);
      return person;
    }
    
    // Try fuzzy matching with individual name parts
    const nameWords = cleanedName.split(/\s+/).filter(word => word.length > 2);
    
    for (const word of nameWords) {
      person = people.find(p => {
        const firstName = p.first_name.toLowerCase();
        const lastName = p.last_name.toLowerCase();
        return firstName.includes(word) || 
               lastName.includes(word) ||
               word.includes(firstName) ||
               word.includes(lastName);
      });
      
      if (person) {
        console.log('Found fuzzy match for word:', word, '-> person:', person);
        return person;
      }
    }
    
    console.log('No person found for:', searchName);
    return null;
  };

  const findBusByNumber = (busNo: string) => {
    if (!busNo) return null;
    const searchBus = busNo.toLowerCase().trim();
    return buses.find(b => 
      b.bus_no.toLowerCase() === searchBus ||
      b.bus_no.toLowerCase().includes(searchBus) ||
      searchBus.includes(b.bus_no.toLowerCase())
    );
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      let currentTripNumber = 1;
      
      // First get the current highest trip ID to continue sequence
      const { data: existingData } = await supabase
        .from('driver_allocations')
        .select('trip_id')
        .like('trip_id', 'T%')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingData && existingData.length > 0) {
        const lastTripId = existingData[0].trip_id;
        const match = lastTripId.match(/T(\d+)/);
        if (match) {
          currentTripNumber = parseInt(match[1]) + 1;
        }
      }

      const allocRows = jsonData.map((row: any, index: number) => {
        // More flexible column name detection
        const getColumnValue = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const value = row[name];
            if (value !== undefined && value !== null && value !== '') {
              return value.toString().trim();
            }
          }
          return null;
        };

        const busNo = getColumnValue(['Bus No', 'bus no', 'Bus', 'bus', 'Bus Number', 'BusNo']);
        const routeNo = getColumnValue(['Route', 'route', 'Route No', 'route no', 'RouteNo']);
        const routeName = getColumnValue(['route name', 'Route Name', 'RouteName', 'Route', 'route']);
        const driverName = getColumnValue(['Driver', 'driver', 'Driver Name', 'DriverName']);
        const conductorName = getColumnValue(['Conductor', 'conductor', 'Conductor Name', 'ConductorName']);
        const whatsapp = getColumnValue(['Whatsapp', 'whatsapp', 'WhatsApp', 'Phone', 'phone', 'Contact']);
        const dateValue = getColumnValue(['date', 'Date', 'Trip Date', 'TripDate', 'Day']);
        const timeValue = getColumnValue(['Time', 'time', 'Start Time', 'StartTime', 'Departure']);

        const date = parseDate(dateValue);
        const time = parseTime(timeValue);
        
        // Generate trip ID with new format: TYYYYMMDD-####
        const dateForId = date.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
        const tripId = `T${dateForId}-${(currentTripNumber + index).toString().padStart(4, '0')}`;

        // Find actual IDs from the data
        const foundBus = busNo ? findBusByNumber(busNo) : null;
        const foundRoute = (routeName || routeNo) ? findRouteByName(routeName || routeNo) : null;
        const foundDriver = driverName ? findPersonByName(driverName) : null;
        const foundConductor = conductorName ? findPersonByName(conductorName) : null;

        console.log('Excel row mapping:', {
          original: { busNo, routeName, routeNo, driverName, conductorName, dateValue, timeValue },
          found: { 
            bus: foundBus ? `${foundBus.bus_no} (${foundBus.id})` : 'Not found',
            route: foundRoute ? `${foundRoute.route_name} (${foundRoute.id})` : 'Not found',
            driver: foundDriver ? `${foundDriver.first_name} ${foundDriver.last_name} (${foundDriver.user_id})` : 'Not found',
            conductor: foundConductor ? `${foundConductor.first_name} ${foundConductor.last_name} (${foundConductor.user_id})` : 'Not found',
            date, time
          }
        });

        return {
          trip_id: tripId,
          bus_id: foundBus?.id || null,
          route_id: foundRoute?.id || null,
          driver_id: foundDriver?.id || null,
          conductor_id: foundConductor?.id || null,
          allocation_date: date,
          start_time: time || '06:00',
          end_time: time ? addHours(time, 8) : '18:00',
          status: 'confirmed',
          notes: JSON.stringify({
            bus_no: busNo,
            route_no: routeNo,
            route: routeName,
            driver: driverName,
            conductor: conductorName,
            whatsapp,
            time: row['Time']?.toString() || row['time']?.toString()
          })
        } as any;
      });

      const { error } = await supabase.from('driver_allocations').insert(allocRows);
      if (error) throw error;

      toast.success(`Imported ${allocRows.length} allocations`);
      setExcelOpen(false);
      fetchAllocations();
    } catch (error: any) {
      console.error('Excel upload error:', error);
      toast.error('Failed to process Excel file: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const addHours = (timeStr: string, hours: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + (hours * 60);
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (!isSupervisor) return toast.error('Access denied');
    
    try {
      const { error } = await supabase
        .from('driver_allocations')
        .delete()
        .eq('id', allocationId);
      
      if (error) throw error;
      
      toast.success('Allocation deleted');
      fetchAllocations();
    } catch (error: any) {
      toast.error('Failed to delete allocation: ' + error.message);
    }
  };

  const handleExportData = () => {
    const exportData = allocations.map(row => ({
      'Trip ID': row.trip_id,
      'Bus No': row.bus_no,
      'Route No': row.route_no,
      'Route Name': row.route_name,
      'Driver': row.driver_name,
      'Conductor': row.conductor_name,
      'Date': row.date,
      'Start Time': row.start_time,
      'End Time': row.end_time,
      'Status': row.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Allocations');
    XLSX.writeFile(wb, `driver_allocations_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data exported successfully');
  };

  const handleCreate = async () => {
    if (!isSupervisor) return toast.error('Access denied');
    if (!form.date || !form.route_id || !form.driver_id || form.bus_ids.length === 0) {
      return toast.error('Please fill required fields and select at least 1 bus');
    }
    if (form.bus_ids.length > 3) return toast.error('Select up to 3 buses');

    const conflicts = await checkConflicts();
    if (conflicts.length > 0) {
      toast.error('Time-window conflict: driver already assigned');
      return;
    }

    const tripId = form.trip_id || await generateTripId(form.date);

    try {
      // Create one allocation per bus to support many-to-many mapping
      const allocRows = form.bus_ids.map(bus_id => ({
        trip_id: tripId,
        bus_id,
        route_id: form.route_id,
        driver_id: form.driver_id,
        conductor_id: form.conductor_id || null,
        allocation_date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        status: 'confirmed'
      }));

      const { error: allocErr } = await supabase.from('driver_allocations').insert(allocRows);
      if (allocErr) throw allocErr;

      // Auto-create scheduled trips in daily_trips
      const tripRows = form.bus_ids.map(bus_id => ({
        bus_id,
        route_id: form.route_id,
        driver_id: form.driver_id,
        conductor_id: form.conductor_id || null,
        trip_date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        status: 'scheduled' as const,
        trip_no: tripId
      }));
      const { error: tripErr } = await supabase.from('daily_trips').insert(tripRows);
      if (tripErr) throw tripErr;

      toast.success('Allocation confirmed and trips created');
      setOpen(false);
      setForm({ ...form, trip_id: "", bus_ids: [] });
      fetchAllocations();
    } catch (e: any) {
      console.error('create allocation', e);
      toast.error(e.message || 'Failed to create allocation');
    }
  };

  const handleEditAllocation = (allocation: AllocationRow) => {
    setEditForm({
      trip_id: allocation.trip_id,
      date: allocation.date,
      start_time: allocation.start_time || "06:00",
      end_time: allocation.end_time || "18:00",
      route_id: routes.find(r => r.route_no === allocation.route_no || r.route_name === allocation.route_name)?.id || "",
      driver_id: people.find(p => `${p.first_name} ${p.last_name}` === allocation.driver_name)?.user_id || "",
      conductor_id: people.find(p => `${p.first_name} ${p.last_name}` === allocation.conductor_name)?.user_id || "",
      bus_id: buses.find(b => b.bus_no === allocation.bus_no)?.id || "",
      status: allocation.status,
    });
    setEditingAllocation(allocation);
  };

  const handleUpdateAllocation = async () => {
    if (!editingAllocation || !isSupervisor) return;

    try {
      const { error } = await supabase
        .from('driver_allocations')
        .update({
          trip_id: editForm.trip_id,
          allocation_date: editForm.date,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          route_id: editForm.route_id || null,
          driver_id: editForm.driver_id || null,
          conductor_id: editForm.conductor_id || null,
          bus_id: editForm.bus_id || null,
          status: editForm.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAllocation.id);

      if (error) throw error;

      toast.success('Allocation updated successfully');
      setEditingAllocation(null);
      fetchAllocations();
    } catch (error: any) {
      toast.error('Failed to update allocation: ' + error.message);
    }
  };

  const columns: ColumnDef<AllocationRow>[] = [
    { accessorKey: 'trip_id', header: 'Trip ID' },
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'bus_no', header: 'Bus No.' },
    { accessorKey: 'route_no', header: 'Route No.' },
    { accessorKey: 'route_name', header: 'Route' },
    { accessorKey: 'driver_name', header: 'Driver' },
    { accessorKey: 'conductor_name', header: 'Conductor' },
    { 
      accessorKey: 'driver_phone', 
      header: 'WhatsApp',
      cell: ({ row }) => row.original.driver_phone || '-'
    },
    { accessorKey: 'time', header: 'Time' },
    { accessorKey: 'start_time', header: 'Start Time' },
    { accessorKey: 'end_time', header: 'End Time' },
    { accessorKey: 'status', header: 'Status' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {isSupervisor && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditAllocation(row.original)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAllocation(row.original.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  const selectedBusNames = useMemo(() =>
    buses.filter(b => form.bus_ids.includes(b.id)).map(b => b.bus_no).join(', '), [buses, form.bus_ids]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Driver Allocation</h1>
          <p className="text-muted-foreground">Assign buses, routes, drivers and confirm trips</p>
        </div>
        {isSupervisor && (
          <div className="flex gap-2">
            <Button onClick={handleExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            
            <Dialog open={excelOpen} onOpenChange={setExcelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" /> Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Excel File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Excel File</Label>
                    <Input 
                      type="file" 
                      accept=".xlsx,.xls" 
                      onChange={handleExcelUpload}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Expected format: Bus No | Route | route name | Driver | Conductor | Whatsapp | date | Time
                    </p>
                  </div>
                  {uploading && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Processing Excel file...</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={!!editingAllocation} onOpenChange={(open) => !open && setEditingAllocation(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Allocation</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Trip ID</Label>
                    <Input 
                      value={editForm.trip_id}
                      onChange={(e) => setEditForm({ ...editForm, trip_id: e.target.value })} 
                    />
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={editForm.date} 
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Start</Label>
                      <Input 
                        type="time" 
                        value={editForm.start_time} 
                        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} 
                      />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input 
                        type="time" 
                        value={editForm.end_time} 
                        onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Route</Label>
                    <Select value={editForm.route_id} onValueChange={(v) => setEditForm({ ...editForm, route_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.route_no} — {r.route_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Bus</Label>
                    <Select value={editForm.bus_id} onValueChange={(v) => setEditForm({ ...editForm, bus_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bus" />
                      </SelectTrigger>
                      <SelectContent>
                        {buses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.bus_no}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Driver</Label>
                    <Select value={editForm.driver_id} onValueChange={(v) => setEditForm({ ...editForm, driver_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Conductor</Label>
                    <Select value={editForm.conductor_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, conductor_id: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select conductor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {people.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 flex gap-2">
                    <Button onClick={handleUpdateAllocation} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />Update Allocation
                    </Button>
                    <Button variant="outline" onClick={() => setEditingAllocation(null)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Allocation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Allocation</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Trip ID</Label>
                    <Input placeholder="Auto or custom" value={form.trip_id}
                      onChange={(e) => setForm({ ...form, trip_id: e.target.value })} />
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Start</Label>
                      <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <Label>Route</Label>
                    <Select value={form.route_id} onValueChange={(v) => setForm({ ...form, route_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.route_no} — {r.route_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Driver</Label>
                    <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Conductor</Label>
                    <Select value={form.conductor_id || "none"} onValueChange={(v) => setForm({ ...form, conductor_id: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select conductor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {people.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Buses (max 3)</Label>
                    <select multiple className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                      value={form.bus_ids} onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                        setForm({ ...form, bus_ids: opts.slice(0,3) });
                      }}>
                      {buses.map((b) => (
                        <option key={b.id} value={b.id}>{b.bus_no}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Selected: {selectedBusNames || 'None'}</p>
                  </div>

                  <div className="col-span-2">
                    <Button onClick={handleCreate} className="w-full"><CheckCircle className="h-4 w-4 mr-2" />Confirm & Create Trips</Button>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className="w-full justify-start gap-2"><ShieldAlert className="h-4 w-4" /> Time-window conflict checks run before confirming.</Badge>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
          <CardDescription>Recent assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={allocations} searchKey="trip_id" />
        </CardContent>
      </Card>
    </div>
  );
}
