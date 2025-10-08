import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Loader2,
  ArrowLeft
} from "lucide-react";

interface Student {
  id: string;
  sbs_cord?: string;
  student_name: string;
  pickup_point_cord?: string;
  pickup_point_definition?: string;
  admission_no?: string;
  grade?: string;
  school_location?: string;
  route?: string;
  bus_reg_no?: string;
  driver_name?: string;
  driver_contact_no?: string;
  care_taker_name?: string;
  care_taker_contact_no?: string;
  parent_name?: string;
  address?: string;
  email_id?: string;
  father_contact_no?: string;
  mother_contact_no?: string;
  payment_date?: string;
  update_new?: number;
  service_type?: string;
  pickup_point?: string;
  dropoff_point?: string;
  payment_amount?: number;
  payment_status: string;
  last_payment_date?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  created_at: string;
}

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
}

export default function SchoolStudentDatabase() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  const isSuperAdmin = userRoles?.includes('super_admin');

  useEffect(() => {
    fetchBranchData();
    fetchStudents();
  }, [branchId]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, statusFilter, gradeFilter, routeFilter]);

  const fetchBranchData = async () => {
    if (!branchId) return;
    
    try {
      const { data, error } = await supabase
        .from("school_branches")
        .select("*")
        .eq("id", branchId)
        .single();

      if (error) throw error;
      setBranch(data);
    } catch (error) {
      console.error("Error fetching branch:", error);
    }
  };

  const fetchStudents = async () => {
    if (!branchId) return;

    try {
      const { data, error } = await supabase
        .from("school_students")
        .select("*")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .order("student_name");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admission_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(student => student.payment_status === statusFilter);
    }

    // Grade filter
    if (gradeFilter !== "all") {
      filtered = filtered.filter(student => student.grade === gradeFilter);
    }

    // Route filter
    if (routeFilter !== "all") {
      filtered = filtered.filter(student => student.route === routeFilter);
    }

    setFilteredStudents(filtered);
  };

  const getUniqueValues = (key: keyof Student) => {
    return Array.from(new Set(students.map(s => s[key]).filter(Boolean))) as string[];
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("school_students")
        .update({ is_active: false })
        .eq("id", studentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      await fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const clearBranchStudents = async () => {
    if (!branchId) return;
    setClearing(true);
    try {
      const { error } = await supabase
        .from("school_students")
        .update({ is_active: false })
        .eq("branch_id", branchId)
        .eq("is_active", true);
      if (error) throw error;
      toast({
        title: "Cleared",
        description: "All active students in this branch were archived.",
      });
      await fetchStudents();
    } catch (error) {
      console.error("Error clearing students:", error);
      toast({
        title: "Error",
        description: "Failed to clear students for this branch",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const columns = [
    {
      accessorKey: "student_name",
      header: "Student Name",
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.getValue("student_name")}</div>
          {row.original.admission_no && (
            <div className="text-sm text-muted-foreground">#{row.original.admission_no}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue("grade") || "N/A"}</Badge>
      ),
    },
    {
      accessorKey: "parent_name",
      header: "Parent",
      cell: ({ row }: any) => (
        <div>
          <div>{row.getValue("parent_name") || "N/A"}</div>
          {(row.original.father_contact_no || row.original.mother_contact_no) && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {row.original.father_contact_no || row.original.mother_contact_no}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "route",
      header: "Route",
      cell: ({ row }: any) => (
        <div>
          <div>{row.getValue("route") || "N/A"}</div>
          {row.original.bus_reg_no && (
            <div className="text-sm text-muted-foreground">Bus: {row.original.bus_reg_no}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "pickup_point",
      header: "Pickup/Drop-off",
      cell: ({ row }: any) => (
        <div className="max-w-[200px]">
          {row.original.pickup_point && (
            <div className="text-sm">
              <span className="font-medium">Pickup:</span> {row.original.pickup_point}
            </div>
          )}
          {row.original.dropoff_point && (
            <div className="text-sm">
              <span className="font-medium">Drop:</span> {row.original.dropoff_point}
            </div>
          )}
          {!row.original.pickup_point && !row.original.dropoff_point && (
            <span className="text-muted-foreground">N/A</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "service_type",
      header: "Service",
      cell: ({ row }: any) => {
        const type = row.getValue("service_type") as string;
        return (
          <Badge variant={type === "BothWay" ? "default" : "secondary"}>
            {type || "N/A"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "emergency_contact_name",
      header: "Emergency Contact",
      cell: ({ row }: any) => (
        <div>
          {row.original.emergency_contact_name && (
            <div className="font-medium">{row.original.emergency_contact_name}</div>
          )}
          {row.original.emergency_contact_number && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {row.original.emergency_contact_number}
            </div>
          )}
          {!row.original.emergency_contact_name && !row.original.emergency_contact_number && (
            <span className="text-muted-foreground">N/A</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }: any) => {
        const status = row.getValue("payment_status") as string;
        const amount = row.original.payment_amount;
        const variant = status === "paid" ? "default" : 
                      status === "overdue" ? "destructive" : "secondary";
        return (
          <div>
            <Badge variant={variant}>{status}</Badge>
            {amount && (
              <div className="text-sm text-muted-foreground mt-1">
                LKR {amount.toLocaleString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStudent(row.original);
              setIsEditModalOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteStudent(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/school-bus/branch/${branchId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Branch
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Student Database - {branch?.branch_name}
          </h1>
          <p className="text-muted-foreground">
            Manage student information and enrollment data
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/school-bus/branch/${branchId}/import`)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={() => navigate(`/school-bus/branch/${branchId}/students/add`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
          {isSuperAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={clearing}>
                  {clearing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Branch Students
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all students for {branch?.branch_name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive all active students in this branch (set as inactive). You can re-import afterwards.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearBranchStudents}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <div className="text-2xl font-bold">{students.length}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="text-2xl font-bold">
                  {students.filter(s => s.payment_status === "paid").length}
                </div>
                <div className="text-sm text-muted-foreground">Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <div className="text-2xl font-bold">
                  {students.filter(s => s.payment_status === "pending").length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <div className="text-2xl font-bold">
                  {students.filter(s => s.payment_status === "overdue").length}
                </div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, Admission No, Parent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Payment Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {getUniqueValues("grade").map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="route">Route</Label>
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {getUniqueValues("route").map(route => (
                    <SelectItem key={route} value={route}>{route}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
          <CardDescription>
            Complete student database with payment tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredStudents}
            searchKey="student_name"
          />
        </CardContent>
      </Card>

      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              try {
                const { error } = await supabase
                  .from("school_students")
                  .update({
                    student_name: formData.get("student_name") as string,
                    admission_no: formData.get("admission_no") as string,
                    grade: formData.get("grade") as string,
                    parent_name: formData.get("parent_name") as string,
                    father_contact_no: formData.get("father_contact_no") as string,
                    mother_contact_no: formData.get("mother_contact_no") as string,
                    email_id: formData.get("email_id") as string,
                    address: formData.get("address") as string,
                    route: formData.get("route") as string,
                    bus_reg_no: formData.get("bus_reg_no") as string,
                    service_type: formData.get("service_type") as string,
                    pickup_point: formData.get("pickup_point") as string,
                    dropoff_point: formData.get("dropoff_point") as string,
                    emergency_contact_name: formData.get("emergency_contact_name") as string,
                    emergency_contact_number: formData.get("emergency_contact_number") as string,
                    payment_status: formData.get("payment_status") as string,
                    payment_amount: formData.get("payment_amount") ? Number(formData.get("payment_amount")) : null,
                  })
                  .eq("id", selectedStudent.id);

                if (error) throw error;

                toast({
                  title: "Success",
                  description: "Student updated successfully",
                });
                setIsEditModalOpen(false);
                setSelectedStudent(null);
                await fetchStudents();
              } catch (error) {
                console.error("Error updating student:", error);
                toast({
                  title: "Error",
                  description: "Failed to update student",
                  variant: "destructive",
                });
              }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_name">Student Name*</Label>
                  <Input id="student_name" name="student_name" defaultValue={selectedStudent.student_name} required />
                </div>
                <div>
                  <Label htmlFor="admission_no">Admission No</Label>
                  <Input id="admission_no" name="admission_no" defaultValue={selectedStudent.admission_no || ""} />
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" name="grade" defaultValue={selectedStudent.grade || ""} />
                </div>
                <div>
                  <Label htmlFor="parent_name">Parent Name</Label>
                  <Input id="parent_name" name="parent_name" defaultValue={selectedStudent.parent_name || ""} />
                </div>
                <div>
                  <Label htmlFor="father_contact_no">Father Contact</Label>
                  <Input id="father_contact_no" name="father_contact_no" defaultValue={selectedStudent.father_contact_no || ""} />
                </div>
                <div>
                  <Label htmlFor="mother_contact_no">Mother Contact</Label>
                  <Input id="mother_contact_no" name="mother_contact_no" defaultValue={selectedStudent.mother_contact_no || ""} />
                </div>
                <div>
                  <Label htmlFor="email_id">Email</Label>
                  <Input id="email_id" name="email_id" type="email" defaultValue={selectedStudent.email_id || ""} />
                </div>
                <div>
                  <Label htmlFor="route">Route</Label>
                  <Input id="route" name="route" defaultValue={selectedStudent.route || ""} />
                </div>
                <div>
                  <Label htmlFor="bus_reg_no">Bus Registration No</Label>
                  <Input id="bus_reg_no" name="bus_reg_no" defaultValue={selectedStudent.bus_reg_no || ""} />
                </div>
                <div>
                  <Label htmlFor="pickup_point">Pickup Point</Label>
                  <Input id="pickup_point" name="pickup_point" defaultValue={selectedStudent.pickup_point || ""} />
                </div>
                <div>
                  <Label htmlFor="dropoff_point">Drop-off Point</Label>
                  <Input id="dropoff_point" name="dropoff_point" defaultValue={selectedStudent.dropoff_point || ""} />
                </div>
                <div>
                  <Label htmlFor="service_type">Service Type</Label>
                  <Select name="service_type" defaultValue={selectedStudent.service_type || ""}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BothWay">Both Way</SelectItem>
                      <SelectItem value="OneWay">One Way</SelectItem>
                      <SelectItem value="Morning">Morning Only</SelectItem>
                      <SelectItem value="Evening">Evening Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={selectedStudent.emergency_contact_name || ""} />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                  <Input id="emergency_contact_number" name="emergency_contact_number" defaultValue={selectedStudent.emergency_contact_number || ""} />
                </div>
                <div>
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select name="payment_status" defaultValue={selectedStudent.payment_status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_amount">Payment Amount</Label>
                  <Input id="payment_amount" name="payment_amount" type="number" defaultValue={selectedStudent.payment_amount || ""} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={selectedStudent.address || ""} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}