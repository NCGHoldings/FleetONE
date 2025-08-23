import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { Clock, FileText, AlertTriangle, CheckCircle, XCircle, User, Phone, Bus, MapPin, Flag, Calendar } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

interface Complaint {
  id: string;
  feedback_id: string;
  feedback_date: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  type: string;
  current_handler?: string;
  staff_group?: string;
  resolution?: string;
  escalation_level: number;
  created_at: string;
  resolved_at?: string;
}

export default function Complaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch complaints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-warning text-warning-foreground';
      case 'escalated': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const calculateSLA = (createdAt: string, status: string) => {
    if (status === 'resolved') return 'Resolved';
    
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (hoursDiff > 48) return 'Overdue';
    if (hoursDiff > 24) return 'Due Soon';
    return `${48 - hoursDiff}h remaining`;
  };

  const columns: ColumnDef<Complaint>[] = [
    {
      accessorKey: "feedback_id",
      header: "Complaint ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("feedback_id") || `CMP-${row.original.id.slice(-6)}`}</div>
      ),
    },
    {
      accessorKey: "feedback_date",
      header: "Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {new Date(row.getValue("feedback_date")).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("category")}</Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge className={getPriorityColor(row.getValue("priority"))}>
          <Flag className="h-3 w-3 mr-1" />
          {row.getValue("priority")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.getValue("status"))}>
          {row.getValue("status") === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
          {row.getValue("status") === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
          {row.getValue("status") === 'escalated' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "sla",
      header: "SLA Status",
      cell: ({ row }) => (
        <div className="text-sm">
          {calculateSLA(row.original.created_at, row.original.status)}
        </div>
      ),
    },
    {
      accessorKey: "current_handler",
      header: "Assigned To",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {row.getValue("current_handler") || "Unassigned"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedComplaint(row.original)}
          >
            <FileText className="h-4 w-4" />
            View
          </Button>
          <DocumentUpload
            linkedTable="feedback_complaints"
            linkedRowId={row.original.id}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaints Management</h1>
          <p className="text-muted-foreground">
            Track and resolve customer complaints efficiently
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          Add New Complaint
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complaints.filter(c => c.status !== 'resolved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complaints.filter(c => c.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complaints.filter(c => c.priority === 'high').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={complaints}
        searchKey="title"
        title="Complaints"
      />

      {/* View Complaint Dialog */}
      {selectedComplaint && (
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Complaint Details - {selectedComplaint.feedback_id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p>{selectedComplaint.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={getPriorityColor(selectedComplaint.priority)}>
                    {selectedComplaint.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedComplaint.description}</p>
              </div>
              {selectedComplaint.resolution && (
                <div>
                  <Label className="text-sm font-medium">Resolution</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedComplaint.resolution}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span>Created: {new Date(selectedComplaint.created_at).toLocaleString()}</span>
                {selectedComplaint.resolved_at && (
                  <span>Resolved: {new Date(selectedComplaint.resolved_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}