import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdvanceDetails } from '@/hooks/useAdvanceDetails';
import AdvanceDetailsForm from './AdvanceDetailsForm';
import AdvanceDetailsPreview from './AdvanceDetailsPreview';
import { Loader2, FileText, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { AdvanceDetailsData } from '@/lib/advance-details-generator';

interface AdvanceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    quotation_no: string;
    pickup_date: string;
    pickup_location: string;
    drop_location: string;
    total_days: number;
  };
  paymentId?: string;
}

export default function AdvanceDetailsModal({
  open,
  onClose,
  quotation,
  paymentId,
}: AdvanceDetailsModalProps) {
  const { loading, fetchAdvanceDetails, saveAdvanceDetails } = useAdvanceDetails();
  const [existingData, setExistingData] = useState<any>(null);
  const [previewData, setPreviewData] = useState<AdvanceDetailsData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open) {
      loadExistingData();
    }
  }, [open, quotation.id]);

  const loadExistingData = async () => {
    const data = await fetchAdvanceDetails(quotation.id);
    setExistingData(data);
    if (data) {
      if (data.status === 'completed') {
        setActiveTab('preview');
        setPreviewData(data);
      } else {
        setActiveTab('form');
        setIsEditing(true);
      }
    } else {
      setActiveTab('form');
      setIsEditing(true);
    }
  };

  const handleSaveDraft = async (data: AdvanceDetailsData) => {
    const result = await saveAdvanceDetails({
      ...data,
      quotationId: quotation.id,
      paymentId,
      id: existingData?.id,
      status: 'draft',
    });

    if (result.success) {
      await loadExistingData();
    }
  };

  const handlePreview = (data: AdvanceDetailsData) => {
    setPreviewData(data);
    setActiveTab('preview');
  };

  const handleSaveComplete = async (pdfBase64: string) => {
    if (!previewData) return;

    const result = await saveAdvanceDetails({
      ...previewData,
      quotationId: quotation.id,
      paymentId,
      id: existingData?.id,
      status: 'completed',
      pdfDocumentData: pdfBase64,
    });

    if (result.success) {
      toast.success('Advance details saved and PDF generated!');
      await loadExistingData();
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setActiveTab('form');
  };

  const getStatusBadge = () => {
    if (!existingData) return null;
    
    const statusColors = {
      draft: 'bg-yellow-500',
      completed: 'bg-green-500',
      void: 'bg-gray-500',
    };

    return (
      <Badge className={statusColors[existingData.status as keyof typeof statusColors]}>
        {existingData.status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Advance Payment Details
            </DialogTitle>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        {loading && !existingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'form' | 'preview')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="form" disabled={!isEditing && existingData?.status === 'completed'}>
                  <Edit className="w-4 h-4 mr-2" />
                  Form
                </TabsTrigger>
                <TabsTrigger value="preview" disabled={!previewData}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {existingData?.status === 'completed' && activeTab === 'preview' && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            <TabsContent value="form">
              <AdvanceDetailsForm
                quotationNo={quotation.quotation_no}
                hireDate={new Date(quotation.pickup_date)}
                pickupLocation={quotation.pickup_location}
                dropLocation={quotation.drop_location}
                numberOfDays={quotation.total_days}
                existingData={existingData}
                onSaveDraft={handleSaveDraft}
                onPreview={handlePreview}
                disabled={!isEditing}
              />
            </TabsContent>

            <TabsContent value="preview">
              {previewData && (
                <AdvanceDetailsPreview
                  data={previewData}
                  onDownload={existingData?.status !== 'completed' ? handleSaveComplete : undefined}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
