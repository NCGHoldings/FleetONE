import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpDown, Plus, Trash2, Navigation } from 'lucide-react';

export function DistanceDebugTool() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [mapUrl, setMapUrl] = useState('');

  // Stop Handlers
  const addStop = () => setStops(prev => [...prev, '']);
  const removeStop = (index: number) => setStops(prev => prev.filter((_, i) => i !== index));
  const updateStop = (index: number, value: string) => {
    setStops(prev => {
      const newStops = [...prev];
      newStops[index] = value;
      return newStops;
    });
  };

  const swapOriginDestination = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const getDirections = () => {
    if (!origin || !destination) return;
    
    // Base params
    let url = `https://www.google.com/maps?saddr=${encodeURIComponent(origin)}`;
    
    // Add waypoints and destination
    const validStops = stops.filter(s => s.trim() !== '');
    if (validStops.length > 0) {
      // For multiple points, the daddr param chains points with "+to:"
      const waypointsStr = validStops.map(s => encodeURIComponent(s)).join('+to:');
      url += `&daddr=${waypointsStr}+to:${encodeURIComponent(destination)}`;
    } else {
      url += `&daddr=${encodeURIComponent(destination)}`;
    }
    
    // Make sure we output the embed version
    url += '&output=embed';
    
    setMapUrl(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Origin</Label>
              <div className="flex gap-2">
                <Input placeholder="Enter starting point" value={origin} onChange={(e) => setOrigin(e.target.value)} />
              </div>
            </div>
            
            <Button variant="outline" size="icon" className="mt-6 shrink-0" onClick={swapOriginDestination}>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            <div className="flex-1 space-y-2">
              <Label>Destination</Label>
              <div className="flex gap-2">
                <Input placeholder="Enter destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Dynamic Stops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stops (Optional)</Label>
              <Button variant="ghost" size="sm" onClick={addStop}>
                <Plus className="h-3 w-3 mr-1" /> Add Stop
              </Button>
            </div>
            {stops.map((stop, index) => (
              <div key={index} className="flex gap-2">
                <Input 
                  placeholder={`Stop ${index + 1}`} 
                  value={stop} 
                  onChange={(e) => updateStop(index, e.target.value)} 
                />
                <Button variant="ghost" size="icon" onClick={() => removeStop(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={getDirections} disabled={!origin || !destination}>
            <Navigation className="mr-2 h-4 w-4" /> Get Directions
          </Button>
        </CardContent>
      </Card>

      {mapUrl && (
        <Card>
          <CardContent className="p-0 overflow-hidden h-[600px] flex rounded-lg">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}