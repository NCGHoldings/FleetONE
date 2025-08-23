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

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_allocations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows: AllocationRow[] = (data || []).map((r: any) => ({
        id: r.id,
        trip_id: r.trip_id,
        date: r.allocation_date,
        start_time: r.start_time,
        end_time: r.end_time,
        status: r.status,
        bus_no: buses.find(b => b.id === r.bus_id)?.bus_no,
        route_no: routes.find(rt => rt.id === r.route_id)?.route_no,
        route_name: routes.find(rt => rt.id === r.route_id)?.route_name,
        driver_name: nameOf(r.driver_id),
        conductor_name: nameOf(r.conductor_id),
        driver_phone: phoneOf(r.driver_id),
        conductor_phone: phoneOf(r.conductor_id),
      }));

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

  const generateTripId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `T${timestamp}`;
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

  const parseDate = (dateStr: string) => {
    // Handle format like "2025.07.31"
    if (dateStr && dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const generateTripIdForExcel = (dateStr: string, seq: number) => {
    const d = parseDate(dateStr) || new Date().toISOString().slice(0,10);
    const ymd = d.split('-').join('');
    return `T${ymd}-${String(seq).padStart(4,'0')}`;
  };

  const findBusByNo = (busNo: string) => buses.find(b => b.bus_no.toLowerCase() === busNo.toLowerCase());
  const findRouteByName = (routeName: string) => routes.find(r => r.route_name.toLowerCase().includes(routeName.toLowerCase()));
  const findPersonByName = (name: string) => people.find(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(p.first_name.toLowerCase())
  );

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      console.log('Processing Excel data:', jsonData);

      // Step 1: Create missing buses
      const newBuses = new Set<string>();
      for (const row of jsonData) {
        const busNo = row['Bus No']?.toString().trim();
        if (busNo && !findBusByNo(busNo)) {
          newBuses.add(busNo);
        }
      }

      if (newBuses.size > 0) {
        console.log('Creating missing buses:', Array.from(newBuses));
        const busRows = Array.from(newBuses).map(busNo => ({
          bus_no: busNo,
          type: 'Bus', // default type
          model: 'Unknown',
          year: new Date().getFullYear(),
          capacity: 50 // default capacity
        }));
        
        const { error: busErr } = await supabase.from('buses').insert(busRows);
        if (busErr) {
          console.error('Error creating buses:', busErr);
          throw new Error(`Failed to create buses: ${busErr.message}`);
        }
      }

      // Step 2: Create missing routes
      const newRoutes = new Set<string>();
      for (const row of jsonData) {
        const routeName = row['route name']?.toString().trim();
        if (routeName && !findRouteByName(routeName)) {
          newRoutes.add(routeName);
        }
      }

      if (newRoutes.size > 0) {
        console.log('Creating missing routes:', Array.from(newRoutes));
        const routeRows = Array.from(newRoutes).map((routeName, index) => ({
          route_no: `R${Date.now()}${index}`, // generate route number
          route_name: routeName,
          start_location: (routeName.split(/\s+to\s+/i)[0] || 'Unknown').trim(),
          end_location: (routeName.split(/\s+to\s+/i)[1] || 'Unknown').trim()
        }));
        
        const { error: routeErr } = await supabase.from('routes').insert(routeRows);
        if (routeErr) {
          console.error('Error creating routes:', routeErr);
          throw new Error(`Failed to create routes: ${routeErr.message}`);
        }
      }

      // Step 3: Create missing staff profiles
      const newStaff = new Set<string>();
      for (const row of jsonData) {
        const driverName = row['Driver']?.toString().trim();
        const conductorName = row['Conductor']?.toString().trim();
        
        if (driverName && !findPersonByName(driverName)) {
          newStaff.add(driverName);
        }
        if (conductorName && !findPersonByName(conductorName)) {
          newStaff.add(conductorName);
        }
      }

      if (newStaff.size > 0) {
        console.log('Creating missing staff profiles:', Array.from(newStaff));
        const staffRows = Array.from(newStaff).map((fullName) => {
          const nameParts = fullName.trim().split(' ');
          const phoneMatch = (jsonData as any[]).find(r => r['Driver']?.toString().trim() === fullName && r['Whatsapp']);
          const phone = phoneMatch ? phoneMatch['Whatsapp'].toString().replace(/\D/g, '') : '';
          return {
            user_id: crypto.randomUUID(), // Generate UUID for user_id
            first_name: nameParts[0] || fullName,
            last_name: nameParts.slice(1).join(' ') || '',
            employee_id: `EMP${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
            phone
          };
        });
        
        const { error: staffErr } = await supabase.from('profiles').insert(staffRows);
        if (staffErr) {
          console.error('Error creating staff profiles:', staffErr);
          throw new Error(`Failed to create staff profiles: ${staffErr.message}`);
        }
      }

      // Step 4: Refresh local data
      await fetchLists();

      // Step 5: Process Excel data for allocations
      const processedRows = [];
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const busNo = row['Bus No']?.toString().trim();
        const routeName = row['route name']?.toString().trim();
        const driverName = row['Driver']?.toString().trim();
        const conductorName = row['Conductor']?.toString().trim();
        
        const bus = findBusByNo(busNo);
        const route = findRouteByName(routeName);
        const driver = findPersonByName(driverName);
        const conductor = conductorName ? findPersonByName(conductorName) : null;
        
        const date = parseDate(row['date']);
        const time = parseTime(row['Time']);

        if (bus && route && driver && date) {
          processedRows.push({
            tripId: generateTripIdForExcel(date, i + 1),
            busId: bus.id,
            routeId: route.id,
            driverId: driver.user_id,
            conductorId: conductor?.user_id || null,
            date: date,
            startTime: time || '06:00',
            endTime: time ? addHours(time, 8) : '18:00'
          });
        }
      }

      if (processedRows.length === 0) {
        toast.error('No valid rows found to import after creating missing records');
        return;
      }

      // Step 6: Create allocations
      const allocRows = processedRows.map(row => ({
        trip_id: row.tripId,
        bus_id: row.busId,
        route_id: row.routeId,
        driver_id: row.driverId,
        conductor_id: row.conductorId,
        allocation_date: row.date,
        start_time: row.startTime,
        end_time: row.endTime,
        status: 'confirmed'
      }));

      const { error: allocErr } = await supabase.from('driver_allocations').insert(allocRows);
      if (allocErr) throw allocErr;

      // Step 7: Create daily trips
      const tripRows = processedRows.map(row => ({
        bus_id: row.busId,
        route_id: row.routeId,
        driver_id: row.driverId,
        conductor_id: row.conductorId,
        trip_date: row.date,
        start_time: row.startTime,
        end_time: row.endTime,
        status: 'scheduled' as const,
        trip_no: row.tripId
      }));

      const { error: tripErr } = await supabase.from('daily_trips').insert(tripRows);
      if (tripErr) throw tripErr;

      toast.success(`Successfully imported ${processedRows.length} allocations and created ${newBuses.size} buses, ${newRoutes.size} routes, ${newStaff.size} staff profiles`);
      setExcelOpen(false);
      fetchAllocations();
    } catch (error: any) {
      console.error('Excel upload error:', error);
      toast.error('Failed to process Excel file: ' + error.message);
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

  const createWhatsAppLink = (phone?: string, text?: string) => {
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(text || 'Trip assigned.');
    return `https://wa.me/${digits}?text=${msg}`;
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

    const tripId = form.trip_id || `ALC-${form.date.replace(/-/g, '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

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

  const columns: ColumnDef<AllocationRow>[] = [
    { accessorKey: 'trip_id', header: 'Trip ID' },
    { accessorKey: 'bus_no', header: 'Bus No.' },
    { accessorKey: 'route_no', header: 'Route No.' },
    { accessorKey: 'route_name', header: 'Route' },
    { accessorKey: 'driver_name', header: 'Driver' },
    { accessorKey: 'conductor_name', header: 'Conductor' },
    {
      accessorKey: 'driver_phone',
      header: 'Whatsapp',
      cell: ({ row }) => {
        const url = createWhatsAppLink(row.original.driver_phone, `Trip ${row.original.trip_id} assigned to you on ${row.original.date}`);
        return url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
            <MessageCircle className="h-4 w-4" /> Driver
          </a>
        ) : '-';
      }
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <a
            href={createWhatsAppLink(row.original.conductor_phone, `Trip ${row.original.trip_id} assigned on ${row.original.date}`)}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground"
          >
            <Send className="h-4 w-4" /> Conductor
          </a>
          {isSupervisor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteAllocation(row.original.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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
