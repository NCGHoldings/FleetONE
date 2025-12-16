import { useRef, useMemo } from "react";
import * as THREE from "three";
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
    "Front Left": { position: [-5.2, 0.6, -1.35] as [number, number, number] },
    "Front Right": { position: [-5.2, 0.6, 1.35] as [number, number, number] },
    "Rear Left 1": { position: [4.2, 0.6, -1.35] as [number, number, number] },
    "Rear Right 1": { position: [4.2, 0.6, 1.35] as [number, number, number] },
    "Rear Left 2": { position: [5.5, 0.6, -1.35] as [number, number, number] },
    "Rear Right 2": { position: [5.5, 0.6, 1.35] as [number, number, number] },
  };

  const getTyreByPosition = (position: string) => {
    return tyres.find(t => t.position === position);
  };

  // Create smooth coach body shape
  const coachGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Coach side profile - smooth curves
    shape.moveTo(-7, 0.3);
    shape.lineTo(-7, 1.8);
    shape.quadraticCurveTo(-7, 2.8, -6.2, 3.0); // Front windshield curve
    shape.lineTo(-5.8, 3.2);
    shape.lineTo(6.5, 3.2); // Roof line
    shape.quadraticCurveTo(7, 3.2, 7, 2.8); // Rear curve
    shape.lineTo(7, 0.3);
    shape.lineTo(-7, 0.3);
    
    const extrudeSettings = {
      depth: 2.5,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
      curveSegments: 32,
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Window line geometry
  const windowLineGeometry = useMemo(() => {
    const points = [];
    for (let x = -5.5; x <= 6; x += 0.3) {
      points.push(new THREE.Vector3(x, 2.4, -1.26));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  // Create grid lines for wireframe effect
  const gridLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    
    // Horizontal lines on sides
    for (let y = 0.5; y <= 3.2; y += 0.25) {
      lines.push([
        new THREE.Vector3(-7, y, -1.25),
        new THREE.Vector3(7, y, -1.25)
      ]);
      lines.push([
        new THREE.Vector3(-7, y, 1.25),
        new THREE.Vector3(7, y, 1.25)
      ]);
    }
    
    // Vertical lines on sides
    for (let x = -7; x <= 7; x += 0.5) {
      const topY = x < -6 ? 2.0 + (x + 7) * 1.2 : 3.2;
      lines.push([
        new THREE.Vector3(x, 0.5, -1.25),
        new THREE.Vector3(x, Math.min(topY, 3.2), -1.25)
      ]);
      lines.push([
        new THREE.Vector3(x, 0.5, 1.25),
        new THREE.Vector3(x, Math.min(topY, 3.2), 1.25)
      ]);
    }
    
    // Top roof lines
    for (let z = -1.25; z <= 1.25; z += 0.25) {
      lines.push([
        new THREE.Vector3(-5.8, 3.2, z),
        new THREE.Vector3(6.5, 3.2, z)
      ]);
    }
    
    // Front face lines
    for (let z = -1.25; z <= 1.25; z += 0.25) {
      lines.push([
        new THREE.Vector3(-7, 0.5, z),
        new THREE.Vector3(-7, 2.0, z)
      ]);
    }
    
    // Rear face lines
    for (let z = -1.25; z <= 1.25; z += 0.25) {
      lines.push([
        new THREE.Vector3(7, 0.5, z),
        new THREE.Vector3(7, 2.8, z)
      ]);
    }
    
    return lines;
  }, []);

  // Window rectangles
  const windows = useMemo(() => {
    const windowPositions: { x: number; width: number }[] = [];
    for (let x = -4.5; x <= 5.5; x += 1.5) {
      windowPositions.push({ x, width: 1.2 });
    }
    return windowPositions;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, -0.5]}>
      {/* Main bus body - wireframe style */}
      <mesh geometry={coachGeometry} position={[0, 0, -1.25]}>
        <meshBasicMaterial 
          color="#e5e7eb"
          wireframe
          wireframeLinewidth={1}
        />
      </mesh>
      
      {/* Solid semi-transparent body for depth */}
      <mesh geometry={coachGeometry} position={[0, 0, -1.25]}>
        <meshStandardMaterial 
          color="#f8fafc"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dense grid lines for professional wireframe look */}
      {gridLines.map((line, i) => (
        <line key={`grid-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                line[0].x, line[0].y, line[0].z,
                line[1].x, line[1].y, line[1].z
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#d1d5db" linewidth={1} />
        </line>
      ))}

      {/* Windows - left side */}
      {windows.map((win, i) => (
        <group key={`window-left-${i}`}>
          <mesh position={[win.x, 2.3, -1.26]}>
            <planeGeometry args={[win.width, 0.9]} />
            <meshBasicMaterial 
              color="#94a3b8"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Window frame */}
          <lineLoop position={[win.x, 2.3, -1.27]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={4}
                array={new Float32Array([
                  -win.width/2, -0.45, 0,
                  win.width/2, -0.45, 0,
                  win.width/2, 0.45, 0,
                  -win.width/2, 0.45, 0
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#9ca3af" />
          </lineLoop>
        </group>
      ))}

      {/* Windows - right side */}
      {windows.map((win, i) => (
        <group key={`window-right-${i}`}>
          <mesh position={[win.x, 2.3, 1.26]}>
            <planeGeometry args={[win.width, 0.9]} />
            <meshBasicMaterial 
              color="#94a3b8"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineLoop position={[win.x, 2.3, 1.27]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={4}
                array={new Float32Array([
                  -win.width/2, -0.45, 0,
                  win.width/2, -0.45, 0,
                  win.width/2, 0.45, 0,
                  -win.width/2, 0.45, 0
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#9ca3af" />
          </lineLoop>
        </group>
      ))}

      {/* Front windshield */}
      <mesh position={[-6.5, 2.2, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <planeGeometry args={[1.8, 2.2]} />
        <meshBasicMaterial 
          color="#64748b"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wheel wells - front */}
      <mesh position={[-5.2, 0.6, -1.3]}>
        <boxGeometry args={[1.4, 1.0, 0.15]} />
        <meshBasicMaterial color="#374151" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-5.2, 0.6, 1.3]}>
        <boxGeometry args={[1.4, 1.0, 0.15]} />
        <meshBasicMaterial color="#374151" transparent opacity={0.5} />
      </mesh>

      {/* Wheel wells - rear (double) */}
      <mesh position={[4.85, 0.6, -1.3]}>
        <boxGeometry args={[2.8, 1.0, 0.15]} />
        <meshBasicMaterial color="#374151" transparent opacity={0.5} />
      </mesh>
      <mesh position={[4.85, 0.6, 1.3]}>
        <boxGeometry args={[2.8, 1.0, 0.15]} />
        <meshBasicMaterial color="#374151" transparent opacity={0.5} />
      </mesh>

      {/* Tyres */}
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

      {/* Ground plane with subtle grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshBasicMaterial color="#f1f5f9" transparent opacity={0.8} />
      </mesh>
      
      {/* Ground grid */}
      <gridHelper args={[20, 40, "#e2e8f0", "#e2e8f0"]} position={[0, 0.02, 0]} />
    </group>
  );
};
