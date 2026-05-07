import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Image as ImageIcon, ExternalLink, Download, Upload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface RoutePermit {
  id: string;
  permit_no: string;
  route_name: string;
}

interface RoutePermitDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permit: RoutePermit;
}

export const RoutePermitDocumentModal = ({
  open,
  onOpenChange,
  permit,
}: RoutePermitDocumentModalProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    if (!permit?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('linked_table', 'route_permits')
        .eq('linked_row_id', permit.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      if (data && data.length > 0 && !activeDoc) {
        setActiveDoc(data[0]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && permit?.id) {
      fetchDocuments();
    }
  }, [open, permit?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !permit?.id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `route-permits/${permit.id}/${Date.now()}_${file.name}`;
      
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { data: docData, error: insertError } = await supabase
        .from('documents')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: urlData.publicUrl,
          storage_path: filePath,
          linked_table: 'route_permits',
          linked_row_id: permit.id,
          tag: 'permit_document',
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      fetchDocuments();
      if (docData) setActiveDoc(docData);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleDelete = async (doc: any) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast.success('Document deleted');
      if (activeDoc?.id === doc.id) setActiveDoc(null);
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const isPdf = (fileName: string) => fileName.toLowerCase().endsWith('.pdf');
  const isImage = (fileName: string) => 
    ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileName.toLowerCase().endsWith(ext));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl flex items-center gap-2 font-bold tracking-tight">
                <FileText className="w-6 h-6 text-primary" />
                Permit Documents: <span className="text-primary font-mono">{permit.permit_no}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {permit.route_name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="relative gap-2 font-medium"
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
                {uploading ? 'Uploading...' : 'Upload Document'}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar List */}
          <div className="w-80 border-r bg-muted/10 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setActiveDoc(doc)}
                      className={`w-full flex items-center gap-3 p-3 text-left rounded-xl transition-all duration-300 border ${
                        activeDoc?.id === doc.id 
                          ? 'bg-primary/10 border-primary shadow-sm text-primary' 
                          : 'bg-background border-border hover:border-primary/50 hover:bg-muted'
                      }`}
                    >
                      {isPdf(doc.file_name) ? (
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <FileText className="w-5 h-5 text-red-500" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-xs truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          {format(parseISO(doc.uploaded_at), 'MMM dd, yyyy')} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-10 px-4 space-y-2">
                    <FileText className="w-10 h-10 mx-auto opacity-10" />
                    <p className="text-xs text-muted-foreground font-medium">No documents uploaded yet.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 bg-muted/5 flex flex-col items-center justify-center relative p-8">
            {activeDoc ? (
              <>
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload(activeDoc)}
                    className="gap-2 bg-background shadow-sm hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(activeDoc)}
                    className="gap-2 bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>

                <div className="w-full h-full rounded-2xl border bg-background shadow-2xl flex items-center justify-center overflow-hidden">
                  {isPdf(activeDoc.file_name) ? (
                    <iframe 
                      src={`${activeDoc.file_url}#toolbar=0`} 
                      className="w-full h-full border-0"
                      title={activeDoc.file_name}
                    />
                  ) : isImage(activeDoc.file_name) ? (
                    <img 
                      src={activeDoc.file_url} 
                      alt={activeDoc.file_name} 
                      className="max-w-full max-h-full object-contain p-4 animate-in fade-in zoom-in duration-300"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-10">
                      <FileText className="w-20 h-20 mx-auto mb-4 opacity-10" />
                      <p className="font-medium">Preview not available for this file type.</p>
                      <Button variant="link" onClick={() => handleDownload(activeDoc)}>
                        Click here to download and view
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-12 h-12 opacity-20" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Select a document</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Choose a document from the list on the left to preview it here or upload a new one.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
