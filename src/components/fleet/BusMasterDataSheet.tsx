import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBusMasterData } from "@/hooks/useBusMasterData";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bus, TrendingUp, Route, Wrench, Fuel, Circle, 
  FileText, CreditCard, ExternalLink, X 
} from "lucide-react";
import { BusMasterOverviewTab } from "./BusMasterOverviewTab";
import { BusMasterFinancialsTab } from "./BusMasterFinancialsTab";
import { BusMasterTripsTab } from "./BusMasterTripsTab";
import { BusMasterServiceTab } from "./BusMasterServiceTab";
import { BusMasterFuelTab } from "./BusMasterFuelTab";
import { BusMasterTyresTab } from "./BusMasterTyresTab";
import { BusMasterDocumentsTab } from "./BusMasterDocumentsTab";
import { BusMasterLoansTab } from "./BusMasterLoansTab";

interface BusMasterDataSheetProps {
  busId: string | null;
  open: boolean;
  onClose: () => void;
}

export const BusMasterDataSheet = ({ busId, open, onClose }: BusMasterDataSheetProps) => {
  const { data, isLoading, error } = useBusMasterData(busId);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {isLoading ? (
                    <Skeleton className="h-6 w-32" />
                  ) : (
                    <>Bus {data?.bus?.bus_no} - Master Data Sheet</>
                  )}
                </DialogTitle>
                {data?.bus && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{data.bus.model}</Badge>
                    <Badge 
                      style={{ 
                        backgroundColor: data.bus.bus_categories?.color || 'hsl(var(--muted))',
                        color: 'white'
                      }}
                    >
                      {data.bus.bus_categories?.name || 'Uncategorized'}
                    </Badge>
                    <Badge variant={data.bus.status === 'active' ? 'default' : 'secondary'}>
                      {data.bus.status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">Loading bus data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-destructive">
              <p>Error loading bus data</p>
              <p className="text-sm">{(error as Error).message}</p>
            </div>
          </div>
        ) : data ? (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex-shrink-0 grid grid-cols-8 w-full">
              <TabsTrigger value="overview" className="text-xs">
                <Bus className="h-3 w-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="financials" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Financials
              </TabsTrigger>
              <TabsTrigger value="trips" className="text-xs">
                <Route className="h-3 w-3 mr-1" />
                Trips
              </TabsTrigger>
              <TabsTrigger value="service" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                Service
              </TabsTrigger>
              <TabsTrigger value="fuel" className="text-xs">
                <Fuel className="h-3 w-3 mr-1" />
                Fuel
              </TabsTrigger>
              <TabsTrigger value="tyres" className="text-xs">
                <Circle className="h-3 w-3 mr-1" />
                Tyres
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="loans" className="text-xs">
                <CreditCard className="h-3 w-3 mr-1" />
                Loans
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="m-0">
                <BusMasterOverviewTab data={data} />
              </TabsContent>
              <TabsContent value="financials" className="m-0">
                <BusMasterFinancialsTab data={data} />
              </TabsContent>
              <TabsContent value="trips" className="m-0">
                <BusMasterTripsTab data={data} busId={busId!} />
              </TabsContent>
              <TabsContent value="service" className="m-0">
                <BusMasterServiceTab data={data} />
              </TabsContent>
              <TabsContent value="fuel" className="m-0">
                <BusMasterFuelTab data={data} />
              </TabsContent>
              <TabsContent value="tyres" className="m-0">
                <BusMasterTyresTab data={data} />
              </TabsContent>
              <TabsContent value="documents" className="m-0">
                <BusMasterDocumentsTab data={data} />
              </TabsContent>
              <TabsContent value="loans" className="m-0">
                <BusMasterLoansTab data={data} />
              </TabsContent>
            </div>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
