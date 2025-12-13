import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearch } from '@/components/ui/enhanced-search';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  RotateCcw, 
  X, 
  ChevronDown,
  Bookmark,
  Sparkles,
  Clock
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
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

interface AdvancedFilterPanelProps {
  onFilterChange: (filters: any) => void;
  availableRoutes?: string[];
  availableDrivers?: string[];
  availableBuses?: string[];
  availableTimes?: string[];
}

interface FilterPreset {
  name: string;
  filters: any;
}

export default function AdvancedFilterPanel({ 
  onFilterChange, 
  availableRoutes = [], 
  availableDrivers = [], 
  availableBuses = [],
  availableTimes = []
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
    emitFilters({ from, to: now });
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

// Fire once on mount
useEffect(() => {
  emitFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Removed auto-emit useEffect - now using manual "Apply Filters" button

  const activeFilterCount = selectedRoutes.length + selectedDrivers.length + selectedBuses.length + selectedTimes.length;

  const handleApplyFilters = () => {
    emitFilters();
  };

  const filteredRoutes = availableRoutes.filter(r => 
    r.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDrivers = availableDrivers.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredBuses = availableBuses.filter(b => 
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
                      emitFilters({ from: range.from, to: range.to });
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
            {/* Routes */}
            {availableRoutes.length > 0 && (
              <div className="space-y-2">
                <Label>Routes ({selectedRoutes.length} selected)</Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-routes"
                        checked={selectedRoutes.length === availableRoutes.length && availableRoutes.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoutes([...availableRoutes]);
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
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleRouteToggle(route)}
                        />
                        <label 
                          htmlFor={`route-${route}`} 
                          className="text-sm cursor-pointer flex-1"
                          onClick={(e) => e.stopPropagation()}
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
            {availableDrivers.length > 0 && (
              <div className="space-y-2">
                <Label>Drivers ({selectedDrivers.length} selected)</Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-drivers"
                        checked={selectedDrivers.length === availableDrivers.length && availableDrivers.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDrivers([...availableDrivers]);
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
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleDriverToggle(driver)}
                        />
                        <label 
                          htmlFor={`driver-${driver}`} 
                          className="text-sm cursor-pointer flex-1"
                          onClick={(e) => e.stopPropagation()}
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
            {availableBuses.length > 0 && (
              <div className="space-y-2">
                <Label>Buses ({selectedBuses.length} selected)</Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-buses"
                        checked={selectedBuses.length === availableBuses.length && availableBuses.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBuses([...availableBuses]);
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
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleBusToggle(bus)}
                        />
                        <label 
                          htmlFor={`bus-${bus}`} 
                          className="text-sm cursor-pointer flex-1"
                          onClick={(e) => e.stopPropagation()}
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
            {availableTimes.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Start Times ({selectedTimes.length} selected)
                </Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all-times"
                        checked={selectedTimes.length === availableTimes.length && availableTimes.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTimes([...availableTimes]);
                          } else {
                            setSelectedTimes([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all-times" className="text-sm font-medium cursor-pointer">
                        Select All
                      </label>
                    </div>
                    {availableTimes.map((time) => (
                      <div
                        key={time}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded p-1"
                        onClick={() => handleTimeToggle(time)}
                      >
                        <Checkbox
                          id={`time-${time}`}
                          checked={selectedTimes.includes(time)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleTimeToggle(time)}
                        />
                        <label 
                          htmlFor={`time-${time}`} 
                          className="text-sm cursor-pointer flex-1"
                          onClick={(e) => e.stopPropagation()}
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
