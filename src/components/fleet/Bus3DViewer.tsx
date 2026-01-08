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
    <div className="relative w-full h-[750px] rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 border border-slate-200 shadow-xl">
      {/* Bus Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Select value={selectedBusId} onValueChange={setSelectedBusId}>
          <SelectTrigger className="w-[220px] bg-white/95 backdrop-blur-sm shadow-md border-slate-200">
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
      <div className="absolute bottom-4 left-4 z-10 text-xs text-slate-500 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200">
        🖱️ Drag to rotate • Scroll to zoom • Click tyre for details
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          pixelRatio: Math.min(window.devicePixelRatio, 2)
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Camera positioned for optimal 3/4 front-right view like reference */}
          <PerspectiveCamera 
            makeDefault 
            position={[-14, 8, 14]} 
            fov={42} 
          />
          
          {/* ============ ENHANCED STUDIO LIGHTING ============ */}
          
          {/* Soft ambient for base illumination */}
          <ambientLight intensity={0.55} color="#f8fafc" />
          
          {/* Main key light (top-front-right) */}
          <directionalLight 
            position={[15, 20, 12]} 
            intensity={1.4}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            color="#ffffff"
          />
          
          {/* Fill light (opposite side, softer) */}
          <directionalLight 
            position={[-15, 12, -10]} 
            intensity={0.55}
            color="#e0f2fe"
          />
          
          {/* Rim/back light for depth separation */}
          <directionalLight 
            position={[0, 10, -18]} 
            intensity={0.45}
            color="#dbeafe"
          />
          
          {/* Front accent light for details */}
          <pointLight 
            position={[-12, 5, 0]} 
            intensity={0.4}
            color="#f0f9ff"
          />
          
          {/* Top spotlight for dramatic effect */}
          <spotLight
            position={[0, 18, 0]}
            angle={0.6}
            penumbra={0.9}
            intensity={0.7}
            castShadow
            color="#ffffff"
          />
          
          {/* Hemisphere light for natural outdoor feel */}
          <hemisphereLight
            color="#f0f9ff"
            groundColor="#e2e8f0"
            intensity={0.45}
          />

          {/* Bus Model */}
          <Bus3DModel 
            tyres={selectedBusTyres} 
            onTyreClick={handleTyreClick}
          />

          {/* Controls - optimized for 3/4 view */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={35}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 1.8, 0]}
            enableDamping={true}
            dampingFactor={0.06}
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
