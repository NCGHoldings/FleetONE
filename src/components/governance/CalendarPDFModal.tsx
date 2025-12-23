import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Calendar, Loader2 } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { generateGovernanceCalendarPDF } from '@/lib/governance-calendar-pdf';
import { useGovernanceOccurrencesRange, useHolidaysRange } from '@/hooks/useGovernanceOccurrencesRange';
import { toast } from 'sonner';

interface CalendarPDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  filters: {
    selectedCompanies: string[];
    selectedSBUs: string[];
    selectedTypes: string[];
    selectedCategories: string[];
    selectedStatuses: string[];
  };
}

export const CalendarPDFModal = ({ open, onOpenChange, currentDate, filters }: CalendarPDFModalProps) => {
  // Generate 12 months starting from current month
  const availableMonths = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = addMonths(start, 11);
    return eachMonthOfInterval({ start, end });
  }, [currentDate]);

  const [selectedMonths, setSelectedMonths] = useState<Date[]>([startOfMonth(currentDate)]);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [showCompanyNames, setShowCompanyNames] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate date range for fetching data
  const dateRange = useMemo(() => {
    if (selectedMonths.length === 0) {
      return { start: currentDate, end: currentDate };
    }
    const sorted = [...selectedMonths].sort((a, b) => a.getTime() - b.getTime());
    return {
      start: sorted[0],
      end: sorted[sorted.length - 1],
    };
  }, [selectedMonths, currentDate]);

  // Fetch data for selected range
  const { data: occurrences = [], isLoading: isLoadingOccurrences } = useGovernanceOccurrencesRange({
    startDate: dateRange.start,
    endDate: dateRange.end,
    companyIds: filters.selectedCompanies,
    sbuIds: filters.selectedSBUs,
    types: filters.selectedTypes,
    categories: filters.selectedCategories,
    statuses: filters.selectedStatuses,
    enabled: open && selectedMonths.length > 0,
  });

  const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidaysRange(
    dateRange.start,
    dateRange.end,
    open && selectedMonths.length > 0 && includeHolidays
  );

  const toggleMonth = (month: Date) => {
    setSelectedMonths(prev => {
      const exists = prev.some(m => m.getTime() === month.getTime());
      if (exists) {
        return prev.filter(m => m.getTime() !== month.getTime());
      }
      return [...prev, month].sort((a, b) => a.getTime() - b.getTime());
    });
  };

  const selectAll = () => setSelectedMonths(availableMonths);
  const clearAll = () => setSelectedMonths([]);

  const handleGenerate = async () => {
    if (selectedMonths.length === 0) {
      toast.error('Please select at least one month');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Build filter info string
      const filterParts: string[] = [];
      if (filters.selectedCompanies.length > 0) {
        filterParts.push(`Companies: ${filters.selectedCompanies.length} selected`);
      }
      if (filters.selectedStatuses.length > 0) {
        filterParts.push(`Status: ${filters.selectedStatuses.join(', ')}`);
      }
      const filterInfo = filterParts.length > 0 ? filterParts.join(' | ') : 'All items';

      // Generate PDF
      generateGovernanceCalendarPDF({
        occurrences,
        holidays: includeHolidays ? holidays : [],
        months: selectedMonths,
        includeHolidays,
        showCompanyNames,
        includeLegend,
        filterInfo,
      });

      toast.success(`PDF generated with ${selectedMonths.length} page(s)`);
      onOpenChange(false);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isLoadingOccurrences || isLoadingHolidays;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Calendar PDF
          </DialogTitle>
          <DialogDescription>
            Select months to include in your PDF export. Each month will be on a separate A4 page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Months</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[180px] rounded-md border p-3">
              <div className="grid grid-cols-3 gap-2">
                {availableMonths.map((month) => {
                  const isSelected = selectedMonths.some(m => m.getTime() === month.getTime());
                  const monthOccCount = occurrences.filter(occ => {
                    const occDate = new Date(occ.scheduled_date);
                    return occDate >= startOfMonth(month) && occDate <= endOfMonth(month);
                  }).length;

                  return (
                    <button
                      key={month.toISOString()}
                      onClick={() => toggleMonth(month)}
                      className={`
                        relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
                        }
                      `}
                    >
                      <Calendar className={`h-4 w-4 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-medium">{format(month, 'MMM yyyy')}</span>
                      {isSelected && monthOccCount > 0 && (
                        <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                          {monthOccCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">PDF Options</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="holidays" 
                  checked={includeHolidays} 
                  onCheckedChange={(checked) => setIncludeHolidays(checked as boolean)}
                />
                <Label htmlFor="holidays" className="text-sm cursor-pointer">
                  Include holidays 🏖️
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="companyNames" 
                  checked={showCompanyNames} 
                  onCheckedChange={(checked) => setShowCompanyNames(checked as boolean)}
                />
                <Label htmlFor="companyNames" className="text-sm cursor-pointer">
                  Show company/SBU names
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="legend" 
                  checked={includeLegend} 
                  onCheckedChange={(checked) => setIncludeLegend(checked as boolean)}
                />
                <Label htmlFor="legend" className="text-sm cursor-pointer">
                  Include status legend
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Preview Info */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedMonths.length} page{selectedMonths.length !== 1 ? 's' : ''} (A4)
              </span>
            </div>
            {selectedMonths.length > 0 && !isLoading && (
              <Badge variant="outline" className="text-xs">
                {occurrences.length} occurrence{occurrences.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={selectedMonths.length === 0 || isLoading || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
