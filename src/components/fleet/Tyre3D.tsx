import { useRef, useState } from "react";
import { Cylinder } from "@react-three/drei";
import * as THREE from "three";

interface Tyre3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  conditionPercentage: number;
  tyreId?: string;
  positionLabel: string;
  brand?: string;
  onClick?: () => void;
}

export const Tyre3D = ({ 
  position, 
  rotation = [0, 0, Math.PI / 2],
  conditionPercentage, 
  tyreId,
  positionLabel,
  brand,
  onClick 
}: Tyre3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "#10b981"; // Emerald
    if (percentage >= 50) return "#14b8a6"; // Teal
    if (percentage >= 30) return "#f59e0b"; // Amber
    if (percentage >= 10) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const tyreColor = getConditionColor(conditionPercentage);
  const scale = hovered ? 1.1 : 1;

  return (
    <group position={position}>
      {/* Main tyre */}
      <Cylinder
        ref={meshRef}
        args={[0.5, 0.5, 0.35, 32]}
        rotation={rotation}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial 
          color={tyreColor} 
          emissive={hovered ? tyreColor : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </Cylinder>
      
      {/* Rim (silver center) */}
      <Cylinder
        args={[0.25, 0.25, 0.36, 32]}
        rotation={rotation}
        scale={scale}
      >
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </Cylinder>

      {/* Hub cap */}
      <Cylinder
        args={[0.12, 0.12, 0.37, 16]}
        rotation={rotation}
        scale={scale}
      >
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </Cylinder>
    </group>
  );
};
