import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface UploadedFile {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

export default function ReceiptUpload() {
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Load branches on component mount
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('school_branches')
        .select('id, branch_name, branch_code')
        .eq('is_active', true);

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchStudents = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('school_students')
        .select('id, student_name, admission_no, grade')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const uploadFile = async (fileItem: UploadedFile, index: number) => {
    if (!selectedBranch || !selectedStudent || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please select branch, student, and enter payment amount before uploading",
        variant: "destructive",
      });
      return;
    }

    setUploadedFiles(prev => prev.map((item, i) => 
      i === index ? { ...item, uploading: true } : item
    ));

    try {
      const fileName = `${selectedBranch}/${selectedStudent}/${Date.now()}-${fileItem.file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('school-receipts')
        .upload(fileName, fileItem.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('school-receipts')
        .getPublicUrl(fileName);

      // Save receipt record
      const { error: insertError } = await supabase
        .from('school_receipts')
        .insert({
          student_id: selectedStudent,
          branch_id: selectedBranch,
          receipt_url: publicUrl,
          file_name: fileItem.file.name,
          file_type: fileItem.file.type,
          file_size: fileItem.file.size,
          upload_source: 'parent',
          verification_status: 'pending'
        });

      if (insertError) throw insertError;

      setUploadedFiles(prev => prev.map((item, i) => 
        i === index ? { ...item, uploading: false, uploaded: true } : item
      ));

      toast({
        title: "Success",
        description: "Receipt uploaded successfully and is pending verification",
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => prev.map((item, i) => 
        i === index ? { 
          ...item, 
          uploading: false, 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : item
      ));

      toast({
        title: "Upload Failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const item = prev[index];
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitAll = async () => {
    const pendingFiles = uploadedFiles.filter(f => !f.uploaded && !f.uploading);
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      if (!uploadedFiles[i].uploaded && !uploadedFiles[i].uploading) {
        await uploadFile(uploadedFiles[i], i);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Upload Payment Receipt</h1>
        <p className="text-muted-foreground">
          Upload your child's school bus payment receipts for verification
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">School Branch</Label>
              <Select 
                value={selectedBranch} 
                onValueChange={(value) => {
                  setSelectedBranch(value);
                  fetchStudents(value);
                  setSelectedStudent("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student">Student</Label>
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent}
                disabled={!selectedBranch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.student_name} ({student.admission_no}) - Grade {student.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (LKR)</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Payment Date</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the payment..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Receipt Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop receipt files here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports: Images (PNG, JPG) and PDF files up to 10MB
                </p>
                <Button variant="outline">Choose Files</Button>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-medium">Selected Files:</h3>
              <div className="grid gap-4">
                {uploadedFiles.map((fileItem, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {fileItem.file.type.startsWith('image/') ? (
                        <img
                          src={fileItem.preview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <FileImage className="w-16 h-16 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fileItem.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileItem.uploaded ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Uploaded
                </Badge>
                      ) : fileItem.uploading ? (
                        <Badge variant="secondary">Uploading...</Badge>
                      ) : fileItem.error ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Ready</Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={fileItem.uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <Button 
                  onClick={handleSubmitAll}
                  disabled={!selectedBranch || !selectedStudent || !paymentAmount || 
                           uploadedFiles.every(f => f.uploaded)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Upload All Receipts
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}