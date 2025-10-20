import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { 
  Car, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  FileText, 
  Upload,
  Download,
  Trash2,
  Edit,
  Save,
  X
} from "lucide-react";

interface AccidentRecord {
  id: string;
  no: number;
  vehicle_number: string;
  accident_date: string;
  bl_number?: string;
  Driver?: string;
  details_of_accident?: string;
  estimate_amount?: number;
  approved_amount?: number;
  process_details?: string;
  accident_mark: boolean;
  salvage: boolean;
  salvage_disposition?: string;
  salvage_value?: number;
  salvage_sale_date?: string;
  reported_by?: string;
  location?: string;
  insurer_claim_ref?: string;
  status: string;
  ari_status?: string;
  created_at: string;
  updated_at: string;
}

interface AccidentDocument {
  id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  version: number;
  uploaded_at: string;
  download_url?: string;
  document_type: string;
}

interface AccidentDetailsModalProps {
  accident: AccidentRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AccidentDetailsModal({ accident, open, onOpenChange, onUpdate }: AccidentDetailsModalProps) {
  const { hasRole } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<AccidentDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<string>('License');
  
  const [formData, setFormData] = useState<Partial<AccidentRecord>>({});

  const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  useEffect(() => {
    if (accident) {
      setFormData(accident);
      fetchDocuments();
    }
  }, [accident]);

  const fetchDocuments = async () => {
    try {
      // Only fetch documents if we have an accident ID
      if (!accident?.id) {
        setDocuments([]);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-documents/${accident.id}/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('No documents found for this accident');
        setDocuments([]);
        return;
      }

      const result = await response.json();
      setDocuments(result.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-records', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success('Accident record updated successfully');
      setEditMode(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating accident:', error);
      toast.error(error.message || 'Failed to update accident record');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !isAdmin) return;

    const file = event.target.files[0];
    
    // Validate file type
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 
      'image/tiff', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain', // .txt
      'application/rtf', // .rtf
      'application/vnd.oasis.opendocument.text', // .odt
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Other
      'text/csv', 'application/json', 'application/xml', 'text/xml'
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not supported. Please upload images, documents, or common file formats.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('documentType', documentType);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-documents/${accident.id}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-documents/${accident.id}/documents`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'NO', 'VehicleNumber', 'AccidentDate', 'BLNumber', 'DetailsOfAccident',
      'EstimateAmount', 'ApprovedAmount', 'ProcessDetails', 'AccidentMark', 'Salvage',
      'ReportedBy', 'Location', 'InsurerClaimRef', 'CreatedAt', 'UpdatedAt'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      '1,BUS001,2024-01-15,BL001,Sample accident details,50000,45000,Claim processed,false,false,John Doe,Colombo,REF001,2024-01-15,2024-01-15';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accident_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Accident Details - {accident.vehicle_number}
            {editMode && <Badge variant="secondary">Editing</Badge>}
          </DialogTitle>
          <DialogDescription>
            Accident No: {accident.no} | Date: {format(parseISO(accident.accident_date), 'MMM dd, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              {isAdmin && (
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button size="sm" onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setEditMode(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="vehicle_number">Vehicle Number</Label>
                <Input
                  id="vehicle_number"
                  value={formData.vehicle_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
                  disabled={!editMode}
                />
              </div>
              
              <div>
                <Label htmlFor="accident_date">Accident Date</Label>
                <Input
                  id="accident_date"
                  type="date"
                  value={formData.accident_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, accident_date: e.target.value }))}
                  disabled={!editMode}
                />
              </div>

              <div>
                <Label htmlFor="bl_number">BL Number (Optional)</Label>
                <Input
                  id="bl_number"
                  value={formData.bl_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, bl_number: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Leave empty if not available"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be unique across all records
                </p>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  disabled={!editMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reported">Reported</SelectItem>
                    <SelectItem value="Estimate">Estimate</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Settlement">Settlement</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ari_status">ARI Status</Label>
                {editMode ? (
                  <Select 
                    value={formData.ari_status || 'incomplete'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ari_status: value }))}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-muted">
                    <Badge variant={formData.ari_status === 'complete' ? 'default' : 'secondary'}>
                      {formData.ari_status === 'complete' ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reported_by">Reported By</Label>
                <Input
                  id="reported_by"
                  value={formData.reported_by || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, reported_by: e.target.value }))}
                  disabled={!editMode}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  disabled={!editMode}
                />
              </div>

              <div>
                <Label htmlFor="Driver">Driver Name</Label>
                <Input
                  id="Driver"
                  value={formData.Driver || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, Driver: e.target.value }))}
                  disabled={!editMode}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="details_of_accident">Details of Accident</Label>
              <Textarea
                id="details_of_accident"
                value={formData.details_of_accident || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, details_of_accident: e.target.value }))}
                disabled={!editMode}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="process_details">Process Details</Label>
              <Textarea
                id="process_details"
                value={formData.process_details || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, process_details: e.target.value }))}
                disabled={!editMode}
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="estimate_amount">Estimate Amount (LKR)</Label>
                <Input
                  id="estimate_amount"
                  type="number"
                  value={formData.estimate_amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimate_amount: parseFloat(e.target.value) || undefined }))}
                  disabled={!editMode}
                />
              </div>
              
              <div>
                <Label htmlFor="approved_amount">Approved Amount (LKR)</Label>
                <Input
                  id="approved_amount"
                  type="number"
                  value={formData.approved_amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, approved_amount: parseFloat(e.target.value) || undefined }))}
                  disabled={!editMode}
                />
              </div>

              <div>
                <Label htmlFor="insurer_claim_ref">Insurer Claim Reference</Label>
                <Input
                  id="insurer_claim_ref"
                  value={formData.insurer_claim_ref || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, insurer_claim_ref: e.target.value }))}
                  disabled={!editMode}
                />
              </div>
            </div>

            {/* Salvage Information */}
            <Card>
              <CardHeader>
                <CardTitle>Salvage Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.salvage || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, salvage: e.target.checked }))}
                      disabled={!editMode}
                    />
                    <span>Has Salvage</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.accident_mark || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, accident_mark: e.target.checked }))}
                      disabled={!editMode}
                    />
                    <span>Accident Mark</span>
                  </label>
                </div>

                {formData.salvage && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="salvage_disposition">Salvage Disposition</Label>
                      <Select 
                        value={formData.salvage_disposition || ''} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, salvage_disposition: value }))}
                        disabled={!editMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stored">Stored</SelectItem>
                          <SelectItem value="Sold">Sold</SelectItem>
                          <SelectItem value="Disposed">Disposed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="salvage_value">Salvage Value (LKR)</Label>
                      <Input
                        id="salvage_value"
                        type="number"
                        value={formData.salvage_value || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, salvage_value: parseFloat(e.target.value) || undefined }))}
                        disabled={!editMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="salvage_sale_date">Salvage Sale Date</Label>
                      <Input
                        id="salvage_sale_date"
                        type="date"
                        value={formData.salvage_sale_date || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, salvage_sale_date: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Documents</h3>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                </div>
              )}
            </div>

            {isAdmin && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="document-type">Document Type</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger id="document-type">
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="License">License</SelectItem>
                          <SelectItem value="Estimate Receipt">Estimate Receipt</SelectItem>
                          <SelectItem value="Final Bill">Final Bill</SelectItem>
                          <SelectItem value="Part Quotation">Part Quotation</SelectItem>
                          <SelectItem value="After Repair Inspection">After Repair Inspection</SelectItem>
                          <SelectItem value="Police Report">Police Report</SelectItem>
                          <SelectItem value="Accident Photo">Accident Photo</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="file-upload"
                        disabled={uploading}
                      />
                      <Button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={uploading}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Document'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
              ) : (
                documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{doc.original_name}</p>
                            <Badge variant="outline">{doc.document_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {doc.file_type} • {(doc.file_size / 1024 / 1024).toFixed(2)}MB • v{doc.version} • 
                            {format(parseISO(doc.uploaded_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.download_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.download_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}