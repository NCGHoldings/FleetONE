import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Edit, CheckCircle, Eye, Trash2, Plus, Minus, AlertCircle } from "lucide-react";
import { SingleTrip, DailyExpenses } from "@/lib/ocr-processor";
import { DB_EXPENSE_CATEGORIES, mapOCRExpensesToDB, DBExpenseFields, KNOWN_OCR_EXPENSE_KEYS } from "@/lib/ocr-expense-mapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExtractedMultiTripData {
  fileName: string;
  imageUrl: string;
  busNumber: string;
  date: string;
  confidence: number;
  trips: SingleTrip[];
  daily_expenses: DailyExpenses;
  mapped_expenses?: DBExpenseFields;
}

interface OCRExtractedDataCardProps {
  data: ExtractedMultiTripData;
  onApply: (data: ExtractedMultiTripData & { mapped_expenses: DBExpenseFields }) => void;
  onDiscard: () => void;
  onView: () => void;
  savedExpensesTotal?: number;
}

export const OCRExtractedDataCard = ({ data, onApply, onDiscard, onView, savedExpensesTotal }: OCRExtractedDataCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);
  const [hasEdits, setHasEdits] = useState(false);
  
  // Initialize mapped expenses from OCR data
  const initialMappedExpenses = data.mapped_expenses || mapOCRExpensesToDB(data.daily_expenses);
  const [mappedExpenses, setMappedExpenses] = useState<DBExpenseFields>(() => initialMappedExpenses);
  const [originalMappedExpenses] = useState<DBExpenseFields>(initialMappedExpenses);
  
  // Track unmapped OCR items
  const [unmappedItems, setUnmappedItems] = useState<Record<string, number>>(() => {
    const unmapped: Record<string, number> = {};
    Object.entries(data.daily_expenses).forEach(([key, value]) => {
      if (!KNOWN_OCR_EXPENSE_KEYS.includes(key) && value > 0) {
        unmapped[key] = value;
      }
    });
    return unmapped;
  });

  const getConfidenceBadge = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">High: {percent}%</Badge>;
    if (percent >= 60) return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">Medium: {percent}%</Badge>;
    return <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Low: {percent}%</Badge>;
  };

  const getBorderColor = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) return "border-green-500/30";
    if (percent >= 60) return "border-yellow-500/30";
    return "border-red-500/30";
  };

  // Calculate totals using mapped expenses
  const totalRevenue = editedData.trips.reduce((sum, trip) => {
    return sum + Object.values(trip.income).reduce((s, v) => s + v, 0);
  }, 0);

  const totalExpenses = Object.values(mappedExpenses).reduce((sum, val) => sum + val, 0);
  const netProfit = totalRevenue - totalExpenses;

  const handleMappedExpenseChange = (field: keyof DBExpenseFields, value: number) => {
    setHasEdits(true);
    setMappedExpenses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTripIncomeChange = (tripIndex: number, field: keyof SingleTrip['income'], value: number) => {
    setHasEdits(true);
    setEditedData(prev => ({
      ...prev,
      trips: prev.trips.map((trip, idx) =>
        idx === tripIndex
          ? { ...trip, income: { ...trip.income, [field]: value } }
          : trip
      )
    }));
  };

  const handleAllocateUnmapped = (unmappedKey: string, targetCategory: keyof DBExpenseFields) => {
    const amount = unmappedItems[unmappedKey];
    if (amount) {
      // Add to mapped category
      setMappedExpenses(prev => ({
        ...prev,
        [targetCategory]: prev[targetCategory] + amount
      }));
      
      // Remove from unmapped
      setUnmappedItems(prev => {
        const newUnmapped = { ...prev };
        delete newUnmapped[unmappedKey];
        return newUnmapped;
      });
    }
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

  const handleConfirmEdits = () => {
    console.log('✏️ EDITS CONFIRMED - Ready to Apply');
    console.log('  Original mapped expenses:', originalMappedExpenses);
    console.log('  Edited mapped expenses:', mappedExpenses);
    setIsEditing(false);
  };

  const handleResetToOCR = () => {
    console.log('↶ RESET TO OCR VALUES');
    setEditedData(data);
    setMappedExpenses(data.mapped_expenses || mapOCRExpensesToDB(data.daily_expenses));
    setHasEdits(false);
    setIsEditing(false);
  };

  const handleApplyAll = () => {
    console.log('🎯 APPLYING DATA TO DATABASE:');
    console.log('  Bus:', editedData.busNumber, '| Date:', editedData.date);
    console.log('  Original OCR expenses:', data.daily_expenses);
    console.log('  Edited mapped expenses:', mappedExpenses);
    console.log('  Edited trips:', editedData.trips);
    console.log('  Has user edits:', hasEdits);
    
    onApply({ ...editedData, mapped_expenses: mappedExpenses });
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

  return (
    <Card className={`mb-4 border-2 ${getBorderColor(data.confidence)}`}>
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
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>📊 {data.trips.length} trip{data.trips.length !== 1 ? 's' : ''}</span>
                  <span>💰 Revenue: Rs. {formatAmount(totalRevenue)}</span>
                  <span>💸 Expenses: Rs. {formatAmount(totalExpenses)}</span>
                  <span className={netProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    📈 Net: Rs. {formatAmount(netProfit)}
                  </span>
                  {savedExpensesTotal !== undefined && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-500">
                      ✓ Saved • Rs. {formatAmount(savedExpensesTotal)}
                    </Badge>
                  )}
                </div>
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

                {/* Trips Section with Visual Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">📊 TRIP REVENUE (Individual)</h4>
                    {isEditing && (
                      <Button onClick={handleAddTrip} size="sm" variant="outline">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Trip
                      </Button>
                    )}
                  </div>
                  
                  {/* Quick summary of all trips */}
                  {!isEditing && editedData.trips.length > 1 && (
                    <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                      {editedData.trips.map((trip, idx) => {
                        const tripRev = Object.values(trip.income).reduce((s, v) => s + v, 0);
                        return (
                          <span key={idx} className="bg-primary/5 px-2 py-1 rounded">
                            T{trip.trip_no}: Rs. {formatAmount(tripRev)}
                          </span>
                        );
                      })}
                    </div>
                  )}

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

                {/* Daily Expenses Section with Mapped Categories */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">💸 DAILY EXPENSES (21 Categories)</h4>
                  
                  {/* Unmapped OCR Items */}
                  {Object.keys(unmappedItems).length > 0 && (
                    <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="space-y-2">
                        <p className="text-xs font-semibold">⚠️ Unmapped OCR Items - Please Allocate:</p>
                        <div className="space-y-2">
                          {Object.entries(unmappedItems).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-semibold min-w-[80px]">
                                Rs. {formatAmount(value)}
                              </span>
                              <span className="text-muted-foreground flex-1">{key}</span>
                              <Select onValueChange={(target) => handleAllocateUnmapped(key, target as keyof DBExpenseFields)}>
                                <SelectTrigger className="h-7 text-xs w-[160px]">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DB_EXPENSE_CATEGORIES.map(cat => (
                                    <SelectItem key={cat.key} value={cat.key} className="text-xs">
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Mapped Expenses (21 DB categories) */}
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="space-y-1 text-xs max-h-[300px] overflow-y-auto">
                      {DB_EXPENSE_CATEGORIES.map(({ key, label }) => {
                        const currentValue = mappedExpenses[key as keyof DBExpenseFields];
                        const originalValue = originalMappedExpenses[key as keyof DBExpenseFields];
                        const hasChanged = hasEdits && currentValue !== originalValue;
                        
                        return (currentValue > 0 || isEditing) ? (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-muted-foreground">{label}:</span>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={currentValue}
                                onChange={(e) => handleMappedExpenseChange(key as keyof DBExpenseFields, Number(e.target.value))}
                                className="h-6 w-24 text-xs text-right"
                              />
                            ) : (
                              <span className="font-mono flex items-center gap-2">
                                {hasChanged ? (
                                  <>
                                    <span className="text-muted-foreground line-through text-[10px]">
                                      {formatAmount(originalValue)}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                      → {formatAmount(currentValue)}
                                    </span>
                                  </>
                                ) : (
                                  formatAmount(currentValue)
                                )}
                              </span>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-500/20">
                      <div className="flex justify-between font-semibold text-sm">
                        <span>Total Daily Expenses:</span>
                        <span className="font-mono text-amber-700 dark:text-amber-400">Rs. {formatAmount(totalExpenses)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ℹ️ Applied once per bus per day (not per trip)
                      </p>
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
                      <Button 
                        onClick={handleConfirmEdits} 
                        size="sm" 
                        className="flex-1"
                        title="Confirm your edits (does not save to database yet)"
                      >
                        ✓ Confirm Edits
                      </Button>
                      <Button 
                        onClick={handleResetToOCR} 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        title="Reset all values to OCR extracted data"
                      >
                        ↶ Reset to OCR
                      </Button>
                    </>
                  ) : (
                    <>
                      {hasEdits && (
                        <Badge variant="secondary" className="mr-2">
                          ✏️ Edited (Ready to Apply)
                        </Badge>
                      )}
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        onClick={handleApplyAll} 
                        size="sm" 
                        className="flex-1"
                        disabled={Object.keys(unmappedItems).length > 0}
                        title={Object.keys(unmappedItems).length > 0 
                          ? "Please map all unmapped items before applying" 
                          : "Save trips and expenses to database"}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Apply All (Trips + Expenses)
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
