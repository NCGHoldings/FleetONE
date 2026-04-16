import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { Circle, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface BusMasterTyresTabProps {
  data: BusMasterData;
}

export const BusMasterTyresTab = ({ data }: BusMasterTyresTabProps) => {
  const { tyres, bus } = data;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getConditionColor = (condition: number | null) => {
    if (condition === null) return 'bg-gray-500';
    if (condition >= 70) return 'bg-green-500';
    if (condition >= 40) return 'bg-yellow-500';
    if (condition >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getConditionLabel = (condition: number | null) => {
    if (condition === null) return 'Unknown';
    if (condition >= 70) return 'Good';
    if (condition >= 40) return 'Fair';
    if (condition >= 20) return 'Worn';
    return 'Replace Soon';
  };

  // Group tyres by position (front, rear, spare)
  const groupedTyres = {
    front: tyres.filter(t => t.position.toLowerCase().includes('front')),
    rear: tyres.filter(t => t.position.toLowerCase().includes('rear')),
    spare: tyres.filter(t => t.position.toLowerCase().includes('spare')),
    other: tyres.filter(t => 
      !t.position.toLowerCase().includes('front') && 
      !t.position.toLowerCase().includes('rear') && 
      !t.position.toLowerCase().includes('spare')
    )
  };

  const totalCost = tyres.reduce((sum, t) => sum + (t.purchase_cost || 0), 0);
  const avgCondition = tyres.length > 0 
    ? tyres.reduce((sum, t) => sum + (t.condition_percentage || 0), 0) / tyres.length 
    : 0;

  const needsAttention = tyres.filter(t => (t.condition_percentage || 0) < 40);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Tyres</p>
            <p className="text-2xl font-bold">{tyres.length}</p>
            <p className="text-xs text-muted-foreground">
              Expected: {bus.total_tyres || 6}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Condition</p>
            <p className="text-2xl font-bold">{avgCondition.toFixed(0)}%</p>
            <Progress value={avgCondition} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Needs Attention</p>
            <p className={`text-2xl font-bold ${needsAttention.length > 0 ? 'text-orange-500' : 'text-green-600'}`}>
              {needsAttention.length}
            </p>
            <p className="text-xs text-muted-foreground">tyres below 40%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Investment</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attention Alert */}
      {needsAttention.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  {needsAttention.length} tyre(s) need attention
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  Positions: {needsAttention.map(t => t.position).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tyre Grid */}
      {tyres.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(groupedTyres).map(([group, groupTyres]) => 
            groupTyres.length > 0 && (
              <Card key={group}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{group} Tyres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupTyres.map((tyre) => (
                    <div 
                      key={tyre.id} 
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${getConditionColor(tyre.condition_percentage)}`}>
                            <Circle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tyre.position}</p>
                            <p className="text-xs text-muted-foreground">
                              {tyre.tyre_brand} - {tyre.tyre_size}
                            </p>
                            {tyre.tyre_serial_number && (
                              <p className="text-xs text-muted-foreground">
                                S/N: {tyre.tyre_serial_number}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={`${getConditionColor(tyre.condition_percentage)} text-white`}>
                          {getConditionLabel(tyre.condition_percentage)}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Condition</p>
                          <div className="flex items-center gap-2">
                            <Progress value={tyre.condition_percentage || 0} className="h-2 flex-1" />
                            <span className="font-medium">{tyre.condition_percentage || 0}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tread Depth</p>
                          <p className="font-medium">
                            {tyre.current_tread_depth_mm ? `${tyre.current_tread_depth_mm}mm` : 'N/A'}
                            {tyre.original_tread_depth_mm && (
                              <span className="text-muted-foreground"> / {tyre.original_tread_depth_mm}mm</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Installed</p>
                          <p className="font-medium">
                            {format(new Date(tyre.installation_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Km Traveled</p>
                          <p className="font-medium">
                            {tyre.current_km && tyre.km_at_installation 
                              ? formatNumber(tyre.current_km - tyre.km_at_installation)
                              : 'N/A'
                            } km
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Tyre Records</p>
              <p className="text-sm">Add tyre information to track condition and replacements</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
