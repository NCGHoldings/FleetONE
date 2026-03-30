// @ts-nocheck
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useVehicleSalesTemplates, VehicleSalesTemplate } from '@/hooks/useVehicleSalesTemplates';
import { FileText, Image } from 'lucide-react';

interface LightVehicleInvoiceTemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateChange: (template: VehicleSalesTemplate | null) => void;
}

export function LightVehicleInvoiceTemplateSelector({
  selectedTemplateId,
  onTemplateChange,
}: LightVehicleInvoiceTemplateSelectorProps) {
  const { data: templates, isLoading } = useVehicleSalesTemplates('light_vehicle_sales' as any, 'lightvehicle_order_invoice');

  const handleChange = (value: string) => {
    if (value === '_default') {
      onTemplateChange(null);
    } else {
      const template = templates?.find(t => t.id === value);
      onTemplateChange(template || null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        <FileText className="h-4 w-4 inline mr-1" />
        Template:
      </Label>
      <Select
        value={selectedTemplateId || '_default'}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[220px] h-8">
          <SelectValue placeholder="Select template..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_default">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Default Template</span>
            </div>
          </SelectItem>
          {templates?.map(template => (
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
  );
}
