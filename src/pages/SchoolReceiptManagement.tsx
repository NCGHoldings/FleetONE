import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Eye, Check, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Receipt {
  id: string;
  student_id: string;
  receipt_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  verification_status: string;
  rejection_reason?: string;
  uploaded_by: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  student_name?: string;
  student_admission_no?: string;
}

export default function SchoolReceiptManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, [branchId]);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("school_receipts")
        .select(`
          *,
          school_students!inner(
            student_name,
            admission_no
          )
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const receiptsWithStudentInfo = data?.map(receipt => ({
        ...receipt,
        student_name: receipt.school_students?.student_name,
        student_admission_no: receipt.school_students?.admission_no,
      })) || [];

      setReceipts(receiptsWithStudentInfo);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast({
        title: "Error",
        description: "Failed to load receipts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReceipt = async (receiptId: string, status: "approved" | "rejected", reason?: string) => {
    try {
      const { error } = await supabase
        .from("school_receipts")
        .update({
          verification_status: status,
          rejection_reason: reason || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", receiptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Receipt ${status} successfully`,
      });

      fetchReceipts();
      setViewModalOpen(false);
      setSelectedReceipt(null);
    } catch (error) {
      console.error("Error verifying receipt:", error);
      toast({
        title: "Error",
        description: "Failed to verify receipt",
        variant: "destructive",
      });
    }
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  const downloadReceipt = async (receipt: Receipt) => {
    try {
      const { data, error } = await supabase.storage
        .from("school-receipts")
        .download(receipt.receipt_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = receipt.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.getValue("student_name")}</div>
          {row.original.student_admission_no && (
            <div className="text-sm text-muted-foreground">#{row.original.student_admission_no}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "file_name",
      header: "Receipt File",
      cell: ({ row }: any) => (
        <div>
          <div>{row.getValue("file_name")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.file_type} • {(row.original.file_size / 1024).toFixed(1)} KB
          </div>
        </div>
      ),
    },
    {
      accessorKey: "verification_status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.getValue("verification_status") as string;
        const variant = status === "approved" ? "default" : 
                      status === "rejected" ? "destructive" : "secondary";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Uploaded",
      cell: ({ row }: any) => {
        const date = row.getValue("created_at") as string;
        return format(new Date(date), "MMM dd, yyyy HH:mm");
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
            onClick={() => handleViewReceipt(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadReceipt(row.original)}
          >
            <Download className="h-4 w-4" />
          </Button>
          {row.original.verification_status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVerifyReceipt(row.original.id, "approved")}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVerifyReceipt(row.original.id, "rejected", "Invalid receipt")}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const stats = {
    total: receipts.length,
    pending: receipts.filter(r => r.verification_status === "pending").length,
    approved: receipts.filter(r => r.verification_status === "approved").length,
    rejected: receipts.filter(r => r.verification_status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-bold tracking-tight">Receipt Management</h1>
          <p className="text-muted-foreground">
            Verify and manage parent payment receipts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Receipts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={receipts}
            searchKey="student_name"
          />
        </CardContent>
      </Card>

      {/* View Receipt Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Student</label>
                  <p>{selectedReceipt.student_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">File Name</label>
                  <p>{selectedReceipt.file_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedReceipt.verification_status === "approved" ? "default" : 
                                 selectedReceipt.verification_status === "rejected" ? "destructive" : "secondary"}>
                    {selectedReceipt.verification_status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Uploaded</label>
                  <p>{format(new Date(selectedReceipt.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
              </div>
              
              {selectedReceipt.verification_status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => handleVerifyReceipt(selectedReceipt.id, "approved")}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleVerifyReceipt(selectedReceipt.id, "rejected", "Invalid receipt")}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}