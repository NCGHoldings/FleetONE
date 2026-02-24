import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Route, Clock, Calculator } from "lucide-react";

interface SegmentDetail {
  segment: string;
  from?: string;
  to?: string;
  distance: number;
  duration: string;
}

interface DistanceResult {
  kmParkingToPickup: number;
  kmTrip: number;
  kmDropToParking: number;
  totalDistance: number;
  calculationMethod: string;
  segmentDetails?: SegmentDetail[];
  routeComparison?: {
    segmentTotal: number;
    optimizedTotal: number;
    difference: number;
    percentageDiff: string;
  };
  pickupAddress: string;
  dropAddress: string;
  routeDescription: string;
}

export function DistanceDebugTool() {
  const [pickup, setPickup] = useState("Katunayake, Sri Lanka");
  const [drop, setDrop] = useState("Katunayake, Sri Lanka");
  const [intermediateStops, setIntermediateStops] = useState<string[]>([
    "Seeduwa, Sri Lanka",
    "Ja-Ela, Sri Lanka", 
    "Kandana, Sri Lanka",
    "Ragama, Sri Lanka",
    "Kadawatha, Sri Lanka",
    "Kelaniya Raja Maha Viharaya, Peliyagoda, Sri Lanka",
    "Peliyagoda, Sri Lanka",
    "Orugodawatta, Sri Lanka",
    "Kaduwela Interchange - Exit, Outer Circular Expressway, Kaduwela, Sri Lanka",
    "Laya Leisure Resort & Spa, කලවාන, Sri Lanka"
  ]);
  
  const [calculateSegments, setCalculateSegments] = useState(true);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    segmentResult?: DistanceResult;
    optimizedResult?: DistanceResult;
  }>({});

  const calculateDistance = async (useSegments: boolean) => {
    setLoading(true);
    try {
      const { data: fuelSettings } = await supabase
        .from('fuel_settings')
        .select('*')
        .eq('is_default', true)
        .single();

      if (!fuelSettings) {
        throw new Error("Default fuel settings not found");
      }

      const intermediateStopsFormatted = intermediateStops.map((stop, index) => ({
        id: `stop-${index}`,
        location: stop
      }));

      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: pickup,
          dropLocation: drop,
          intermediateStops: intermediateStopsFormatted,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng,
          calculateSegments: useSegments,
          avoidHighways,
          avoidTolls,
          debugMode: true,
          routePreference: 'distance',
        }
      });

      if (error) {
        throw new Error(`Distance calculation failed: ${error.message}`);
      }

      return distanceData as DistanceResult;
    } catch (error) {
      console.error('Distance calculation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to calculate distance",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    setLoading(true);
    setResults({});

    try {
      // Calculate with segment-by-segment method
      const segmentResult = await calculateDistance(true);
      
      // Calculate with optimized route method
      const optimizedResult = await calculateDistance(false);

      setResults({
        segmentResult: segmentResult || undefined,
        optimizedResult: optimizedResult || undefined
      });

      if (segmentResult && optimizedResult) {
        const difference = Math.abs(segmentResult.totalDistance - optimizedResult.totalDistance);
        const percentDiff = ((difference / segmentResult.totalDistance) * 100).toFixed(2);
        
        toast({
          title: "Comparison Complete",
          description: `Segment: ${segmentResult.totalDistance} km vs Optimized: ${optimizedResult.totalDistance} km (${percentDiff}% difference)`,
        });
      }
    } catch (error) {
      console.error('Comparison error:', error);
    }
  };

  const addIntermediateStop = () => {
    setIntermediateStops([...intermediateStops, ""]);
  };

  const updateIntermediateStop = (index: number, value: string) => {
    const updated = [...intermediateStops];
    updated[index] = value;
    setIntermediateStops(updated);
  };

  const removeIntermediateStop = (index: number) => {
    setIntermediateStops(intermediateStops.filter((_, i) => i !== index));
  };

  const ResultCard = ({ title, result, color }: { title: string; result: DistanceResult; color: string }) => (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="outline" className={color}>{title}</Badge>
          <span className="text-sm font-normal">({result.calculationMethod})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{result.totalDistance} km</div>
              <div className="text-sm text-muted-foreground">Total Distance</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-semibold">{result.kmTrip} km</div>
              <div className="text-sm text-muted-foreground">Trip Distance</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Parking → Pickup:</span> {result.kmParkingToPickup} km
            </div>
            <div>
              <span className="font-medium">Drop → Parking:</span> {result.kmDropToParking} km
            </div>
          </div>

          {result.routeComparison && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">Route Comparison:</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Optimized: {result.routeComparison.optimizedTotal} km</div>
                <div>Segment: {result.routeComparison.segmentTotal} km</div>
                <div>Difference: {result.routeComparison.difference} km ({result.routeComparison.percentageDiff}%)</div>
              </div>
            </div>
          )}

          {result.segmentDetails && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Segment Breakdown:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.segmentDetails.map((segment, idx) => (
                  <div key={idx} className="text-xs flex justify-between p-1 bg-muted rounded">
                    <span className="truncate">{segment.segment}</span>
                    <span className="font-mono">{segment.distance} km</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Distance Calculation Debug Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup">Pickup Location</Label>
              <Input
                id="pickup"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Enter pickup location"
              />
            </div>
            <div>
              <Label htmlFor="drop">Drop Location</Label>
              <Input
                id="drop"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                placeholder="Enter drop location"
              />
            </div>
          </div>

          <div>
            <Label>Intermediate Stops</Label>
            <div className="space-y-2 mt-2">
              {intermediateStops.map((stop, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={stop}
                    onChange={(e) => updateIntermediateStop(index, e.target.value)}
                    placeholder={`Stop ${index + 1}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeIntermediateStop(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addIntermediateStop}>
                Add Stop
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="avoid-highways"
                checked={avoidHighways}
                onCheckedChange={setAvoidHighways}
              />
              <Label htmlFor="avoid-highways">Avoid Highways</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="avoid-tolls"
                checked={avoidTolls}
                onCheckedChange={setAvoidTolls}
              />
              <Label htmlFor="avoid-tolls">Avoid Tolls</Label>
            </div>
          </div>

          <Button
            onClick={runComparison}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Route className="h-4 w-4 mr-2" />
            )}
            Compare Calculation Methods
          </Button>
        </CardContent>
      </Card>

      {(results.segmentResult || results.optimizedResult) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.segmentResult && (
            <ResultCard
              title="Segment-by-Segment"
              result={results.segmentResult}
              color="text-green-700 bg-green-100"
            />
          )}
          {results.optimizedResult && (
            <ResultCard
              title="Optimized Route"
              result={results.optimizedResult}
              color="text-blue-700 bg-blue-100"
            />
          )}
        </div>
      )}

      {results.segmentResult && results.optimizedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparison Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {results.segmentResult.totalDistance} km
                </div>
                <div className="text-sm text-muted-foreground">Segment Method</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {results.optimizedResult.totalDistance} km
                </div>
                <div className="text-sm text-muted-foreground">Optimized Method</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.abs(results.segmentResult.totalDistance - results.optimizedResult.totalDistance).toFixed(1)} km
                </div>
                <div className="text-sm text-muted-foreground">Difference</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <strong>Recommendation:</strong> The segment-by-segment method typically provides more accurate results 
                that match manual Google Maps calculations, as it calculates each route segment individually rather than 
                relying on Google's route optimization.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}