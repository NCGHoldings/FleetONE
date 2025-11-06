import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Trash2, 
  Eye, 
  ArrowLeft,
  Fuel,
  Wrench,
  CircleDollarSign,
  Users,
  Utensils,
  ParkingCircle,
  MapPin,
  FileText,
  ShieldCheck,
  FileCheck,
  Home,
  AlertCircle,
  ScrollText,
  Building,
  Scale,
  ClipboardList,
  Droplets,
  ChevronDown,
  ChevronUp,
  Waves
} from "lucide-react";
import { format } from "date-fns";
import { DailyBusExpensesForm } from "@/components/trips/DailyBusExpensesForm";
import { useDailyBusExpenses } from "@/hooks/useDailyBusExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DailyBusExpenses() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const { expenses, loading, saveExpense, deleteExpense } = useDailyBusExpenses(date);
  
  // Check if we're in view-only mode from OCR
  const queryDate = searchParams.get('date');
  const queryBusId = searchParams.get('bus');
  const isViewOnly = !!(queryDate && queryBusId);

  // Initialize date from query params
  useEffect(() => {
    if (queryDate) {
      const parsedDate = new Date(queryDate + 'T00:00:00');
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
      }
    }
  }, [queryDate]);

  // Filter expenses if bus is specified
  const displayedExpenses = isViewOnly && queryBusId
    ? expenses.filter(exp => exp.bus_id === queryBusId)
    : expenses;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Daily Bus Operating Expenses</h1>
              <p className="text-muted-foreground mt-1">
                Track expenses per bus per day - fuel, repairs, and operating costs
              </p>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isViewOnly && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Eye className="h-5 w-5" />
                OCR View-Only Mode
              </CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-400">
                Viewing expenses automatically saved from OCR trip sheet. This page is in read-only mode.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!isViewOnly && (
          <DailyBusExpensesForm
            date={date}
            onSave={saveExpense}
          />
        )}

        {isViewOnly && queryBusId && (
          <DailyBusExpensesForm
            date={date}
            onSave={saveExpense}
            readOnly={true}
            initialBusId={queryBusId}
          />
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Expenses for {format(date, "PPP")}</h2>
          
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : displayedExpenses.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {isViewOnly 
                ? "No OCR expenses found for this bus/date. Please check if expenses were saved correctly."
                : "No expenses recorded for this date"}
            </Card>
          ) : (
            <div className="grid gap-4">
              {displayedExpenses.map((expense) => (
                <Card key={expense.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{expense.buses.bus_no}</CardTitle>
                        <CardDescription>{format(date, "EEEE, MMMM d, yyyy")}</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</div>
                           <div className="text-3xl font-bold text-primary">
                            Rs. {((expense as any).total_daily_expenses || 0).toLocaleString()}
                          </div>
                        </div>
                        {!isViewOnly && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense Record?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the expense record for {expense.buses.bus_no} on {format(date, "PPP")}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => expense.id && deleteExpense(expense.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <Tabs defaultValue="all" className="w-full">
                      <TabsList className="grid w-full grid-cols-5 mb-6">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="operational">Operational</TabsTrigger>
                        <TabsTrigger value="staff">Staff</TabsTrigger>
                        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        <TabsTrigger value="administrative">Admin</TabsTrigger>
                      </TabsList>

                      <TabsContent value="all" className="space-y-6">
                        {/* Operational Expenses */}
                        <ExpenseSection
                          title="Operational Expenses"
                          color="blue"
                          expenses={[
                            { icon: Fuel, label: "Fuel Cost", value: expense.fuel_cost },
                            { icon: ParkingCircle, label: "Parking", value: expense.parking },
                            { icon: MapPin, label: "Highway Charges", value: expense.highway_charges },
                          ]}
                        />

                        {/* Staff Expenses */}
                        <ExpenseSection
                          title="Staff Expenses"
                          color="green"
                          expenses={[
                            { icon: CircleDollarSign, label: "Salary", value: expense.salary },
                            { icon: Utensils, label: "Food", value: expense.food },
                            { icon: Users, label: "Runner", value: expense.runner },
                            { icon: Home, label: "Staff Accommodation", value: expense.staff_accommodation },
                          ]}
                        />

                        {/* Maintenance */}
                        <ExpenseSection
                          title="Maintenance"
                          color="orange"
                          expenses={[
                            { icon: Wrench, label: "Repair", value: expense.repair },
                            { icon: CircleDollarSign, label: "Tyre/Tube", value: expense.tyre_tube },
                            { icon: Waves, label: "Body Wash", value: expense.body_wash },
                          ]}
                        />

                        {/* Administrative */}
                        <ExpenseSection
                          title="Administrative"
                          color="purple"
                          expenses={[
                            { icon: ShieldCheck, label: "Police", value: expense.police },
                            { icon: FileCheck, label: "Emission/Fitness", value: expense.emission_fitness },
                            { icon: FileText, label: "Permits Renewal", value: expense.permits_renewal },
                            { icon: ScrollText, label: "Log Sheet", value: expense.log_sheet },
                            { icon: Building, label: "NTC", value: expense.ntc },
                            { icon: Scale, label: "Legal/Court", value: expense.legal_court },
                            { icon: ClipboardList, label: "Temporary Permit", value: expense.temporary_permit },
                          ]}
                        />

                        {/* Other */}
                        <ExpenseSection
                          title="Other Expenses"
                          color="gray"
                          expenses={[
                            { icon: AlertCircle, label: "Accident Compensation", value: expense.accident_compensation },
                            { icon: Building, label: "Vehicle Hire", value: expense.vehicle_hire },
                            { icon: Droplets, label: "Short/Misc", value: expense.short_misc },
                            { icon: FileText, label: "Other", value: expense.other },
                          ]}
                        />
                      </TabsContent>

                      <TabsContent value="operational">
                        <ExpenseSection
                          title="Operational Expenses"
                          color="blue"
                          expenses={[
                            { icon: Fuel, label: "Fuel Cost", value: expense.fuel_cost },
                            { icon: ParkingCircle, label: "Parking", value: expense.parking },
                            { icon: MapPin, label: "Highway Charges", value: expense.highway_charges },
                          ]}
                        />
                      </TabsContent>

                      <TabsContent value="staff">
                        <ExpenseSection
                          title="Staff Expenses"
                          color="green"
                          expenses={[
                            { icon: CircleDollarSign, label: "Salary", value: expense.salary },
                            { icon: Utensils, label: "Food", value: expense.food },
                            { icon: Users, label: "Runner", value: expense.runner },
                            { icon: Home, label: "Staff Accommodation", value: expense.staff_accommodation },
                          ]}
                        />
                      </TabsContent>

                      <TabsContent value="maintenance">
                        <ExpenseSection
                          title="Maintenance"
                          color="orange"
                          expenses={[
                            { icon: Wrench, label: "Repair", value: expense.repair },
                            { icon: CircleDollarSign, label: "Tyre/Tube", value: expense.tyre_tube },
                            { icon: Waves, label: "Body Wash", value: expense.body_wash },
                          ]}
                        />
                      </TabsContent>

                      <TabsContent value="administrative">
                        <ExpenseSection
                          title="Administrative"
                          color="purple"
                          expenses={[
                            { icon: ShieldCheck, label: "Police", value: expense.police },
                            { icon: FileCheck, label: "Emission/Fitness", value: expense.emission_fitness },
                            { icon: FileText, label: "Permits Renewal", value: expense.permits_renewal },
                            { icon: ScrollText, label: "Log Sheet", value: expense.log_sheet },
                            { icon: Building, label: "NTC", value: expense.ntc },
                            { icon: Scale, label: "Legal/Court", value: expense.legal_court },
                            { icon: ClipboardList, label: "Temporary Permit", value: expense.temporary_permit },
                          ]}
                        />
                      </TabsContent>
                    </Tabs>

                    {expense.notes && (
                      <div className="mt-4 p-3 rounded-lg bg-muted/30 border-l-4 border-primary">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">📌</span>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-muted-foreground mb-1">Notes</div>
                            <p className="text-sm">{expense.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Helper component for expense sections
interface ExpenseSectionProps {
  title: string;
  color: "blue" | "green" | "orange" | "purple" | "gray";
  expenses: Array<{
    icon: React.ElementType;
    label: string;
    value?: number;
  }>;
}

function ExpenseSection({ title, color, expenses }: ExpenseSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const colorClasses = {
    blue: {
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800"
    },
    green: {
      badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      icon: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
      border: "border-green-200 dark:border-green-800"
    },
    orange: {
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      icon: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-800"
    },
    purple: {
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      icon: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800"
    },
    gray: {
      badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      icon: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-700"
    }
  };

  const sectionTotal = expenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
  const hasExpenses = sectionTotal > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={`border rounded-lg ${colorClasses[color].border}`}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{title}</h3>
            <Badge className={colorClasses[color].badge}>
              Rs. {sectionTotal.toLocaleString()}
            </Badge>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expenses.map((expense, idx) => {
              const Icon = expense.icon;
              const value = expense.value || 0;
              
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    value > 0 
                      ? 'bg-card hover:shadow-md' 
                      : 'bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colorClasses[color].icon} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">{expense.label}</span>
                  </div>
                  <span className={`font-bold ${value > 0 ? 'text-lg' : 'text-base text-muted-foreground'}`}>
                    Rs. {value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
