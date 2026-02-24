import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Fuel, 
  Users, 
  Wrench, 
  MapPin, 
  FileText,
  DollarSign,
  Building2,
  TrendingUp,
  Clock,
  Ambulance,
  Car,
  Scale,
  Ticket,
  TestTube,
  Home,
  Coffee,
  UserCheck,
  CircleParking,
  Shield
} from "lucide-react";

interface ExpenseDetailsModalProps {
  expense: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailsModal({ expense, open, onOpenChange }: ExpenseDetailsModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const expenseCategories = [
    {
      title: "Operational Expenses",
      color: "blue",
      icon: DollarSign,
      expenses: [
        { label: "Fuel Cost", value: expense.fuel_cost, icon: Fuel },
        { label: "Parking", value: expense.parking, icon: CircleParking },
        { label: "Highway Charges", value: expense.highway_charges, icon: MapPin },
        { label: "Police", value: expense.police, icon: Shield },
      ]
    },
    {
      title: "Staff Expenses",
      color: "green",
      icon: Users,
      expenses: [
        { label: "Salary", value: expense.salary, icon: DollarSign },
        { label: "Food", value: expense.food, icon: Coffee },
        { label: "Runner", value: expense.runner, icon: UserCheck },
        { label: "Staff Accommodation", value: expense.staff_accommodation, icon: Home },
      ]
    },
    {
      title: "Maintenance",
      color: "orange",
      icon: Wrench,
      expenses: [
        { label: "Repair", value: expense.repair, icon: Wrench },
        { label: "Tyre/Tube", value: expense.tyre_tube, icon: TrendingUp },
        { label: "Body Wash", value: expense.body_wash, icon: TestTube },
      ]
    },
    {
      title: "Administrative",
      color: "purple",
      icon: FileText,
      expenses: [
        { label: "Permits Renewal", value: expense.permits_renewal, icon: FileText },
        { label: "Log Sheet", value: expense.log_sheet, icon: FileText },
        { label: "NTC", value: expense.ntc, icon: Building2 },
        { label: "Legal/Court", value: expense.legal_court, icon: Scale },
        { label: "Emission/Fitness", value: expense.emission_fitness, icon: TestTube },
        { label: "Temporary Permit", value: expense.temporary_permit, icon: Ticket },
      ]
    },
    {
      title: "Other Expenses",
      color: "gray",
      icon: DollarSign,
      expenses: [
        { label: "Accident Compensation", value: expense.accident_compensation, icon: Ambulance },
        { label: "Vehicle Hire", value: expense.vehicle_hire, icon: Car },
        { label: "Short/Misc", value: expense.short_misc, icon: DollarSign },
        { label: "Other", value: expense.other, icon: DollarSign },
      ]
    },
  ];

  const getCategoryTotal = (category: any) => {
    return category.expenses.reduce((sum: number, exp: any) => sum + (exp.value || 0), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Bus {expense.buses?.bus_no} - Expense Details
            </DialogTitle>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {formatCurrency(expense.total_daily_expenses || 0)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Date: {new Date(expense.expense_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {expenseCategories.map((category) => {
            const total = getCategoryTotal(category);
            if (total === 0) return null;

            return (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{category.title}</h3>
                  </div>
                  <Badge variant="outline" className="text-base">
                    {formatCurrency(total)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-7">
                  {category.expenses
                    .filter(exp => exp.value > 0)
                    .map((exp) => (
                      <div 
                        key={exp.label}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <exp.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{exp.label}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(exp.value)}
                        </span>
                      </div>
                    ))}
                </div>

                <Separator />
              </div>
            );
          })}

          {expense.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {expense.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
