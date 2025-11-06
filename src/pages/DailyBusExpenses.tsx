import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { DailyBusExpensesForm } from "@/components/trips/DailyBusExpensesForm";
import { useDailyBusExpenses } from "@/hooks/useDailyBusExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
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

export default function DailyBusExpenses() {
  const [searchParams] = useSearchParams();
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
        <div className="flex items-center justify-between">
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
                          <div className="text-2xl font-bold text-primary">
                            Rs. {(
                              (expense.fuel_cost || 0) +
                              (expense.repair || 0) +
                              (expense.tyre_tube || 0) +
                              (expense.salary || 0) +
                              (expense.police || 0) +
                              (expense.food || 0) +
                              (expense.parking || 0) +
                              (expense.highway_charges || 0) +
                              (expense.other || 0)
                            ).toLocaleString()}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Fuel Cost */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">⛽</span>
                          </div>
                          <span className="font-medium">Fuel Cost</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.fuel_cost || 0).toLocaleString()}</span>
                      </div>

                      {/* Repair */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🔧</span>
                          </div>
                          <span className="font-medium">Repair</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.repair || 0).toLocaleString()}</span>
                      </div>

                      {/* Tyre/Tube */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🛞</span>
                          </div>
                          <span className="font-medium">Tyre/Tube</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.tyre_tube || 0).toLocaleString()}</span>
                      </div>

                      {/* Salary */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">💰</span>
                          </div>
                          <span className="font-medium">Salary</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.salary || 0).toLocaleString()}</span>
                      </div>

                      {/* Police */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🚔</span>
                          </div>
                          <span className="font-medium">Police</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.police || 0).toLocaleString()}</span>
                      </div>

                      {/* Food */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🍽️</span>
                          </div>
                          <span className="font-medium">Food</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.food || 0).toLocaleString()}</span>
                      </div>

                      {/* Parking */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🅿️</span>
                          </div>
                          <span className="font-medium">Parking</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.parking || 0).toLocaleString()}</span>
                      </div>

                      {/* Highway Charges */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🛣️</span>
                          </div>
                          <span className="font-medium">Highway Charges</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.highway_charges || 0).toLocaleString()}</span>
                      </div>

                      {/* Other */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">📝</span>
                          </div>
                          <span className="font-medium">Other</span>
                        </div>
                        <span className="font-bold text-lg">Rs. {(expense.other || 0).toLocaleString()}</span>
                      </div>
                    </div>

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
