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
import { Calendar, CheckCircle, MessageCircle, Plus, Send, ShieldAlert } from "lucide-react";

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

  const createWhatsAppLink = (phone?: string, text?: string) => {
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(text || 'Trip assigned.');
    return `https://wa.me/${digits}?text=${msg}`;
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

    const tripId = form.trip_id || `ALC-${form.date.replaceAll('-', '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

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
                  <Select value={form.conductor_id} onValueChange={(v) => setForm({ ...form, conductor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select conductor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
