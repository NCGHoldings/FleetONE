import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Edit, CheckCircle, Eye, Trash2, Plus, Minus } from "lucide-react";
import { SingleTrip, DailyExpenses } from "@/lib/ocr-processor";

interface ExtractedMultiTripData {
  fileName: string;
  imageUrl: string;
  busNumber: string;
  date: string;
  confidence: number;
  trips: SingleTrip[];
  daily_expenses: DailyExpenses;
}

interface OCRExtractedDataCardProps {
  data: ExtractedMultiTripData;
  onApply: (data: ExtractedMultiTripData) => void;
  onDiscard: () => void;
  onView: () => void;
}

export const OCRExtractedDataCard = ({ data, onApply, onDiscard, onView }: OCRExtractedDataCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);

  const getConfidenceBadge = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) return <Badge variant="default" className="bg-green-500">High: {percent}%</Badge>;
    if (percent >= 60) return <Badge variant="default" className="bg-yellow-500">Medium: {percent}%</Badge>;
    return <Badge variant="destructive">Low: {percent}%</Badge>;
  };

  // Calculate totals
  const totalRevenue = editedData.trips.reduce((sum, trip) => {
    return sum + Object.values(trip.income).reduce((s, v) => s + v, 0);
  }, 0);

  const totalExpenses = Object.values(editedData.daily_expenses).reduce((sum, val) => sum + val, 0);
  const netProfit = totalRevenue - totalExpenses;

  const handleTripIncomeChange = (tripIndex: number, field: keyof SingleTrip['income'], value: number) => {
    setEditedData(prev => ({
      ...prev,
      trips: prev.trips.map((trip, idx) => 
        idx === tripIndex 
          ? { ...trip, income: { ...trip.income, [field]: value } }
          : trip
      )
    }));
  };

  const handleExpenseChange = (field: keyof DailyExpenses, value: number) => {
    setEditedData(prev => ({
      ...prev,
      daily_expenses: { ...prev.daily_expenses, [field]: value }
    }));
  };

  const handleAddTrip = () => {
    const newTripNo = editedData.trips.length + 1;
    setEditedData(prev => ({
      ...prev,
      trips: [...prev.trips, {
        trip_no: newTripNo,
        income: {
          bus_collection: 0,
          call_booking: 0,
          agent_booking: 0,
          luggage_income: 0,
          special_income: 0,
        }
      }]
    }));
  };

  const handleRemoveTrip = (tripIndex: number) => {
    if (editedData.trips.length > 1) {
      setEditedData(prev => ({
        ...prev,
        trips: prev.trips.filter((_, idx) => idx !== tripIndex)
      }));
    }
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const fieldLabels: Record<string, string> = {
    bus_collection: "Bus Collection (බස්රථ)",
    call_booking: "Call Booking (ඇවිලා)",
    agent_booking: "Agent Booking (ඒජන්ට්)",
    luggage_income: "Luggage (ගමන් මල්)",
    special_income: "Special (විශේෂ)",
  };

  const expenseLabels: Record<string, string> = {
    fuel_cost: "Diesel (ඩීසල්)",
    driver_salary: "Driver (රියදුරු)",
    conductor_salary: "Conductor (කොන්දොස්තර)",
    food: "Food (කෑම)",
    parking: "Parking (යාත්රා)",
    body_wash: "Body Wash (විදවණ)",
    police: "Police (පොලීසිය)",
    repair: "Repair (අළුත්වැඩියා)",
    other: "Other",
  };

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <img 
                src={data.imageUrl} 
                alt="Trip sheet preview" 
                className="w-16 h-16 object-cover rounded border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{data.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">🚌 {data.busNumber}</span>
                  <span className="text-sm text-muted-foreground">• {data.date}</span>
                  {getConfidenceBadge(data.confidence)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  📊 {data.trips.length} trip{data.trips.length !== 1 ? 's' : ''} detected • 
                  💰 Rs. {formatAmount(totalRevenue)} revenue • 
                  💸 Rs. {formatAmount(totalExpenses)} expenses
                </p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Image Preview */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Original Sheet</h4>
                <img 
                  src={data.imageUrl} 
                  alt="Full trip sheet" 
                  className="w-full rounded border"
                />
              </div>

              {/* Right: Extracted Data */}
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">📋 Bus {data.busNumber} • {data.date}</p>
                </div>

                {/* Trips Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">📊 TRIPS ({editedData.trips.length})</h4>
                    {isEditing && (
                      <Button onClick={handleAddTrip} size="sm" variant="outline">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Trip
                      </Button>
                    )}
                  </div>

                  {editedData.trips.map((trip, tripIdx) => {
                    const tripRevenue = Object.values(trip.income).reduce((s, v) => s + v, 0);
                    return (
                      <div key={tripIdx} className="p-3 bg-primary/5 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Trip {trip.trip_no}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">Rs. {formatAmount(tripRevenue)}</span>
                            {isEditing && editedData.trips.length > 1 && (
                              <Button 
                                onClick={() => handleRemoveTrip(tripIdx)} 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          {Object.entries(trip.income).map(([key, value]) => (
                            value > 0 || isEditing ? (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  {fieldLabels[key] || key}:
                                </span>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => handleTripIncomeChange(tripIdx, key as keyof SingleTrip['income'], Number(e.target.value))}
                                    className="h-6 w-24 text-xs text-right"
                                  />
                                ) : (
                                  <span className="font-mono">{formatAmount(value)}</span>
                                )}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Daily Expenses Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">💸 DAILY EXPENSES (Applied to all trips)</h4>
                  <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <div className="space-y-1 text-xs">
                      {Object.entries(editedData.daily_expenses).map(([key, value]) => (
                        value > 0 || isEditing ? (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                              {expenseLabels[key] || key}:
                            </span>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={value}
                                onChange={(e) => handleExpenseChange(key as keyof DailyExpenses, Number(e.target.value))}
                                className="h-6 w-24 text-xs text-right"
                              />
                            ) : (
                              <span className="font-mono">{formatAmount(value)}</span>
                            )}
                          </div>
                        ) : null
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-destructive/20">
                      <div className="flex justify-between font-semibold text-sm">
                        <span>Total Expenses:</span>
                        <span className="font-mono">Rs. {formatAmount(totalExpenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Revenue</p>
                      <p className="font-mono font-bold text-lg">Rs. {formatAmount(totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Expenses</p>
                      <p className="font-mono font-bold text-lg">Rs. {formatAmount(totalExpenses)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Net Profit</p>
                    <p className={`font-mono font-bold text-xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Rs. {formatAmount(netProfit)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} size="sm" className="flex-1">
                        Save Changes
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button onClick={() => onApply(editedData)} size="sm" className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Apply All Trips
                      </Button>
                      <Button onClick={onView} variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button onClick={onDiscard} variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
