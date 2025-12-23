import { useState } from 'react';
import { Calendar, List, Filter, ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { MonthCalendar } from '@/components/governance/MonthCalendar';
import { ListView } from '@/components/governance/ListView';
import { OccurrenceDetailsModal } from '@/components/governance/OccurrenceDetailsModal';
import { FilterSidebar, useGovernanceFilters } from '@/components/governance/FilterSidebar';
import { useGovernanceOccurrences, type GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';
import { useScheduleGovernance } from '@/hooks/useScheduleGovernance';
import { useAuth } from '@/hooks/useAuth';
import { CalendarPDFModal } from '@/components/governance/CalendarPDFModal';

const GovernanceCalendar = () => {
  const [view, setView] = useState<'month' | 'list'>('month');
  const [showFilters, setShowFilters] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOccurrence, setSelectedOccurrence] = useState<GovernanceOccurrence | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const { hasRole } = useAuth();
  const { generateSchedule, isGenerating } = useScheduleGovernance();
  const filters = useGovernanceFilters();
  
  const { data: occurrences = [], isLoading } = useGovernanceOccurrences({
    currentDate,
    companyIds: filters.selectedCompanies,
    sbuIds: filters.selectedSBUs,
    types: filters.selectedTypes,
    categories: filters.selectedCategories,
    statuses: filters.selectedStatuses,
  });

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOccurrenceClick = (occurrence: GovernanceOccurrence) => {
    setSelectedOccurrence(occurrence);
    setDetailsModalOpen(true);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
          {/* Filters Sidebar */}
          {showFilters && <FilterSidebar onClose={() => setShowFilters(false)} />}

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {!showFilters && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFilters(true)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Show Filters
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold ml-4">
                  {format(startOfMonth(currentDate), 'MMMM yyyy')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Download PDF Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPdfModalOpen(true)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>

                {isAdmin && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={generateSchedule}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Generating...' : 'Generate Schedule'}
                  </Button>
                )}
                
                <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                  <TabsList>
                    <TabsTrigger value="month">
                      <Calendar className="h-4 w-4 mr-2" />
                      Month
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <List className="h-4 w-4 mr-2" />
                      List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Calendar Content */}
            <Card className="flex-1 p-4 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading occurrences...</div>
                </div>
              ) : (
                <>
                  {view === 'month' && (
                    <MonthCalendar
                      currentDate={currentDate}
                      occurrences={occurrences}
                      onOccurrenceClick={handleOccurrenceClick}
                    />
                  )}
                  {view === 'list' && (
                    <ListView
                      occurrences={occurrences}
                      onOccurrenceClick={handleOccurrenceClick}
                    />
                  )}
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Occurrence Details Modal */}
        <OccurrenceDetailsModal
          occurrence={selectedOccurrence}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />

        {/* PDF Export Modal */}
        <CalendarPDFModal
          open={pdfModalOpen}
          onOpenChange={setPdfModalOpen}
          currentDate={currentDate}
          filters={{
            selectedCompanies: filters.selectedCompanies,
            selectedSBUs: filters.selectedSBUs,
            selectedTypes: filters.selectedTypes,
            selectedCategories: filters.selectedCategories,
            selectedStatuses: filters.selectedStatuses,
          }}
        />
    </TooltipProvider>
  );
};

export default GovernanceCalendar;
