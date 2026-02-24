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

  // Tyre positions - 6 total (2 front, 4 rear on 2 axles) - adjusted for larger tyres
  const tyrePositions = {
    "Front Left": { position: [-5.5, 0.75, -1.5] as [number, number, number] },
    "Front Right": { position: [-5.5, 0.75, 1.5] as [number, number, number] },
    "Rear Left 1": { position: [4.5, 0.75, -1.5] as [number, number, number] },
    "Rear Right 1": { position: [4.5, 0.75, 1.5] as [number, number, number] },
    "Rear Left 2": { position: [6.0, 0.75, -1.5] as [number, number, number] },
    "Rear Right 2": { position: [6.0, 0.75, 1.5] as [number, number, number] },
  };

  const getTyreByPosition = (position: string) => {
    return tyres.find(t => t.position === position);
  };

  // Create smooth aerodynamic coach body shape
  const coachGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Professional coach profile with smooth aerodynamic curves
    shape.moveTo(-7.8, 0.3);
    shape.lineTo(-7.8, 1.4);
    // Smooth front windshield curve - aerodynamic nose
    shape.bezierCurveTo(-7.8, 2.0, -7.6, 2.6, -7.2, 3.0);
    shape.bezierCurveTo(-6.8, 3.3, -6.2, 3.5, -5.5, 3.55);
    // Roof line - slight curve
    shape.quadraticCurveTo(0, 3.65, 6.8, 3.55);
    // Rear curve
    shape.quadraticCurveTo(7.4, 3.5, 7.8, 3.2);
    shape.lineTo(7.8, 0.3);
    shape.lineTo(-7.8, 0.3);
    
    const extrudeSettings = {
      depth: 2.8,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 6,
      curveSegments: 64,
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Generate VERY dense grid lines for professional CAD-quality wireframe
  const gridLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    const busLength = 15.6; // -7.8 to 7.8
    const busHeight = 3.25;
    const busWidth = 2.8;
    
    // ==== SIDE PANELS - Extremely dense horizontal lines ====
    for (let y = 0.35; y <= 3.55; y += 0.08) {
      // Adjust x bounds based on height for curved front
      const frontX = y < 1.5 ? -7.8 : y < 2.5 ? -7.5 : y < 3.0 ? -7.0 : -6.0;
      lines.push([[frontX, y, -1.4], [7.8, y, -1.4]]);
      lines.push([[frontX, y, 1.4], [7.8, y, 1.4]]);
    }
    
    // ==== SIDE PANELS - Extremely dense vertical lines ====
    for (let x = -7.8; x <= 7.8; x += 0.18) {
      // Calculate top Y based on front curve
      let topY = 3.55;
      if (x < -6.5) {
        topY = 1.5 + (x + 7.8) * 1.5;
      } else if (x < -5.5) {
        topY = 3.0 + (x + 6.5) * 0.55;
      }
      lines.push([[x, 0.35, -1.4], [x, Math.min(topY, 3.55), -1.4]]);
      lines.push([[x, 0.35, 1.4], [x, Math.min(topY, 3.55), 1.4]]);
    }
    
    // ==== ROOF - Dense grid ====
    // Longitudinal lines (front to back)
    for (let z = -1.4; z <= 1.4; z += 0.12) {
      lines.push([[-5.5, 3.55, z], [6.8, 3.55, z]]);
    }
    // Lateral lines (side to side)
    for (let x = -5.5; x <= 6.8; x += 0.18) {
      lines.push([[x, 3.55, -1.4], [x, 3.55, 1.4]]);
    }
    
    // ==== FRONT FACE - Dense horizontal lines ====
    for (let y = 0.35; y <= 3.0; y += 0.1) {
      const halfWidth = y < 1.5 ? 1.4 : Math.max(0.5, 1.4 - (y - 1.5) * 0.3);
      lines.push([[-7.8, y, -halfWidth], [-7.8, y, halfWidth]]);
    }
    
    // ==== FRONT FACE - Dense vertical lines ====
    for (let z = -1.4; z <= 1.4; z += 0.12) {
      lines.push([[-7.8, 0.35, z], [-7.8, 2.0, z]]);
    }
    
    // ==== REAR FACE - Dense horizontal lines ====
    for (let y = 0.35; y <= 3.2; y += 0.1) {
      lines.push([[7.8, y, -1.4], [7.8, y, 1.4]]);
    }
    
    // ==== REAR FACE - Dense vertical lines ====
    for (let z = -1.4; z <= 1.4; z += 0.12) {
      lines.push([[7.8, 0.35, z], [7.8, 3.2, z]]);
    }
    
    // ==== WINDSHIELD CURVE LINES ====
    // Curved front profile lines
    for (let z = -1.2; z <= 1.2; z += 0.15) {
      lines.push([
        [-7.8, 1.5, z],
        [-7.5, 2.2, z],
        [-7.0, 2.8, z],
        [-6.2, 3.3, z],
        [-5.5, 3.55, z]
      ]);
    }
    
    // ==== BOTTOM EDGE LINES ====
    lines.push([[-7.8, 0.35, -1.4], [7.8, 0.35, -1.4]]);
    lines.push([[-7.8, 0.35, 1.4], [7.8, 0.35, 1.4]]);
    lines.push([[-7.8, 0.35, -1.4], [-7.8, 0.35, 1.4]]);
    lines.push([[7.8, 0.35, -1.4], [7.8, 0.35, 1.4]]);
    
    // ==== DIAGONAL STRUCTURAL LINES (for realistic look) ====
    // Cross bracing pattern on sides
    for (let x = -7; x <= 7; x += 1.5) {
      lines.push([[x, 0.5, -1.4], [x + 0.8, 1.8, -1.4]]);
      lines.push([[x, 0.5, 1.4], [x + 0.8, 1.8, 1.4]]);
    }
    
    return lines;
  }, []);

  // Window positions for side windows
  const windows = useMemo(() => {
    const positions: number[] = [];
    for (let x = -4.5; x <= 6.0; x += 1.4) {
      positions.push(x);
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, -0.5]}>
      {/* ============ MAIN BUS BODY ============ */}
      {/* Solid body with very subtle fill */}
      <mesh geometry={coachGeometry} position={[0, 0, -1.4]}>
        <meshStandardMaterial 
          color="#f1f5f9"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Primary wireframe overlay */}
      <mesh geometry={coachGeometry} position={[0, 0, -1.4]}>
        <meshBasicMaterial 
          color="#cbd5e1"
          wireframe
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* ============ DENSE GRID LINES (CAD-Quality Wireframe) ============ */}
      {gridLines.map((points, i) => (
        <Line
          key={`grid-${i}`}
          points={points}
          color="#9ca3af"
          lineWidth={0.6}
          transparent
          opacity={0.7}
        />
      ))}

      {/* ============ MAIN STRUCTURAL OUTLINE (Bold) ============ */}
      {/* Bottom outline */}
      <Line
        points={[[-7.8, 0.35, -1.4], [7.8, 0.35, -1.4]]}
        color="#64748b"
        lineWidth={1.5}
      />
      <Line
        points={[[-7.8, 0.35, 1.4], [7.8, 0.35, 1.4]]}
        color="#64748b"
        lineWidth={1.5}
      />
      
      {/* Top/roof outline */}
      <Line
        points={[[-5.5, 3.55, -1.4], [6.8, 3.55, -1.4]]}
        color="#64748b"
        lineWidth={1.5}
      />
      <Line
        points={[[-5.5, 3.55, 1.4], [6.8, 3.55, 1.4]]}
        color="#64748b"
        lineWidth={1.5}
      />

      {/* Vertical corner edges */}
      <Line points={[[7.8, 0.35, -1.4], [7.8, 3.2, -1.4]]} color="#64748b" lineWidth={1.5} />
      <Line points={[[7.8, 0.35, 1.4], [7.8, 3.2, 1.4]]} color="#64748b" lineWidth={1.5} />
      
      {/* Front curve outline */}
      <Line
        points={[
          [-7.8, 0.35, -1.4],
          [-7.8, 1.5, -1.4],
          [-7.5, 2.2, -1.4],
          [-7.0, 2.8, -1.4],
          [-6.2, 3.3, -1.4],
          [-5.5, 3.55, -1.4]
        ]}
        color="#64748b"
        lineWidth={1.5}
      />
      <Line
        points={[
          [-7.8, 0.35, 1.4],
          [-7.8, 1.5, 1.4],
          [-7.5, 2.2, 1.4],
          [-7.0, 2.8, 1.4],
          [-6.2, 3.3, 1.4],
          [-5.5, 3.55, 1.4]
        ]}
        color="#64748b"
        lineWidth={1.5}
      />

      {/* ============ SIDE MIRRORS ============ */}
      {/* Left Side Mirror */}
      <group position={[-6.8, 2.5, -1.7]}>
        <mesh position={[0, 0, -0.2]} rotation={[0, 0, Math.PI / 10]}>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.08, -0.08, -0.45]}>
          <boxGeometry args={[0.22, 0.35, 0.12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0.08, -0.08, -0.52]}>
          <planeGeometry args={[0.18, 0.28]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Right Side Mirror */}
      <group position={[-6.8, 2.5, 1.7]}>
        <mesh position={[0, 0, 0.2]} rotation={[0, 0, Math.PI / 10]}>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.08, -0.08, 0.45]}>
          <boxGeometry args={[0.22, 0.35, 0.12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0.08, -0.08, 0.52]}>
          <planeGeometry args={[0.18, 0.28]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* ============ FRONT WINDSHIELD ============ */}
      <mesh position={[-7.0, 2.3, 0]} rotation={[0, 0, -Math.PI / 5.5]}>
        <planeGeometry args={[2.2, 2.6]} />
        <meshStandardMaterial 
          color="#334155"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Windshield frame */}
      <Line
        points={[
          [-7.75, 1.0, -1.2],
          [-7.75, 1.0, 1.2],
          [-6.5, 3.2, 1.2],
          [-6.5, 3.2, -1.2],
          [-7.75, 1.0, -1.2],
        ]}
        color="#1f2937"
        lineWidth={2.5}
      />

      {/* Destination display above windshield */}
      <mesh position={[-6.6, 3.35, 0]}>
        <boxGeometry args={[0.4, 0.2, 2.0]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* ============ HEADLIGHTS ============ */}
      {[-1.0, 1.0].map((z, i) => (
        <group key={`headlight-${i}`} position={[-7.82, 1.1, z]}>
          <mesh>
            <boxGeometry args={[0.1, 0.35, 0.5]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[-0.05, 0, 0]}>
            <boxGeometry args={[0.02, 0.28, 0.42]} />
            <meshStandardMaterial 
              color="#fef9c3" 
              emissive="#fef08a"
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      ))}

      {/* ============ REAR LIGHTS ============ */}
      {[-1.0, 1.0].map((z, i) => (
        <mesh key={`rearlight-${i}`} position={[7.82, 1.3, z]}>
          <boxGeometry args={[0.08, 0.45, 0.35]} />
          <meshStandardMaterial 
            color="#dc2626" 
            emissive="#ef4444"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* ============ FRONT GRILLE ============ */}
      <mesh position={[-7.85, 0.7, 0]}>
        <boxGeometry args={[0.05, 0.6, 2.0]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {[-0.7, -0.35, 0, 0.35, 0.7].map((z, i) => (
        <mesh key={`grille-${i}`} position={[-7.88, 0.7, z]}>
          <boxGeometry args={[0.02, 0.5, 0.1]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* ============ ROOF AC UNIT ============ */}
      <mesh position={[0.5, 3.72, 0]}>
        <boxGeometry args={[4.0, 0.3, 2.0]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.6} />
      </mesh>
      {[-1.4, 0, 1.4].map((x, i) => (
        <mesh key={`ac-vent-${i}`} position={[x + 0.5, 3.9, 0]}>
          <boxGeometry args={[0.9, 0.1, 1.6]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}

      {/* ============ PASSENGER DOOR ============ */}
      <group position={[-3.8, 1.6, 1.41]}>
        <Line
          points={[
            [-0.7, -1.2, 0],
            [0.7, -1.2, 0],
            [0.7, 1.5, 0],
            [-0.7, 1.5, 0],
            [-0.7, -1.2, 0],
          ]}
          color="#64748b"
          lineWidth={2}
        />
        <Line
          points={[[0, -1.2, 0], [0, 1.5, 0]]}
          color="#64748b"
          lineWidth={1.5}
        />
      </group>

      {/* ============ SIDE WINDOWS ============ */}
      {windows.map((x, i) => (
        <group key={`window-pair-${i}`}>
          {/* Left window */}
          <mesh position={[x, 2.5, -1.41]}>
            <planeGeometry args={[1.1, 0.95]} />
            <meshStandardMaterial 
              color="#64748b"
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
          <Line
            points={[
              [x - 0.55, 2.02, -1.42],
              [x + 0.55, 2.02, -1.42],
              [x + 0.55, 2.97, -1.42],
              [x - 0.55, 2.97, -1.42],
              [x - 0.55, 2.02, -1.42],
            ]}
            color="#475569"
            lineWidth={1.2}
          />
          
          {/* Right window */}
          <mesh position={[x, 2.5, 1.41]}>
            <planeGeometry args={[1.1, 0.95]} />
            <meshStandardMaterial 
              color="#64748b"
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
          <Line
            points={[
              [x - 0.55, 2.02, 1.42],
              [x + 0.55, 2.02, 1.42],
              [x + 0.55, 2.97, 1.42],
              [x - 0.55, 2.97, 1.42],
              [x - 0.55, 2.02, 1.42],
            ]}
            color="#475569"
            lineWidth={1.2}
          />
        </group>
      ))}

      {/* ============ WHEEL ARCHES (Darker areas) ============ */}
      {/* Front arches */}
      <mesh position={[-5.5, 0.8, -1.42]}>
        <boxGeometry args={[2.0, 1.4, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-5.5, 0.8, 1.42]}>
        <boxGeometry args={[2.0, 1.4, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.5} />
      </mesh>

      {/* Rear arches (larger for dual wheels) */}
      <mesh position={[5.25, 0.8, -1.42]}>
        <boxGeometry args={[3.8, 1.4, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.5} />
      </mesh>
      <mesh position={[5.25, 0.8, 1.42]}>
        <boxGeometry args={[3.8, 1.4, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.5} />
      </mesh>

      {/* ============ BUMPERS ============ */}
      <mesh position={[-7.9, 0.45, 0]}>
        <boxGeometry args={[0.2, 0.3, 2.6]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[7.9, 0.45, 0]}>
        <boxGeometry args={[0.2, 0.3, 2.6]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* ============ TYRES (Large, Realistic) ============ */}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.95} />
      </mesh>
      
      <gridHelper args={[26, 52, "#e2e8f0", "#f1f5f9"]} position={[0, 0.02, 0]} />
    </group>
  );
};
