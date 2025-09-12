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
import ComplaintQRGenerator from "@/components/complaints/ComplaintQRGenerator";
import { Clock, FileText, AlertTriangle, CheckCircle, XCircle, User, Phone, Bus, MapPin, Flag, Calendar, Plus } from "lucide-react";
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
  reported_by?: string;
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    type: 'complaint',
    staff_group: ''
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      // Get the user's profile ID (not auth user ID)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Error",
          description: "User profile not found",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from('feedback_complaints')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          type: formData.type,
          staff_group: formData.staff_group || null,
          status: 'new',
          reported_by: profile.id,
          escalation_level: 1
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint created successfully",
      });

      // Reset form and close dialog
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        type: 'complaint',
        staff_group: ''
      });
      setShowAddDialog(false);
      
      // Refresh the complaints list
      fetchComplaints();
    } catch (error) {
      console.error('Error creating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to create complaint",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Complaint>[] = [
    {
      accessorKey: "feedback_id",
      header: "Complaint ID",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="font-medium">{row.getValue("feedback_id") || `CMP-${row.original.id.slice(-6)}`}</div>
          {!row.original.reported_by && (
            <Badge variant="outline" className="text-xs">
              Anonymous
            </Badge>
          )}
        </div>
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
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-destructive via-destructive to-primary p-8 text-destructive-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <AlertTriangle className="w-10 h-10 animate-wiggle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Complaints Management
              </h1>
              <p className="text-destructive-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Track, resolve, and prevent customer complaints efficiently
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 animate-scale-in"
            style={{ animationDelay: '0.2s' }}
          >
            <Plus className="w-4 h-4 mr-2 animate-pulse-subtle" />
            Add New Complaint
          </Button>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced Stats Cards with Animations */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <Card className="professional-card hover:shadow-primary transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground group-hover:animate-bounce-subtle" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complaints.length}</div>
            </CardContent>
          </Card>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <Card className="professional-card hover:shadow-warning transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning group-hover:animate-pulse-subtle" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {complaints.filter(c => c.status !== 'resolved').length}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <Card className="professional-card hover:shadow-success transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success group-hover:animate-bounce-notification" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {complaints.filter(c => c.status === 'resolved').length}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <Card className="professional-card hover:shadow-destructive transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive group-hover:animate-wiggle" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {complaints.filter(c => c.priority === 'high').length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Generator Section */}
      <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <ComplaintQRGenerator />
      </div>

      <DataTable
        columns={columns}
        data={complaints}
        searchKey="title"
        title="Complaints"
      />

      {/* Add Complaint Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Complaint</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the complaint"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service Quality</SelectItem>
                  <SelectItem value="driver">Driver Behavior</SelectItem>
                  <SelectItem value="vehicle">Vehicle Condition</SelectItem>
                  <SelectItem value="scheduling">Scheduling</SelectItem>
                  <SelectItem value="safety">Safety Concerns</SelectItem>
                  <SelectItem value="billing">Billing Issues</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="staff_group">Related Staff Group</Label>
              <Select value={formData.staff_group} onValueChange={(value) => setFormData(prev => ({ ...prev, staff_group: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drivers">Drivers</SelectItem>
                  <SelectItem value="conductors">Conductors</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="administration">Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the complaint"
                rows={4}
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Complaint
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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