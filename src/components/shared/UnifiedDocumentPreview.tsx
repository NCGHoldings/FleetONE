import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Printer, Mail, FileText, Image, Loader2 } from 'lucide-react';
import { useVehicleSalesTemplates, VehicleSalesTemplate } from '@/hooks/useVehicleSalesTemplates';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface UnifiedDocumentPreviewProps {
  // HTML content to render
  htmlContent: string;
  
  // Document info for actions
  documentNumber?: string;
  documentType?: string;
  
  // Template configuration
  module?: 'yutong_sales' | 'sinotruck_sales' | 'light_vehicle_sales';
  templateTypeCode?: string;
  
  // Callbacks
  onTemplateChange?: (template: VehicleSalesTemplate | null) => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  
  // Optional custom actions
  actions?: React.ReactNode;
  
  // Height customization
  height?: string;
  
  // Show template selector
  showTemplateSelector?: boolean;
}

export function UnifiedDocumentPreview({
  htmlContent,
  documentNumber,
  documentType = 'Document',
  module,
  templateTypeCode,
  onTemplateChange,
  onDownload,
  onPrint,
  onEmail,
  actions,
  height = 'calc(90vh - 280px)',
  showTemplateSelector = true,
}: UnifiedDocumentPreviewProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Fetch templates if module and type are provided
  const { data: templates, isLoading: templatesLoading } = useVehicleSalesTemplates(
    module || 'yutong_sales',
    templateTypeCode
  );
  
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => t.is_active);
  }, [templates]);

  const handleTemplateChange = (value: string) => {
    if (value === '_default') {
      setSelectedTemplateId(null);
      onTemplateChange?.(null);
    } else {
      setSelectedTemplateId(value);
      const template = filteredTemplates.find(t => t.id === value);
      onTemplateChange?.(template || null);
    }
  };

  const handleDefaultDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    
    setIsDownloading(true);
    try {
      // Create temporary container
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '900px';
      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      
      document.body.removeChild(container);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
      pdf.save(`${documentNumber || 'document'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDefaultPrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          {showTemplateSelector && module && templateTypeCode && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                <FileText className="h-4 w-4 inline mr-1" />
                Template:
              </Label>
              <Select
                value={selectedTemplateId || '_default'}
                onValueChange={handleTemplateChange}
                disabled={templatesLoading}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Default Template</span>
                    </div>
                  </SelectItem>
                  {filteredTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.header_image_url ? (
                          <Image className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{template.template_name}</span>
                        {template.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onEmail && (
            <Button size="sm" variant="outline" onClick={onEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDefaultDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
          
          <Button size="sm" variant="outline" onClick={handleDefaultPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          
          {actions}
        </div>
      </div>
      
      {/* Preview Area */}
      <div 
        className="border rounded-lg overflow-hidden bg-white mt-4 flex-1"
        style={{ height }}
      >
        <iframe
          srcDoc={htmlContent}
          title={`${documentType} Preview`}
          className="w-full h-full border-0"
          style={{ minHeight: '600px', background: 'white' }}
        />
      </div>
    </div>
  );
}
