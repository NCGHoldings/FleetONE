import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, TrendingUp, History, Settings, AlertCircle } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TyreDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tyreId: string;
  busNumber: string;
}

export const TyreDetailsModal = ({ open, onOpenChange, tyreId, busNumber }: TyreDetailsModalProps) => {
  const { data: tyre } = useQuery({
    queryKey: ["tyre-details", tyreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_tyres")
        .select("*")
        .eq("id", tyreId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: inspections } = useQuery({
    queryKey: ["tyre-inspections", tyreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tyre_inspection_records")
        .select(`
          *,
          profiles:inspector_id (first_name, last_name)
        `)
        .eq("tyre_id", tyreId)
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  if (!tyre) return null;

  const kmDriven = tyre.current_km - tyre.km_at_installation;
  const kmRemaining = Math.max(0, tyre.expected_lifespan_km - kmDriven);
  const daysInstalled = Math.floor(
    (new Date().getTime() - new Date(tyre.installation_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Prepare chart data
  const chartData = inspections?.map(inspection => ({
    date: formatDateDisplay(inspection.inspection_date),
    treadDepth: inspection.tread_depth_mm || 0,
    pressure: inspection.pressure_psi || 0,
  })).reverse() || [];

  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "text-emerald-500";
    if (percentage >= 50) return "text-teal-500";
    if (percentage >= 30) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {busNumber} - {tyre.position}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {tyre.tyre_brand} • {tyre.tyre_size} • {tyre.tyre_type || "N/A"}
          </p>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Condition Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Current Condition</h3>
                <Badge className={`text-lg px-4 py-1 ${tyre.condition_percentage >= 70 ? 'bg-emerald-500' : tyre.condition_percentage >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}>
                  {Math.round(tyre.condition_percentage)}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tread Depth</p>
                  <p className={`text-2xl font-bold ${getConditionColor(tyre.condition_percentage)}`}>
                    {tyre.current_tread_depth_mm || "N/A"}mm
                  </p>
                  <p className="text-xs text-muted-foreground">of {tyre.original_tread_depth_mm}mm</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">KM Driven</p>
                  <p className="text-2xl font-bold">{kmDriven.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{kmRemaining.toLocaleString()}km left</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="text-2xl font-bold">{daysInstalled}</p>
                  <p className="text-xs text-muted-foreground">days installed</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="mt-1">{tyre.status}</Badge>
                </div>
              </div>
            </Card>

            {/* Performance Chart */}
            {chartData.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Tread Depth Over Time
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="treadDepth" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Installation Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installed:</span>
                    <span className="font-medium">{formatDateDisplay(tyre.installation_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Date:</span>
                    <span className="font-medium">{tyre.purchase_date ? formatDateDisplay(tyre.purchase_date) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">LKR {tyre.purchase_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KM at Install:</span>
                    <span className="font-medium">{tyre.km_at_installation.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Specifications
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial Number:</span>
                    <span className="font-medium">{tyre.tyre_serial_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Life:</span>
                    <span className="font-medium">{tyre.expected_lifespan_km.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Rotation:</span>
                    <span className="font-medium">{tyre.last_rotation_date ? formatDateDisplay(tyre.last_rotation_date) : "Never"}</span>
                  </div>
                </div>
              </Card>
            </div>

            {tyre.notes && (
              <Card className="p-4 bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground">{tyre.notes}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Inspection History
              </h3>
              {inspections && inspections.length > 0 ? (
                <div className="space-y-3">
                  {inspections.map((inspection) => (
                    <div key={inspection.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">{formatDateDisplay(inspection.inspection_date)}</p>
                        <Badge>{inspection.condition_status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Tread: {inspection.tread_depth_mm}mm • Pressure: {inspection.pressure_psi} PSI</p>
                        {inspection.wear_pattern && <p>Wear: {inspection.wear_pattern}</p>}
                        {inspection.recommendation && <p>Recommendation: {inspection.recommendation}</p>}
                        {inspection.damage_notes && <p className="text-red-500">⚠️ {inspection.damage_notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No inspection records yet</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="w-full">Record Inspection</Button>
              <Button variant="outline" className="w-full">Mark for Rotation</Button>
              <Button variant="outline" className="w-full">Mark for Replacement</Button>
              <Button variant="destructive" className="w-full">Remove from Service</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
