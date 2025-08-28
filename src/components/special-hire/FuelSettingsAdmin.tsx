import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { MapPin, Save, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FuelSetting {
  id: string;
  diesel_price_lkr_per_l: number;
  parking_location_name: string;
  parking_lat: number;
  parking_lng: number;
  is_default: boolean;
}

export function FuelSettingsAdmin() {
  const [settings, setSettings] = useState<FuelSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_settings')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          diesel_price_lkr_per_l: 350.0,
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
        setSettings(newSettings);
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

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('fuel_settings')
        .update({
          diesel_price_lkr_per_l: settings.diesel_price_lkr_per_l,
          parking_location_name: settings.parking_location_name,
          parking_lat: settings.parking_lat,
          parking_lng: settings.parking_lng
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Fuel settings updated successfully"
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

  const updateSetting = (key: keyof FuelSetting, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
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

  if (!settings) {
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
              value={settings.diesel_price_lkr_per_l}
              onChange={(e) => updateSetting('diesel_price_lkr_per_l', parseFloat(e.target.value) || 0)}
              className="w-full max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              This price is used for calculating fuel costs in quotations
            </p>
          </div>

          <Separator />

          {/* Parking Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <h3 className="text-lg font-medium">Default Parking Location</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  value={settings.parking_location_name}
                  onChange={(e) => updateSetting('parking_location_name', e.target.value)}
                  placeholder="e.g., Main Depot"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={settings.parking_lat}
                  onChange={(e) => updateSetting('parking_lat', parseFloat(e.target.value) || 0)}
                  placeholder="6.9271"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={settings.parking_lng}
                  onChange={(e) => updateSetting('parking_lng', parseFloat(e.target.value) || 0)}
                  placeholder="79.8612"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This location is used as the starting and ending point for calculating parking-to-pickup and drop-to-parking distances
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
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