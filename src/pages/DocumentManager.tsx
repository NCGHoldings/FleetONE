import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { FileText, Image, Download, Trash2, Eye, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Document {
  id: string;
  bucket_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  updated_at: string;
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('');

  const fetchDocuments = async () => {
    try {
      let query = supabase.from('v_all_system_documents').select('*').order('uploaded_at', { ascending: false });

      if (selectedBucket) {
        query = query.eq('bucket_id', selectedBucket);
      }

      if (searchTerm) {
        query = query.ilike('file_name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, selectedBucket]);

  const handleDownload = async (bucketId: string, storagePath: string, fileName: string) => {
    try {
      // Create signed URL for downloading
      const { data, error } = await supabase.storage
        .from(bucketId)
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
      toast.success('Document downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (bucketId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucketId)
        .remove([storagePath]);

      if (storageError) throw storageError;

      // No need to delete from DB, storage.objects trigger handles it automatically
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
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

  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: "file_name",
      header: "File Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[300px]">
          {getFileIcon(row.original.file_type || '')}
          <span className="font-medium truncate" title={row.getValue("file_name")}>{row.getValue("file_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "bucket_id",
      header: "Category (Bucket)",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {(row.getValue("bucket_id") as string).replace(/-/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: "file_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="max-w-[100px] truncate">
          {row.getValue("file_type") || 'Unknown'}
        </Badge>
      ),
    },
    {
      accessorKey: "file_size",
      header: "Size",
      cell: ({ row }) => formatFileSize(row.getValue("file_size")),
    },
    {
      accessorKey: "uploaded_at",
      header: "Uploaded",
      cell: ({ row }) => {
        const date = row.getValue("uploaded_at") as string;
        return format(new Date(date), 'MMM dd, yyyy HH:mm');
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                const { data, error } = await supabase.storage
                  .from(row.original.bucket_id)
                  .createSignedUrl(row.original.file_path, 60);
                
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
            onClick={() => handleDownload(row.original.bucket_id, row.original.file_path, row.original.file_name)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row.original.bucket_id, row.original.file_path)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
  const uniqueBuckets = [...new Set(documents.map(doc => doc.bucket_id))];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Manager</h1>
        <p className="text-muted-foreground">Search and manage all documents across the system</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories (Buckets)</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueBuckets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Input
                placeholder="Search by file name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <select
                className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
              >
                <option value="">All Categories</option>
                {uniqueBuckets.map(bucket => (
                  <option key={bucket} value={bucket}>
                    {bucket.replace(/-/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            {/* Tag filter removed as we use bucket_id now */}
            <div className="hidden"></div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            View and manage all documents uploaded to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={documents} />
        </CardContent>
      </Card>
    </div>
  );
}