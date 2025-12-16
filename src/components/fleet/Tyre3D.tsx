import { useRef, useState } from "react";
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
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Color based on condition - matching reference image style
  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "#22c55e"; // Green
    if (percentage >= 50) return "#84cc16"; // Lime
    if (percentage >= 30) return "#eab308"; // Yellow
    if (percentage >= 10) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const rimColor = getConditionColor(conditionPercentage);
  const scale = hovered ? 1.08 : 1;

  return (
    <group 
      ref={groupRef}
      position={position}
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
      {/* Outer tyre (black rubber) */}
      <mesh rotation={rotation}>
        <torusGeometry args={[0.42, 0.15, 16, 32]} />
        <meshStandardMaterial 
          color="#1f2937"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Tyre tread pattern - subtle rings */}
      {[0.38, 0.46].map((radius, i) => (
        <mesh key={i} rotation={rotation}>
          <torusGeometry args={[radius, 0.02, 8, 32]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* Inner rim - colored based on condition */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.28, 0.28, 0.28, 32]} />
        <meshStandardMaterial 
          color={rimColor}
          metalness={0.6}
          roughness={0.3}
          emissive={hovered ? rimColor : "#000000"}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      {/* Hub cap center */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.12, 0.12, 0.30, 16]} />
        <meshStandardMaterial 
          color="#94a3b8"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Hub cap detail - center dot */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.05, 0.05, 0.32, 8]} />
        <meshStandardMaterial 
          color="#64748b"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Rim spokes effect */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh 
            key={`spoke-${i}`}
            position={[
              Math.cos(angle) * 0.18,
              0,
              Math.sin(angle) * 0.18
            ]}
            rotation={rotation}
          >
            <boxGeometry args={[0.04, 0.26, 0.08]} />
            <meshStandardMaterial 
              color={rimColor}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
        );
      })}

      {/* Hover glow ring */}
      {hovered && (
        <mesh rotation={rotation}>
          <torusGeometry args={[0.55, 0.02, 8, 32]} />
          <meshBasicMaterial 
            color={rimColor}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
};
