import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRouteAnalytics } from "@/hooks/useRouteAnalytics";
import { EnhancedRouteCard } from "@/components/school/EnhancedRouteCard";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  IndianRupee,
  AlertCircle,
  BarChart3,
  Eye,
  Settings
} from "lucide-react";

interface RouteFormData {
  route_name: string;
  route_code: string;
  start_location: string;
  end_location: string;
  distance_km: string;
  estimated_duration_min: string;
  pickup_points: string;
  driver_name: string;
  driver_contact: string;
  bus_reg_no: string;
}

interface StudentListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: any[];
  routeName: string;
}

function StudentListModal({ open, onOpenChange, students, routeName }: StudentListModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Students on Route: {routeName}</DialogTitle>
          <DialogDescription>
            {students.length} students assigned to this route
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => (
              <Card key={student.id || index} className="p-4">
                <div className="space-y-2">
                  <div className="font-medium">{student.student_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Grade: {student.grade || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Parent: {student.parent_name || 'N/A'}
                  </div>
                  <Badge variant={
                    student.payment_status === 'paid' ? 'default' : 
                    student.payment_status === 'overdue' ? 'destructive' : 'secondary'
                  }>
                    {student.payment_status || 'pending'}
                  </Badge>
                  {student.payment_amount && (
                    <div className="text-sm font-medium">
                      LKR {Number(student.payment_amount).toLocaleString()}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SchoolRouteManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [selectedRouteName, setSelectedRouteName] = useState("");
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<RouteFormData>({
    route_name: "",
    route_code: "",
    start_location: "",
    end_location: "",
    distance_km: "",
    estimated_duration_min: "",
    pickup_points: "",
    driver_name: "",
    driver_contact: "",
    bus_reg_no: ""
  });

  // Use the enhanced route analytics hook
  const { 
    routes, 
    loading, 
    error, 
    refetch, 
    addRouteExpense, 
    addStaffCost, 
    updateRouteInfo 
  } = useRouteAnalytics(branchId);

  const handleViewStudents = (routeId: string, students: any[]) => {
    const route = routes.find(r => r.routeId === routeId);
    setSelectedStudents(students);
    setSelectedRouteName(route?.routeName || "Unknown Route");
    setStudentsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      route_name: "",
      route_code: "",
      start_location: "",
      end_location: "",
      distance_km: "",
      estimated_duration_min: "",
      pickup_points: "",
      driver_name: "",
      driver_contact: "",
      bus_reg_no: ""
    });
  };

  // Calculate overall statistics
  const totalStudents = routes.reduce((sum, route) => sum + route.totalStudents, 0);
  const totalIncome = routes.reduce((sum, route) => sum + route.totalIncome, 0);
  const totalExpenses = routes.reduce((sum, route) => sum + route.totalExpenses, 0);
  const totalProfit = routes.reduce((sum, route) => sum + route.netProfit, 0);
  const profitableRoutes = routes.filter(route => route.netProfit > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading route analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/school-bus/branch/${branchId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Branch
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Route Management & Analytics</h1>
            <p className="text-muted-foreground">
              Auto-detected routes with comprehensive financial tracking
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overall Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Across {routes.length} routes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {(totalIncome / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">
              Monthly revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              LKR {(totalProfit / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">
              After all expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitable Routes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitableRoutes}/{routes.length}</div>
            <p className="text-xs text-muted-foreground">
              {routes.length > 0 ? ((profitableRoutes / routes.length) * 100).toFixed(0) : 0}% profitable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Routes Grid */}
      {routes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <EnhancedRouteCard
              key={route.routeId}
              route={route}
              onAddExpense={addRouteExpense}
              onAddStaff={addStaffCost}
              onUpdateRoute={updateRouteInfo}
              onViewStudents={handleViewStudents}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Routes Detected</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Routes are automatically detected from your student database. 
              Import student data with route information to see routes here.
            </p>
            <Button onClick={() => navigate(`/school-bus/branch/${branchId}/import`)}>
              Import Student Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Students Modal */}
      <StudentListModal
        open={studentsModalOpen}
        onOpenChange={setStudentsModalOpen}
        students={selectedStudents}
        routeName={selectedRouteName}
      />

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <Button variant="outline" size="sm" onClick={refetch} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}