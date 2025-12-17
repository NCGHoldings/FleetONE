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

  // Color based on condition - vibrant colors matching reference
  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "#22c55e"; // Bright Green
    if (percentage >= 50) return "#84cc16"; // Lime
    if (percentage >= 30) return "#eab308"; // Yellow
    if (percentage >= 10) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const rimColor = getConditionColor(conditionPercentage);
  const scale = hovered ? 1.08 : 1;

  // LARGER Tyre dimensions matching reference image
  const outerRadius = 0.72;
  const innerRadius = 0.42;
  const tyreWidth = 0.42;

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
      {/* ============ OUTER TYRE (Black Rubber) - LARGER ============ */}
      <mesh rotation={rotation}>
        <torusGeometry args={[outerRadius, 0.26, 32, 64]} />
        <meshStandardMaterial 
          color="#0f172a"
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>

      {/* Secondary tyre ring for depth */}
      <mesh rotation={rotation}>
        <torusGeometry args={[outerRadius - 0.05, 0.22, 24, 64]} />
        <meshStandardMaterial 
          color="#1e293b"
          roughness={0.9}
          metalness={0.08}
        />
      </mesh>

      {/* ============ TREAD PATTERN - More visible ============ */}
      {/* Main circumferential grooves */}
      {[0.52, 0.62, 0.72, 0.82].map((radius, i) => (
        <mesh key={`groove-${i}`} rotation={rotation}>
          <torusGeometry args={[radius, 0.018, 12, 64]} />
          <meshStandardMaterial 
            color={i % 2 === 0 ? "#0f172a" : "#1e293b"} 
            roughness={0.88}
          />
        </mesh>
      ))}

      {/* Tread blocks around circumference */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        const x = Math.cos(angle) * 0.68;
        const z = Math.sin(angle) * 0.68;
        return (
          <mesh 
            key={`tread-${i}`}
            position={[x, 0, z]}
            rotation={[0, -angle + Math.PI / 2, Math.PI / 2]}
          >
            <boxGeometry args={[0.14, 0.05, 0.035]} />
            <meshStandardMaterial color="#1e293b" roughness={0.82} />
          </mesh>
        );
      })}

      {/* Sidewall rings */}
      <mesh rotation={rotation}>
        <torusGeometry args={[0.48, 0.012, 8, 64]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh rotation={rotation}>
        <torusGeometry args={[0.88, 0.01, 8, 64]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* ============ INNER RIM - PROMINENTLY COLORED ============ */}
      {/* Main inner rim surface - BRIGHT COLOR (like reference) */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[innerRadius + 0.08, innerRadius + 0.08, tyreWidth - 0.02, 64]} />
        <meshStandardMaterial 
          color={rimColor}
          metalness={0.75}
          roughness={0.2}
          emissive={rimColor}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Inner colored disc (very visible from side) */}
      <mesh rotation={rotation} position={[0, tyreWidth / 2 - 0.08, 0]}>
        <circleGeometry args={[innerRadius + 0.06, 64]} />
        <meshStandardMaterial 
          color={rimColor}
          metalness={0.7}
          roughness={0.25}
          emissive={rimColor}
          emissiveIntensity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rim outer edge ring */}
      <mesh rotation={rotation}>
        <torusGeometry args={[innerRadius + 0.04, 0.035, 16, 64]} />
        <meshStandardMaterial 
          color={rimColor}
          metalness={0.8}
          roughness={0.15}
          emissive={hovered ? rimColor : "#000000"}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      {/* Secondary rim highlight ring */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[innerRadius - 0.03, innerRadius - 0.03, tyreWidth + 0.04, 64]} />
        <meshStandardMaterial 
          color="#64748b"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* ============ 5-SPOKE RIM DESIGN - LARGER ============ */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <group key={`spoke-${i}`} rotation={rotation}>
            {/* Main spoke - COLORED */}
            <mesh 
              position={[
                Math.cos(angle) * 0.22,
                0,
                Math.sin(angle) * 0.22
              ]}
              rotation={[Math.PI / 2, angle, 0]}
            >
              <boxGeometry args={[0.1, tyreWidth - 0.06, 0.24]} />
              <meshStandardMaterial 
                color={rimColor}
                metalness={0.7}
                roughness={0.25}
                emissive={hovered ? rimColor : "#000000"}
                emissiveIntensity={hovered ? 0.3 : 0}
              />
            </mesh>

            {/* Spoke center highlight */}
            <mesh 
              position={[
                Math.cos(angle) * 0.22,
                0,
                Math.sin(angle) * 0.22
              ]}
              rotation={[Math.PI / 2, angle, 0]}
            >
              <boxGeometry args={[0.04, tyreWidth - 0.04, 0.2]} />
              <meshStandardMaterial 
                color="#94a3b8"
                metalness={0.92}
                roughness={0.08}
              />
            </mesh>
          </group>
        );
      })}

      {/* ============ CENTER HUB - LARGER ============ */}
      {/* Hub base */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.14, 0.14, tyreWidth + 0.08, 48]} />
        <meshStandardMaterial 
          color="#64748b"
          metalness={0.88}
          roughness={0.12}
        />
      </mesh>

      {/* Hub center dome */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.09, 0.1, tyreWidth + 0.14, 32]} />
        <meshStandardMaterial 
          color="#475569"
          metalness={0.92}
          roughness={0.08}
        />
      </mesh>

      {/* ============ LUG NUTS ============ */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const nutRadius = 0.1;
        return (
          <mesh 
            key={`nut-${i}`}
            position={[
              Math.cos(angle) * nutRadius,
              (tyreWidth / 2) + 0.06,
              Math.sin(angle) * nutRadius
            ]}
            rotation={rotation}
          >
            <cylinderGeometry args={[0.02, 0.02, 0.035, 6]} />
            <meshStandardMaterial 
              color="#94a3b8"
              metalness={0.95}
              roughness={0.08}
            />
          </mesh>
        );
      })}

      {/* ============ BRAKE DISC (visible through spokes) ============ */}
      <mesh rotation={rotation}>
        <cylinderGeometry args={[0.28, 0.28, 0.05, 48]} />
        <meshStandardMaterial 
          color="#374151"
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      {/* Brake disc ventilation holes */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const holeRadius = 0.22;
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
            <cylinderGeometry args={[0.016, 0.016, 0.06, 8]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        );
      })}

      {/* ============ HOVER GLOW EFFECT ============ */}
      {hovered && (
        <>
          <mesh rotation={rotation}>
            <torusGeometry args={[outerRadius + 0.1, 0.03, 8, 64]} />
            <meshBasicMaterial 
              color={rimColor}
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh rotation={rotation}>
            <torusGeometry args={[outerRadius + 0.16, 0.02, 8, 64]} />
            <meshBasicMaterial 
              color={rimColor}
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* Inner glow */}
          <mesh rotation={rotation}>
            <torusGeometry args={[innerRadius + 0.1, 0.025, 8, 64]} />
            <meshBasicMaterial 
              color={rimColor}
              transparent
              opacity={0.5}
            />
          </mesh>
        </>
      )}
    </group>
  );
};
