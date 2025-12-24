import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Receipt, 
  Calculator, 
  FileCheck,
  Eye,
  Edit,
  Download,
  History,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useDocumentFlow, DocumentFlowStep, DocumentType } from '@/hooks/useDocumentFlow';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentVersionHistory } from './DocumentVersionHistory';
import { cn } from '@/lib/utils';

interface DocumentFlowDashboardProps {
  quotationId: string;
  quotationData: any;
  onDocumentGenerated?: () => void;
  onDocumentEdited?: () => void;
}

const documentIcons: Record<DocumentType, React.ReactNode> = {
  quotation: <FileText className="h-5 w-5" />,
  advance_receipt: <Receipt className="h-5 w-5" />,
  post_trip_adjustment: <Calculator className="h-5 w-5" />,
  balance_invoice: <FileCheck className="h-5 w-5" />,
  sales_receipt: <Receipt className="h-5 w-5" />
};

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  draft: <AlertCircle className="h-4 w-4" />,
  ready: <FileText className="h-4 w-4" />,
  sent: <ArrowRight className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />
};

export function DocumentFlowDashboard({ 
  quotationId, 
  quotationData,
  onDocumentGenerated,
  onDocumentEdited 
}: DocumentFlowDashboardProps) {
  const { flowState, loading, refresh } = useDocumentFlow(quotationId);
  const [selectedStep, setSelectedStep] = useState<DocumentFlowStep | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewMode, setPreviewMode] = useState<'view' | 'edit'>('view');

  if (loading || !flowState) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleViewDocument = (step: DocumentFlowStep) => {
    setSelectedStep(step);
    setPreviewMode('view');
    setShowPreview(true);
  };

  const handleEditDocument = (step: DocumentFlowStep) => {
    setSelectedStep(step);
    setPreviewMode('edit');
    setShowPreview(true);
  };

  const handleViewHistory = (step: DocumentFlowStep) => {
    setSelectedStep(step);
    setShowHistory(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setSelectedStep(null);
    refresh();
    onDocumentEdited?.();
  };

  const handleHistoryClose = () => {
    setShowHistory(false);
    setSelectedStep(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Document Flow
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {flowState.quotationNo} • Trip Status: 
                <Badge variant="outline" className="ml-2 capitalize">
                  {flowState.tripStatus.replace(/_/g, ' ')}
                </Badge>
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Visual Flow Diagram */}
          <div className="relative">
            {/* Connection Lines */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
            
            {/* Steps */}
            <div className="relative z-10 grid grid-cols-4 gap-4">
              {flowState.steps.map((step, index) => (
                <div key={step.type} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 bg-background transition-all",
                      step.status === 'completed' && "border-green-500 bg-green-50 dark:bg-green-950",
                      step.status === 'sent' && "border-purple-500 bg-purple-50 dark:bg-purple-950",
                      step.status === 'ready' && "border-blue-500 bg-blue-50 dark:bg-blue-950",
                      step.status === 'draft' && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
                      step.status === 'pending' && "border-muted-foreground/30 bg-muted"
                    )}
                  >
                    <div className={cn(
                      step.status === 'completed' && "text-green-600",
                      step.status === 'sent' && "text-purple-600",
                      step.status === 'ready' && "text-blue-600",
                      step.status === 'draft' && "text-yellow-600",
                      step.status === 'pending' && "text-muted-foreground"
                    )}>
                      {documentIcons[step.type]}
                    </div>
                  </div>

                  {/* Arrow to next */}
                  {index < flowState.steps.length - 1 && (
                    <ChevronRight 
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-5 w-5",
                        step.status === 'completed' ? "text-green-500" : "text-muted-foreground/30"
                      )}
                      style={{ left: `calc(${(index + 1) * 25}% - 10px)` }}
                    />
                  )}

                  {/* Step Info */}
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium">{step.label}</p>
                    <Badge 
                      variant="secondary" 
                      className={cn("mt-1 text-xs", statusColors[step.status])}
                    >
                      {statusIcons[step.status]}
                      <span className="ml-1 capitalize">{step.status}</span>
                    </Badge>
                  </div>

                  {/* Version Info */}
                  {step.currentVersion && (
                    <p className="text-xs text-muted-foreground mt-1">
                      v{step.currentVersion.version_number}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1 mt-3">
                    {step.status !== 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDocument(step)}
                        className="h-7 px-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {step.canEdit && step.status !== 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditDocument(step)}
                        className="h-7 px-2"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {step.allVersions.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewHistory(step)}
                        className="h-7 px-2"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Document Details List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Document Details</h4>
            {flowState.steps.map((step) => (
              <div 
                key={step.type}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  step.status === 'pending' && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    statusColors[step.status]
                  )}>
                    {documentIcons[step.type]}
                  </div>
                  <div>
                    <p className="font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {step.allVersions.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {step.allVersions.length} version{step.allVersions.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  
                  <div className="flex gap-1">
                    {step.status !== 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDocument(step)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {step.canEdit && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditDocument(step)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </>
                    )}
                    {step.canGenerate && step.status === 'pending' && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleEditDocument(step)}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {selectedStep && showPreview && (
        <DocumentPreviewModal
          isOpen={showPreview}
          onClose={handlePreviewClose}
          documentType={selectedStep.type}
          quotationData={quotationData}
          existingVersion={selectedStep.currentVersion}
          mode={previewMode}
          onSave={() => {
            refresh();
            onDocumentGenerated?.();
          }}
        />
      )}

      {/* Version History Modal */}
      {selectedStep && showHistory && (
        <DocumentVersionHistory
          isOpen={showHistory}
          onClose={handleHistoryClose}
          quotationId={quotationId}
          documentType={selectedStep.type}
          versions={selectedStep.allVersions}
          onRestore={() => {
            refresh();
            handleHistoryClose();
          }}
        />
      )}
    </>
  );
}
