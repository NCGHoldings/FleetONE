import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearch } from '@/components/ui/enhanced-search';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  RotateCcw, 
  X, 
  ChevronDown,
  Bookmark,
  Sparkles,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { cn, safeParseJSON } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RawTrip {
  route_id: string;
  bus_id: string;
  driver_id?: string;
  start_time?: string;
  trip_date?: string;
  routes?: { route_no: string; route_name: string };
  buses?: { bus_no?: string; registration_number?: string };
  profiles?: { first_name: string; last_name: string };
  notes?: string | object;
}

interface AdvancedFilterPanelProps {
  onFilterChange: (filters: any) => void;
  availableRoutes?: string[];
  availableDrivers?: string[];
  availableBuses?: string[];
  availableTimes?: string[];
  rawTrips?: RawTrip[];
}

interface FilterPreset {
  name: string;
  filters: any;
}

// Helper function to extract driver name from trip
const extractDriverName = (trip: RawTrip): string => {
  let driverName = '';
  if (trip.notes) {
    const notes = safeParseJSON(trip.notes, {});
    driverName = (notes as any).driver || '';
  }
  if (!driverName && trip.profiles) {
    driverName = `${trip.profiles.first_name} ${trip.profiles.last_name}`.trim();
  }
  return driverName || 'Unknown Driver';
};

// Helper function to extract bus name from trip
const extractBusName = (trip: RawTrip): string => {
  if (!trip.buses) return '';
  return trip.buses.bus_no || trip.buses.registration_number || '';
};

// Helper function to extract route name from trip
const extractRouteName = (trip: RawTrip): string => {
  if (!trip.routes) return '';
  return `${trip.routes.route_no} - ${trip.routes.route_name}`;
};

// Helper function to extract time from trip
const extractTime = (trip: RawTrip): string => {
  if (!trip.start_time) return '';
  return trip.start_time.substring(0, 5);
};

