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
  linked_table: string;
  linked_row_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  storage_path: string;
  tag: string;
  uploaded_at: string;
  uploaded_by: string;
  description?: string;
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const fetchDocuments = async () => {
    try {
      let query = supabase.from('documents').select('*').order('uploaded_at', { ascending: false });

      if (selectedTable) {
        query = query.eq('linked_table', selectedTable);
      }

      if (selectedTag) {
        query = query.eq('tag', selectedTag);
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
  }, [searchTerm, selectedTable, selectedTag]);

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
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
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (documentId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

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
        <div className="flex items-center gap-2">
          {getFileIcon(row.original.file_type)}
          <span className="font-medium">{row.getValue("file_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "linked_table",
      header: "Table",
      cell: ({ row }) => (
        <Badge variant="outline">
          {(row.getValue("linked_table") as string).replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: "tag",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("tag")}</Badge>
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
            onClick={() => window.open(row.original.file_url, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDownload(row.original.file_url, row.original.file_name)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row.original.id, row.original.storage_path)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
  const uniqueTables = [...new Set(documents.map(doc => doc.linked_table))];
  const uniqueTags = [...new Set(documents.map(doc => doc.tag))];

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
            <CardTitle className="text-sm font-medium">Tables</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTables.length}</div>
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
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
              >
                <option value="">All Tables</option>
                {uniqueTables.map(table => (
                  <option key={table} value={table}>
                    {table.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Types</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
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