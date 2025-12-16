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
    <div className="relative w-full h-[700px] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 border border-slate-200 shadow-lg">
      {/* Bus Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Select value={selectedBusId} onValueChange={setSelectedBusId}>
          <SelectTrigger className="w-[200px] bg-white/95 backdrop-blur-sm shadow-md border-slate-200">
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
      <div className="absolute bottom-4 left-4 z-10 text-xs text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
        🖱️ Drag to rotate • Scroll to zoom • Click tyre for details
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[-4, 6, 12]} fov={50} />
          
          {/* ============ ENHANCED LIGHTING ============ */}
          
          {/* Soft ambient light for overall illumination */}
          <ambientLight intensity={0.5} color="#f8fafc" />
          
          {/* Main key light (sun-like) */}
          <directionalLight 
            position={[12, 18, 10]} 
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* Fill light (softer, opposite side) */}
          <directionalLight 
            position={[-12, 10, -8]} 
            intensity={0.5}
            color="#e0f2fe"
          />
          
          {/* Rim light (back lighting for depth) */}
          <directionalLight 
            position={[0, 8, -15]} 
            intensity={0.4}
            color="#dbeafe"
          />
          
          {/* Top spotlight for dramatic effect */}
          <spotLight
            position={[0, 15, 0]}
            angle={0.5}
            penumbra={0.8}
            intensity={0.6}
            castShadow
            color="#ffffff"
          />
          
          {/* Front accent light */}
          <pointLight 
            position={[-10, 4, 0]} 
            intensity={0.3}
            color="#f0f9ff"
          />
          
          {/* Hemisphere light for natural outdoor feel */}
          <hemisphereLight
            color="#f0f9ff"
            groundColor="#e2e8f0"
            intensity={0.4}
          />

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
            maxDistance={28}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 1.5, 0]}
            enableDamping={true}
            dampingFactor={0.05}
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
