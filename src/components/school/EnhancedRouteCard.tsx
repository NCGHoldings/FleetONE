import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Bus, 
  Users, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Plus,
  Settings,
  Eye,
  Phone,
  User
} from "lucide-react";
import { ExpenseRequestForm } from "@/components/accounting/ExpenseRequestForm";
import { RouteStaffModal } from "./RouteStaffModal";

interface RouteCardProps {
  route: {
    routeId: string;
    routeName: string;
    busRegNos: string[];
    totalBuses: number;
    drivers: { name?: string; contact?: string; busRegNo?: string }[];
    totalStudents: number;
    totalIncome: number;
    outstandingAmount: number;
    totalExpenses: number;
    staffCosts: number;
    netProfit: number;
    profitMargin: number;
    students: any[];
  };
  onAddStaff: (routeId: string, staff: any) => Promise<void>;
  onUpdateRoute: (routeId: string, updates: any) => Promise<void>;
  onViewStudents: (routeId: string, students: any[]) => void;
}

export function EnhancedRouteCard({ 
  route, 
  onAddStaff, 
  onUpdateRoute, 
  onViewStudents 
}: RouteCardProps) {
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const paymentRate = route.totalStudents > 0 
    ? ((route.totalStudents - (route.outstandingAmount / (route.totalIncome + route.outstandingAmount || 1)) * route.totalStudents) / route.totalStudents) * 100
    : 0;

  const isProfitable = route.netProfit > 0;
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Bus className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">{route.routeName}</CardTitle>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {route.busRegNos.length > 0 ? (
                      route.busRegNos.map((bus, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {bus}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No Bus Assigned
                      </Badge>
                    )}
                  </div>
                  {route.totalBuses > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {route.totalBuses} bus{route.totalBuses > 1 ? 'es' : ''} • {route.drivers.filter(d => d.name).length} driver{route.drivers.filter(d => d.name).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewStudents(route.routeId, route.students)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-blue-600">
                <Users className="h-4 w-4" />
                {route.totalStudents}
              </div>
              <div className="text-xs text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-600">
                <IndianRupee className="h-4 w-4" />
                {(route.totalIncome / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-muted-foreground">Income</div>
            </div>
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {(route.netProfit / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-muted-foreground">Net Profit</div>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Payment Progress</span>
              <span className="text-sm font-bold">{paymentRate.toFixed(1)}%</span>
            </div>
            <Progress value={paymentRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>LKR {route.totalIncome.toLocaleString()} collected</span>
              <span>LKR {route.outstandingAmount.toLocaleString()} pending</span>
            </div>
          </div>

          {/* Profit Margin Indicator */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isProfitable ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isProfitable ? 'Profitable' : 'Loss Making'}
              </span>
            </div>
            <Badge variant={isProfitable ? "default" : "destructive"}>
              {route.profitMargin.toFixed(1)}%
            </Badge>
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Expenses</div>
                  <div className="font-semibold">LKR {route.totalExpenses.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Staff Costs</div>
                  <div className="font-semibold">LKR {route.staffCosts.toLocaleString()}</div>
                </div>
              </div>
              
              {route.drivers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Drivers:</div>
                  {route.drivers.filter(d => d.name).map((driver, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{driver.name}</span>
                      {driver.busRegNo && (
                        <Badge variant="secondary" className="text-xs">{driver.busRegNo}</Badge>
                      )}
                      {driver.contact && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {driver.contact}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpenseModalOpen(true)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStaffModalOpen(true)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Staff
            </Button>
          </div>

          {/* Warning for low profitability */}
          {!isProfitable && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">Route needs attention - operating at a loss</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ExpenseRequestForm
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        defaultBusinessUnit="SBO"
        defaultSchoolRouteId={route.routeId}
      />

      <RouteStaffModal
        open={staffModalOpen}
        onOpenChange={setStaffModalOpen}
        routeId={route.routeId}
        routeName={route.routeName}
        onAddStaff={(staff) => onAddStaff(route.routeId, staff)}
      />
    </>
  );
}