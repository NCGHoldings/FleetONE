import { useRef } from "react";
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
    "Front Left": { position: [-4.5, 0.5, -1.4] as [number, number, number] },
    "Front Right": { position: [-4.5, 0.5, 1.4] as [number, number, number] },
    "Rear Left 1": { position: [3, 0.5, -1.4] as [number, number, number] },
    "Rear Right 1": { position: [3, 0.5, 1.4] as [number, number, number] },
    "Rear Left 2": { position: [4.2, 0.5, -1.4] as [number, number, number] },
    "Rear Right 2": { position: [4.2, 0.5, 1.4] as [number, number, number] },
  };

  const getTyreByPosition = (position: string) => {
    return tyres.find(t => t.position === position);
  };

  return (
    <group ref={groupRef}>
      {/* Bus body - main rectangular frame */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[12, 2.5, 2.5]} />
        <meshStandardMaterial 
          color="#1e3a5f" 
          wireframe={false}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Bus body wireframe overlay */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[12, 2.5, 2.5]} />
        <meshBasicMaterial color="#3b82f6" wireframe />
      </mesh>

      {/* Front windshield area */}
      <mesh position={[-5.5, 2.2, 0]} rotation={[0, 0, -Math.PI / 12]}>
        <boxGeometry args={[1.5, 2, 2.3]} />
        <meshStandardMaterial 
          color="#1e40af" 
          transparent 
          opacity={0.6}
        />
      </mesh>

      {/* Front windshield wireframe */}
      <mesh position={[-5.5, 2.2, 0]} rotation={[0, 0, -Math.PI / 12]}>
        <boxGeometry args={[1.5, 2, 2.3]} />
        <meshBasicMaterial color="#60a5fa" wireframe />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[11, 0.2, 2.4]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Windows - left side */}
      {[-3, -1, 1, 3, 5].map((x, i) => (
        <mesh key={`window-left-${i}`} position={[x, 2.2, -1.26]}>
          <planeGeometry args={[1.5, 1.2]} />
          <meshStandardMaterial 
            color="#0ea5e9" 
            transparent 
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Windows - right side */}
      {[-3, -1, 1, 3, 5].map((x, i) => (
        <mesh key={`window-right-${i}`} position={[x, 2.2, 1.26]}>
          <planeGeometry args={[1.5, 1.2]} />
          <meshStandardMaterial 
            color="#0ea5e9" 
            transparent 
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Wheel wells - front */}
      <mesh position={[-4.5, 0.8, -1.35]}>
        <boxGeometry args={[1.2, 1.2, 0.3]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-4.5, 0.8, 1.35]}>
        <boxGeometry args={[1.2, 1.2, 0.3]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Wheel wells - rear */}
      <mesh position={[3.6, 0.8, -1.35]}>
        <boxGeometry args={[2.5, 1.2, 0.3]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[3.6, 0.8, 1.35]}>
        <boxGeometry args={[2.5, 1.2, 0.3]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Headlights */}
      <mesh position={[-6, 1.5, -0.8]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-6, 1.5, 0.8]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
      </mesh>

      {/* Tail lights */}
      <mesh position={[6, 1.5, -0.8]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[6, 1.5, 0.8]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
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

      {/* Ground grid */}
      <gridHelper args={[20, 20, "#374151", "#1f2937"]} position={[0, 0, 0]} />
    </group>
  );
};
