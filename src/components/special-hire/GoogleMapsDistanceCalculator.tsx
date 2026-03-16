import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Navigation,
  ArrowUpDown,
  RotateCcw,
  Search,
  Plus,
  X,
  Info,
} from 'lucide-react';

export const GoogleMapsDistanceCalculator: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [mapUrl, setMapUrl] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const buildMapUrl = useCallback(() => {
    if (!origin.trim() || !destination.trim()) {
      toast({
        title: 'Missing Locations',
        description: 'Please enter both origin and destination.',
        variant: 'destructive',
      });
      return;
    }

    const encodedOrigin = encodeURIComponent(origin.trim());
    let destParts: string[] = [];
    waypoints.forEach(wp => {
      if (wp.trim()) {
        destParts.push(encodeURIComponent(wp.trim()));
      }
    });
    destParts.push(encodeURIComponent(destination.trim()));
    const encodedDest = destParts.join('+to:');

    const url = `https://maps.google.com/maps?saddr=${encodedOrigin}&daddr=${encodedDest}&output=embed`;
    setMapUrl(url);
    setHasSearched(true);
  }, [origin, destination, waypoints, toast]);

  const handleSwap = useCallback(() => {
    setOrigin(destination);
    setDestination(origin);
    setMapUrl('');
    setHasSearched(false);
  }, [origin, destination]);

  const handleReset = useCallback(() => {
    setOrigin('');
    setDestination('');
    setWaypoints([]);
    setMapUrl('');
    setHasSearched(false);
  }, []);

  const addWaypoint = useCallback(() => {
    setWaypoints(prev => [...prev, '']);
  }, []);

  const updateWaypoint = useCallback((index: number, value: string) => {
    setWaypoints(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
    setMapUrl('');
    setHasSearched(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buildMapUrl();
    }
  };

  const defaultMapUrl = 'https://maps.google.com/maps?q=Sri+Lanka&t=m&z=8&output=embed';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Google Maps Distance Calculator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search locations and get driving distance — right inside the system. No need to open another browser tab.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Origin */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  Origin
                </label>
                <Input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Chilaw"
                  className="text-sm"
                />
              </div>

              {/* Waypoints (stops) */}
              {waypoints.map((wp, index) => (
                <div key={index} className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                    Stop {index + 1}
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      value={wp}
                      onChange={(e) => updateWaypoint(index, e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`e.g. Galle`}
                      className="text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeWaypoint(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Swap */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwap}
                  className="rounded-full h-8 w-8 p-0"
                  title="Swap origin & destination"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  Destination
                </label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Matara"
                  className="text-sm"
                />
              </div>

              {/* Add Stop Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={addWaypoint}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Stop
              </Button>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={buildMapUrl}
                  disabled={!origin.trim() || !destination.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  title="Reset all"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tip */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    Type origin and destination, then click <strong>"Get Directions"</strong>. 
                    Google Maps will show the route with <strong>distance (km)</strong> and <strong>travel time</strong> — just like using Google Maps in a browser.
                  </p>
                  <p>
                    Use <strong>"Add Stop"</strong> for multi-stop trips (e.g. Chilaw → Galle → Matara).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Embedded Google Maps */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative w-full" style={{ minHeight: '550px' }}>
                <iframe
                  src={hasSearched && mapUrl ? mapUrl : defaultMapUrl}
                  width="100%"
                  height="550"
                  style={{ border: 0, borderRadius: '0 0 12px 12px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps Distance Calculator"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
