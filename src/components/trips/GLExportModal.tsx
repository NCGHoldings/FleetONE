import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FileSpreadsheet, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { BusDailySummary } from '@/hooks/useDailyBusGroupedTrips';
import { generateGLRows, exportToExcel, calculateGLSummary } from '@/lib/gl-export-generator';

interface GLExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busSummaries: BusDailySummary[];
  selectedDate: Date | null;
  dateRange?: { from?: Date; to?: Date };
}

export function GLExportModal({
  open,
  onOpenChange,
  busSummaries,
  selectedDate,
  dateRange,
}: GLExportModalProps) {
  const [exportMode, setExportMode] = useState<'all' | 'filled'>('filled');

  const displayDate = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    if (selectedDate) {
      return format(selectedDate, 'dd/MM/yyyy');
    }
    return 'No date selected';
  }, [selectedDate, dateRange]);

  const exportDate = selectedDate || dateRange?.from || new Date();

  const glRows = useMemo(() => {
    if (!busSummaries.length) return [];
    
    return generateGLRows({
      busSummaries,
      date: exportDate,
      exportMode,
    });
  }, [busSummaries, exportDate, exportMode]);

  const summary = useMemo(() => {
    return calculateGLSummary(glRows);
  }, [glRows]);

  const handleExport = () => {
    if (!busSummaries.length) {
      toast.error('No data available to export');
      return;
    }

    try {
      exportToExcel(glRows, exportDate);
      toast.success('GL export generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate export. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export to GL Format
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range Display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              {displayDate}
            </div>
          </div>

          {/* Export Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Mode</Label>
            <RadioGroup value={exportMode} onValueChange={(value) => setExportMode(value as 'all' | 'filled')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All Categories (Include all GL codes)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filled" id="filled" />
                <Label htmlFor="filled" className="font-normal cursor-pointer">
                  Only Filled Categories (Exclude zero entries)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview Summary */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Export Preview</Label>
            <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buses:</span>
                <span className="font-medium">{summary.busCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue:</span>
                <span className="font-medium text-green-600">
                  Rs. {summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Expenses:</span>
                <span className="font-medium text-red-600">
                  Rs. {summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Total GL Entries:</span>
                <span className="font-medium">{summary.entryCount} rows</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!busSummaries.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
