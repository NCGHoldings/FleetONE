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

  // Color based on condition
  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "#22c55e"; // Green
    if (percentage >= 50) return "#84cc16"; // Lime
    if (percentage >= 30) return "#eab308"; // Yellow
    if (percentage >= 10) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const rimColor = getConditionColor(conditionPercentage);
  const scale = hovered ? 1.06 : 1;

  // Tyre dimensions
  const outerRadius = 0.48;
  const innerRadius = 0.28;
  const tyreWidth = 0.32;

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
      {/* ============ OUTER TYRE (Black Rubber) ============ */}
      {/* Main tyre body */}
      <mesh rotation={rotation}>
        <torusGeometry args={[outerRadius, 0.18, 24, 48]} />
        <meshStandardMaterial 
          color="#111827"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* ============ TREAD PATTERN ============ */}
      {/* Circumferential grooves - realistic tread pattern */}
      {[0.36, 0.42, 0.48, 0.54].map((radius, i) => (
        <mesh key={`groove-${i}`} rotation={rotation}>
          <torusGeometry args={[radius, 0.015, 8, 48]} />
          <meshStandardMaterial 
            color={i % 2 === 0 ? "#0f172a" : "#1e293b"} 
            roughness={0.9}
          />
        </mesh>
      ))}

      {/* Cross-groove tread blocks (around circumference) */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const x = Math.cos(angle) * 0.45;
        const z = Math.sin(angle) * 0.45;
        return (
          <mesh 
            key={`tread-${i}`}
            position={[x, 0, z]}
            rotation={[0, -angle + Math.PI / 2, Math.PI / 2]}
          >
            <boxGeometry args={[0.12, 0.04, 0.03]} />
            <meshStandardMaterial color="#1e293b" roughness={0.85} />
          </mesh>
        );
      })}

      {/* Sidewall texture rings */}
      <mesh rotation={rotation}>
        <torusGeometry args={[0.32, 0.008, 8, 48]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh rotation={rotation}>
        <torusGeometry args={[0.58, 0.008, 8, 48]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* ============ WHEEL RIM (Colored by condition) ============ */}
      {/* Outer rim edge */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[innerRadius + 0.02, innerRadius + 0.02, tyreWidth, 48]} />
        <meshStandardMaterial 
          color={rimColor}
          metalness={0.7}
          roughness={0.25}
          emissive={hovered ? rimColor : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* Inner rim surface */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[innerRadius - 0.02, innerRadius - 0.02, tyreWidth + 0.02, 48]} />
        <meshStandardMaterial 
          color="#475569"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* ============ 5-SPOKE RIM DESIGN ============ */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <group key={`spoke-${i}`} rotation={rotation}>
            {/* Main spoke */}
            <mesh 
              position={[
                Math.cos(angle) * 0.14,
                0,
                Math.sin(angle) * 0.14
              ]}
              rotation={[Math.PI / 2, angle, 0]}
            >
              <boxGeometry args={[0.06, tyreWidth - 0.04, 0.16]} />
              <meshStandardMaterial 
                color={rimColor}
                metalness={0.65}
                roughness={0.3}
                emissive={hovered ? rimColor : "#000000"}
                emissiveIntensity={hovered ? 0.25 : 0}
              />
            </mesh>

            {/* Spoke highlight/edge detail */}
            <mesh 
              position={[
                Math.cos(angle) * 0.14,
                0,
                Math.sin(angle) * 0.14
              ]}
              rotation={[Math.PI / 2, angle, 0]}
            >
              <boxGeometry args={[0.03, tyreWidth - 0.02, 0.14]} />
              <meshStandardMaterial 
                color="#94a3b8"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          </group>
        );
      })}

      {/* ============ CENTER HUB ============ */}
      {/* Hub cap base */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.1, 0.1, tyreWidth + 0.06, 32]} />
        <meshStandardMaterial 
          color="#64748b"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* Hub cap center dome */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.06, 0.07, tyreWidth + 0.1, 24]} />
        <meshStandardMaterial 
          color="#475569"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* ============ LUG NUTS ============ */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const nutRadius = 0.075;
        return (
          <mesh 
            key={`nut-${i}`}
            position={[
              Math.cos(angle) * nutRadius,
              (tyreWidth / 2) + 0.04,
              Math.sin(angle) * nutRadius
            ]}
            rotation={rotation}
          >
            <cylinderGeometry args={[0.015, 0.015, 0.025, 6]} />
            <meshStandardMaterial 
              color="#94a3b8"
              metalness={0.95}
              roughness={0.1}
            />
          </mesh>
        );
      })}

      {/* ============ INNER WHEEL DETAIL ============ */}
      {/* Brake disc (visible through spokes) */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 32]} />
        <meshStandardMaterial 
          color="#374151"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Brake disc ventilation holes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const holeRadius = 0.16;
        return (
          <mesh 
            key={`brake-hole-${i}`}
            position={[
              Math.cos(angle) * holeRadius,
              0,
              Math.sin(angle) * holeRadius
            ]}
            rotation={rotation}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        );
      })}

      {/* ============ HOVER GLOW EFFECT ============ */}
      {hovered && (
        <>
          <mesh rotation={rotation}>
            <torusGeometry args={[outerRadius + 0.08, 0.025, 8, 48]} />
            <meshBasicMaterial 
              color={rimColor}
              transparent
              opacity={0.5}
            />
          </mesh>
          <mesh rotation={rotation}>
            <torusGeometry args={[outerRadius + 0.12, 0.015, 8, 48]} />
            <meshBasicMaterial 
              color={rimColor}
              transparent
              opacity={0.3}
            />
          </mesh>
        </>
      )}
    </group>
  );
};
