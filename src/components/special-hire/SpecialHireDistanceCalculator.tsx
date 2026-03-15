import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript, DirectionsRenderer } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import {
    MapPin, Navigation, Plus, X, Loader2, Route, Clock, Ruler,
    Copy, Check, Car
} from 'lucide-react';

const libraries: ("places" | "geometry" | "drawing")[] = ['places'];

interface ParkingLocation {
    id: string;
    parking_location_name: string;
    parking_lat: number;
    parking_lng: number;
    is_default: boolean;
}

interface IntermediateStop {
    id: string;
    location: string;
    coords?: [number, number]; // [lng, lat]
}

interface LegInfo {
    legNumber: number;
    startAddress: string;
    endAddress: string;
    distanceText: string;
    distanceMeters: number;
    durationText: string;
    durationSeconds: number;
}

interface RouteResult {
    legs: LegInfo[];
    totalDistanceMeters: number;
    totalDistanceKm: string;
    totalDurationSeconds: number;
    totalDurationText: string;
    warnings: string[];
}

const mapContainerStyle = {
    width: '100%',
    height: '450px',
    borderRadius: '12px',
};

const defaultCenter = { lat: 7.8731, lng: 80.7718 }; // Sri Lanka center

export function SpecialHireDistanceCalculator() {
    const [pickup, setPickup] = useState('');
    const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
    const [drop, setDrop] = useState('');
    const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);
    const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([]);
    const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
    const [selectedParkingId, setSelectedParkingId] = useState('');
    const [avoidHighways, setAvoidHighways] = useState(false);
    const [avoidTolls, setAvoidTolls] = useState(false);
    const [loading, setLoading] = useState(false);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [copied, setCopied] = useState(false);

    // Google Maps state
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { toast } = useToast();

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    // Load parking locations
    useEffect(() => {
        loadParkingLocations();
    }, []);

    const loadParkingLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('fuel_settings')
                .select('*')
                .order('parking_location_name');

            if (error) throw error;
            setParkingLocations(data || []);

            const defaultLoc = data?.find(loc => loc.is_default) || data?.[0];
            if (defaultLoc) {
                setSelectedParkingId(defaultLoc.id);
            }
        } catch (error) {
            console.error('Error loading parking locations:', error);
        }
    };

    const selectedParking = parkingLocations.find(p => p.id === selectedParkingId);

    const addIntermediateStop = () => {
        setIntermediateStops(prev => [
            ...prev,
            { id: crypto.randomUUID(), location: '' }
        ]);
    };

    const removeIntermediateStop = (id: string) => {
        setIntermediateStops(prev => prev.filter(s => s.id !== id));
    };

    const updateIntermediateStop = (id: string, location: string, coords?: [number, number]) => {
        setIntermediateStops(prev => prev.map(s =>
            s.id === id ? { ...s, location, coords } : s
        ));
    };

    // Format seconds into a human-readable duration string
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours} hr ${minutes} min`;
        return `${minutes} min`;
    };

    // ── CLIENT-SIDE Google Maps DirectionsService ──
    const calculateDistance = async () => {
        if (!pickup || !drop) {
            toast({
                title: 'Missing Locations',
                description: 'Please enter both pickup and drop locations',
                variant: 'destructive',
            });
            return;
        }

        if (!selectedParking) {
            toast({
                title: 'No Parking Location',
                description: 'Please select a parking location',
                variant: 'destructive',
            });
            return;
        }

        if (!isLoaded || !window.google) {
            toast({
                title: 'Maps Not Ready',
                description: 'Google Maps is still loading. Please wait a moment.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        setRouteResult(null);
        setDirections(null);

        try {
            const directionsService = new google.maps.DirectionsService();

            // Build the full route: Parking → Pickup → Intermediate Stops → Drop → Parking
            const validStops = intermediateStops.filter(s => s.location.trim());

            const origin = new google.maps.LatLng(selectedParking.parking_lat, selectedParking.parking_lng);
            const destination = new google.maps.LatLng(selectedParking.parking_lat, selectedParking.parking_lng);

            // Waypoints: Pickup → Intermediate Stops → Drop
            const waypoints: google.maps.DirectionsWaypoint[] = [
                { location: pickup, stopover: true },
                ...validStops.map(s => ({ location: s.location, stopover: true })),
                { location: drop, stopover: true },
            ];

            const result = await directionsService.route({
                origin,
                destination,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidHighways,
                avoidTolls,
                optimizeWaypoints: false, // Keep user-specified order
            });

            if (result.status !== google.maps.DirectionsStatus.OK) {
                throw new Error(`Google Maps could not find a route: ${result.status}`);
            }

            // Set directions for the map renderer
            setDirections(result);

            // Fit map to bounds
            if (mapRef.current && result.routes[0]?.bounds) {
                mapRef.current.fitBounds(result.routes[0].bounds);
            }

            // Extract leg details
            const route = result.routes[0];
            let totalDistanceMeters = 0;
            let totalDurationSeconds = 0;

            const legs: LegInfo[] = route.legs.map((leg, index) => {
                const distMeters = leg.distance?.value || 0;
                const durSeconds = leg.duration?.value || 0;
                totalDistanceMeters += distMeters;
                totalDurationSeconds += durSeconds;

                return {
                    legNumber: index + 1,
                    startAddress: leg.start_address || '',
                    endAddress: leg.end_address || '',
                    distanceText: leg.distance?.text || '0 km',
                    distanceMeters: distMeters,
                    durationText: leg.duration?.text || '0 min',
                    durationSeconds: durSeconds,
                };
            });

            const totalKm = (totalDistanceMeters / 1000).toFixed(1);

            const routeData: RouteResult = {
                legs,
                totalDistanceMeters,
                totalDistanceKm: `${totalKm} km`,
                totalDurationSeconds,
                totalDurationText: formatDuration(totalDurationSeconds),
                warnings: route.warnings || [],
            };

            setRouteResult(routeData);

            toast({
                title: 'Distance Calculated',
                description: `Total: ${totalKm} km | Duration: ${formatDuration(totalDurationSeconds)}`,
            });
        } catch (error: any) {
            console.error('Distance calculation error:', error);
            toast({
                title: 'Calculation Error',
                description: error.message || 'Failed to calculate distance',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    // Copy results to clipboard
    const copyResults = () => {
        if (!routeResult) return;

        const text = routeResult.legs.map((leg, i) =>
            `Leg ${i + 1}: ${leg.startAddress} → ${leg.endAddress} | ${leg.distanceText} | ${leg.durationText}`
        ).join('\n') + `\n\nTotal: ${routeResult.totalDistanceKm} | ${routeResult.totalDurationText}`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Copied!', description: 'Distance details copied to clipboard' });
    };

    // Calculate segment summaries from result
    const getSegmentSummary = () => {
        if (!routeResult || !routeResult.legs || routeResult.legs.length === 0) return null;

        const legs = routeResult.legs;
        const parkingToPickup = legs[0]; // Parking → Pickup
        const dropToParking = legs[legs.length - 1]; // Drop → Parking

        // Trip legs = everything in between (Pickup → Stops → Drop)
        const tripLegs = legs.slice(1, legs.length - 1);
        const tripDistanceM = tripLegs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
        const tripDurationS = tripLegs.reduce((sum, leg) => sum + leg.durationSeconds, 0);

        return {
            parkingToPickup: {
                distanceKm: (parkingToPickup.distanceMeters / 1000).toFixed(1),
                duration: parkingToPickup.durationText,
            },
            trip: {
                distanceKm: (tripDistanceM / 1000).toFixed(1),
                duration: formatDuration(tripDurationS),
                legs: tripLegs,
            },
            dropToParking: {
                distanceKm: (dropToParking.distanceMeters / 1000).toFixed(1),
                duration: dropToParking.durationText,
            },
        };
    };

    const segments = routeResult ? getSegmentSummary() : null;

    if (loadError) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-red-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Failed to load Google Maps</p>
                    <p className="text-sm text-muted-foreground mt-1">Please check your API key configuration.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-primary/5">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Route className="h-5 w-5 text-primary" />
                        </div>
                        Distance Calculator
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Calculate route distances with Google Maps — includes parking, pickup, intermediate stops, and drop-off
                    </p>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Panel - Inputs */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Parking Location */}
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <Label className="flex items-center gap-2 text-sm font-semibold">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                Parking Location
                            </Label>
                            <Select value={selectedParkingId} onValueChange={setSelectedParkingId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select parking location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {parkingLocations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.parking_location_name}
                                            {loc.is_default && ' (Default)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Pickup Location */}
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <Label className="flex items-center gap-2 text-sm font-semibold">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                Pickup Location
                            </Label>
                            <LocationAutocomplete
                                value={pickup}
                                onChange={(val, coords) => {
                                    setPickup(val);
                                    if (coords) setPickupCoords(coords);
                                }}
                                placeholder="Enter pickup location..."
                            />
                        </CardContent>
                    </Card>

                    {/* Intermediate Stops */}
                    {intermediateStops.length > 0 && (
                        <Card>
                            <CardContent className="pt-4 space-y-3">
                                <Label className="flex items-center gap-2 text-sm font-semibold">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    Intermediate Stops
                                </Label>
                                <div className="space-y-2">
                                    {intermediateStops.map((stop, index) => (
                                        <div key={stop.id} className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs shrink-0 w-6 h-6 flex items-center justify-center p-0">
                                                {index + 1}
                                            </Badge>
                                            <div className="flex-1">
                                                <LocationAutocomplete
                                                    value={stop.location}
                                                    onChange={(val, coords) => updateIntermediateStop(stop.id, val, coords)}
                                                    placeholder={`Stop ${index + 1}...`}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => removeIntermediateStop(stop.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addIntermediateStop}
                        className="w-full border-dashed"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Intermediate Stop
                    </Button>

                    {/* Drop Location */}
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <Label className="flex items-center gap-2 text-sm font-semibold">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                Drop Location
                            </Label>
                            <LocationAutocomplete
                                value={drop}
                                onChange={(val, coords) => {
                                    setDrop(val);
                                    if (coords) setDropCoords(coords);
                                }}
                                placeholder="Enter drop location..."
                            />
                        </CardContent>
                    </Card>

                    {/* Route Options */}
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <Label className="text-sm font-semibold">Route Options</Label>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="avoid-highways"
                                        checked={avoidHighways}
                                        onCheckedChange={setAvoidHighways}
                                    />
                                    <Label htmlFor="avoid-highways" className="text-sm cursor-pointer">
                                        Avoid Highways
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="avoid-tolls"
                                        checked={avoidTolls}
                                        onCheckedChange={setAvoidTolls}
                                    />
                                    <Label htmlFor="avoid-tolls" className="text-sm cursor-pointer">
                                        Avoid Tolls
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calculate Button */}
                    <Button
                        onClick={calculateDistance}
                        disabled={loading || !pickup || !drop}
                        className="w-full h-12 text-base font-semibold"
                        size="lg"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                            <Navigation className="h-5 w-5 mr-2" />
                        )}
                        {loading ? 'Calculating Route...' : 'Calculate Distance'}
                    </Button>
                </div>

                {/* Right Panel - Map + Results */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Google Map */}
                    <Card className="overflow-hidden">
                        <CardContent className="p-0">
                            {!isLoaded ? (
                                <div className="flex items-center justify-center bg-muted/20" style={{ height: '450px' }}>
                                    <div className="text-center space-y-3">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
                                    </div>
                                </div>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={defaultCenter}
                                    zoom={8}
                                    onLoad={onMapLoad}
                                    options={{
                                        zoomControl: true,
                                        mapTypeControl: true,
                                        streetViewControl: false,
                                        fullscreenControl: true,
                                        styles: [
                                            {
                                                featureType: 'poi',
                                                elementType: 'labels',
                                                stylers: [{ visibility: 'off' }],
                                            },
                                        ],
                                    }}
                                >
                                    {/* Render directions route on the map */}
                                    {directions && (
                                        <DirectionsRenderer
                                            directions={directions}
                                            options={{
                                                polylineOptions: {
                                                    strokeColor: '#6366f1',
                                                    strokeWeight: 5,
                                                    strokeOpacity: 0.8,
                                                },
                                                suppressMarkers: false,
                                            }}
                                        />
                                    )}
                                </GoogleMap>
                            )}
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {routeResult && segments && (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200">
                                    <CardContent className="p-4 text-center">
                                        <Ruler className="h-5 w-5 mx-auto mb-1 text-indigo-600" />
                                        <div className="text-xl font-bold text-indigo-700">{routeResult.totalDistanceKm}</div>
                                        <div className="text-xs text-muted-foreground">Total Distance</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200">
                                    <CardContent className="p-4 text-center">
                                        <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                                        <div className="text-xl font-bold text-amber-700">{routeResult.totalDurationText}</div>
                                        <div className="text-xs text-muted-foreground">Total Duration</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200">
                                    <CardContent className="p-4 text-center">
                                        <Car className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                                        <div className="text-xl font-bold text-emerald-700">{segments.trip.distanceKm} km</div>
                                        <div className="text-xs text-muted-foreground">Trip Distance</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
                                    <CardContent className="p-4 text-center">
                                        <Route className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                                        <div className="text-xl font-bold text-purple-700">{routeResult.legs.length}</div>
                                        <div className="text-xs text-muted-foreground">Route Legs</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Segment Breakdown */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Route className="h-4 w-4" />
                                            Route Breakdown
                                        </CardTitle>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={copyResults}
                                            className="flex items-center gap-1"
                                        >
                                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Parking → Pickup */}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                                            <MapPin className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium">Parking → Pickup</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {selectedParking?.parking_location_name} → {pickup}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-semibold text-sm">{segments.parkingToPickup.distanceKm} km</div>
                                            <div className="text-xs text-muted-foreground">{segments.parkingToPickup.duration}</div>
                                        </div>
                                    </div>

                                    {/* Trip Legs */}
                                    <div className="space-y-2">
                                        {segments.trip.legs.map((leg, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                    <span className="text-white text-xs font-bold">{index + 1}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium">
                                                        {index === 0 ? 'Pickup' : `Stop ${index}`} → {index === segments.trip.legs.length - 1 ? 'Drop' : `Stop ${index + 1}`}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {leg.startAddress} → {leg.endAddress}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="font-semibold text-sm">{leg.distanceText}</div>
                                                    <div className="text-xs text-muted-foreground">{leg.durationText}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Trip Subtotal */}
                                    <div className="flex items-center justify-between p-2 rounded-md bg-green-100 dark:bg-green-900/30 text-sm">
                                        <span className="font-medium text-green-800 dark:text-green-300">Trip Subtotal</span>
                                        <span className="font-bold text-green-800 dark:text-green-300">
                                            {segments.trip.distanceKm} km | {segments.trip.duration}
                                        </span>
                                    </div>

                                    {/* Drop → Parking */}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                            <MapPin className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium">Drop → Parking</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {drop} → {selectedParking?.parking_location_name}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-semibold text-sm">{segments.dropToParking.distanceKm} km</div>
                                            <div className="text-xs text-muted-foreground">{segments.dropToParking.duration}</div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Grand Total */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                                        <span className="font-bold text-base">Grand Total</span>
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-primary">{routeResult.totalDistanceKm}</div>
                                            <div className="text-sm text-muted-foreground">{routeResult.totalDurationText}</div>
                                        </div>
                                    </div>

                                    {/* Route Warnings */}
                                    {routeResult.warnings && routeResult.warnings.length > 0 && (
                                        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                                            {routeResult.warnings.map((warning, i) => (
                                                <div key={i}>⚠️ {warning}</div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Empty State */}
                    {!routeResult && !loading && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                                    <Navigation className="h-10 w-10 text-muted-foreground opacity-50" />
                                </div>
                                <p className="font-medium text-muted-foreground">No Route Calculated</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Enter pickup and drop locations, then click "Calculate Distance" to see the route
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
