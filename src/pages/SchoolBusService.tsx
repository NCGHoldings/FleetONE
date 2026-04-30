import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/dashboard/KPICard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Users, 
  CreditCard, 
  MapPin, 
  AlertCircle, 
  TrendingUp,
  School,
  Bus,
  Receipt,
  Download,
  Upload,
  MessageSquare,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  Bell,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  manager_name?: string;
  is_total_branch: boolean;
  is_active: boolean;
}

interface BranchStats {
  totalStudents: number;
  paidStudents: number;
  pendingStudents: number;
  totalRevenue: number;
  overduePayments: number;
}

const initialFormState = {
  branch_name: "",
  branch_code: "",
  address: "",
  contact_phone: "",
  contact_email: "",
  manager_name: "",
};

export default function SchoolBusService() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("school_branches")
        .select("*")
        .eq("is_active", true)
        .order("is_total_branch", { ascending: true })
        .order("branch_name");

      if (error) throw error;
      setBranches(data || []);
      
      // Fetch stats for each branch
      if (data) {
        for (const branch of data) {
          await fetchBranchStats(branch.id);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchStats = async (branchId: string) => {
    try {
      let allBranchStudents: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("school_students")
          .select("is_active, payment_status, payment_amount, current_amount_due, payment_balance")
          .eq("branch_id", branchId)
          .range(page * pageSize, (page + 1) * pageSize - 1);
          
        if (error) throw error;
        allBranchStudents = [...allBranchStudents, ...(data || [])];
        hasMore = data && data.length === pageSize;
        page++;
      }

      const activeStudents = allBranchStudents.filter(s => s.is_active !== false);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: payments, error: paymentsError } = await supabase
        .from("school_payment_transactions")
        .select("amount_paid, payment_date, school_students!inner(branch_id)")
        .eq("school_students.branch_id", branchId);

      if (paymentsError) throw paymentsError;

      const currentMonthTx = (payments || []).filter((tx: any) => {
        if (!tx.payment_date) return false;
        return new Date(tx.payment_date) >= startOfMonth;
      });

      const totalStudents = activeStudents.length;
      
      let paidStudentsCount = 0;
      let pendingStudentsCount = 0;
      let overduePaymentsCount = 0;

      activeStudents.forEach(s => {
        const due = s.current_amount_due || 0;
        const balance = s.payment_balance || 0;
        const hasPaymentHistory = Number(s.payment_amount) > 0 || balance > 0;
        const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;
        
        const isStatusPaid = s.payment_status && String(s.payment_status).toLowerCase().trim() === 'paid';
        const isStatusOverdue = s.payment_status && String(s.payment_status).toLowerCase().trim() === 'overdue';

        if (isMathematicallyPaid || isStatusPaid) {
          paidStudentsCount++;
        } else if (due > 0 && balance < 0) {
          overduePaymentsCount++;
        } else {
          pendingStudentsCount++;
        }
      });

      const paidStudents = paidStudentsCount;
      const pendingStudents = pendingStudentsCount;
      const overduePayments = overduePaymentsCount;
      const totalRevenue = currentMonthTx.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0) || 0;

      setBranchStats(prev => ({
        ...prev,
        [branchId]: {
          totalStudents,
          paidStudents,
          pendingStudents,
          totalRevenue,
          overduePayments
        }
      }));
    } catch (error) {
      console.error(`Error fetching stats for branch ${branchId}:`, error);
    }
  };

  const handleBranchClick = (branch: Branch) => {
    if (branch.is_total_branch) {
      navigate("/school-bus/total-dashboard");
    } else {
      navigate(`/school-bus/branch/${branch.id}`);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate branch code from name (first 3 uppercase chars)
      if (field === "branch_name") {
        updated.branch_code = value
          .replace(/[^a-zA-Z]/g, "")
          .substring(0, 3)
          .toUpperCase();
      }
      return updated;
    });
  };

  const handleCreateBranch = async () => {
    if (!formData.branch_name.trim()) {
      toast({ title: "Validation Error", description: "Branch name is required", variant: "destructive" });
      return;
    }
    if (!formData.branch_code.trim()) {
      toast({ title: "Validation Error", description: "Branch code is required", variant: "destructive" });
      return;
    }

    // Check for duplicate branch code
    const existing = branches.find(
      b => b.branch_code.toLowerCase() === formData.branch_code.trim().toLowerCase()
    );
    if (existing) {
      toast({ title: "Duplicate Code", description: `Branch code "${formData.branch_code}" already exists for "${existing.branch_name}"`, variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data: newBranch, error } = await supabase.from("school_branches").insert({
        branch_name: formData.branch_name.trim(),
        branch_code: formData.branch_code.trim().toUpperCase(),
        address: formData.address.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        manager_name: formData.manager_name.trim() || null,
        is_active: true,
        is_total_branch: false,
      }).select().single();

      if (error) throw error;

      // Auto-create default import settings for the new branch
      if (newBranch) {
        await supabase.from('school_payment_import_settings').insert([{
          branch_id: newBranch.id,
          min_confidence_threshold: 80,
          auto_approve_high_confidence: true,
          admission_prefixes: ['N', 'LNU', 'LKA', 'TKA', 'TN', 'R0', 'Sta'],
          default_payment_method: 'Bank Transfer',
          auto_split_siblings: true,
          enable_pattern_learning: true,
        }]);
      }

      toast({
        title: "Branch Created",
        description: `"${formData.branch_name}" branch has been created successfully.`,
      });

      setFormData(initialFormState);
      setCreateDialogOpen(false);
      // Refresh the branch list
      setLoading(true);
      await fetchBranches();
    } catch (error: any) {
      console.error("Error creating branch:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create branch",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading School Bus Service...</p>
        </div>
      </div>
    );
  }

  const totalBranch = branches.find(b => b.is_total_branch);
  const regularBranches = branches.filter(b => !b.is_total_branch);

  // Calculate overall totals
  const overallStats = Object.values(branchStats).reduce(
    (acc, stats) => ({
      totalStudents: acc.totalStudents + stats.totalStudents,
      paidStudents: acc.paidStudents + stats.paidStudents,
      pendingStudents: acc.pendingStudents + stats.pendingStudents,
      totalRevenue: acc.totalRevenue + stats.totalRevenue,
      overduePayments: acc.overduePayments + stats.overduePayments,
    }),
    { totalStudents: 0, paidStudents: 0, pendingStudents: 0, totalRevenue: 0, overduePayments: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Bus Service</h1>
          <p className="text-muted-foreground">
            Manage student transportation across all branches
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <School className="h-5 w-5 text-primary" />
                  Create New Branch
                </DialogTitle>
                <DialogDescription>
                  Add a new branch to the School Bus Service. It will have all the same features as existing branches.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch_name">Branch Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="branch_name"
                      placeholder="e.g. Colombo"
                      value={formData.branch_name}
                      onChange={(e) => handleFormChange("branch_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch_code">Branch Code <span className="text-red-500">*</span></Label>
                    <Input
                      id="branch_code"
                      placeholder="e.g. COL"
                      value={formData.branch_code}
                      onChange={(e) => handleFormChange("branch_code", e.target.value)}
                      maxLength={5}
                      className="uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Branch address"
                    value={formData.address}
                    onChange={(e) => handleFormChange("address", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      placeholder="e.g. 011-2345678"
                      value={formData.contact_phone}
                      onChange={(e) => handleFormChange("contact_phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder="branch@example.com"
                      value={formData.contact_email}
                      onChange={(e) => handleFormChange("contact_email", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager_name">Manager Name</Label>
                  <Input
                    id="manager_name"
                    placeholder="Branch manager's name"
                    value={formData.manager_name}
                    onChange={(e) => handleFormChange("manager_name", e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBranch} disabled={creating}>
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Branch
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10" onClick={() => navigate("/school-bus/import-expenses")}>
            Import Expenses
          </Button>
          <Button onClick={() => navigate("/school-bus/import")}>
            Import Students
          </Button>
          <Button onClick={() => navigate("/school-bus/payments")}>
            Manage Payments
          </Button>
        </div>
      </div>

      {/* Advanced KPI Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Students"
          value={overallStats.totalStudents.toString()}
          description="Across all branches"
          icon={<Users className="h-4 w-4 text-blue-500" />}
        />
        <KPICard
          title="Revenue (LKR)"
          value={overallStats.totalRevenue.toLocaleString()}
          description="Total collected this month"
          icon={<CreditCard className="h-4 w-4 text-green-500" />}
        />
        <KPICard
          title="Payment Rate"
          value={`${overallStats.totalStudents > 0 ? ((overallStats.paidStudents / overallStats.totalStudents) * 100).toFixed(1) : 0}%`}
          description={`${overallStats.paidStudents} students paid`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        />
        <KPICard
          title="Pending Collection"
          value={overallStats.pendingStudents.toString()}
          description="Need immediate attention"
          icon={<Receipt className="h-4 w-4 text-amber-500" />}
        />
        <KPICard
          title="Urgent Follow-up"
          value={overallStats.overduePayments.toString()}
          description="Overdue payments"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
        />
      </div>


      {/* Total Dashboard Card */}
      {totalBranch && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              {totalBranch.branch_name} Dashboard
            </CardTitle>
            <CardDescription>
              Consolidated view across all 7 branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{overallStats.totalStudents}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">LKR {overallStats.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{overallStats.paidStudents}</div>
                <div className="text-sm text-muted-foreground">Students Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{overallStats.overduePayments}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={() => handleBranchClick(totalBranch)}
                className="w-full"
              >
                View Total Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Cards - Clean Interface */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {regularBranches.map((branch) => {
          const stats = branchStats[branch.id] || {
            totalStudents: 0,
            paidStudents: 0,
            pendingStudents: 0,
            totalRevenue: 0,
            overduePayments: 0,
          };

          const paymentRate = stats.totalStudents > 0 ? (stats.paidStudents / stats.totalStudents) * 100 : 0;

          return (
            <Card key={branch.id} className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white border border-gray-100">
              {/* Branch Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{branch.branch_name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs font-medium text-gray-600 bg-gray-50">
                      {branch.branch_code}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
                  <p className="text-sm font-medium text-blue-700 mb-2">Total Students</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalStudents}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
                  <p className="text-sm font-medium text-green-700 mb-2">Revenue (LKR)</p>
                  <p className="text-3xl font-bold text-green-900">{stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Rate */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-600">Payment Rate</span>
                  <span className="text-lg font-bold text-red-500">{paymentRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${paymentRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">{stats.paidStudents} Paid</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-orange-700">{stats.pendingStudents} Pending</span>
                </div>
              </div>

              {/* Manage Button */}
              <Button 
                onClick={() => handleBranchClick(branch)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                <Bus className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}