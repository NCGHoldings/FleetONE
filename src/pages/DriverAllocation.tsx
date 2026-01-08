import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { BulkImportModal } from "@/components/driver-allocation/BulkImportModal";
import { DataValidationPanel } from "@/components/trips/DataValidationPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, CheckCircle, MessageCircle, Plus, Send, ShieldAlert, Upload, Download, Edit, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx-js-style';
import { formatDateDisplay } from "@/lib/utils";

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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  
  // Date range filter state
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

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

  useEffect(() => {
    fetchAllocations();
  }, [filterStartDate, filterEndDate]);

  const fetchLists = async () => {
    try {
      const [busesRes, routesRes, staffRes] = await Promise.all([
        supabase.from('buses').select('id, bus_no'),
        supabase.from('routes').select('id, route_no, route_name'),
        // Get staff from profiles joined with user_roles to get active staff members
        supabase
          .from('profiles')
          .select(`
            user_id, 
            first_name, 
            last_name, 
            phone,
            user_roles!inner(role)
          `)
          .eq('status', 'active')
          .in('user_roles.role', ['driver', 'conductor', 'supervisor', 'admin', 'super_admin'])
      ]);
      setBuses(busesRes.data || []);
      setRoutes(routesRes.data || []);
      setPeople(staffRes.data || []);
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
      let query = supabase
        .from('driver_allocations')
        .select('*');

      // Apply date filters if set
      if (filterStartDate) {
        query = query.gte('allocation_date', filterStartDate);
      }
      if (filterEndDate) {
        query = query.lte('allocation_date', filterEndDate);
      }

      const { data, error } = await query
        .order('allocation_date', { ascending: false })
        .limit(500);
      if (error) throw error;

      const rows: AllocationRow[] = (data || []).map((r: any) => {
        const meta = safeParseJSON(r.notes);
        
        // PRIORITY: Get actual database values first, fallback to notes only if missing
        const actualRoute = routes.find(rt => rt.id === r.route_id);
        const actualBus = buses.find(b => b.id === r.bus_id);
        const driver = people.find(p => p.user_id === r.driver_id);
        const conductor = people.find(p => p.user_id === r.conductor_id);
        
        return {
          id: r.id,
          trip_id: r.trip_id,
          date: r.allocation_date,
          start_time: r.start_time,
          end_time: r.end_time,
          status: r.status,
          
          // DISPLAY EXCEL VALUES: Show what user uploaded, not database IDs
          bus_no: actualBus?.bus_no || meta?.excel_bus_no || meta?.bus_no || 'N/A',
          route_no: meta?.excel_route_no || actualRoute?.route_no || meta?.route_no || 'N/A',
          route_name: meta?.excel_route_name || actualRoute?.route_name || meta?.route || 'N/A',
          
          // Use actual linked profiles first, then Excel names
          driver_name: driver ? `${driver.first_name} ${driver.last_name}` : meta?.excel_driver || meta?.driver || 'N/A',
          conductor_name: conductor ? `${conductor.first_name} ${conductor.last_name}` : meta?.excel_conductor || meta?.conductor || 'N/A',
          driver_phone: driver?.phone || meta?.whatsapp,
          conductor_phone: conductor?.phone,
          
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
      console.warn('⚠️ Empty date string, using current date');
      return new Date().toISOString().split('T')[0];
    }

    // Handle Excel serial date numbers (most common issue)
    if (typeof dateStr === 'number') {
      console.log('🔢 Processing Excel serial date:', dateStr);
      
      // Excel serial date: days since January 1, 1900
      // JavaScript Date: milliseconds since January 1, 1970
      // The difference is 25569 days (70 years * 365.25 days)
      
      // Convert Excel serial date to JavaScript date
      const jsDate = new Date((dateStr - 25569) * 86400 * 1000);
      
      // Adjust for timezone to get correct date
      const utcDate = new Date(jsDate.getTime() + jsDate.getTimezoneOffset() * 60000);
      
      if (!isNaN(utcDate.getTime())) {
        const result = utcDate.toISOString().split('T')[0];
        console.log('✅ Converted Excel serial date:', dateStr, '→', result);
        return result;
      }
    }

    const dateString = dateStr.toString().trim();
    console.log('📅 Parsing date string:', dateString);

    try {
      // Handle DD/MM/YYYY format (most common format in Excel exports)
      if (dateString.includes('/')) {
        const parts = dateString.split('/').map(p => p.trim());
        if (parts.length === 3) {
          let day, month, year;
          
          // Check if first part is year (YYYY/MM/DD) or day (DD/MM/YYYY)
          if (parts[0].length === 4) {
            // YYYY/MM/DD
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
          } else {
            // DD/MM/YYYY format (most common in many countries)
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          }
          
          const result = `${year}-${month}-${day}`;
          console.log('✅ Parsed DD/MM/YYYY:', dateString, '→', result);
          return result;
        }
      }

      // Handle DD.MM.YYYY format
      if (dateString.includes('.')) {
        const parts = dateString.split('.').map(p => p.trim());
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          const result = `${year}-${month}-${day}`;
          console.log('✅ Parsed DD.MM.YYYY:', dateString, '→', result);
          return result;
        }
      }

      // Handle DD-MM-YYYY format
      if (dateString.includes('-')) {
        const parts = dateString.split('-').map(p => p.trim());
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD (already correct)
            console.log('✅ Date already in YYYY-MM-DD format:', dateString);
            return dateString;
          } else {
            // DD-MM-YYYY
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            const result = `${year}-${month}-${day}`;
            console.log('✅ Parsed DD-MM-YYYY:', dateString, '→', result);
            return result;
          }
        }
      }

      // Try to parse as ISO date or other standard format
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const result = parsedDate.toISOString().split('T')[0];
        console.log('✅ Parsed as standard date:', dateString, '→', result);
        return result;
      }

    } catch (error) {
      console.error('❌ Error parsing date:', dateString, error);
    }

    // Final fallback: use current date
    console.warn('⚠️ Could not parse date:', dateString, '- using current date as fallback');
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
    
    console.log('🔍 Searching for person:', `"${searchName}"`);
    console.log('📋 Available people:', people.length, 'profiles');
    
    // Remove common prefixes/suffixes and extra whitespace
    const cleanedName = searchName
      .replace(/^(mr|mrs|ms|dr|prof)\.?\s*/i, '')
      .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🧹 Cleaned name:', `"${cleanedName}"`);
    
    // Try exact full name match first
    let person = people.find(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase().trim();
      return fullName === cleanedName || cleanedName === fullName;
    });
    
    if (person) {
      console.log('✅ Found exact match:', `${person.first_name} ${person.last_name}`);
      return person;
    }
    
    // Try first name exact match
    person = people.find(p => {
      const firstName = p.first_name.toLowerCase().trim();
      return firstName === cleanedName;
    });
    
    if (person) {
      console.log('✅ Found first name match:', `${person.first_name} ${person.last_name}`);
      return person;
    }
    
    // Try last name exact match
    person = people.find(p => {
      const lastName = p.last_name.toLowerCase().trim();
      return lastName === cleanedName;
    });
    
    if (person) {
      console.log('✅ Found last name match:', `${person.first_name} ${person.last_name}`);
      return person;
    }
    
    // Try partial matches with full name
    person = people.find(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase().trim();
      return fullName.includes(cleanedName) || cleanedName.includes(fullName);
    });
    
    if (person) {
      console.log('✅ Found partial full name match:', `${person.first_name} ${person.last_name}`);
      return person;
    }
    
    // Try fuzzy matching with individual name parts
    const nameWords = cleanedName.split(/\s+/).filter(word => word.length > 2);
    
    for (const word of nameWords) {
      person = people.find(p => {
        const firstName = p.first_name.toLowerCase().trim();
        const lastName = p.last_name.toLowerCase().trim();
        return firstName.includes(word) || 
               lastName.includes(word) ||
               word.includes(firstName) ||
               word.includes(lastName);
      });
      
      if (person) {
        console.log('✅ Found fuzzy match for word:', `"${word}"`, '→', `${person.first_name} ${person.last_name}`);
        return person;
      }
    }
    
    // Log some examples of available names for debugging
    if (people.length > 0) {
      const exampleNames = people.slice(0, 5).map(p => `${p.first_name} ${p.last_name}`).join(', ');
      console.log('❌ No person found for:', `"${searchName}"`, '| Examples:', exampleNames);
    } else {
      console.log('❌ No people in database!');
    }
    
    return null;
  };

  const findBusByNumber = (busNo: string) => {
    if (!busNo) return null;
    
    // Clean and normalize the bus number
    const searchBus = busNo.toUpperCase().trim()
      .replace(/\s+/g, ' ')  // Normalize spaces
      .replace(/^(BUS\s*#?\s*)/i, ''); // Remove "Bus #" prefix
    
    console.log('🔍 Searching for bus:', `"${busNo}"`, '→', `"${searchBus}"`);
    
    // Try exact match first
    let bus = buses.find(b => 
      b.bus_no.toUpperCase().replace(/\s+/g, ' ') === searchBus
    );
    
    if (bus) {
      console.log('✅ Found exact bus match:', bus.bus_no);
      return bus;
    }
    
    // Try without spaces/dashes (NC6915 matches NC 6915 or NC-6915)
    const normalized = searchBus.replace(/[-\s]/g, '');
    bus = buses.find(b => 
      b.bus_no.toUpperCase().replace(/[-\s]/g, '') === normalized
    );
    
    if (bus) {
      console.log('✅ Found normalized bus match:', bus.bus_no);
      return bus;
    }
    
    console.log('❌ Bus not found:', `"${busNo}"`, '| Available:', buses.slice(0, 5).map(b => b.bus_no).join(', '));
    return null;
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

      console.log('📊 Excel Import Started');
      console.log('Total rows:', jsonData.length);
      console.log('First row sample:', jsonData[0]);
      console.log('Available columns:', Object.keys(jsonData[0] || {}));

      // Improved column name detection - trim and normalize
      const getColumnValue = (possibleNames: string[], rowData: any) => {
        // First, try exact matches with trimmed column names
        for (const name of possibleNames) {
          for (const key in rowData) {
            const trimmedKey = key.trim();
            if (trimmedKey.toLowerCase() === name.toLowerCase()) {
              const value = rowData[key];
              if (value !== undefined && value !== null && value !== '') {
                return value.toString().trim();
              }
            }
          }
        }

        // Then try partial matches
        for (const name of possibleNames) {
          for (const key in rowData) {
            const trimmedKey = key.trim().toLowerCase();
            if (trimmedKey.includes(name.toLowerCase()) || name.toLowerCase().includes(trimmedKey)) {
              const value = rowData[key];
              if (value !== undefined && value !== null && value !== '') {
                return value.toString().trim();
              }
            }
          }
        }
        return null;
      };

      // Group rows by date first
      const rowsByDate: { [date: string]: any[] } = {};
      const parsedRows = jsonData.map((row: any, index: number) => {
        const busNo = getColumnValue(['Bus No', 'bus no', 'Bus', 'bus', 'Bus Number', 'BusNo'], row);
        const routeNo = getColumnValue(['Route', 'route', 'Route No', 'route no', 'RouteNo'], row);
        const routeName = getColumnValue(['route name', 'Route Name', 'RouteName'], row) || routeNo;
        const driverName = getColumnValue(['Driver', 'driver', 'Driver Name', 'DriverName'], row);
        const conductorName = getColumnValue(['Conductor', 'conductor', 'Conductor Name', 'ConductorName'], row);
        const whatsapp = getColumnValue(['Whatsapp', 'whatsapp', 'WhatsApp', 'Phone', 'phone', 'Contact'], row);
        const dateValue = getColumnValue(['date', 'Date', 'DATE', 'Trip Date', 'TripDate', 'Allocation Date'], row);
        const timeValue = getColumnValue(['Time', 'time', 'Start Time', 'StartTime', 'Departure', 'time'], row);

        console.log(`\n🔍 Row ${index + 1} Raw Data:`, {
          dateValue,
          busNo,
          routeName,
          driverName,
          conductorName
        });

        const date = parseDate(dateValue);
        const time = parseTime(timeValue);

        // Validation warnings
        if (!dateValue) warnings.push(`Row ${index + 1}: No date found`);
        if (!busNo) warnings.push(`Row ${index + 1}: No bus number found`);
        if (!driverName) warnings.push(`Row ${index + 1}: No driver name found`);

        return {
          rowIndex: index + 1,
          original: row,
          busNo,
          routeNo,
          routeName,
          driverName,
          conductorName,
          whatsapp,
          dateValue,
          timeValue,
          date,
          time
        };
      });

      // Group by date
      parsedRows.forEach((parsedRow) => {
        if (!rowsByDate[parsedRow.date]) {
          rowsByDate[parsedRow.date] = [];
        }
        rowsByDate[parsedRow.date].push(parsedRow);
      });

      console.log('\n📅 Grouped by Date:', Object.keys(rowsByDate).map(date => 
        `${date}: ${rowsByDate[date].length} trips`
      ));

      // Generate trip IDs for each date group
      const allocRows = [];
      let successCount = 0;
      let missingDriverCount = 0;
      let missingConductorCount = 0;
      let missingBusCount = 0;

      for (const [date, rows] of Object.entries(rowsByDate)) {
        // Get the highest existing trip number for this specific date
        const dateForId = date.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
        const pattern = `T${dateForId}-%`;
        
        const { data: existingData } = await supabase
          .from('driver_allocations')
          .select('trip_id')
          .like('trip_id', pattern)
          .order('trip_id', { ascending: false })
          .limit(1);
        
        let nextNumber = 1;
        if (existingData && existingData.length > 0) {
          const lastTripId = existingData[0].trip_id;
          const match = lastTripId.match(/T\d{8}-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        console.log(`\n📋 Processing Date ${date}: Starting from trip ${nextNumber}`);

        // Process each row for this date
        rows.forEach((parsedRow, index) => {
          const { busNo, routeNo, routeName, driverName, conductorName, whatsapp, timeValue, date, time, rowIndex } = parsedRow;
          
          // Generate trip ID with proper daily sequence
          const tripId = `T${dateForId}-${(nextNumber + index).toString().padStart(4, '0')}`;

          // Find actual IDs from the data with better logging
          const foundBus = busNo ? findBusByNumber(busNo) : null;
          const foundRoute = (routeName || routeNo) ? findRouteByName(routeName || routeNo) : null;
          const foundDriver = driverName ? findPersonByName(driverName) : null;
          const foundConductor = conductorName ? findPersonByName(conductorName) : null;

          // Track missing items
          if (!foundBus && busNo) {
            missingBusCount++;
            warnings.push(`Row ${rowIndex}: Bus "${busNo}" not found in database`);
          }
          if (!foundDriver && driverName) {
            missingDriverCount++;
            warnings.push(`Row ${rowIndex}: Driver "${driverName}" not found in database`);
          }
          if (!foundConductor && conductorName) {
            missingConductorCount++;
            warnings.push(`Row ${rowIndex}: Conductor "${conductorName}" not found in database`);
          }

          console.log(`✅ Row ${rowIndex} - Trip ${tripId}:`, {
            date: `${parsedRow.dateValue} → ${date}`,
            bus: foundBus ? `✓ ${foundBus.bus_no}` : `✗ "${busNo}" NOT FOUND`,
            route: foundRoute ? `✓ ${foundRoute.route_name}` : `✗ "${routeName || routeNo}" NOT FOUND`,
            driver: foundDriver ? `✓ ${foundDriver.first_name} ${foundDriver.last_name}` : `✗ "${driverName}" NOT FOUND`,
            conductor: foundConductor ? `✓ ${foundConductor.first_name} ${foundConductor.last_name}` : `✗ "${conductorName}" NOT FOUND`
          });

          if (foundBus || foundDriver) {
            successCount++;
          }

          allocRows.push({
            trip_id: tripId,
            bus_id: foundBus?.id || null,
            route_id: foundRoute?.id || null,
            driver_id: foundDriver?.user_id || null,
            conductor_id: foundConductor?.user_id || null,
            allocation_date: date,
            start_time: time || '06:00',
            end_time: time ? addHours(time, 8) : '18:00',
            status: 'confirmed',
            notes: JSON.stringify({
              // Store BOTH database and Excel values for proper display
              bus_no: foundBus?.bus_no || null,
              excel_bus_no: busNo, // Always store Excel value
              route_no: foundRoute?.route_no || null,
              excel_route_no: routeNo, // Always store Excel route number
              route: foundRoute?.route_name || null,
              excel_route_name: routeName, // Always store Excel route name
              driver: foundDriver ? `${foundDriver.first_name} ${foundDriver.last_name}` : null,
              excel_driver: driverName, // Always store Excel driver name
              conductor: foundConductor ? `${foundConductor.first_name} ${foundConductor.last_name}` : null,
              excel_conductor: conductorName, // Always store Excel conductor name
              whatsapp: foundDriver?.phone || whatsapp,
              time: timeValue,
              import_warnings: !foundBus || !foundDriver || !foundConductor ? 'Missing data' : null,
              import_timestamp: new Date().toISOString()
            })
          });
        });
      }

      console.log(`\n📊 Import Summary:`);
      console.log(`Total Rows: ${allocRows.length}`);
      console.log(`Successful Matches: ${successCount}`);
      console.log(`Missing Buses: ${missingBusCount}`);
      console.log(`Missing Drivers: ${missingDriverCount}`);
      console.log(`Missing Conductors: ${missingConductorCount}`);
      console.log(`Warnings: ${warnings.length}`);

      if (allocRows.length === 0) {
        throw new Error('No valid rows to import. Please check your Excel file format.');
      }

      // Show warnings if any
      if (warnings.length > 0) {
        console.warn('⚠️ Import Warnings:', warnings);
        const proceed = window.confirm(
          `Found ${warnings.length} warnings:\n\n` +
          warnings.slice(0, 10).join('\n') +
          (warnings.length > 10 ? `\n... and ${warnings.length - 10} more` : '') +
          '\n\nDo you want to proceed with import?'
        );
        if (!proceed) {
          setUploading(false);
          if (event.target) event.target.value = '';
          return;
        }
      }

      const { error } = await supabase.from('driver_allocations').insert(allocRows);
      if (error) throw error;

      // Also create daily_trips for each allocation
      const tripRows = allocRows.map(alloc => ({
        bus_id: alloc.bus_id,
        route_id: alloc.route_id,
        driver_id: alloc.driver_id,
        conductor_id: alloc.conductor_id,
        trip_date: alloc.allocation_date,
        start_time: alloc.start_time,
        end_time: alloc.end_time,
        status: 'scheduled' as const,
        trip_no: alloc.trip_id
      }));

      const { error: tripError } = await supabase.from('daily_trips').insert(tripRows);
      if (tripError) console.warn('Failed to create daily trips:', tripError);

      toast.success(
        `✅ Successfully imported ${allocRows.length} allocations!\n` +
        (missingDriverCount > 0 ? `⚠️ ${missingDriverCount} drivers not found\n` : '') +
        (missingConductorCount > 0 ? `⚠️ ${missingConductorCount} conductors not found\n` : '') +
        (missingBusCount > 0 ? `⚠️ ${missingBusCount} buses not found` : '')
      );
      setExcelOpen(false);
      fetchAllocations();
    } catch (error: any) {
      console.error('❌ Excel upload error:', error);
      toast.error('Failed to process file: ' + (error.message || 'Unknown error'));
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
      'Date': formatDateDisplay(row.date),
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
      // Store names in notes for display purposes if they are custom names
      const driverName = people.find(p => p.user_id === editForm.driver_id) 
        ? `${people.find(p => p.user_id === editForm.driver_id)?.first_name} ${people.find(p => p.user_id === editForm.driver_id)?.last_name}`
        : editForm.driver_id;
      
      const conductorName = editForm.conductor_id && editForm.conductor_id !== "none" 
        ? (people.find(p => p.user_id === editForm.conductor_id) 
           ? `${people.find(p => p.user_id === editForm.conductor_id)?.first_name} ${people.find(p => p.user_id === editForm.conductor_id)?.last_name}`
           : editForm.conductor_id)
        : null;

      const busNo = buses.find(b => b.id === editForm.bus_id)?.bus_no;
      const route = routes.find(r => r.id === editForm.route_id);

      const notes = JSON.stringify({
        bus_no: busNo,
        route_no: route?.route_no,
        route: route?.route_name,
        driver: driverName,
        conductor: conductorName,
        updated: true
      });

      const { error } = await supabase
        .from('driver_allocations')
        .update({
          trip_id: editForm.trip_id,
          allocation_date: editForm.date,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          route_id: editForm.route_id || null,
          driver_id: people.find(p => p.user_id === editForm.driver_id) ? editForm.driver_id : null,
          conductor_id: editForm.conductor_id && editForm.conductor_id !== "none" && people.find(p => p.user_id === editForm.conductor_id) ? editForm.conductor_id : null,
          bus_id: editForm.bus_id || null,
          status: editForm.status,
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAllocation.id);

      if (error) throw error;

      // Also update related daily_trips if exists
      const { error: tripError } = await supabase
        .from('daily_trips')
        .update({
          bus_id: editForm.bus_id || null,
          route_id: editForm.route_id || null,
          driver_id: people.find(p => p.user_id === editForm.driver_id) ? editForm.driver_id : null,
          conductor_id: editForm.conductor_id && editForm.conductor_id !== "none" && people.find(p => p.user_id === editForm.conductor_id) ? editForm.conductor_id : null,
          trip_date: editForm.date,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          updated_at: new Date().toISOString(),
        })
        .eq('trip_no', editForm.trip_id);

      if (tripError) console.warn('Failed to update related daily trip:', tripError);

      toast.success('Allocation updated successfully');
      setEditingAllocation(null);
      fetchAllocations();
    } catch (error: any) {
      toast.error('Failed to update allocation: ' + error.message);
    }
  };

  const columns: ColumnDef<AllocationRow>[] = [
    { accessorKey: 'trip_id', header: 'Trip ID' },
    { 
      accessorKey: 'date', 
      header: 'Date',
      cell: ({ row }) => formatDateDisplay(row.getValue('date') as string)
    },
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

  // Filter allocations by date range
  const filteredAllocations = useMemo(() => {
    if (!filterStartDate && !filterEndDate) {
      return allocations;
    }
    
    return allocations.filter(allocation => {
      const allocationDate = allocation.date;
      
      if (filterStartDate && allocationDate < filterStartDate) {
        return false;
      }
      
      if (filterEndDate && allocationDate > filterEndDate) {
        return false;
      }
      
      return true;
    });
  }, [allocations, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
  };

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
                  <Upload className="h-4 w-4 mr-2" /> Import Excel/CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Excel or CSV File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Excel or CSV File</Label>
                    <Input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
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
                    <div className="space-y-2">
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
                      <Input 
                        placeholder="Or type new driver name" 
                        value={editForm.driver_id && !people.find(p => p.user_id === editForm.driver_id) ? editForm.driver_id : ""}
                        onChange={(e) => setEditForm({ ...editForm, driver_id: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Conductor</Label>
                    <div className="space-y-2">
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
                      <Input 
                        placeholder="Or type new conductor name" 
                        value={editForm.conductor_id && editForm.conductor_id !== "none" && !people.find(p => p.user_id === editForm.conductor_id) ? editForm.conductor_id : ""}
                        onChange={(e) => setEditForm({ ...editForm, conductor_id: e.target.value })}
                      />
                    </div>
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
                    <div className="space-y-2">
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
                      <Input 
                        placeholder="Or type new driver name" 
                        value={form.driver_id && !people.find(p => p.user_id === form.driver_id) ? form.driver_id : ""}
                        onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Conductor</Label>
                    <div className="space-y-2">
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
                      <Input 
                        placeholder="Or type new conductor name" 
                        value={form.conductor_id && form.conductor_id !== "none" && !people.find(p => p.user_id === form.conductor_id) ? form.conductor_id : ""}
                        onChange={(e) => setForm({ ...form, conductor_id: e.target.value })}
                      />
                    </div>
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

      {/* Data Validation Panel */}
      <DataValidationPanel />

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
          <CardDescription>Recent assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range Filter */}
            <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-start-date">Start Date</Label>
                <Input
                  id="filter-start-date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  placeholder="From date"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-end-date">End Date</Label>
                <Input
                  id="filter-end-date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  placeholder="To date"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!filterStartDate && !filterEndDate}
                >
                  Clear Filters
                </Button>
                <Badge variant="secondary" className="h-10 px-4 flex items-center">
                  {filteredAllocations.length} of {allocations.length} allocations
                </Badge>
              </div>
            </div>
            
            <DataTable columns={columns} data={filteredAllocations} searchKey="trip_id" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
