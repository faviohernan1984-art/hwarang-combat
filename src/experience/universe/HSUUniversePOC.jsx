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
      atmosphereRef.current.uniforms.uIntensity.value =
        THREE.MathUtils.lerp(
          0.38,
          0.72,
          travelProgress
        );
    }
  });

  return (
    <group>
      <mesh ref={planetRef}>
        <sphereGeometry args={[1.32, 128, 128]} />

        <meshStandardMaterial
          color="#030a14"
          roughness={0.82}
          metalness={0.18}
          emissive="#020812"
          emissiveIntensity={0.16}
        />
      </mesh>

      <mesh scale={1.035}>
        <sphereGeometry args={[1.32, 128, 128]} />

        <shaderMaterial
          ref={atmosphereRef}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          uniforms={{
            uBlueColor: {
              value: new THREE.Color("#3287ff"),
            },
            uWhiteColor: {
              value: new THREE.Color("#e9f4ff"),
            },
            uSunDirection: {
              value: new THREE.Vector3(
                0,
                1.15,
                -2.8
              ).normalize(),
            },
            uIntensity: {
              value: 0.38,
            },
          }}
          vertexShader={`
            varying vec3 vWorldNormal;
            varying vec3 vWorldPosition;

            void main() {
              vWorldNormal =
                normalize(
                  mat3(modelMatrix) * normal
                );

              vec4 worldPosition =
                modelMatrix *
                vec4(position, 1.0);

              vWorldPosition =
                worldPosition.xyz;

              gl_Position =
                projectionMatrix *
                viewMatrix *
                worldPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vWorldNormal;
            varying vec3 vWorldPosition;

            uniform vec3 uBlueColor;
            uniform vec3 uWhiteColor;
            uniform vec3 uSunDirection;
            uniform float uIntensity;

            void main() {
              vec3 normal =
                normalize(vWorldNormal);

              vec3 viewDirection =
                normalize(
                  cameraPosition -
                  vWorldPosition
                );

              float fresnel =
                pow(
                  1.0 -
                  max(
                    dot(
                      normal,
                      viewDirection
                    ),
                    0.0
                  ),
                  3.4
                );

              float sunPresence =
                pow(
                  max(
                    dot(
                      normal,
                      normalize(uSunDirection)
                    ),
                    0.0
                  ),
                  2.2
                );

              float glow =
  fresnel *
  sunPresence *
  2.1;

              vec3 color =
                mix(
                  uBlueColor,
                  uWhiteColor,
                  sunPresence * 0.78
                );

              gl_FragColor =
                vec4(
                  color,
                  glow * uIntensity
                );
            }
          `}
        />
      </mesh>
    </group>
  );
}

function DeepSpaceStars() {
  const starsRef = useRef(null);

  useFrame(({ pointer }, delta) => {
  if (!starsRef.current) return;

  starsRef.current.rotation.y += delta * 0.0008;
  starsRef.current.rotation.x += delta * 0.0002;

  starsRef.current.position.x = THREE.MathUtils.lerp(
    starsRef.current.position.x,
    pointer.x * 0.035,
    0.015
  );

  starsRef.current.position.y = THREE.MathUtils.lerp(
    starsRef.current.position.y,
    pointer.y * 0.02,
    0.015
  );
});

  return (
    <Stars
      ref={starsRef}
      radius={160}
      depth={120}
      count={9000}
      factor={1.15}
      saturation={0}
      fade
      speed={0}
    />
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
       radius={32}
       depth={48}
       count={4200}
       factor={2.2}
       saturation={0}
       fade
       speed={0.12}
    />
  );
}

function MidSpaceStars() {
  const starsRef = useRef(null);

  useFrame(({ pointer }, delta) => {
    if (!starsRef.current) return;

    starsRef.current.rotation.y += delta * 0.0018;
    starsRef.current.rotation.x += delta * 0.0005;

    starsRef.current.position.x = THREE.MathUtils.lerp(
      starsRef.current.position.x,
      pointer.x * 0.16,
      0.025
    );

    starsRef.current.position.y = THREE.MathUtils.lerp(
      starsRef.current.position.y,
      pointer.y * 0.1,
      0.025
    );
  });

  return (
    <Stars
      ref={starsRef}
      radius={52}
      depth={54}
      count={1800}
      factor={1.45}
      saturation={0}
      fade
      speed={0.04}
    />
  );
}

