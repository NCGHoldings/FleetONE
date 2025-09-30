import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Check, X, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ReceiptUploadQRGenerator } from "@/components/school/ReceiptUploadQRGenerator";

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
  payment_amount?: number;
  payment_date?: string;
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
  const [verifyingReceipt, setVerifyingReceipt] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationAmount, setVerificationAmount] = useState("");

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

  const handleVerifyReceipt = async (receiptId: string, status: "approved" | "rejected") => {
    setVerifyingReceipt(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Call edge function for verification with payment processing
      const { data, error } = await supabase.functions.invoke('verify-receipt-uploads', {
        body: {
          receipt_id: receiptId,
          verification_status: status,
          payment_amount: verificationAmount ? parseFloat(verificationAmount) : null,
          payment_date: selectedReceipt?.payment_date || new Date().toISOString().split('T')[0],
          notes: verificationNotes || (status === 'rejected' ? 'Receipt verification failed' : 'Payment verified through receipt upload'),
          verified_by: user?.id
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Receipt ${status} successfully${status === 'approved' ? ' and student payment updated' : ''}`,
      });

      fetchReceipts();
      setViewModalOpen(false);
      setSelectedReceipt(null);
      setVerificationNotes("");
      setVerificationAmount("");
    } catch (error) {
      console.error("Error verifying receipt:", error);
      toast({
        title: "Error",
        description: "Failed to verify receipt",
        variant: "destructive",
      });
    } finally {
      setVerifyingReceipt(false);
    }
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setVerificationAmount(receipt.payment_amount?.toString() || "");
    setVerificationNotes("");
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
      accessorKey: "payment_amount",
      header: "Amount",
      cell: ({ row }: any) => {
        const amount = row.getValue("payment_amount") as number;
        return amount ? (
          <div className="font-medium">LKR {amount.toLocaleString()}</div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewReceipt(row.original)}
              title="Review & Verify"
            >
              <Eye className="h-4 w-4" />
            </Button>
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

      {/* QR Code Generator */}
      <ReceiptUploadQRGenerator />

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

      {/* View & Verify Receipt Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Student Information */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Student Information</h3>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedReceipt.student_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Admission No:</span>
                    <p className="font-medium">{selectedReceipt.student_admission_no}</p>
                  </div>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Payment Amount</Label>
                  <Input
                    type="number"
                    value={verificationAmount}
                    onChange={(e) => setVerificationAmount(e.target.value)}
                    placeholder="Enter amount"
                    disabled={selectedReceipt.verification_status !== "pending"}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Date</Label>
                  <p className="text-sm mt-2">
                    {selectedReceipt.payment_date 
                      ? format(new Date(selectedReceipt.payment_date), "MMM dd, yyyy")
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">File Name</Label>
                  <p className="text-sm mt-2">{selectedReceipt.file_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-2">
                    <Badge variant={selectedReceipt.verification_status === "approved" ? "default" : 
                                   selectedReceipt.verification_status === "rejected" ? "destructive" : "secondary"}>
                      {selectedReceipt.verification_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Uploaded</Label>
                  <p className="text-sm mt-2">{format(new Date(selectedReceipt.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
              </div>

              {/* Receipt Preview */}
              <div>
                <Label className="text-sm font-medium">Receipt Preview</Label>
                <div className="mt-2 border rounded-lg p-4 bg-muted/20">
                  <Button
                    variant="outline"
                    onClick={() => downloadReceipt(selectedReceipt)}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt to View
                  </Button>
                </div>
              </div>

              {/* Verification Notes */}
              {selectedReceipt.verification_status === "pending" && (
                <div>
                  <Label htmlFor="notes">Verification Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add any notes about this verification..."
                    rows={3}
                  />
                </div>
              )}

              {/* Rejection Reason */}
              {selectedReceipt.verification_status === "rejected" && selectedReceipt.rejection_reason && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-red-800">Rejection Reason</Label>
                  <p className="text-sm text-red-700 mt-1">{selectedReceipt.rejection_reason}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              {selectedReceipt.verification_status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => handleVerifyReceipt(selectedReceipt.id, "approved")}
                    disabled={verifyingReceipt || !verificationAmount}
                    className="flex-1"
                  >
                    {verifyingReceipt ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve & Update Payment
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleVerifyReceipt(selectedReceipt.id, "rejected")}
                    disabled={verifyingReceipt}
                    className="flex-1"
                  >
                    {verifyingReceipt ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
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