import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTyreManagement } from "@/hooks/useTyreManagement";
import { TyreVisualDashboard } from "@/components/fleet/TyreVisualDashboard";
import { AddTyreModal } from "@/components/fleet/AddTyreModal";
import { TyreInspectionForm } from "@/components/fleet/TyreInspectionForm";
import { TyreAlertPanel } from "@/components/fleet/TyreAlertPanel";
import { NSPTyreInventory } from "@/components/fleet/NSPTyreInventory";
import { 
  Plus, Search, Filter, TrendingUp, AlertTriangle, 
  RotateCcw, DollarSign, BarChart3, Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function TyreManagement() {
  const { tyres, tyresLoading, stats, syncAllConditions, isSyncing } = useTyreManagement();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Fetch all buses
  const { data: buses } = useQuery({
    queryKey: ["buses-for-tyres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("*")
        .order("bus_no", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Group tyres by bus
  const tyresByBus = tyres?.reduce((acc, tyre) => {
    if (!acc[tyre.bus_id]) {
      acc[tyre.bus_id] = [];
    }
    acc[tyre.bus_id].push(tyre);
    return acc;
  }, {} as Record<string, typeof tyres>);

  // Filter buses based on search and conditions
  const filteredBuses = buses?.filter(bus => {
    const busNumber = bus.bus_no?.toLowerCase() || "";
    const matchesSearch = busNumber.includes(searchQuery.toLowerCase());
    
    const busTyres = tyresByBus?.[bus.id] || [];
    const worstCondition = Math.min(...busTyres.map(t => t.condition_percentage), 100);
    
    let matchesCondition = true;
    if (filterCondition === "critical") matchesCondition = worstCondition < 30;
    else if (filterCondition === "warning") matchesCondition = worstCondition >= 30 && worstCondition < 50;
    else if (filterCondition === "good") matchesCondition = worstCondition >= 50;
    
    return matchesSearch && matchesCondition;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      {/* Hero Header */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-primary p-8 shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Fleet Tyre Management
          </h1>
          <p className="text-primary-foreground/90 text-lg">
            Monitor tyre lifecycle, track conditions, and optimize replacements
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
      </div>

      {/* Alert Panel */}
      {tyres && tyres.length > 0 && (
        <div className="mb-8">
          <TyreAlertPanel tyres={tyres} />
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 border-l-4 border-l-primary bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Tyres</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalTyres}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-500 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Need Replacement</p>
                <p className="text-3xl font-bold text-red-500">{stats.needingReplacement}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-amber-500 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due for Rotation</p>
                <p className="text-3xl font-bold text-amber-500">{stats.dueForRotation}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-emerald-500 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Tyres</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.activeTyres}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-purple-500 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Condition</p>
                <p className="text-3xl font-bold text-purple-500">{stats.averageCondition.toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card className="p-6 mb-6 bg-card/50 backdrop-blur">
        <Tabs defaultValue="fleet" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="fleet">Fleet Tyres</TabsTrigger>
            <TabsTrigger value="inventory">
              <Package className="w-4 h-4 mr-2" />
              NSP Inventory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fleet" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search bus number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filterCondition} onValueChange={setFilterCondition}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="good">Good (≥50%)</SelectItem>
                    <SelectItem value="warning">Warning (30-49%)</SelectItem>
                    <SelectItem value="critical">Critical (&lt;30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => syncAllConditions()} 
                  variant="outline"
                  disabled={isSyncing}
                  className="border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  <TrendingUp className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync All Mileages'}
                </Button>
                <Button onClick={() => navigate('/tyre-analytics')} variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button onClick={() => setShowInspectionForm(true)} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Record Inspection
                </Button>
                <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-primary to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tyre
                </Button>
              </div>
            </div>

            {/* Bus Tyre Grids */}
            {tyresLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading tyre data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredBuses?.map(bus => (
                  <TyreVisualDashboard
                    key={bus.id}
                    bus={bus}
                    tyres={tyresByBus?.[bus.id] || []}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory">
            <NSPTyreInventory buses={buses || []} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modals */}
      {showAddModal && (
        <AddTyreModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          buses={buses || []}
        />
      )}

      {showInspectionForm && (
        <TyreInspectionForm
          open={showInspectionForm}
          onOpenChange={setShowInspectionForm}
          buses={buses || []}
        />
      )}
    </div>
  );
}
