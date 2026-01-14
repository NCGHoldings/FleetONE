import { useState } from "react";
import { ChevronDown, ChevronRight, Users, Bus, MapPin, Clock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CrewGroup } from "@/hooks/useCrewGroupedTrips";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface CrewConsolidatedViewProps {
  crewGroups: CrewGroup[];
  onRefresh: () => void;
}

export function CrewConsolidatedView({ crewGroups, onRefresh }: CrewConsolidatedViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleExpanded = (signature: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(signature)) {
      newExpanded.delete(signature);
    } else {
      newExpanded.add(signature);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(crewGroups.map(g => g.crew_signature)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePrint = (group: CrewGroup) => {
    // Create print-friendly content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Crew Trip Sheet - ${group.bus_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .crew-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .crew-info div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          .totals { font-weight: bold; background-color: #e0e0e0; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; }
          .signature { border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 5px; }
          @media print { body { print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Trip Sheet</h1>
          <h2>Bus: ${group.bus_no}</h2>
          <p>Date: ${format(new Date(group.trip_date), 'PPP')}</p>
        </div>
        
        <div class="crew-info">
          <div><strong>Driver:</strong> ${group.driver_name}</div>
          <div><strong>Conductor:</strong> ${group.conductor_name}</div>
          <div><strong>Total Trips:</strong> ${group.trip_count}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Trip No</th>
              <th>Route</th>
              <th>Time</th>
              <th>Distance (km)</th>
              <th>Revenue (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${group.trips.map((trip, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${trip.trip_no}</td>
                <td>${trip.route_name}</td>
                <td>${trip.start_time || '-'} - ${trip.end_time || '-'}</td>
                <td>${trip.distance_km?.toFixed(1) || '-'}</td>
                <td>${trip.income.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="totals">
              <td colspan="4">TOTAL</td>
              <td>${group.total_distance.toFixed(1)}</td>
              <td>${group.total_income.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div class="signature">Driver Signature</div>
          <div class="signature">Conductor Signature</div>
          <div class="signature">Verified By</div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (crewGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Crew Groups Found</h3>
        <p className="text-muted-foreground">
          No trips with driver/conductor information found for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {crewGroups.length} crew group{crewGroups.length !== 1 ? 's' : ''} found
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Crew Group Cards */}
      {crewGroups.map((group) => {
        const isExpanded = expandedGroups.has(group.crew_signature);
        const hasUnknownCrew = group.driver_name === 'Unknown' || group.conductor_name === 'Unknown';

        return (
          <Collapsible
            key={group.crew_signature}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(group.crew_signature)}
          >
            <Card className={cn(
              "transition-all",
              isExpanded && "ring-2 ring-primary/20"
            )}>
              {/* Summary Header */}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex items-start gap-3 text-left">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 mt-1 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mt-1 text-muted-foreground" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4 text-primary" />
                          <CardTitle className="text-lg">{group.bus_no}</CardTitle>
                          <Badge variant="secondary">{group.trip_count} Trip{group.trip_count !== 1 ? 's' : ''}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.driver_name} / {group.conductor_name}
                          </span>
                          {group.first_start && group.last_end && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {group.first_start} - {group.last_end}
                            </span>
                          )}
                        </div>
                        {group.route_names.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {group.route_names.join(', ')}
                          </div>
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(group.total_income)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.total_distance.toFixed(1)} km
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(group);
                      }}
                      title="Print Crew Sheet"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {hasUnknownCrew && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 w-fit mt-2">
                    ⚠️ Missing crew info
                  </Badge>
                )}
              </CardHeader>

              {/* Expanded Trip Details */}
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  {/* Trip Table */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Trip No</th>
                          <th className="text-left p-3 font-medium">Route</th>
                          <th className="text-left p-3 font-medium">Time</th>
                          <th className="text-right p-3 font-medium">Distance</th>
                          <th className="text-right p-3 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.trips.map((trip, idx) => (
                          <tr key={trip.id} className="border-t hover:bg-muted/50">
                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="font-mono">
                                {trip.trip_no}
                              </Badge>
                            </td>
                            <td className="p-3">{trip.route_name}</td>
                            <td className="p-3 text-muted-foreground">
                              {trip.start_time && trip.end_time
                                ? `${trip.start_time} - ${trip.end_time}`
                                : trip.start_time || '-'}
                            </td>
                            <td className="p-3 text-right">
                              {trip.distance_km?.toFixed(1) || '-'} km
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatCurrency(trip.income)}
                              {trip.income === 0 && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Pending
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/50 font-semibold">
                        <tr className="border-t">
                          <td colSpan={4} className="p-3">TOTAL</td>
                          <td className="p-3 text-right">{group.total_distance.toFixed(1)} km</td>
                          <td className="p-3 text-right text-primary">{formatCurrency(group.total_income)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Date Display */}
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Date: {format(new Date(group.trip_date), 'PPPP')}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
