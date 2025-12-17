import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, Bus, Route, Clock, ChevronDown, ChevronUp, X, RefreshCw } from "lucide-react";
import { AvailableStartTime } from "@/hooks/useCrossComparisonAnalytics";

interface CrossComparisonFilterPanelProps {
  availableBuses: { id: string; name: string; tripCount: number }[];
  availableRoutes: { id: string; name: string; tripCount: number }[];
  availableStartTimes: AvailableStartTime[];
  selectedBuses: string[];
  selectedRoutes: string[];
  selectedStartTimes: string[];
  onBusesChange: (buses: string[]) => void;
  onRoutesChange: (routes: string[]) => void;
  onStartTimesChange: (times: string[]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  matchingTrips: number;
  isLoading?: boolean;
}

export default function CrossComparisonFilterPanel({
  availableBuses,
  availableRoutes,
  availableStartTimes,
  selectedBuses,
  selectedRoutes,
  selectedStartTimes,
  onBusesChange,
  onRoutesChange,
  onStartTimesChange,
  onApplyFilters,
  onClearFilters,
  matchingTrips,
  isLoading = false,
}: CrossComparisonFilterPanelProps) {
  const [busesOpen, setBusesOpen] = useState(true);
  const [routesOpen, setRoutesOpen] = useState(true);
  const [timesOpen, setTimesOpen] = useState(true);

  const handleBusToggle = (busName: string) => {
    if (selectedBuses.includes(busName)) {
      onBusesChange(selectedBuses.filter(b => b !== busName));
    } else {
      onBusesChange([...selectedBuses, busName]);
    }
  };

  const handleRouteToggle = (routeName: string) => {
    if (selectedRoutes.includes(routeName)) {
      onRoutesChange(selectedRoutes.filter(r => r !== routeName));
    } else {
      onRoutesChange([...selectedRoutes, routeName]);
    }
  };

  const handleTimeToggle = (time: string) => {
    if (selectedStartTimes.includes(time)) {
      onStartTimesChange(selectedStartTimes.filter(t => t !== time));
    } else {
      onStartTimesChange([...selectedStartTimes, time]);
    }
  };

  const selectAllBuses = () => onBusesChange(availableBuses.map(b => b.name));
  const selectAllRoutes = () => onRoutesChange(availableRoutes.map(r => r.name));
  const selectAllTimes = () => onStartTimesChange(availableStartTimes.map(t => t.value));

  const totalSelected = selectedBuses.length + selectedRoutes.length + selectedStartTimes.length;

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Cross-Comparison Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {matchingTrips} trips match
            </Badge>
            {totalSelected > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Buses Filter */}
          <Collapsible open={busesOpen} onOpenChange={setBusesOpen}>
            <div className="border rounded-lg p-3 bg-background">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Buses</span>
                  {selectedBuses.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedBuses.length}
                    </Badge>
                  )}
                </div>
                {busesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="flex justify-between mb-2">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllBuses}>
                    Select All
                  </Button>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onBusesChange([])}>
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {availableBuses.map(bus => (
                      <label
                        key={bus.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedBuses.includes(bus.name)}
                          onCheckedChange={() => handleBusToggle(bus.name)}
                        />
                        <span className="flex-1 text-sm">{bus.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {bus.tripCount}
                        </Badge>
                      </label>
                    ))}
                    {availableBuses.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No buses in selected period
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Routes Filter */}
          <Collapsible open={routesOpen} onOpenChange={setRoutesOpen}>
            <div className="border rounded-lg p-3 bg-background">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Routes</span>
                  {selectedRoutes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedRoutes.length}
                    </Badge>
                  )}
                </div>
                {routesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="flex justify-between mb-2">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllRoutes}>
                    Select All
                  </Button>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onRoutesChange([])}>
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {availableRoutes.map(route => (
                      <label
                        key={route.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedRoutes.includes(route.name)}
                          onCheckedChange={() => handleRouteToggle(route.name)}
                        />
                        <span className="flex-1 text-sm truncate" title={route.name}>
                          {route.name}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {route.tripCount}
                        </Badge>
                      </label>
                    ))}
                    {availableRoutes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No routes in selected period
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Start Times Filter - Real times from database */}
          <Collapsible open={timesOpen} onOpenChange={setTimesOpen}>
            <div className="border rounded-lg p-3 bg-background">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Start Times</span>
                  {selectedStartTimes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedStartTimes.length}
                    </Badge>
                  )}
                </div>
                {timesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="flex justify-between mb-2">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllTimes}>
                    Select All
                  </Button>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onStartTimesChange([])}>
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {availableStartTimes.map(time => (
                      <label
                        key={time.value}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedStartTimes.includes(time.value)}
                          onCheckedChange={() => handleTimeToggle(time.value)}
                        />
                        <span className="flex-1 text-sm font-mono">{time.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {time.tripCount}
                        </Badge>
                      </label>
                    ))}
                    {availableStartTimes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No start times available
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Selected Filters Summary */}
        {totalSelected > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {selectedBuses.map(bus => (
              <Badge 
                key={bus} 
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Bus className="h-3 w-3 mr-1" />
                {bus}
                <button className="ml-1 hover:opacity-70" onClick={() => handleBusToggle(bus)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedRoutes.map(route => (
              <Badge 
                key={route} 
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                <Route className="h-3 w-3 mr-1" />
                {route.length > 20 ? route.slice(0, 20) + '...' : route}
                <button className="ml-1 hover:opacity-70" onClick={() => handleRouteToggle(route)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedStartTimes.map(time => {
              const timeInfo = availableStartTimes.find(t => t.value === time);
              return (
                <Badge 
                  key={time} 
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {timeInfo?.label || time}
                  <button className="ml-1 hover:opacity-70" onClick={() => handleTimeToggle(time)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Apply Button */}
        <div className="flex justify-end pt-2">
          <Button 
            onClick={onApplyFilters} 
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-purple-600 text-white"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters ({matchingTrips} trips)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
