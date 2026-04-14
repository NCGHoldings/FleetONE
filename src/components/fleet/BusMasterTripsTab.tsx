import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ExternalLink, Download, Search, Route } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BusMasterTripsTabProps {
  data: BusMasterData;
  busId: string;
}

export const BusMasterTripsTab = ({ data, busId }: BusMasterTripsTabProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { trips, bus } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK').format(num);
  };

  const filteredTrips = trips.recentTrips.filter(trip => 
    trip.trip_date.includes(searchTerm) ||
    trip.trip_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewInDailyTrips = () => {
    navigate(`/daily-trips?bus=${bus.bus_no}`);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Trip No', 'Income', 'Expenses', 'Distance', 'Fuel Cost', 'Net'];
    const rows = trips.recentTrips.map(trip => [
      trip.trip_date,
      trip.trip_no || '',
      trip.income || 0,
      trip.total_expenses || 0,
      trip.distance_km || 0,
      trip.fuel_cost || 0,
      (trip.income || 0) - (trip.total_expenses || 0)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bus_${bus.bus_no}_trips.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Trips</p>
            <p className="text-2xl font-bold">{formatNumber(trips.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(trips.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Distance</p>
            <p className="text-2xl font-bold">{formatNumber(trips.totalDistance)} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg per Trip</p>
            <p className="text-2xl font-bold">{formatCurrency(trips.avgIncomePerTrip)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trip History Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4" />
              Recent Trips (Last 20)
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by date or trip no..."
                  className="pl-8 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="default" size="sm" onClick={handleViewInDailyTrips}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View All in Daily Trips
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTrips.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trip No</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => {
                    const net = (trip.income || 0) - (trip.total_expenses || 0);
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(trip.trip_date), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{trip.trip_no || '-'}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(trip.income || 0)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(trip.total_expenses || 0)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(net)}
                        </TableCell>
                        <TableCell className="text-right">
                          {trip.distance_km ? `${formatNumber(trip.distance_km)} km` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                            {trip.status || 'pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No trips match your search' : 'No trips recorded for this bus'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
