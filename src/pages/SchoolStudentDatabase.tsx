import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  MapPin
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
  created_at: string;
}

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
}

export default function SchoolStudentDatabase() {
  const { branchId } = useParams<{ branchId: string }>();
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
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
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
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
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
    </div>
  );
}