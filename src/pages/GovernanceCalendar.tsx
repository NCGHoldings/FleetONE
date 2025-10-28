import { useState } from 'react';
import { Calendar, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';

const GovernanceCalendar = () => {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [showFilters, setShowFilters] = useState(true);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Filters Sidebar */}
        {showFilters && (
          <Card className="w-80 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Company</label>
                <p className="text-xs text-muted-foreground">Company filters will appear here</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">SBU</label>
                <p className="text-xs text-muted-foreground">SBU filters will appear here</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <p className="text-xs text-muted-foreground">Type filters (Report/Event) will appear here</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <p className="text-xs text-muted-foreground">Category filters will appear here</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <p className="text-xs text-muted-foreground">Status filters will appear here</p>
              </div>
            </div>
          </Card>
        )}

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
              
              <Button variant="outline" size="sm">Today</Button>
              <Button variant="outline" size="sm">← Prev</Button>
              <Button variant="outline" size="sm">Next →</Button>
              <span className="text-lg font-semibold ml-4">January 2025</span>
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="month">
                  <Calendar className="h-4 w-4 mr-2" />
                  Month
                </TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Calendar Content */}
          <Card className="flex-1 p-4">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Governance Calendar</h3>
                <p className="text-muted-foreground max-w-md">
                  This is the foundation of the governance calendar system. 
                  The calendar views, occurrence display, and interactive features 
                  will be implemented next.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Current view: <strong>{view.toUpperCase()}</strong>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default GovernanceCalendar;
