// @ts-nocheck
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, Car, Ship } from 'lucide-react';
import { SinotrukVehicleDataUpload } from './SinotrukVehicleDataUpload';
import { SinotrukVehicleDataSheets } from './SinotrukVehicleDataSheets';
import { SinotrukVehicleRecords } from './SinotrukVehicleRecords';
import { SinotrukShipmentVehicleView } from './SinotrukShipmentVehicleView';
import { SinotrukVehicleStatsCards } from './SinotrukVehicleStatsCards';
import { useSinotrukVehicleDataManagement } from '@/hooks/useSinotrukVehicleDataManagement';

export function SinotrukVehicleDataManagement() {
  const [activeTab, setActiveTab] = useState('upload');
  const [stats, setStats] = useState({
    totalSheets: 0,
    totalVehicles: 0,
    matchedVehicles: 0,
    pendingVehicles: 0,
    completedSheets: 0
  });
  const { getStats } = useSinotrukVehicleDataManagement();

  const loadStats = async () => {
    const data = await getStats();
    setStats(data);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleUploadComplete = () => {
    loadStats();
    setActiveTab('sheets');
  };

  return (
    <div className="space-y-6">
      <SinotrukVehicleStatsCards stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="sheets" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Data Sheets</span>
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Vehicles</span>
          </TabsTrigger>
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            <span className="hidden sm:inline">Shipment View</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <SinotrukVehicleDataUpload onUploadComplete={handleUploadComplete} />
        </TabsContent>

        <TabsContent value="sheets" className="mt-6">
          <SinotrukVehicleDataSheets onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <SinotrukVehicleRecords onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="shipments" className="mt-6">
          <SinotrukShipmentVehicleView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
