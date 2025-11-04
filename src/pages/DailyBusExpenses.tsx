import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { DailyBusExpensesForm } from "@/components/trips/DailyBusExpensesForm";
import { useDailyBusExpenses } from "@/hooks/useDailyBusExpenses";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [date, setDate] = useState<Date>(new Date());
  const { expenses, loading, saveExpense, deleteExpense } = useDailyBusExpenses(date);

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

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>💡 How It Works</CardTitle>
            <CardDescription>
              Enter expenses once per bus per day. The system will automatically distribute costs across all trips for accurate profitability analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ <strong>Revenue:</strong> Track per trip (entered in Quick Entry or Add Trip)</div>
            <div>✅ <strong>Expenses:</strong> Track per bus per day (enter here)</div>
            <div>✅ <strong>Analytics:</strong> System calculates profit per trip using distance-weighted allocation</div>
          </CardContent>
        </Card>

        <DailyBusExpensesForm
          date={date}
          onSave={saveExpense}
        />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Expenses for {format(date, "PPP")}</h2>
          
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : expenses.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No expenses recorded for this date
            </Card>
          ) : (
            <div className="grid gap-4">
              {expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{expense.buses.bus_no}</div>
                        <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Fuel:</span>{" "}
                            <span className="font-medium">Rs. {expense.fuel_cost?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Food:</span>{" "}
                            <span className="font-medium">Rs. {expense.food?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Parking:</span>{" "}
                            <span className="font-medium">Rs. {expense.parking?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Other:</span>{" "}
                            <span className="font-medium">
                              Rs. {(
                                (expense.repair || 0) +
                                (expense.tyre_tube || 0) +
                                (expense.police || 0) +
                                (expense.highway_charges || 0) +
                                (expense.other || 0)
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {expense.notes && (
                          <div className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Notes:</span> {expense.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-xl font-bold text-primary">
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                      </div>
                    </div>
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
