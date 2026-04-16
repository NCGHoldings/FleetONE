import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, Bus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusInCategory } from "@/hooks/useBusCategories";

interface CategoryBusListPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  color?: string;
  fetchBuses: () => Promise<BusInCategory[]>;
}

export function CategoryBusListPreview({
  open,
  onOpenChange,
  title,
  subtitle,
  color,
  fetchBuses
}: CategoryBusListPreviewProps) {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<BusInCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchBuses()
        .then(data => setBuses(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, fetchBuses]);

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'manual':
        return <Badge variant="outline" className="text-xs">Manual</Badge>;
      case 'auto_route_rule':
        return <Badge variant="secondary" className="text-xs">Route Rule</Badge>;
      case 'auto_school_routes':
        return <Badge className="text-xs bg-purple-500">School</Badge>;
      case 'auto_daily_trips':
        return <Badge variant="secondary" className="text-xs">Daily Trips</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Default</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: color || '#6B7280' }}
            />
            {title}
          </DialogTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : buses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bus className="h-12 w-12 mb-3 opacity-50" />
            <p>No buses in this category</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {buses.length} bus{buses.length !== 1 ? 'es' : ''} assigned
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/fleet-management');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Fleet Management
              </Button>
            </div>
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-2">
                {buses.map((bus) => (
                  <div 
                    key={bus.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-semibold text-primary">
                        {bus.bus_no}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {bus.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSourceBadge(bus.category_assignment_source)}
                      <Badge 
                        variant={bus.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {bus.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
