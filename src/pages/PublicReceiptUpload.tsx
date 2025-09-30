import { useState } from "react";
import { Upload, FileImage, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function PublicReceiptUpload() {
  const { toast } = useToast();
  const [step, setStep] = useState<'admission' | 'confirm' | 'upload' | 'success'>('admission');
  const [admissionNo, setAdmissionNo] = useState("");
  const [studentData, setStudentData] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submissionId, setSubmissionId] = useState("");

  const handleSearchStudent = async () => {
    if (!admissionNo.trim()) {
      toast({
        title: "Admission Number Required",
        description: "Please enter your child's admission number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_students')
        .select(`
          *,
          school_branches!inner(
            branch_name,
            branch_code
          )
        `)
        .eq('admission_no', admissionNo.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Student Not Found",
          description: "No active student found with this admission number",
          variant: "destructive",
        });
        return;
      }

      setStudentData(data);
      setPaymentAmount(data.update_new?.toString() || data.payment_amount?.toString() || "");
      setStep('confirm');

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Error",
        description: "Failed to search for student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image (JPG, PNG) or PDF file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !studentData || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileName = `${studentData.branch_id}/${studentData.id}/${Date.now()}-${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('school-receipts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('school-receipts')
        .getPublicUrl(fileName);

      // Create receipt record
      const { data: receiptData, error: insertError } = await supabase
        .from('school_receipts')
        .insert({
          student_id: studentData.id,
          branch_id: studentData.branch_id,
          receipt_url: publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          upload_source: 'parent',
          verification_status: 'pending',
          payment_amount: parseFloat(paymentAmount),
          payment_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSubmissionId(receiptData.id);
      setStep('success');

      toast({
        title: "Receipt Submitted Successfully",
        description: "Your payment receipt has been submitted for verification",
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setStep('admission');
    setAdmissionNo("");
    setStudentData(null);
    setPaymentAmount("");
    setSelectedFile(null);
    setFilePreview("");
    setSubmissionId("");
  };

  // Success view
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Receipt Submitted!</CardTitle>
            <CardDescription>
              Your payment receipt has been successfully submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm"><strong>Student:</strong> {studentData?.student_name}</p>
              <p className="text-sm"><strong>Admission No:</strong> {studentData?.admission_no}</p>
              <p className="text-sm"><strong>Branch:</strong> {studentData?.school_branches?.branch_name}</p>
              <p className="text-sm"><strong>Amount:</strong> LKR {parseFloat(paymentAmount).toLocaleString()}</p>
              <p className="text-sm"><strong>Reference ID:</strong> {submissionId.substring(0, 8)}</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong><br/>
                Your receipt will be verified by the school administration. 
                You will be notified once the payment is confirmed.
              </p>
            </div>

            <Button 
              onClick={handleReset}
              className="w-full"
              variant="outline"
            >
              Submit Another Receipt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">School Bus Payment Receipt Upload</CardTitle>
          <CardDescription className="text-center">
            Submit your child's payment receipt for verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Admission Number */}
          {step === 'admission' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admission">Student Admission Number</Label>
                <Input
                  id="admission"
                  placeholder="Enter admission number"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchStudent()}
                />
              </div>

              <Button 
                onClick={handleSearchStudent}
                disabled={loading || !admissionNo.trim()}
                className="w-full"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Search Student
              </Button>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <p>Enter your child's admission number to continue with the payment receipt upload.</p>
              </div>
            </div>
          )}

          {/* Step 2: Confirm Student & Upload */}
          {(step === 'confirm' || step === 'upload') && studentData && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('admission');
                  setStudentData(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Student
              </Button>

              {/* Student Information */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-lg">Student Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name:</p>
                    <p className="font-medium">{studentData.student_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Admission No:</p>
                    <p className="font-medium">{studentData.admission_no}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Grade:</p>
                    <p className="font-medium">{studentData.grade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Branch:</p>
                    <p className="font-medium">{studentData.school_branches?.branch_name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Payment Status:</p>
                    <Badge variant={studentData.payment_status === 'paid' ? 'default' : 'destructive'}>
                      {studentData.payment_status || 'Unpaid'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (LKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
                {studentData.update_new && (
                  <p className="text-xs text-muted-foreground">
                    Expected amount: LKR {parseFloat(studentData.update_new).toLocaleString()}
                  </p>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt">Upload Receipt</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {selectedFile ? (
                    <div className="space-y-4">
                      {filePreview && (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-w-full max-h-48 mx-auto rounded"
                        />
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <FileImage className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview("");
                        }}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        PNG, JPG or PDF (Max 10MB)
                      </p>
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('receipt')?.click()}
                      >
                        Choose File
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={uploading || !selectedFile || !paymentAmount}
                className="w-full"
                size="lg"
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Receipt
              </Button>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
                <strong>Note:</strong> Your receipt will be verified by the school administration. 
                Please ensure the payment receipt is clear and readable.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
