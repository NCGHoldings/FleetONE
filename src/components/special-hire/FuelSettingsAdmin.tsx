import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { MapPin, Save, Settings, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface FuelSetting {
  id: string;
  diesel_price_lkr_per_l: number;
  maintenance_rate_lkr_per_km: number;
  parking_location_name: string;
  parking_lat: number;
  parking_lng: number;
  is_default: boolean;
}

interface NewLocationData {
  parking_location_name: string;
  parking_lat: number;
  parking_lng: number;
}

export function FuelSettingsAdmin() {
  const [settings, setSettings] = useState<FuelSetting[]>([]);
  const [defaultSettings, setDefaultSettings] = useState<FuelSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState<NewLocationData>({
    parking_location_name: '',
    parking_lat: 6.9271,
    parking_lng: 79.8612
  });
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_settings')
        .select('*')
        .order('parking_location_name');

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSettings(data);
        const defaultSetting = data.find(s => s.is_default);
        setDefaultSettings(defaultSetting || data[0]);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          diesel_price_lkr_per_l: 350.0,
          maintenance_rate_lkr_per_km: 20.0,
          parking_location_name: 'Main Depot',
          parking_lat: 6.9271,
          parking_lng: 79.8612,
          is_default: true
        };
        
        const { data: newSettings, error: insertError } = await supabase
          .from('fuel_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings([newSettings]);
        setDefaultSettings(newSettings);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load fuel settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveFuelPrice = async () => {
    if (!defaultSettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('fuel_settings')
        .update({
          diesel_price_lkr_per_l: defaultSettings.diesel_price_lkr_per_l,
          maintenance_rate_lkr_per_km: defaultSettings.maintenance_rate_lkr_per_km
        })
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      
      await loadSettings();
      
      toast({
        title: "Success",
        description: "Fuel price updated for all parking locations"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.parking_location_name.trim()) {
      toast({
        title: "Error",
        description: "Location name is required",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('fuel_settings')
        .insert([{
          ...newLocation,
          diesel_price_lkr_per_l: defaultSettings?.diesel_price_lkr_per_l || 350.0,
          maintenance_rate_lkr_per_km: defaultSettings?.maintenance_rate_lkr_per_km || 20.0,
          is_default: false
        }])
        .select()
        .single();

      if (error) throw error;
      
      setSettings([...settings, data]);
      setNewLocation({
        parking_location_name: '',
        parking_lat: 6.9271,
        parking_lng: 79.8612
      });
      setShowAddForm(false);
      
      toast({
        title: "Success",
        description: "Parking location added successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (locationId: string) => {
    setSaving(true);
    try {
      // Remove default from all locations
      await supabase
        .from('fuel_settings')
        .update({ is_default: false })
        .neq('id', 'none');

      // Set new default
      const { error } = await supabase
        .from('fuel_settings')
        .update({ is_default: true })
        .eq('id', locationId);

      if (error) throw error;
      
      await loadSettings();
      
      toast({
        title: "Success",
        description: "Default parking location updated"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (settings.length <= 1) {
      toast({
        title: "Error",
        description: "Cannot delete the last parking location",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('fuel_settings')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      
      await loadSettings();
      
      toast({
        title: "Success",
        description: "Parking location deleted successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDefaultSetting = (key: keyof FuelSetting, value: any) => {
    if (!defaultSettings) return;
    setDefaultSettings({ ...defaultSettings, [key]: value });
  };

  const updateNewLocation = (key: keyof NewLocationData, value: any) => {
    setNewLocation({ ...newLocation, [key]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!defaultSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No fuel settings found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fuel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Diesel Price */}
          <div className="space-y-2">
            <Label htmlFor="diesel-price">Current Diesel Price (LKR per Liter)</Label>
            <Input
              id="diesel-price"
              type="number"
              step="0.01"
              min="0"
              value={defaultSettings.diesel_price_lkr_per_l}
              onChange={(e) => updateDefaultSetting('diesel_price_lkr_per_l', parseFloat(e.target.value) || 0)}
              className="w-full max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              This price is used for calculating fuel costs in quotations
            </p>
          </div>

          <Separator />

          {/* Maintenance Rate */}
          <div className="space-y-2">
            <Label htmlFor="maintenance-rate">Maintenance Rate (LKR per Kilometer)</Label>
            <Input
              id="maintenance-rate"
              type="number"
              step="0.01"
              min="0"
              value={defaultSettings.maintenance_rate_lkr_per_km}
              onChange={(e) => updateDefaultSetting('maintenance_rate_lkr_per_km', parseFloat(e.target.value) || 0)}
              className="w-full max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Applied to total trip distance (Parking → Pickup → Drop → Parking)
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveFuelPrice} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Update Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parking Locations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Parking Locations
            </CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Location Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <h4 className="font-medium">Add New Parking Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-location-name">Location Name</Label>
                  <Input
                    id="new-location-name"
                    value={newLocation.parking_location_name}
                    onChange={(e) => updateNewLocation('parking_location_name', e.target.value)}
                    placeholder="e.g., Secondary Depot"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-latitude">Latitude</Label>
                  <Input
                    id="new-latitude"
                    type="number"
                    step="0.000001"
                    value={newLocation.parking_lat}
                    onChange={(e) => updateNewLocation('parking_lat', parseFloat(e.target.value) || 0)}
                    placeholder="6.9271"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-longitude">Longitude</Label>
                  <Input
                    id="new-longitude"
                    type="number"
                    step="0.000001"
                    value={newLocation.parking_lng}
                    onChange={(e) => updateNewLocation('parking_lng', parseFloat(e.target.value) || 0)}
                    placeholder="79.8612"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLocation} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Location'}
                </Button>
              </div>
            </div>
          )}

          {/* Existing Locations List */}
          <div className="space-y-3">
            {settings.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{location.parking_location_name}</h4>
                    {location.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lat: {location.parking_lat}, Lng: {location.parking_lng}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!location.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(location.id)}
                      disabled={saving}
                    >
                      Set as Default
                    </Button>
                  )}
                  {settings.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      disabled={saving}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Distance Calculation</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Parking → Pickup (fuel cost only)</li>
                <li>• Pickup → Drop (hire rate applied)</li>
                <li>• Drop → Parking (fuel cost only)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Cost Components</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Fuel cost = Distance ÷ Bus efficiency × Diesel price</li>
                <li>• Maintenance cost = Total distance × Maintenance rate</li>
                <li>• Hire charge = Trip distance × Rate per km</li>
                <li>• Total multiplied by number of buses</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}