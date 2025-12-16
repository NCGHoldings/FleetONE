import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus3DModel } from "./Bus3DModel";
import { TyreStats3DOverlay } from "./TyreStats3DOverlay";
import { TyreDetailsModal } from "./TyreDetailsModal";
import { BusTyre } from "@/hooks/useTyreManagement";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Bus3DViewerProps {
  buses: any[];
  tyresByBus: Record<string, BusTyre[]>;
}

export const Bus3DViewer = ({ buses, tyresByBus }: Bus3DViewerProps) => {
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || "");
  const [selectedTyreId, setSelectedTyreId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const selectedBus = buses.find(b => b.id === selectedBusId);
  const selectedBusTyres = tyresByBus[selectedBusId] || [];

  const handleTyreClick = (tyreId: string) => {
    setSelectedTyreId(tyreId);
    setShowDetailsModal(true);
  };

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Bus Selector */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Select value={selectedBusId} onValueChange={setSelectedBusId}>
          <SelectTrigger className="w-48 bg-card/90 backdrop-blur">
            <SelectValue placeholder="Select Bus" />
          </SelectTrigger>
          <SelectContent>
            {buses.map(bus => (
              <SelectItem key={bus.id} value={bus.id}>
                {bus.bus_no} - {bus.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/80 backdrop-blur rounded-lg px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Controls:</span> Drag to rotate • Scroll to zoom • Click tyres for details
        </p>
      </div>

      {/* Stats Overlay */}
      {selectedBus && (
        <TyreStats3DOverlay 
          bus={selectedBus} 
          tyres={selectedBusTyres}
          onTyreClick={handleTyreClick}
        />
      )}

      {/* 3D Canvas */}
      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[15, 8, 15]} fov={45} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[10, 20, 10]} 
            intensity={1} 
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-10, 10, -10]} intensity={0.3} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />
          
          {/* Environment for better reflections */}
          <Environment preset="city" />

          {/* Bus Model */}
          <Bus3DModel 
            tyres={selectedBusTyres} 
            onTyreClick={handleTyreClick}
          />

          {/* Controls */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={8}
            maxDistance={30}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
      </Canvas>

      {/* Tyre Details Modal */}
      {selectedTyreId && (
        <TyreDetailsModal
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          tyreId={selectedTyreId}
          busNumber={selectedBus?.bus_no || ""}
        />
      )}
    </div>
  );
};