function VolumetricNebulaCloud() {
  const cloudRef = useRef(null);

  const positions = useRef(
    Float32Array.from({ length: 600 * 3 }, (_, i) => {
      const axis = i % 3;

      if (axis === 0) return THREE.MathUtils.randFloatSpread(8);

      if (axis === 1) return THREE.MathUtils.randFloatSpread(4);

      return THREE.MathUtils.randFloat(-8, -2);
    })
  );

  const texture = useRef(null);

  if (!texture.current) {
    const canvas = document.createElement("canvas");

    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(
      32,
      32,
      0,
      32,
      32,
      32
    );

    gradient.addColorStop(0, "rgba(140,180,255,1)");
    gradient.addColorStop(0.4, "rgba(80,120,255,0.25)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    texture.current = new THREE.CanvasTexture(canvas);
  }

  useFrame((_, delta) => {
    if (!cloudRef.current) return;

    cloudRef.current.rotation.z += delta * 0.0015;
  });

  return (
    <points ref={cloudRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        map={texture.current}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.035}
        size={0.55}
        sizeAttenuation
      />
    </points>
  );
}

function NearSpaceParticles() {
  const particlesRef = useRef(null);

  const positions = useRef(
    Float32Array.from({ length: 80 * 3 }, (_, index) => {
      const axis = index % 3;

      if (axis === 0) {
        return THREE.MathUtils.randFloatSpread(12);
      }

      if (axis === 1) {
        return THREE.MathUtils.randFloatSpread(7);
      }

      return THREE.MathUtils.randFloat(2.2, 8.5);
    })
  );

  useFrame(({ pointer }, delta) => {
    if (!particlesRef.current) return;

    particlesRef.current.rotation.y += delta * 0.002;

    particlesRef.current.position.x = THREE.MathUtils.lerp(
      particlesRef.current.position.x,
      pointer.x * 0.75,
      0.035
    );

    particlesRef.current.position.y = THREE.MathUtils.lerp(
      particlesRef.current.position.y,
      pointer.y * 0.45,
      0.035
    );
  });

  const particleTexture = useRef(null);

if (!particleTexture.current) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    32,
    32,
    0,
    32,
    32,
    32
  );

  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.22, "rgba(210, 230, 255, 0.72)");
  gradient.addColorStop(1, "rgba(210, 230, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  particleTexture.current = new THREE.CanvasTexture(canvas);
}

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
  map={particleTexture.current}
  color="#dbe9ff"
  size={0.075}
  sizeAttenuation
  transparent
  opacity={0.32}
  alphaTest={0.01}
  depthWrite={false}
  blending={THREE.AdditiveBlending}
/>
    </points>
  );
}