export default function AdvancedFilterPanel({ 
  onFilterChange, 
  availableRoutes = [], 
  availableDrivers = [], 
  availableBuses = [],
  availableTimes = [],
  rawTrips = []
}: AdvancedFilterPanelProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [preset, setPreset] = useState('30days');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  // Track if we're in the middle of auto-clearing to prevent infinite loops
  const isAutoClearingRef = useRef(false);

  useEffect(() => {
    // Load saved presets from localStorage
    const saved = localStorage.getItem('trip-analytics-presets');
    if (saved) {
      setSavedPresets(JSON.parse(saved));
    }
  }, []);

  const applyPreset = (presetValue: string) => {
    const now = new Date();
    let from: Date;
    
    switch (presetValue) {
      case 'today':
        from = now;
        break;
      case 'week':
        from = startOfWeek(now);
        break;
      case 'month':
        from = startOfMonth(now);
        break;
      case '7days':
        from = subDays(now, 7);
        break;
      case '30days':
        from = subDays(now, 30);
        break;
      case '90days':
        from = subDays(now, 90);
        break;
      default:
        from = subDays(now, 30);
    }
    
    setDateRange({ from, to: now });
    setPreset(presetValue);
    // Don't auto-emit - user must click "Apply Filters"
  };

  const emitFilters = (range?: { from: Date; to: Date }) => {
    const currentRange = range || dateRange;
    onFilterChange({
      startDate: currentRange.from,
      endDate: currentRange.to,
      routes: selectedRoutes.length > 0 ? selectedRoutes : undefined,
      drivers: selectedDrivers.length > 0 ? selectedDrivers : undefined,
      buses: selectedBuses.length > 0 ? selectedBuses : undefined,
      times: selectedTimes.length > 0 ? selectedTimes : undefined,
    });
  };

  const handleReset = () => {
    setSelectedRoutes([]);
    setSelectedDrivers([]);
    setSelectedBuses([]);
    setSelectedTimes([]);
    setSearchQuery('');
    applyPreset('30days');
  };

  const handleTimeToggle = (time: string) => {
    const newSelection = selectedTimes.includes(time)
      ? selectedTimes.filter(t => t !== time)
      : [...selectedTimes, time];
    setSelectedTimes(newSelection);
  };

  // Format time for display (e.g., "10:30" -> "10:30 AM")
  const formatTimeDisplay = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleRouteToggle = (route: string) => {
    const newSelection = selectedRoutes.includes(route)
      ? selectedRoutes.filter(r => r !== route)
      : [...selectedRoutes, route];
    setSelectedRoutes(newSelection);
  };

  const handleDriverToggle = (driver: string) => {
    const newSelection = selectedDrivers.includes(driver)
      ? selectedDrivers.filter(d => d !== driver)
      : [...selectedDrivers, driver];
    setSelectedDrivers(newSelection);
  };

  const handleBusToggle = (bus: string) => {
    const newSelection = selectedBuses.includes(bus)
      ? selectedBuses.filter(b => b !== bus)
      : [...selectedBuses, bus];
    setSelectedBuses(newSelection);
  };

  const saveCurrentPreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: FilterPreset = {
      name: presetName,
      filters: {
        dateRange,
        preset,
        selectedRoutes,
        selectedDrivers,
        selectedBuses
      }
    };
    
    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    localStorage.setItem('trip-analytics-presets', JSON.stringify(updatedPresets));
    setPresetName('');
    setShowPresetInput(false);
  };

  const loadPreset = (preset: FilterPreset) => {
    setDateRange(preset.filters.dateRange);
    setPreset(preset.filters.preset);
    setSelectedRoutes(preset.filters.selectedRoutes);
    setSelectedDrivers(preset.filters.selectedDrivers);
    setSelectedBuses(preset.filters.selectedBuses);
    emitFilters(preset.filters.dateRange);
  };

  const deletePreset = (index: number) => {
    const updatedPresets = savedPresets.filter((_, i) => i !== index);
    setSavedPresets(updatedPresets);
    localStorage.setItem('trip-analytics-presets', JSON.stringify(updatedPresets));
  };

  // NOTE: Removed auto-emit on mount - user must explicitly click "Apply Filters"
  // This prevents unwanted 30-day resets when filters are being selected

  const activeFilterCount = selectedRoutes.length + selectedDrivers.length + selectedBuses.length + selectedTimes.length;

  const handleApplyFilters = () => {
    emitFilters();
  };

  // ============================================
  // BIDIRECTIONAL CASCADING FILTER LOGIC
  // ============================================
  // This computes valid options for ALL filters based on current selections
  // Works in ANY direction: Route→Driver→Bus→Time or Time→Bus→Route→Driver etc.
  
  const bidirectionalCascading = useMemo(() => {
    // If no raw trips data, return original lists
    if (!rawTrips || rawTrips.length === 0) {
      return {
        routes: availableRoutes,
        drivers: availableDrivers,
        buses: availableBuses,
        times: availableTimes,
        hasValidCombinations: true,
        tripCount: 0
      };
    }

    // Create formatted date strings once for comparison
    const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
    const toDateStr = format(dateRange.to, 'yyyy-MM-dd');

    // FIRST: Filter by current local date range selection
    let filteredTrips = rawTrips.filter(t => {
      if (!t.trip_date) return true;
      return t.trip_date >= fromDateStr && t.trip_date <= toDateStr;
    });

    // Apply Route filter if selected
    if (selectedRoutes.length > 0) {
      filteredTrips = filteredTrips.filter(t => {
        const routeName = extractRouteName(t);
        return routeName && selectedRoutes.includes(routeName);
      });
    }

    // Apply Driver filter if selected
    if (selectedDrivers.length > 0) {
      filteredTrips = filteredTrips.filter(t => {
        const driverName = extractDriverName(t);
        return driverName !== 'Unknown Driver' && selectedDrivers.includes(driverName);
      });
    }

    // Apply Bus filter if selected
    if (selectedBuses.length > 0) {
      filteredTrips = filteredTrips.filter(t => {
        const busName = extractBusName(t);
        return busName && selectedBuses.includes(busName);
      });
    }

    // Apply Time filter if selected
    if (selectedTimes.length > 0) {
      filteredTrips = filteredTrips.filter(t => {
        const time = extractTime(t);
        return time && selectedTimes.includes(time);
      });
    }

    // Extract VALID options from the filtered trips
    const validRoutes = new Set<string>();
    const validDrivers = new Set<string>();
    const validBuses = new Set<string>();
    const validTimes = new Set<string>();

    // For cascading, we need to show what's available BEFORE applying each filter type
    // This means we compute options based on date range + OTHER filters (not the filter itself)
    
    // Get trips filtered by date + drivers + buses + times (for route options)
    const tripsForRouteOptions = rawTrips.filter(t => {
      if (t.trip_date) {
        if (t.trip_date < fromDateStr || t.trip_date > toDateStr) return false;
      }
      if (selectedDrivers.length > 0) {
        const driverName = extractDriverName(t);
        if (!selectedDrivers.includes(driverName)) return false;
      }
      if (selectedBuses.length > 0) {
        const busName = extractBusName(t);
        if (!selectedBuses.includes(busName)) return false;
      }
      if (selectedTimes.length > 0) {
        const time = extractTime(t);
        if (!time || !selectedTimes.includes(time)) return false;
      }
      return true;
    });
    tripsForRouteOptions.forEach(t => {
      const routeName = extractRouteName(t);
      if (routeName) validRoutes.add(routeName);
    });

    // Get trips filtered by date + routes + buses + times (for driver options)
    const tripsForDriverOptions = rawTrips.filter(t => {
      if (t.trip_date) {
        if (t.trip_date < fromDateStr || t.trip_date > toDateStr) return false;
      }
      if (selectedRoutes.length > 0) {
        const routeName = extractRouteName(t);
        if (!routeName || !selectedRoutes.includes(routeName)) return false;
      }
      if (selectedBuses.length > 0) {
        const busName = extractBusName(t);
        if (!selectedBuses.includes(busName)) return false;
      }
      if (selectedTimes.length > 0) {
        const time = extractTime(t);
        if (!time || !selectedTimes.includes(time)) return false;
      }
      return true;
    });
    tripsForDriverOptions.forEach(t => {
      const driverName = extractDriverName(t);
      if (driverName && driverName !== 'Unknown Driver') validDrivers.add(driverName);
    });

    // Get trips filtered by date + routes + drivers + times (for bus options)
    const tripsForBusOptions = rawTrips.filter(t => {
      if (t.trip_date) {
        if (t.trip_date < fromDateStr || t.trip_date > toDateStr) return false;
      }
      if (selectedRoutes.length > 0) {
        const routeName = extractRouteName(t);
        if (!routeName || !selectedRoutes.includes(routeName)) return false;
      }
      if (selectedDrivers.length > 0) {
        const driverName = extractDriverName(t);
        if (!selectedDrivers.includes(driverName)) return false;
      }
      if (selectedTimes.length > 0) {
        const time = extractTime(t);
        if (!time || !selectedTimes.includes(time)) return false;
      }
      return true;
    });
    tripsForBusOptions.forEach(t => {
      const busName = extractBusName(t);
      if (busName) validBuses.add(busName);
    });

    // Get trips filtered by date + routes + drivers + buses (for time options)
    const tripsForTimeOptions = rawTrips.filter(t => {
      if (t.trip_date) {
        if (t.trip_date < fromDateStr || t.trip_date > toDateStr) return false;
      }
      if (selectedRoutes.length > 0) {
        const routeName = extractRouteName(t);
        if (!routeName || !selectedRoutes.includes(routeName)) return false;
      }
      if (selectedDrivers.length > 0) {
        const driverName = extractDriverName(t);
        if (!selectedDrivers.includes(driverName)) return false;
      }
      if (selectedBuses.length > 0) {
        const busName = extractBusName(t);
        if (!selectedBuses.includes(busName)) return false;
      }
      return true;
    });
    tripsForTimeOptions.forEach(t => {
      const time = extractTime(t);
      if (time) validTimes.add(time);
    });

    // Sort times chronologically
    const sortedTimes = Array.from(validTimes).sort((a, b) => {
      const [aHours, aMinutes] = a.split(':').map(Number);
      const [bHours, bMinutes] = b.split(':').map(Number);
      return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
    });

    return {
      routes: Array.from(validRoutes).sort(),
      drivers: Array.from(validDrivers).sort(),
      buses: Array.from(validBuses).sort(),
      times: sortedTimes,
      hasValidCombinations: filteredTrips.length > 0,
      tripCount: filteredTrips.length
    };
  }, [rawTrips, dateRange, selectedRoutes, selectedDrivers, selectedBuses, selectedTimes, availableRoutes, availableDrivers, availableBuses, availableTimes]);

  // Effective options: use cascading results if rawTrips available, otherwise fallback
  const effectiveRoutes = rawTrips.length > 0 ? bidirectionalCascading.routes : availableRoutes;
  const effectiveDrivers = rawTrips.length > 0 ? bidirectionalCascading.drivers : availableDrivers;
  const effectiveBuses = rawTrips.length > 0 ? bidirectionalCascading.buses : availableBuses;
  const effectiveTimes = rawTrips.length > 0 ? bidirectionalCascading.times : availableTimes;

  // ============================================
  // AUTO-CLEAR INVALID SELECTIONS
  // ============================================
  // When cascading changes available options, remove selections that are no longer valid
  
  useEffect(() => {
    if (isAutoClearingRef.current || rawTrips.length === 0) return;
    
    isAutoClearingRef.current = true;
    
    let hasChanges = false;
    
    // Check and clear invalid route selections
    const validRouteSelections = selectedRoutes.filter(r => effectiveRoutes.includes(r));
    if (validRouteSelections.length !== selectedRoutes.length) {
      setSelectedRoutes(validRouteSelections);
      hasChanges = true;
    }
    
    // Check and clear invalid driver selections
    const validDriverSelections = selectedDrivers.filter(d => effectiveDrivers.includes(d));
    if (validDriverSelections.length !== selectedDrivers.length) {
      setSelectedDrivers(validDriverSelections);
      hasChanges = true;
    }
    
    // Check and clear invalid bus selections
    const validBusSelections = selectedBuses.filter(b => effectiveBuses.includes(b));
    if (validBusSelections.length !== selectedBuses.length) {
      setSelectedBuses(validBusSelections);
      hasChanges = true;
    }
    
    // Check and clear invalid time selections
    const validTimeSelections = selectedTimes.filter(t => effectiveTimes.includes(t));
    if (validTimeSelections.length !== selectedTimes.length) {
      setSelectedTimes(validTimeSelections);
      hasChanges = true;
    }
    
    // Reset flag after a short delay to allow state updates
    setTimeout(() => {
      isAutoClearingRef.current = false;
    }, 100);
    
  }, [effectiveRoutes, effectiveDrivers, effectiveBuses, effectiveTimes, rawTrips.length]);

  // Check for "no valid combinations" state
  const noValidCombinations = rawTrips.length > 0 && 
    activeFilterCount > 0 && 
    !bidirectionalCascading.hasValidCombinations;

  // Filter lists by search query
  const filteredRoutes = effectiveRoutes.filter(r => 
    r.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDrivers = effectiveDrivers.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredBuses = effectiveBuses.filter(b => 
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 p-6 border rounded-lg bg-card shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <Filter className="w-5 h-5 text-primary" />
          </motion.div>
          <h3 className="text-lg font-semibold">Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            </motion.div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleApplyFilters}
            size="sm" 
            className="bg-primary hover:bg-primary/90"
          >
            <Filter className="w-4 h-4 mr-1" />
            Apply Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSelectedRoutes([]);
                setSelectedDrivers([]);
                setSelectedBuses([]);
                setSelectedTimes([]);
              }}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPresetInput(!showPresetInput)}
            className="text-xs"
          >
            <Bookmark className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              !isExpanded && "rotate-180"
            )} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showPresetInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
              onKeyDown={(e) => e.key === 'Enter' && saveCurrentPreset()}
            />
            <Button size="sm" onClick={saveCurrentPreset}>
              <Sparkles className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {savedPresets.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-2"
          >
            {savedPresets.map((p, idx) => (
              <Badge 
                key={idx}
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10 group"
              >
                <span onClick={() => loadPreset(p)}>{p.name}</span>
                <X 
                  className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deletePreset(idx)}
                />
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-4">
          {/* Date Presets */}
          <div className="space-y-2">
            <Label>Date Range Preset</Label>
            <Select value={preset} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          <div className="space-y-2">
            <Label>Custom Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </>
                  ) : (
                    'Pick a date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setPreset('custom');
                      // Don't auto-emit - user must click "Apply Filters"
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>Search Routes, Drivers, Buses</Label>
            <EnhancedSearch
              onSearch={setSearchQuery}
              placeholder="Search..."
              searchKeys={['routes', 'drivers', 'buses']}
            />
          </div>

          {/* Multi-Select Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* No Valid Combinations Alert */}
            {noValidCombinations && (
              <div className="col-span-full">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No valid combinations found for current selection. Try removing some filters.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Routes */}
            {(availableRoutes.length > 0 || effectiveRoutes.length > 0) && (
              <div className="space-y-2">
                <Label>Routes ({selectedRoutes.length}/{effectiveRoutes.length} available)</Label>
                {effectiveRoutes.length === 0 && activeFilterCount > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No routes match current filters
                  </div>
                )}
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-routes"
                        checked={selectedRoutes.length === effectiveRoutes.length && effectiveRoutes.length > 0}
                        disabled={effectiveRoutes.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoutes([...effectiveRoutes]);
                          } else {
                            setSelectedRoutes([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all-routes" className="text-sm font-medium cursor-pointer">
                        Select All
                      </label>
                    </div>
                    {filteredRoutes.map((route) => (
                      <div
                        key={route}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded p-1"
                        onClick={() => handleRouteToggle(route)}
                      >
                        <Checkbox
                          id={`route-${route}`}
                          checked={selectedRoutes.includes(route)}
                          onCheckedChange={() => handleRouteToggle(route)}
                        />
                        <label 
                          htmlFor={`route-${route}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {route}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Drivers */}
            {(availableDrivers.length > 0 || effectiveDrivers.length > 0) && (
              <div className="space-y-2">
                <Label>Drivers ({selectedDrivers.length}/{effectiveDrivers.length} available)</Label>
                {effectiveDrivers.length === 0 && activeFilterCount > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No drivers match current filters
                  </div>
                )}
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-drivers"
                        checked={selectedDrivers.length === effectiveDrivers.length && effectiveDrivers.length > 0}
                        disabled={effectiveDrivers.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDrivers([...effectiveDrivers]);
                          } else {
                            setSelectedDrivers([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all-drivers" className="text-sm font-medium cursor-pointer">
                        Select All
                      </label>
                    </div>
                    {filteredDrivers.map((driver) => (
                      <div
                        key={driver}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded p-1"
                        onClick={() => handleDriverToggle(driver)}
                      >
                        <Checkbox
                          id={`driver-${driver}`}
                          checked={selectedDrivers.includes(driver)}
                          onCheckedChange={() => handleDriverToggle(driver)}
                        />
                        <label 
                          htmlFor={`driver-${driver}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {driver}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Buses */}
            {(availableBuses.length > 0 || effectiveBuses.length > 0) && (
              <div className="space-y-2">
                <Label>Buses ({selectedBuses.length}/{effectiveBuses.length} available)</Label>
                {effectiveBuses.length === 0 && activeFilterCount > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No buses match current filters
                  </div>
                )}
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-buses"
                        checked={selectedBuses.length === effectiveBuses.length && effectiveBuses.length > 0}
                        disabled={effectiveBuses.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBuses([...effectiveBuses]);
                          } else {
                            setSelectedBuses([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all-buses" className="text-sm font-medium cursor-pointer">
                        Select All
                      </label>
                    </div>
                    {filteredBuses.map((bus) => (
                      <div
                        key={bus}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded p-1"
                        onClick={() => handleBusToggle(bus)}
                      >
                        <Checkbox
                          id={`bus-${bus}`}
                          checked={selectedBuses.includes(bus)}
                          onCheckedChange={() => handleBusToggle(bus)}
                        />
                        <label 
                          htmlFor={`bus-${bus}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {bus}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Start Times */}
            {(availableTimes.length > 0 || effectiveTimes.length > 0) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Start Times ({selectedTimes.length}/{effectiveTimes.length} available)
                </Label>
                {effectiveTimes.length === 0 && activeFilterCount > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No times match current filters
                  </div>
                )}
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-times"
                        checked={selectedTimes.length === effectiveTimes.length && effectiveTimes.length > 0}
                        disabled={effectiveTimes.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTimes([...effectiveTimes]);
                          } else {
                            setSelectedTimes([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all-times" className="text-sm font-medium cursor-pointer">
                        Select All
                      </label>
                    </div>
                    {effectiveTimes.map((time) => (
                      <div
                        key={time}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded p-1"
                        onClick={() => handleTimeToggle(time)}
                      >
                        <Checkbox
                          id={`time-${time}`}
                          checked={selectedTimes.includes(time)}
                          onCheckedChange={() => handleTimeToggle(time)}
                        />
                        <label 
                          htmlFor={`time-${time}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {formatTimeDisplay(time)}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 pt-4 border-t"
            >
              {selectedRoutes.map(route => (
                <Badge key={route} variant="secondary" className="group cursor-pointer">
                  Route: {route}
                  <X 
                    className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRouteToggle(route)}
                  />
                </Badge>
              ))}
              {selectedDrivers.map(driver => (
                <Badge key={driver} variant="secondary" className="group cursor-pointer">
                  Driver: {driver}
                  <X 
                    className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDriverToggle(driver)}
                  />
                </Badge>
              ))}
              {selectedBuses.map(bus => (
                <Badge key={bus} variant="secondary" className="group cursor-pointer">
                  Bus: {bus}
                  <X 
                    className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleBusToggle(bus)}
                  />
                </Badge>
              ))}
              {selectedTimes.map(time => (
                <Badge key={time} variant="secondary" className="group cursor-pointer bg-primary/10">
                  Time: {formatTimeDisplay(time)}
                  <X 
                    className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleTimeToggle(time)}
                  />
                </Badge>
              ))}
            </motion.div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Showing data from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'MMM d, yyyy')}
              {activeFilterCount > 0 && ` with ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
