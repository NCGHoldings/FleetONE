import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import ComplaintQRGenerator from "@/components/complaints/ComplaintQRGenerator";
import { Clock, FileText, AlertTriangle, CheckCircle, XCircle, User, Plus, X, UserPlus, Smile, Frown, Calendar, Flag } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

interface RelatedPerson {
  name: string;
  role: string;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

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
  assigned_to?: string;
  assigned_to_name?: string;
  action_taken?: string;
  related_persons?: RelatedPerson[];
  sla_due_date?: string;
}

const defaultFormData = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  type: 'complaint',
  staff_group: '',
  status: 'new',
  assigned_to: '',
  action_taken: '',
  routeNumber: '',
  busNumber: '',
  incidentDate: '',
  incidentTime: '',
  location: '',
  driverName: ''
};

export default function Complaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [managingComplaint, setManagingComplaint] = useState<Complaint | null>(null);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [relatedPersons, setRelatedPersons] = useState<RelatedPerson[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');
  const [formData, setFormData] = useState({ ...defaultFormData });
  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name')
        .order('first_name');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const transformedData = (data || []).map(item => ({
        ...item,
        related_persons: ((item.related_persons as unknown) as RelatedPerson[]) || []
      }));
      setComplaints(transformedData);
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

  const calculateSLA = (complaint: Complaint) => {
    if (complaint.status === 'resolved') return <span className="text-success">Resolved</span>;
    
    const dueDate = complaint.sla_due_date ? new Date(complaint.sla_due_date) : null;
    if (!dueDate) return <span className="text-muted-foreground">N/A</span>;
    
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hoursDiff = Math.floor(diff / (1000 * 60 * 60));
    
    if (diff < 0) return <span className="text-destructive font-semibold">Overdue</span>;
    if (hoursDiff < 8) return <span className="text-warning font-semibold">{hoursDiff}h left</span>;
    
    const daysDiff = Math.ceil(hoursDiff / 8);
    return <span className="text-success">{daysDiff}d left</span>;
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
      
      const incidentDetails: Record<string, string> = {};
      if (formData.routeNumber) incidentDetails.route_number = formData.routeNumber;
      if (formData.busNumber) incidentDetails.bus_number = formData.busNumber;
      if (formData.incidentDate) incidentDetails.incident_date = formData.incidentDate;
      if (formData.incidentTime) incidentDetails.incident_time = formData.incidentTime;
      if (formData.location) incidentDetails.location = formData.location;
      if (formData.driverName) incidentDetails.driver_name = formData.driverName;

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
          escalation_level: 1,
          related_persons: Object.keys(incidentDetails).length > 0 ? incidentDetails : null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint created successfully",
      });

      // Reset form and close dialog
      setFormData({ ...defaultFormData });
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

  const handleEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    const rp = (complaint.related_persons as any) || {};
    setFormData({
      ...defaultFormData,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      type: complaint.type,
      staff_group: complaint.staff_group || '',
      status: complaint.status || 'new',
      assigned_to: complaint.assigned_to || '',
      action_taken: complaint.action_taken || '',
      routeNumber: rp.route_number || '',
      busNumber: rp.bus_number || '',
      incidentDate: rp.incident_date || '',
      incidentTime: rp.incident_time || '',
      location: rp.location || '',
      driverName: rp.driver_name || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category || !editingComplaint) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('feedback_complaints')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          type: formData.type,
          staff_group: formData.staff_group || null,
        })
        .eq('id', editingComplaint.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint updated successfully",
      });

      setFormData({ ...defaultFormData });
      setShowEditDialog(false);
      setEditingComplaint(null);
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (complaintId: string) => {
    if (!confirm('Are you sure you want to delete this complaint?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('feedback_complaints')
        .delete()
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint deleted successfully",
      });

      fetchComplaints();
    } catch (error) {
      console.error('Error deleting complaint:', error);
      toast({
        title: "Error",
        description: "Failed to delete complaint",
        variant: "destructive",
      });
    }
  };

  const handleManage = (complaint: Complaint) => {
    setManagingComplaint(complaint);
    setRelatedPersons(complaint.related_persons || []);
    const rpManage = (complaint.related_persons as any) || {};
    setFormData({
      ...defaultFormData,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      type: complaint.type,
      staff_group: complaint.staff_group || '',
      status: complaint.status || 'new',
      assigned_to: complaint.assigned_to || '',
      action_taken: complaint.action_taken || '',
      routeNumber: rpManage.route_number || '',
      busNumber: rpManage.bus_number || '',
      incidentDate: rpManage.incident_date || '',
      incidentTime: rpManage.incident_time || '',
      location: rpManage.location || '',
      driverName: rpManage.driver_name || ''
    });
    setShowManageDialog(true);
  };

  const handleManageUpdate = async () => {
    if (!managingComplaint) return;

    try {
      const { error } = await supabase
        .from('feedback_complaints')
        .update({
          status: formData.status,
          assigned_to: null, // Keep as null since we're using text input
          assigned_to_name: formData.assigned_to || null, // Store the typed name here
          action_taken: formData.action_taken || null,
          related_persons: (relatedPersons.length > 0 ? relatedPersons : null) as any,
          resolved_at: formData.status === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', managingComplaint.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint updated successfully",
      });

      setShowManageDialog(false);
      setManagingComplaint(null);
      setRelatedPersons([]);
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint",
        variant: "destructive",
      });
    }
  };

  const addRelatedPerson = () => {
    if (!newPersonName.trim() || !newPersonRole.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and role",
        variant: "destructive",
      });
      return;
    }

    setRelatedPersons([...relatedPersons, { name: newPersonName, role: newPersonRole }]);
    setNewPersonName('');
    setNewPersonRole('');
  };

  const removeRelatedPerson = (index: number) => {
    setRelatedPersons(relatedPersons.filter((_, i) => i !== index));
  };

  const columns: ColumnDef<Complaint>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.getValue("type") === 'feedback' ? (
            <Badge className="bg-success text-success-foreground">
              <Smile className="h-3 w-3 mr-1" />
              Feedback
            </Badge>
          ) : (
            <Badge className="bg-destructive text-destructive-foreground">
              <Frown className="h-3 w-3 mr-1" />
              Complaint
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "feedback_id",
      header: "ID",
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
          {calculateSLA(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "assigned_to_name",
      header: "Assigned To",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {row.getValue("assigned_to_name") || "Unassigned"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => handleManage(row.original)}
          >
            <User className="h-4 w-4 mr-1" />
            Manage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedComplaint(row.original)}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            Delete
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
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">
                    <div className="flex items-center gap-2">
                      <Frown className="h-4 w-4" />
                      Complaint
                    </div>
                  </SelectItem>
                  <SelectItem value="feedback">
                    <div className="flex items-center gap-2">
                      <Smile className="h-4 w-4" />
                      Good Feedback
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description"
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

      {/* Edit Complaint Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Complaint</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the complaint"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Category *</Label>
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
              <Label htmlFor="edit-priority">Priority</Label>
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
              <Label htmlFor="edit-staff-group">Related Staff Group</Label>
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
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the complaint"
                rows={4}
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Complaint
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Complaint Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage {managingComplaint?.type === 'feedback' ? 'Feedback' : 'Complaint'} - {managingComplaint?.feedback_id}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status & Assignment</TabsTrigger>
              <TabsTrigger value="action">Action Taken</TabsTrigger>
              <TabsTrigger value="persons">Related Persons</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="manage-status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        New
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        In Progress
                      </div>
                    </SelectItem>
                    <SelectItem value="resolved">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Resolved
                      </div>
                    </SelectItem>
                    <SelectItem value="escalated">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Escalated
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="manage-assigned">Assign To Staff</Label>
                <Input
                  id="manage-assigned"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  placeholder="Enter staff name or leave empty for unassigned"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">SLA Status</Label>
                <div className="mt-2 p-3 border rounded-md">
                  {managingComplaint && calculateSLA(managingComplaint)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="action" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="manage-action">Action Taken</Label>
                <Textarea
                  id="manage-action"
                  value={formData.action_taken}
                  onChange={(e) => setFormData(prev => ({ ...prev, action_taken: e.target.value }))}
                  placeholder="Describe what actions were taken to address this complaint or feedback..."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Document any steps taken, communications made, or resolutions implemented.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="persons" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label>Related Persons</Label>
                
                {relatedPersons.length > 0 && (
                  <div className="space-y-2">
                    {relatedPersons.map((person, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">{person.role}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRelatedPerson(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="person-name">Person Name</Label>
                    <Input
                      id="person-name"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="person-role">Role/Involvement</Label>
                    <Input
                      id="person-role"
                      value={newPersonRole}
                      onChange={(e) => setNewPersonRole(e.target.value)}
                      placeholder="e.g., Driver, Witness"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addRelatedPerson}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowManageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleManageUpdate}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Complaint Dialog */}
      {selectedComplaint && (
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedComplaint.type === 'feedback' ? 'Feedback' : 'Complaint'} Details - {selectedComplaint.feedback_id}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  {selectedComplaint.type === 'feedback' ? (
                    <Badge className="bg-success text-success-foreground mt-1">
                      <Smile className="h-3 w-3 mr-1" />
                      Good Feedback
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive text-destructive-foreground mt-1">
                      <Frown className="h-3 w-3 mr-1" />
                      Complaint
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedComplaint.status)}>
                      {selectedComplaint.status}
                    </Badge>
                  </div>
                </div>
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
                <Label className="text-sm font-medium">Assigned To</Label>
                <p className="mt-1">{selectedComplaint.assigned_to_name || 'Unassigned'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedComplaint.description}</p>
              </div>

              {selectedComplaint.action_taken && (
                <div>
                  <Label className="text-sm font-medium">Action Taken</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedComplaint.action_taken}</p>
                </div>
              )}

              {selectedComplaint.related_persons && selectedComplaint.related_persons.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Related Persons</Label>
                  <div className="mt-2 space-y-2">
                    {selectedComplaint.related_persons.map((person, index) => (
                      <div key={index} className="p-2 border rounded-md bg-muted/50">
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedComplaint.resolution && (
                <div>
                  <Label className="text-sm font-medium">Resolution</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedComplaint.resolution}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm border-t pt-4">
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