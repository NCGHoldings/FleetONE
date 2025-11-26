import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleMap, useLoadScript, Polyline, Marker } from '@react-google-maps/api';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface TrackPlaybackProps {
  selectedBusId?: string | null;
}

export default function TrackPlayback({ selectedBusId }: TrackPlaybackProps) {
  const [selectedBus, setSelectedBus] = useState<string>(selectedBusId || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo',
  });

  const { data: buses } = useQuery({
    queryKey: ['buses-for-playback'],
    queryFn: async () => {
      const { data } = await supabase
        .from('buses')
        .select('id, bus_no')
        .eq('status', 'active')
        .order('bus_no');
      return data;
    },
  });

  const { data: trackData } = useQuery({
    queryKey: ['gps-history', selectedBus, selectedDate],
    queryFn: async () => {
      if (!selectedBus || !selectedDate) return [];
      
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('gps_location_history')
        .select('*')
        .eq('bus_id', selectedBus)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      return data || [];
    },
    enabled: !!selectedBus && !!selectedDate,
  });

  const mapCenter = trackData && trackData.length > 0
    ? { lat: trackData[0].latitude, lng: trackData[0].longitude }
    : { lat: 6.9271, lng: 79.8612 }; // Colombo default

  const currentPosition = trackData && trackData[currentIndex]
    ? { lat: trackData[currentIndex].latitude, lng: trackData[currentIndex].longitude }
    : null;

  const pathCoordinates = trackData?.slice(0, currentIndex + 1).map(point => ({
    lat: point.latitude,
    lng: point.longitude,
  })) || [];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0]);
  };

  // Playback logic
  if (isPlaying && trackData && currentIndex < trackData.length - 1) {
    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
    }, 1000 / playbackSpeed);
  } else if (isPlaying && currentIndex >= (trackData?.length || 0) - 1) {
    setIsPlaying(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPS Track Playback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-3">
          <Select value={selectedBus} onValueChange={setSelectedBus}>
            <SelectTrigger>
              <SelectValue placeholder="Select bus" />
            </SelectTrigger>
            <SelectContent>
              {buses?.map(bus => (
                <SelectItem key={bus.id} value={bus.id}>{bus.bus_no}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handlePlayPause} size="icon" disabled={!trackData || trackData.length === 0}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button onClick={handleReset} size="icon" variant="outline" disabled={!trackData || trackData.length === 0}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Speed:</span>
              <Slider
                value={[playbackSpeed]}
                onValueChange={handleSpeedChange}
                min={0.5}
                max={5}
                step={0.5}
                className="flex-1"
              />
              <span className="text-sm font-medium">{playbackSpeed}x</span>
            </div>
          </div>
        </div>

        {/* Map */}
        {isLoaded ? (
          <div className="h-[500px] rounded-lg overflow-hidden border border-border">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={currentPosition || mapCenter}
              zoom={14}
              options={{ mapTypeId: 'roadmap' }}
            >
              {pathCoordinates.length > 0 && (
                <Polyline
                  path={pathCoordinates}
                  options={{
                    strokeColor: 'hsl(var(--primary))',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                  }}
                />
              )}
              {currentPosition && (
                <Marker position={currentPosition} icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: 'hsl(var(--primary))',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 2,
                }} />
              )}
            </GoogleMap>
          </div>
        ) : (
          <div className="h-[500px] flex items-center justify-center border border-border rounded-lg">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        )}

        {/* Timeline Info */}
        {trackData && trackData.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Point {currentIndex + 1} of {trackData.length}
            </div>
            {trackData[currentIndex] && (
              <div>
                Time: {new Date(trackData[currentIndex].timestamp).toLocaleTimeString()}
                {' • '}
                Speed: {trackData[currentIndex].speed_kmh?.toFixed(1) || 0} km/h
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