function AmbientNebula() {
  const nebulaRef = useRef(null);

  useFrame(({ pointer }, delta) => {
    if (!nebulaRef.current) return;

    nebulaRef.current.rotation.z += delta * 0.0006;

    nebulaRef.current.position.x = THREE.MathUtils.lerp(
      nebulaRef.current.position.x,
      pointer.x * 0.05,
      0.015
    );

    nebulaRef.current.position.y = THREE.MathUtils.lerp(
      nebulaRef.current.position.y,
      pointer.y * 0.03,
      0.015
    );
  });

  return (
    <mesh
      ref={nebulaRef}
      position={[-3.8, 1.4, -10]}
      rotation={[0, 0, -0.35]}
      scale={[14, 8, 1]}
    >
      <planeGeometry args={[1, 1, 1, 1]} />

      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uColorA: { value: new THREE.Color("#123f8f") },
          uColorB: { value: new THREE.Color("#8d1118") },
          uOpacity: { value: 0.24 },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;

          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform float uOpacity;

          void main() {
            vec2 centeredUv = vUv - 0.5;

            float distanceFromCenter = length(centeredUv * vec2(1.0, 1.45));
            float falloff = smoothstep(0.58, 0.08, distanceFromCenter);

            float internalCloud =
              sin(vUv.x * 11.0 + vUv.y * 7.0) * 0.5 + 0.5;

            internalCloud *=
              sin(vUv.x * 4.0 - vUv.y * 9.0) * 0.5 + 0.5;

            vec3 color = mix(
              uColorA,
              uColorB,
              smoothstep(0.18, 0.86, vUv.x)
            );

            float alpha =
              falloff *
              (0.42 + internalCloud * 0.58) *
              uOpacity;

            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

function DeepSpaceGradient() {
  const materialRef = useRef(null);

  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value =
      state.clock.elapsedTime;
  });

  return (
    <mesh scale={150}>
      <sphereGeometry args={[1, 64, 64]} />

      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        uniforms={{
          uTopColor: {
            value: new THREE.Color("#020611"),
          },
          uCenterColor: {
            value: new THREE.Color("#123c78"),
          },
          uBottomColor: {
            value: new THREE.Color("#5a101c"),
          },
          uTime: {
            value: 0,
          },
        }}
        vertexShader={`
          varying vec3 vPosition;

          void main() {
            vPosition = normalize(position);

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vPosition;

          uniform vec3 uTopColor;
          uniform vec3 uCenterColor;
          uniform vec3 uBottomColor;
          uniform float uTime;

          float random(vec3 position) {
            return fract(
              sin(
                dot(
                  position,
                  vec3(12.9898, 78.233, 37.719)
                )
              ) * 43758.5453
            );
          }

          float noise(vec3 position) {
            vec3 integerPosition = floor(position);
            vec3 fractionalPosition = fract(position);

            fractionalPosition =
              fractionalPosition *
              fractionalPosition *
              (3.0 - 2.0 * fractionalPosition);

            float n000 = random(
              integerPosition + vec3(0.0, 0.0, 0.0)
            );

            float n100 = random(
              integerPosition + vec3(1.0, 0.0, 0.0)
            );

            float n010 = random(
              integerPosition + vec3(0.0, 1.0, 0.0)
            );

            float n110 = random(
              integerPosition + vec3(1.0, 1.0, 0.0)
            );

            float n001 = random(
              integerPosition + vec3(0.0, 0.0, 1.0)
            );

            float n101 = random(
              integerPosition + vec3(1.0, 0.0, 1.0)
            );

            float n011 = random(
              integerPosition + vec3(0.0, 1.0, 1.0)
            );

            float n111 = random(
              integerPosition + vec3(1.0, 1.0, 1.0)
            );

            float x00 = mix(
              n000,
              n100,
              fractionalPosition.x
            );

            float x10 = mix(
              n010,
              n110,
              fractionalPosition.x
            );

            float x01 = mix(
              n001,
              n101,
              fractionalPosition.x
            );

            float x11 = mix(
              n011,
              n111,
              fractionalPosition.x
            );

            float y0 = mix(
              x00,
              x10,
              fractionalPosition.y
            );

            float y1 = mix(
              x01,
              x11,
              fractionalPosition.y
            );

            return mix(
              y0,
              y1,
              fractionalPosition.z
            );
          }

          float fbm(vec3 position) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int i = 0; i < 5; i++) {
              value += noise(position) * amplitude;
              position *= 2.03;
              amplitude *= 0.5;
            }

            return value;
          }

          void main() {
            vec3 direction = normalize(vPosition);

            float vertical =
              direction.y * 0.5 + 0.5;

            float centerPresence =
              1.0 - abs(direction.y);

            vec3 color = mix(
              uBottomColor,
              uTopColor,
              vertical
            );

            color = mix(
              color,
              uCenterColor,
              centerPresence * 0.8
            );

            vec3 noisePosition =
  direction * 0.95 +
  vec3(
    uTime * 0.00045,
    0.0,
    uTime * 0.00025
  );

float largeRegions =
  fbm(noisePosition);

float secondaryRegions =
  fbm(
    direction * 1.8 +
    vec3(8.0, 2.0, 5.0)
  );

largeRegions =
  smoothstep(
    0.52,
    0.86,
    largeRegions
  );

secondaryRegions =
  smoothstep(
    0.66,
    0.93,
    secondaryRegions
  );

float organicVariation =
  largeRegions * 0.88 +
  secondaryRegions * 0.12;

            organicVariation =
              organicVariation - 0.5;

            color *=
              1.0 + organicVariation * 0.13;

            vec3 coolRegion =
              vec3(0.01, 0.025, 0.075);

            vec3 warmRegion =
  vec3(0.22, 0.035, 0.018);

float coolPresence =
  smoothstep(
    0.50,
    0.80,
    largeRegions
  );

float warmPresence =
  smoothstep(
    0.46,
    0.70,
    secondaryRegions
  );

            color +=
              coolRegion *
              coolPresence *
              0.35;

            color +=
  warmRegion *
  warmPresence *
  0.42;

            gl_FragColor =
              vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function GalaxyRegion({
  position,
  rotation,
  scale,
  coolColor,
  warmColor,
  opacity,
  seed,
  pointerInfluence = 0.02,
  rotationSpeed = 0.0001,
}) {
  const regionRef = useRef(null);
  const basePosition = useRef(new THREE.Vector3(...position));

  useFrame(({ pointer }, delta) => {
    if (!regionRef.current) return;

    regionRef.current.rotation.z += delta * rotationSpeed;

    regionRef.current.position.x = THREE.MathUtils.lerp(
      regionRef.current.position.x,
      basePosition.current.x + pointer.x * pointerInfluence,
      0.01
    );

    regionRef.current.position.y = THREE.MathUtils.lerp(
      regionRef.current.position.y,
      basePosition.current.y + pointer.y * pointerInfluence * 0.7,
      0.01
    );
  });

  return (
    <mesh
      ref={regionRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <planeGeometry args={[1, 1]} />

      <shaderMaterial
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uCoolColor: {
            value: new THREE.Color(coolColor),
          },
          uWarmColor: {
            value: new THREE.Color(warmColor),
          },
          uOpacity: {
            value: opacity,
          },
          uSeed: {
            value: seed,
          },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;

          uniform vec3 uCoolColor;
          uniform vec3 uWarmColor;
          uniform float uOpacity;
          uniform float uSeed;

          float random(vec2 position) {
            return fract(
              sin(
                dot(
                  position,
                  vec2(12.9898, 78.233)
                ) + uSeed
              ) * 43758.5453
            );
          }

          float noise(vec2 position) {
            vec2 integerPosition = floor(position);
            vec2 fractionalPosition = fract(position);

            fractionalPosition =
              fractionalPosition *
              fractionalPosition *
              (3.0 - 2.0 * fractionalPosition);

            float a = random(integerPosition);
            float b = random(
              integerPosition + vec2(1.0, 0.0)
            );
            float c = random(
              integerPosition + vec2(0.0, 1.0)
            );
            float d = random(
              integerPosition + vec2(1.0, 1.0)
            );

            return mix(
              mix(a, b, fractionalPosition.x),
              mix(c, d, fractionalPosition.x),
              fractionalPosition.y
            );
          }

          float fbm(vec2 position) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int i = 0; i < 5; i++) {
              value += noise(position) * amplitude;
              position *= 2.04;
              amplitude *= 0.5;
            }

            return value;
          }

          void main() {
            vec2 centeredUv = vUv - 0.5;

            centeredUv.x *= 0.72;
            centeredUv.y *= 1.55;

            float distanceFromCenter =
              length(centeredUv);

            float outerFalloff =
              1.0 -
              smoothstep(
                0.08,
                0.48,
                distanceFromCenter
              );

            float cloudShape =
              fbm(
                centeredUv * 3.2 +
                vec2(3.1 + uSeed, 7.8)
              );

            float cloudDetail =
              fbm(
                centeredUv * 7.5 +
                vec2(11.0, 2.0 + uSeed)
              );

            float density =
              cloudShape * 0.78 +
              cloudDetail * 0.22;

            density =
              smoothstep(
                0.42,
                0.76,
                density
              );

            float warmPresence =
              smoothstep(
                0.48,
                0.78,
                fbm(
                  centeredUv * 2.4 +
                  vec2(9.0 + uSeed, 4.0)
                )
              );

            vec3 color = mix(
              uCoolColor,
              uWarmColor,
              warmPresence
            );

            float alpha =
              outerFalloff *
              density *
              uOpacity;

            gl_FragColor =
              vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

function SunBacklight({ travelProgress }) {
  const sunRef = useRef(null);
  const glowTexture = useRef(null);

  const coreRef = useRef(null);
  const coronaRef = useRef(null);
  const haloRef = useRef(null);

  const coreTexture = useRef(null);
  const coronaTexture = useRef(null);
  const haloTexture = useRef(null);

  if (!glowTexture.current) {
    const canvas =
      document.createElement("canvas");

    canvas.width = 256;
    canvas.height = 256;

    const context =
      canvas.getContext("2d");

    const gradient =
      context.createRadialGradient(
        128,
        128,
        0,
        128,
        128,
        128
      );

    gradient.addColorStop(
      0,
      "rgba(255,255,255,1)"
    );

    gradient.addColorStop(
      0.08,
      "rgba(220,238,255,0.95)"
    );

    gradient.addColorStop(
      0.22,
      "rgba(90,155,255,0.55)"
    );

    gradient.addColorStop(
      0.52,
      "rgba(45,100,255,0.14)"
    );

    gradient.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    context.fillStyle = gradient;

    context.fillRect(
      0,
      0,
      256,
      256
    );

    glowTexture.current =
      new THREE.CanvasTexture(canvas);
  }

  if (!coreTexture.current) {
  const coreCanvas = document.createElement("canvas");

  coreCanvas.width = 256;
  coreCanvas.height = 256;

  const coreContext = coreCanvas.getContext("2d");

  const coreGradient = coreContext.createRadialGradient(
    128,
    128,
    0,
    128,
    128,
    128
  );

  coreGradient.addColorStop(
    0,
    "rgba(255,255,255,1)"
  );

  coreGradient.addColorStop(
    0.1,
    "rgba(255,255,255,1)"
  );

  coreGradient.addColorStop(
    0.22,
    "rgba(225,240,255,0.95)"
  );

  coreGradient.addColorStop(
    0.35,
    "rgba(180,215,255,0.65)"
  );

  coreGradient.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );

  coreContext.fillStyle = coreGradient;

  coreContext.fillRect(
    0,
    0,
    256,
    256
  );

  coreTexture.current =
    new THREE.CanvasTexture(coreCanvas);
}

  useFrame((state) => {
    if (!sunRef.current) return;

    const pulse =
      1 +
      Math.sin(
        state.clock.elapsedTime * 0.45
      ) * 0.018;

    sunRef.current.scale.setScalar(
      pulse *
        THREE.MathUtils.lerp(
          3.4,
          4.2,
          travelProgress
        )
    );
  });

  return (
  <>
    <sprite
      ref={sunRef}
      position={[0, 1.15, -2.8]}
      scale={[3.4, 3.4, 1]}
    >
      <spriteMaterial
        map={glowTexture.current}
        transparent
        depthWrite={false}
        depthTest
        toneMapped={false}
        opacity={
          0.55 +
          travelProgress * 0.25
        }
        blending={THREE.AdditiveBlending}
      />
    </sprite>

    <sprite
      ref={coreRef}
      position={[0, 1.15, -4.2]}
      scale={[1.35, 1.35, 1]}
    >
      <spriteMaterial
        map={coreTexture.current}
        transparent
        depthWrite={false}
        depthTest
        toneMapped={false}
        opacity={0.72}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  </>
);
}

function UniverseScene({ travelProgress }) {
  return (
    <>
      <color attach="background" args={["#010207"]} />

      <ambientLight
  intensity={THREE.MathUtils.lerp(
    0.04,
    0.2,
    travelProgress
  )}
/>

     <directionalLight
  position={[4, 3, 6]}
  intensity={THREE.MathUtils.lerp(
    0.75,
    4.2,
    travelProgress
  )}
  color="#d9e9ff"
/>

      <pointLight
  position={[-4, 1, 2]}
  intensity={THREE.MathUtils.lerp(
    12,
    24,
    travelProgress
  )}
  distance={THREE.MathUtils.lerp(
    10,
    14,
    travelProgress
  )}
  decay={2}
  color="#123f8f"
/>

<pointLight
  position={[3, -2, -1]}
  intensity={THREE.MathUtils.lerp(
    2.5,
    11,
    travelProgress
  )}
  distance={THREE.MathUtils.lerp(
    7,
    10,
    travelProgress
  )}
  decay={2}
  color="#8d1118"
/>

      <DeepSpaceGradient />
      
      <GalaxyRegion
  position={[-6.8, 4.2, -18]}
  rotation={[0, 0, -0.42]}
  scale={[18, 7, 1]}
  coolColor="#286fd1"
  warmColor="#d0522f"
  opacity={0.22}
  seed={2.4}
  pointerInfluence={0.025}
  rotationSpeed={0.00008}
/>

<GalaxyRegion
  position={[7.5, -4.5, -20]}
  rotation={[0, 0, 0.34]}
  scale={[15, 5.5, 1]}
  coolColor="#173f86"
  warmColor="#9f3028"
  opacity={0.11}
  seed={8.7}
  pointerInfluence={0.015}
  rotationSpeed={-0.00005}
/>

      <DeepSpaceStars />
<MidSpaceStars />
<SpaceDust />
<NearSpaceParticles />

<SunBacklight
  travelProgress={travelProgress}
/>

<HOIPlanet
  travelProgress={travelProgress}
/>

<CameraExperience
  travelProgress={travelProgress}
/>
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