import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { Tyre3D } from "./Tyre3D";
import { BusTyre } from "@/hooks/useTyreManagement";

interface Bus3DModelProps {
  tyres: BusTyre[];
  onTyreClick: (tyreId: string) => void;
}

export const Bus3DModel = ({ tyres, onTyreClick }: Bus3DModelProps) => {
  const groupRef = useRef<THREE.Group>(null);

  // Tyre positions - 6 total (2 front, 4 rear on 2 axles)
  const tyrePositions = {
    "Front Left": { position: [-5.2, 0.55, -1.4] as [number, number, number] },
    "Front Right": { position: [-5.2, 0.55, 1.4] as [number, number, number] },
    "Rear Left 1": { position: [4.2, 0.55, -1.4] as [number, number, number] },
    "Rear Right 1": { position: [4.2, 0.55, 1.4] as [number, number, number] },
    "Rear Left 2": { position: [5.5, 0.55, -1.4] as [number, number, number] },
    "Rear Right 2": { position: [5.5, 0.55, 1.4] as [number, number, number] },
  };

  const getTyreByPosition = (position: string) => {
    return tyres.find(t => t.position === position);
  };

  // Create smooth coach body shape with better curves
  const coachGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Coach side profile - aerodynamic curves like luxury coach
    shape.moveTo(-7.2, 0.3);
    shape.lineTo(-7.2, 1.6);
    // Front windshield curve
    shape.quadraticCurveTo(-7.2, 2.4, -6.8, 2.8);
    shape.quadraticCurveTo(-6.4, 3.1, -5.8, 3.25);
    // Roof line
    shape.lineTo(6.5, 3.25);
    // Rear curve
    shape.quadraticCurveTo(7.0, 3.25, 7.2, 2.9);
    shape.lineTo(7.2, 0.3);
    shape.lineTo(-7.2, 0.3);
    
    const extrudeSettings = {
      depth: 2.6,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 4,
      curveSegments: 48,
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Generate dense grid lines for professional wireframe look
  const gridLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    
    // Horizontal lines on sides (denser)
    for (let y = 0.4; y <= 3.25; y += 0.2) {
      lines.push([[-7.2, y, -1.3], [7.2, y, -1.3]]);
      lines.push([[-7.2, y, 1.3], [7.2, y, 1.3]]);
    }
    
    // Vertical lines on sides (denser)
    for (let x = -7.2; x <= 7.2; x += 0.4) {
      const topY = x < -6 ? 1.8 + (x + 7.2) * 1.1 : 3.25;
      lines.push([[x, 0.4, -1.3], [x, Math.min(topY, 3.25), -1.3]]);
      lines.push([[x, 0.4, 1.3], [x, Math.min(topY, 3.25), 1.3]]);
    }
    
    // Top roof lines (front to back)
    for (let z = -1.3; z <= 1.3; z += 0.2) {
      lines.push([[-5.8, 3.25, z], [6.5, 3.25, z]]);
    }
    
    // Front face horizontal lines
    for (let y = 0.4; y <= 2.8; y += 0.2) {
      lines.push([[-7.2, y, -1.3], [-7.2, y, 1.3]]);
    }
    
    // Rear face horizontal lines
    for (let y = 0.4; y <= 2.9; y += 0.2) {
      lines.push([[7.2, y, -1.3], [7.2, y, 1.3]]);
    }
    
    // Cross lines on roof (denser)
    for (let x = -5.5; x <= 6.5; x += 0.4) {
      lines.push([[x, 3.25, -1.3], [x, 3.25, 1.3]]);
    }
    
    // Front vertical lines
    for (let z = -1.3; z <= 1.3; z += 0.2) {
      lines.push([[-7.2, 0.4, z], [-7.2, 2.6, z]]);
    }
    
    // Rear vertical lines
    for (let z = -1.3; z <= 1.3; z += 0.2) {
      lines.push([[7.2, 0.4, z], [7.2, 2.9, z]]);
    }
    
    return lines;
  }, []);

  // Window positions
  const windows = useMemo(() => {
    const positions: number[] = [];
    for (let x = -4.2; x <= 5.5; x += 1.3) {
      positions.push(x);
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, -0.5]}>
      {/* Main bus body - solid with transparency */}
      <mesh geometry={coachGeometry} position={[0, 0, -1.3]}>
        <meshStandardMaterial 
          color="#e2e8f0"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bus body wireframe overlay */}
      <mesh geometry={coachGeometry} position={[0, 0, -1.3]}>
        <meshBasicMaterial 
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Dense grid lines for professional wireframe look */}
      {gridLines.map((points, i) => (
        <Line
          key={`grid-${i}`}
          points={points}
          color="#9ca3af"
          lineWidth={0.8}
          transparent
          opacity={0.6}
        />
      ))}

      {/* ============ SIDE MIRRORS ============ */}
      {/* Left Side Mirror */}
      <group position={[-6.4, 2.3, -1.55]}>
        {/* Mirror arm */}
        <mesh position={[0, 0, -0.15]} rotation={[0, 0, Math.PI / 12]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Mirror housing */}
        <mesh position={[0.05, -0.05, -0.35]}>
          <boxGeometry args={[0.18, 0.28, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Mirror glass */}
        <mesh position={[0.05, -0.05, -0.41]}>
          <planeGeometry args={[0.14, 0.22]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Right Side Mirror */}
      <group position={[-6.4, 2.3, 1.55]}>
        {/* Mirror arm */}
        <mesh position={[0, 0, 0.15]} rotation={[0, 0, Math.PI / 12]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Mirror housing */}
        <mesh position={[0.05, -0.05, 0.35]}>
          <boxGeometry args={[0.18, 0.28, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Mirror glass */}
        <mesh position={[0.05, -0.05, 0.41]}>
          <planeGeometry args={[0.14, 0.22]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* ============ FRONT WINDSHIELD (Enhanced) ============ */}
      {/* Main windshield - curved appearance */}
      <mesh position={[-6.7, 2.1, 0]} rotation={[0, 0, -Math.PI / 7]}>
        <planeGeometry args={[2.0, 2.4]} />
        <meshStandardMaterial 
          color="#475569"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Windshield frame/border */}
      <Line
        points={[
          [-7.1, 1.0, -1.1],
          [-7.1, 1.0, 1.1],
          [-6.2, 2.9, 1.1],
          [-6.2, 2.9, -1.1],
          [-7.1, 1.0, -1.1],
        ]}
        color="#374151"
        lineWidth={2}
      />

      {/* Sun visor strip above windshield */}
      <mesh position={[-6.3, 2.95, 0]}>
        <boxGeometry args={[0.3, 0.15, 2.2]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* ============ HEADLIGHTS ============ */}
      {/* Left headlight */}
      <group position={[-7.15, 1.0, -0.9]}>
        <mesh>
          <boxGeometry args={[0.1, 0.25, 0.4]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[-0.05, 0, 0]}>
          <boxGeometry args={[0.02, 0.2, 0.35]} />
          <meshStandardMaterial 
            color="#fef9c3" 
            emissive="#fef08a"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* Right headlight */}
      <group position={[-7.15, 1.0, 0.9]}>
        <mesh>
          <boxGeometry args={[0.1, 0.25, 0.4]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[-0.05, 0, 0]}>
          <boxGeometry args={[0.02, 0.2, 0.35]} />
          <meshStandardMaterial 
            color="#fef9c3" 
            emissive="#fef08a"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* ============ REAR LIGHTS ============ */}
      {/* Left rear light */}
      <mesh position={[7.15, 1.2, -0.9]}>
        <boxGeometry args={[0.08, 0.35, 0.25]} />
        <meshStandardMaterial 
          color="#dc2626" 
          emissive="#ef4444"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Right rear light */}
      <mesh position={[7.15, 1.2, 0.9]}>
        <boxGeometry args={[0.08, 0.35, 0.25]} />
        <meshStandardMaterial 
          color="#dc2626" 
          emissive="#ef4444"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* ============ AIR INTAKE GRILLE (Front) ============ */}
      <mesh position={[-7.18, 0.7, 0]}>
        <boxGeometry args={[0.05, 0.5, 1.8]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Grille slats */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((z, i) => (
        <mesh key={`grille-${i}`} position={[-7.2, 0.7, z]}>
          <boxGeometry args={[0.02, 0.4, 0.08]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* ============ ROOF AC UNIT ============ */}
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[3.5, 0.25, 1.8]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* AC unit vents */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={`ac-vent-${i}`} position={[x, 3.55, 0]}>
          <boxGeometry args={[0.8, 0.08, 1.4]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}

      {/* ============ PASSENGER DOOR (Right side) ============ */}
      <group position={[-3.5, 1.4, 1.31]}>
        {/* Door outline */}
        <Line
          points={[
            [-0.6, -1.05, 0],
            [0.6, -1.05, 0],
            [0.6, 1.3, 0],
            [-0.6, 1.3, 0],
            [-0.6, -1.05, 0],
          ]}
          color="#64748b"
          lineWidth={2}
        />
        {/* Door center line (folding door) */}
        <Line
          points={[[0, -1.05, 0], [0, 1.3, 0]]}
          color="#64748b"
          lineWidth={1.5}
        />
      </group>

      {/* ============ WINDOWS (Enhanced) ============ */}
      {/* Windows - left side */}
      {windows.map((x, i) => (
        <group key={`window-left-${i}`}>
          <mesh position={[x, 2.35, -1.31]}>
            <planeGeometry args={[1.0, 0.85]} />
            <meshStandardMaterial 
              color="#64748b"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
          {/* Window frame */}
          <Line
            points={[
              [x - 0.5, 1.92, -1.32],
              [x + 0.5, 1.92, -1.32],
              [x + 0.5, 2.77, -1.32],
              [x - 0.5, 2.77, -1.32],
              [x - 0.5, 1.92, -1.32],
            ]}
            color="#475569"
            lineWidth={1.5}
          />
        </group>
      ))}

      {/* Windows - right side */}
      {windows.map((x, i) => (
        <group key={`window-right-${i}`}>
          <mesh position={[x, 2.35, 1.31]}>
            <planeGeometry args={[1.0, 0.85]} />
            <meshStandardMaterial 
              color="#64748b"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
          <Line
            points={[
              [x - 0.5, 1.92, 1.32],
              [x + 0.5, 1.92, 1.32],
              [x + 0.5, 2.77, 1.32],
              [x - 0.5, 2.77, 1.32],
              [x - 0.5, 1.92, 1.32],
            ]}
            color="#475569"
            lineWidth={1.5}
          />
        </group>
      ))}

      {/* ============ WHEEL ARCHES (Enhanced) ============ */}
      {/* Front wheel arches */}
      <mesh position={[-5.2, 0.7, -1.32]}>
        <boxGeometry args={[1.6, 1.1, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.6} />
      </mesh>
      <mesh position={[-5.2, 0.7, 1.32]}>
        <boxGeometry args={[1.6, 1.1, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.6} />
      </mesh>

      {/* Rear wheel arches (double) */}
      <mesh position={[4.85, 0.7, -1.32]}>
        <boxGeometry args={[3.0, 1.1, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.6} />
      </mesh>
      <mesh position={[4.85, 0.7, 1.32]}>
        <boxGeometry args={[3.0, 1.1, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.6} />
      </mesh>

      {/* ============ BUMPERS ============ */}
      {/* Front bumper */}
      <mesh position={[-7.25, 0.4, 0]}>
        <boxGeometry args={[0.15, 0.25, 2.4]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Rear bumper */}
      <mesh position={[7.25, 0.4, 0]}>
        <boxGeometry args={[0.15, 0.25, 2.4]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* ============ TYRES ============ */}
      {Object.entries(tyrePositions).map(([posLabel, { position }]) => {
        const tyre = getTyreByPosition(posLabel);
        return (
          <Tyre3D
            key={posLabel}
            position={position}
            conditionPercentage={tyre?.condition_percentage || 0}
            tyreId={tyre?.id}
            positionLabel={posLabel}
            brand={tyre?.tyre_brand}
            onClick={() => tyre && onTyreClick(tyre.id)}
          />
        );
      })}

      {/* ============ GROUND ============ */}
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[22, 14]} />
        <meshStandardMaterial color="#f1f5f9" transparent opacity={0.9} />
      </mesh>
      
      {/* Ground grid */}
      <gridHelper args={[22, 44, "#cbd5e1", "#e2e8f0"]} position={[0, 0.02, 0]} />
    </group>
  );
};
