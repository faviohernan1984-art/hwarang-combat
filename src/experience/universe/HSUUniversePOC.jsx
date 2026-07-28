import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./HSUUniversePOC.css";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function CameraExperience({ travelProgress }) {
  const { camera, pointer } = useThree();

  useFrame(() => {
    const targetDistance = THREE.MathUtils.lerp(
      10.5,
      3.35,
      travelProgress
    );

    const targetX = pointer.x * 0.42;
    const targetY = pointer.y * 0.25;

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      targetX,
      0.035
    );

    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetY,
      0.035
    );

    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      targetDistance,
      0.04
    );

    camera.lookAt(0, 0, 0);
  });

  return null;
}

function HOIPlanet({ travelProgress }) {
  const planetRef = useRef(null);
  const atmosphereRef = useRef(null);

  useFrame((state, delta) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.055;
      planetRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.18) * 0.025;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.018;

      const pulse =
        1 +
        Math.sin(state.clock.elapsedTime * 0.65) *
          (0.008 + travelProgress * 0.006);

      atmosphereRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <mesh ref={planetRef}>
        <sphereGeometry args={[1.32, 128, 128]} />

        <meshStandardMaterial
          color="#07111f"
          roughness={0.7}
          metalness={0.25}
          emissive="#061a34"
          emissiveIntensity={0.42}
        />
      </mesh>

      <mesh ref={atmosphereRef} scale={1.055}>
        <sphereGeometry args={[1.32, 128, 128]} />

        <meshBasicMaterial
          color="#3287ff"
          transparent
          opacity={0.13 + travelProgress * 0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.105}>
        <sphereGeometry args={[1.32, 96, 96]} />

        <meshBasicMaterial
          color="#4a9cff"
          transparent
          opacity={0.035 + travelProgress * 0.035}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SpaceDust() {
  const dustRef = useRef(null);

  useFrame((_, delta) => {
    if (!dustRef.current) return;

    dustRef.current.rotation.y += delta * 0.004;
    dustRef.current.rotation.x += delta * 0.001;
  });

  return (
    <Stars
      ref={dustRef}
      radius={90}
      depth={70}
      count={6500}
      factor={3}
      saturation={0}
      fade
      speed={0.12}
    />
  );
}

function UniverseScene({ travelProgress }) {
  return (
    <>
      <color attach="background" args={["#010207"]} />

      <fog attach="fog" args={["#010207", 8, 48]} />

      <ambientLight intensity={0.2} />

      <directionalLight
        position={[4, 3, 6]}
        intensity={3.3}
        color="#d9e9ff"
      />

      <pointLight
        position={[-4, 1, 2]}
        intensity={18}
        distance={12}
        decay={2}
        color="#123f8f"
      />

      <pointLight
        position={[3, -2, -1]}
        intensity={9}
        distance={9}
        decay={2}
        color="#8d1118"
      />

      <SpaceDust />
      <HOIPlanet travelProgress={travelProgress} />
      <CameraExperience travelProgress={travelProgress} />
    </>
  );
}

export default function HSUUniversePOC() {
  const [travelProgress, setTravelProgress] = useState(0);

  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();

      setTravelProgress((currentProgress) =>
        clamp(currentProgress + event.deltaY * 0.00045, 0, 1)
      );
    };

    window.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <main className="hsu-universe-poc">
      <Canvas
        dpr={[1, 1.75]}
        camera={{
          position: [0, 0, 10.5],
          fov: 42,
          near: 0.1,
          far: 180,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <UniverseScene travelProgress={travelProgress} />
      </Canvas>
    </main>
  );
}