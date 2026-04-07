import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Navigation } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface SavedRoute {
  id: string;
  route_name: string;
  origin: string;
  destination: string;
  stops: string[];
  total_km: number;
  estimated_hours: number;
  parking_location: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRouteSelected: (route: SavedRoute) => void;
}

export function LoadSavedRouteDialog({ open, onOpenChange, onRouteSelected }: Props) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      fetchRoutes();
    }
  }, [open]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("saved_routes")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.warn("Could not fetch saved routes. Has the migration run?", error);
        setRoutes([]);
      } else {
        setRoutes(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter(r => 
    r.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-primary" />
            Load Saved Route
          </DialogTitle>
          <DialogDescription>
            Select a pre-calculated route from the database to auto-fill your quotation locations and distances.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 my-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, origin, or destination..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md p-2 bg-muted/10">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading routes...
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 p-8">
              <Navigation className="h-8 w-8 opacity-20" />
              <p>No saved routes found matching your search.</p>
              <p className="text-sm">Use the Distance Tool to calculate and save new routes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRoutes.map(route => (
                <div 
                  key={route.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => {
                    onRouteSelected(route);
                    onOpenChange(false);
                  }}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-primary">{route.route_name}</p>
                    <div className="text-sm">
                      <span className="font-medium">{route.origin}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="font-medium">{route.destination}</span>
                    </div>
                    {route.stops && route.stops.length > 0 && (
                      <p className="text-xs text-muted-foreground">Via: {route.stops.join(', ')}</p>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center gap-4 text-sm whitespace-nowrap">
                    <div className="text-right">
                      <p><b className="font-medium">{route.total_km}</b> KM</p>
                      <p className="text-xs text-muted-foreground">{route.estimated_hours} Hours</p>
                    </div>
                    <Button variant="secondary" size="sm">Select</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
