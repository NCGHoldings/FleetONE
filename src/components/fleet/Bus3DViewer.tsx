import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus3DModel } from "./Bus3DModel";
import { TyreStats3DOverlay } from "./TyreStats3DOverlay";
import { TyreDetailsModal } from "./TyreDetailsModal";
import { BusTyre } from "@/hooks/useTyreManagement";

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
    <div className="relative w-full h-[650px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200">
      {/* Bus Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Select value={selectedBusId} onValueChange={setSelectedBusId}>
          <SelectTrigger className="w-[200px] bg-white/95 backdrop-blur shadow-sm border-slate-200">
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

      {/* Stats Overlay */}
      {selectedBus && (
        <TyreStats3DOverlay 
          bus={selectedBus} 
          tyres={selectedBusTyres}
          onTyreClick={handleTyreClick}
        />
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-slate-500">
        Drag to rotate • Scroll to zoom • Click tyre for details
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 8, 14]} fov={45} />
          
          {/* Lighting - soft for wireframe visibility */}
          <ambientLight intensity={0.8} />
          <directionalLight 
            position={[10, 15, 10]} 
            intensity={1.0}
            castShadow
          />
          <directionalLight position={[-10, 10, -5]} intensity={0.4} />
          <pointLight position={[0, 10, 0]} intensity={0.3} />

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
            maxDistance={25}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 1.5, 0]}
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
