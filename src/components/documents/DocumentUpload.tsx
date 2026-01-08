import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Image, Download, Trash2, Eye, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  storage_path: string;
  tag: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface DocumentUploadProps {
  linkedTable: string;
  linkedRowId: string;
  title?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const TAG_OPTIONS = [
  'Permit Book', 'ID Card', 'Fitness Certificate', 'Invoice', 'Claim', 
  'Agreement', 'License', 'Registration', 'Insurance Policy', 'Receipt',
  'Maintenance Record', 'Training Certificate', 'Other'
];

export function DocumentUpload({ linkedTable, linkedRowId, title = "Documents" }: DocumentUploadProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('linked_table', linkedTable)
        .eq('linked_row_id', linkedRowId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [linkedTable, linkedRowId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('File type not supported. Please upload PDF, JPG, PNG, DOCX, or XLSX files.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedTag || !user) return;

    setUploading(true);
    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${linkedTable}/${linkedRowId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save metadata to database (store storage path, we'll generate signed URLs on demand)
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          linked_table: linkedTable,
          linked_row_id: linkedRowId,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          file_url: filePath, // Store the storage path instead of public URL
          storage_path: filePath,
          tag: selectedTag,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      setIsDialogOpen(false);
      setSelectedFile(null);
      setSelectedTag('');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      // Create signed URL for downloading
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60); // 60 seconds expiry

      if (error) throw error;

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: PDF, JPG, PNG, DOCX, XLSX (Max 20MB)
                </p>
              </div>

              <div>
                <Label htmlFor="tag">Document Type</Label>
                <select
                  className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="">Select Type</option>
                  {TAG_OPTIONS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {selectedFile && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {getFileIcon(selectedFile.type)}
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || !selectedTag || uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length > 0 ? (
        <div className="grid gap-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{doc.tag}</Badge>
                      <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('documents')
                          .createSignedUrl(doc.storage_path, 60);
                        
                        if (error) throw error;
                        window.open(data.signedUrl, '_blank');
                      } catch (error) {
                        console.error('Preview error:', error);
                        toast.error('Failed to preview document');
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc.storage_path, doc.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc.id, doc.storage_path)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No documents uploaded yet
        </p>
      )}
    </div>
  );
}