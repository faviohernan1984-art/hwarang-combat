import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./HSUUniversePOC.css";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function HOIIdentityOverlay({ travelProgress }) {
  const identityPresence =
    THREE.MathUtils.smoothstep(
      travelProgress,
      0.32,
      0.72
    );

  const identityExit =
    1 -
    THREE.MathUtils.smoothstep(
      travelProgress,
      0.86,
      0.99
    );

  const presence =
    identityPresence *
    identityExit;

  return (
    <div
      className="hoi-identity"
      style={{
        opacity: presence,
        transform: `
          translateY(${THREE.MathUtils.lerp(
            14,
            0,
            presence
          )}px)
        `,
      }}
    >
      <div className="hoi-identity__name">
        HO<span>i</span>
      </div>

      <div className="hoi-identity__line" />

      <div className="hoi-identity__meaning">
        HWARANG OPERATIONAL INTELLIGENCE
      </div>
    </div>
  );
}

function CameraExperience({ travelProgress }) {
  const { camera, pointer } = useThree();

  useFrame(() => {
    const targetDistance = THREE.MathUtils.lerp(
      10.5,
      3.35,
      travelProgress
    );

    // Microdesplazamiento de cámara.
// El planeta y la estrella responden mínimamente a la perspectiva,
// mientras el espacio profundo permanece prácticamente infinito.
const targetX = pointer.x * 0.035;
const targetY = pointer.y * 0.02;

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
  0.028
);

    camera.lookAt(0, 0, 0);
  });

  return null;
}

function HOIInteractiveZone({ travelProgress }) {
  const starRef = useRef(null);
  const starTexture = useRef(null);
  const hoverEnergyRef = useRef(0);


  const responseRef = useRef(null);
  const fieldRef = useRef(null);

  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const { gl } = useThree();

  const presence = THREE.MathUtils.smoothstep(
    travelProgress,
    0.68,
    0.90
  );

  if (!starTexture.current) {
    const canvas = document.createElement("canvas");

    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");

    const center = 256;

    // ============================================================
    // HALO EXTERIOR
    // ============================================================

    const halo = ctx.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      170
    );

    halo.addColorStop(0, "rgba(255,255,255,1)");
halo.addColorStop(0.018, "rgba(255,255,255,1)");
halo.addColorStop(0.045, "rgba(210,250,255,1)");
halo.addColorStop(0.10, "rgba(70,215,255,0.95)");
halo.addColorStop(0.22, "rgba(25,125,255,0.62)");
halo.addColorStop(0.42, "rgba(75,65,255,0.26)");
halo.addColorStop(0.70, "rgba(100,40,255,0.08)");
halo.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = halo;

    ctx.fillRect(
      0,
      0,
      512,
      512
    );

    // ============================================================
    // RAYOS IRREGULARES
    // ============================================================

    const rayAngles = [
      0.08,
      0.82,
      1.48,
      2.28,
      3.05,
      3.82,
      4.72,
      5.56,
    ];

    const rayLengths = [
      120,
      75,
      145,
      62,
      105,
      88,
      130,
      70,
    ];

    rayAngles.forEach((angle, index) => {
      const length =
        rayLengths[index];

      const x =
        Math.cos(angle) *
        length;

      const y =
        Math.sin(angle) *
        length;

      const gradient =
        ctx.createLinearGradient(
          center,
          center,
          center + x,
          center + y
        );

      gradient.addColorStop(
        0,
        "rgba(230,250,255,0.72)"
      );

      gradient.addColorStop(
        0.18,
        "rgba(80,190,255,0.32)"
      );

      gradient.addColorStop(
        1,
        "rgba(40,90,255,0)"
      );

      ctx.strokeStyle = gradient;

      ctx.lineWidth =
        index % 2 === 0
          ? 2.0
          : 1.0;

      ctx.beginPath();

      ctx.moveTo(
        center,
        center
      );

      ctx.lineTo(
        center + x,
        center + y
      );

      ctx.stroke();
    });

    // ============================================================
    // NÚCLEO FINAL
    // ============================================================

    const core = ctx.createRadialGradient(
  center,
  center,
  0,
  center,
  center,
  34
);

core.addColorStop(0, "rgba(255,255,255,1)");
core.addColorStop(0.06, "rgba(255,255,255,1)");
core.addColorStop(0.14, "rgba(235,255,255,1)");
core.addColorStop(0.30, "rgba(120,235,255,0.98)");
core.addColorStop(0.55, "rgba(40,155,255,0.60)");
core.addColorStop(1, "rgba(50,80,255,0)");

ctx.fillStyle = core;

ctx.fillRect(
  center - 40,
  center - 40,
  80,
  80
);

    starTexture.current =
      new THREE.CanvasTexture(canvas);
  }

  useFrame((state, delta) => {
  if (!starRef.current) return;

  const time = state.clock.elapsedTime;

  // El hover no enciende la estrella.
  // Introduce progresivamente una perturbación óptica.
  const targetHoverEnergy =
    hovered ? 1 : 0;

  hoverEnergyRef.current =
    THREE.MathUtils.lerp(
      hoverEnergyRef.current,
      targetHoverEnergy,
      1 - Math.exp(-delta * 3.2)
    );

  const hoverEnergy =
    hoverEnergyRef.current;

  // Respiración natural permanente.
  const breath =
    1 +
    Math.sin(time * 0.75) *
      0.018;

  // Al detectar al usuario apenas expande su campo.
  const interactionExpansion =
    1 +
    hoverEnergy * 0.055;

  const scale =
    breath *
    interactionExpansion;

  starRef.current.scale.set(
    0.28 * scale,
    0.28 * scale,
    1
  );

  // La estrella permanece luminosa.
  // No existe cambio tipo interruptor.
  starRef.current.material.opacity =
    presence * 0.88;

  // Perturbación óptica muy lenta al detectar presencia.
  starRef.current.material.rotation =
    Math.sin(time * 0.42) *
    0.025 *
    hoverEnergy;

  // Respuesta óptica de HOi.
// El núcleo permanece estable.
// El campo energético responde a la presencia.

if (responseRef.current) {
  const responseScale =
    THREE.MathUtils.lerp(
      0.42,
      0.62,
      hoverEnergy
    );

  responseRef.current.scale.set(
    responseScale,
    responseScale,
    1
  );

  responseRef.current.material.opacity =
    presence *
    THREE.MathUtils.lerp(
      0.10,
      0.42,
      hoverEnergy
    );
}

if (fieldRef.current) {
  const fieldScale =
  THREE.MathUtils.lerp(
    0.50,
    0.62,
    hoverEnergy
  );

  fieldRef.current.scale.set(
    fieldScale,
    fieldScale,
    1
  );

  fieldRef.current.material.opacity =
    presence *
    THREE.MathUtils.lerp(
  0.01,
  0.03,
  hoverEnergy
);
}

});

  if (presence <= 0.001) {
    return null;
  }

  return (
  <group
  onPointerOver={(event) => {
    event.stopPropagation();
    setHovered(true);
    gl.domElement.style.cursor = "pointer";
  }}
  onPointerOut={(event) => {
    event.stopPropagation();
    setHovered(false);
    gl.domElement.style.cursor = "crosshair";
  }}
  onClick={(event) => {
    event.stopPropagation();
    setActive((current) => !current);
  }}
>
    <sprite
      ref={starRef}
      position={[0.55, 0.18, 1.20]}
      onPointerOver={(event) => {
        event.stopPropagation();

        setHovered(true);

        gl.domElement.style.cursor =
          "pointer";
      }}
      onPointerOut={(event) => {
        event.stopPropagation();

        setHovered(false);

        gl.domElement.style.cursor =
          "crosshair";
      }}
      onClick={(event) => {
        event.stopPropagation();

        setActive(
          (current) => !current
        );
      }}
    >
      <spriteMaterial
        map={starTexture.current}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
        {/* SOBREEXPOSICIÓN ÓPTICA HOi */}
    <sprite
      ref={responseRef}
      position={[0.55, 0.18, 1.205]}
      scale={[0.42, 0.42, 1]}
    >
      <spriteMaterial
        map={starTexture.current}
        color="#9eeeff"
        transparent
        opacity={presence * 0.52}
        depthWrite={false}
        depthTest
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>

    {/* CONTAMINACIÓN LUMÍNICA EXTERIOR */}
    <sprite
      ref={fieldRef}
      position={[0.55, 0.18, 1.21]}
      scale={[0.58, 0.58, 1]}
    >
      <spriteMaterial
        map={starTexture.current}
        color="#536dff"
        transparent
        opacity={presence * 0.14}
        depthWrite={false}
        depthTest
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  </group>
);
  
}

function HOIPlanet({
  travelProgress,
  stellarCoreRef,
  planetRef,
}) {
  const atmosphereRef = useRef(null);
  const planetMaterialRef = useRef(null);
  const starWorldPosition = useRef(
  new THREE.Vector3()
);

const planetWorldPosition = useRef(
  new THREE.Vector3()
);

const physicalSunDirection = useRef(
  new THREE.Vector3()
);

  useFrame((state, delta) => {
    // Nivel de activación de HOi según proximidad.
// 0 = lejos / dormido
// 1 = cerca / despierto
const hoiAwake =
  THREE.MathUtils.smoothstep(
    travelProgress,
    0.45,
    0.92
  );
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

  // La atmósfera utiliza la misma estrella física
  // que ilumina realmente al planeta.
  if (
    stellarCoreRef?.current &&
    planetRef.current
  ) {
    stellarCoreRef.current.getWorldPosition(
      starWorldPosition.current
    );

    planetRef.current.getWorldPosition(
      planetWorldPosition.current
    );

    physicalSunDirection.current
      .subVectors(
        starWorldPosition.current,
        planetWorldPosition.current
      )
      .normalize();

    atmosphereRef.current.uniforms.uSunDirection.value.copy(
      physicalSunDirection.current
    );

    if (
  planetMaterialRef.current?.userData?.shader
) {
  
  const shader =
    planetMaterialRef.current.userData.shader;

  shader.uniforms.uSunDirection.value.copy(
    physicalSunDirection.current
  );

  shader.uniforms.uHoiAwake.value =
    hoiAwake;
  shader.uniforms.uTime.value =
  state.clock.elapsedTime;
}

  }
}
  });

  return (
    <group>
      <mesh ref={planetRef}>
        <sphereGeometry args={[1.32, 128, 128]} />

        <meshStandardMaterial
  ref={planetMaterialRef}
  color="#030a14"
  roughness={0.82}
  metalness={0.18}
  emissive="#020812"
  emissiveIntensity={0.16}
  onBeforeCompile={(shader) => {
    shader.uniforms.uSunDirection = {
      value: new THREE.Vector3(-1, 0.3, -1).normalize(),
    };

    shader.uniforms.uHoiAwake = {
  value: 0,
};

shader.uniforms.uTime = {
  value: 0,
};

    planetMaterialRef.current.userData.shader = shader;

    shader.fragmentShader =
  `
    uniform vec3 uSunDirection;
uniform float uHoiAwake;
uniform float uTime;
  ` +
  shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
      
      // Microtextura superficial de HOi.
// No genera iluminación.
// Introduce irregularidad extremadamente tenue
// para que la superficie conserve materia en penumbra.
// Microtextura orgánica y no direccional.
// Evita bandas visibles y rompe la repetición.
vec3 surfaceCoord =
  normal * 3.7;

float organicA =
  sin(
    surfaceCoord.x * 2.3 +
    sin(surfaceCoord.y * 2.7) +
    surfaceCoord.z * 1.9
  );

float organicB =
  sin(
    surfaceCoord.y * 4.1 +
    sin(surfaceCoord.z * 3.2) -
    surfaceCoord.x * 2.6
  );

float organicC =
  sin(
    surfaceCoord.z * 5.3 +
    sin(surfaceCoord.x * 2.1) +
    surfaceCoord.y * 3.4
  );

float hoiSurface =
  (
    organicA * 0.50 +
    organicB * 0.30 +
    organicC * 0.20
  ) * 0.5 + 0.5;

        // Lectura volumétrica nocturna ya aprobada.
        vec3 viewDirection =
          normalize(vViewPosition);

        float facing =
          clamp(
            dot(normal, viewDirection),
            0.0,
            1.0
          );

        float nightVolume =
          pow(
            facing,
            1.7
          );

        vec3 nightBounce =
          vec3(
            0.026,
            0.056,
            0.098
          ) *
          nightVolume;

        // La textura solo modula ligeramente la información
// que ya existe en la cara nocturna.
nightBounce *=
  mix(
    0.96,
    1.035,
    hoiSurface
  );


        // Roce de luz proveniente de la estrella física.
// uSunDirection llega en world space.
// La normal del meshStandardMaterial trabaja en view space,
// por eso convertimos la dirección antes de compararlas.
vec3 sunDirectionView =
  normalize(
    mat3(viewMatrix) *
    normalize(uSunDirection)
  );

// Roce de luz proveniente de la estrella física.
float stellarFacing =
  max(
    dot(
      normal,
      -normalize(uSunDirection)
    ),
    0.0
  );

float stellarGrazing =
  pow(
    stellarFacing,
    3.6
  );

float lateralBias =
  smoothstep(
    -0.15,
    0.85,
    normal.x
  );

stellarGrazing *=
  mix(
    0.55,
    1.0,
    lateralBias
  );  

vec3 stellarLight =
  vec3(
    0.040,
    0.085,
    0.150
  ) *
  stellarGrazing;

  // Pulso interno de HOi.
// Solo aparece durante la aproximación,
// como una actividad tenue debajo de la superficie.

float pulsePhase =
  0.5 +
  0.5 *
  sin(
    vViewPosition.y * 3.2 +
    vViewPosition.x * 1.8
  );

float pulseMask =
  smoothstep(
    0.35,
    0.85,
    pulsePhase
  );

// Respiración energética extremadamente lenta.
// HOi no parpadea: parece contener actividad interna.
float intelligenceBreath =
  0.82 +
  0.18 *
  sin(
    uTime * 0.42
  );

float pulsePresence =
  uHoiAwake *
  pulseMask *
  nightVolume *
  intelligenceBreath;

vec3 hoiPulse =
  vec3(
    0.022,
    0.070,
    0.140
  ) *
  pulsePresence *
  1.15;

        gl_FragColor.rgb +=
  nightBounce +
  stellarLight +
  hoiPulse;

        #include <dithering_fragment>
      `
    );
  }}
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
        <HOIInteractiveZone
  travelProgress={travelProgress}
/>
      </mesh>
    </group>
  );
}

function DeepSpaceStars() {
  const starsRef = useRef(null);

  useFrame(({ camera }) => {
  if (!starsRef.current) return;

  // Espacio profundo prácticamente infinito.
  // Acompaña posición Y orientación de la cámara
  // para eliminar el paralaje provocado por el mouse.
  starsRef.current.position.copy(camera.position);
  starsRef.current.quaternion.copy(camera.quaternion);
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

  useFrame(({ camera }) => {
    if (!starsRef.current) return;

    // Campo estelar intermedio:
    // acompaña la cámara para evitar
    // sensación de estrellas cercanas.
    starsRef.current.position.copy(camera.position);
    starsRef.current.quaternion.copy(camera.quaternion);
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
      speed={0}
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

function StellarBody({ stellarCoreRef }) {
  return (
    <group position={[-57, 15.5, -400]}>
      <mesh ref={stellarCoreRef}>
        <sphereGeometry args={[12, 64, 64]} />

        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * ==============================================================
 * ARCHITECTURAL CONTRACT
 * Optical Layer
 * ==============================================================
 *
 * PROPÓSITO
 * --------------------------------------------------------------
 * Centralizar todos los fenómenos ópticos cinematográficos de
 * Universe™.
 *
 * Esta capa representa el comportamiento de la cámara virtual y
 * del sistema óptico de visualización, no del universo físico.
 *
 * Todo elemento implementado aquí existe únicamente como resultado
 * de la percepción visual del observador.
 *
 *
 * RESPONSABILIDADES
 * --------------------------------------------------------------
 * • Renderizar efectos ópticos independientes del mundo 3D.
 * • Utilizar información proveniente de la cámara y/o de la
 *   proyección en pantalla.
 * • Mantener separados los efectos cinematográficos de la
 *   simulación física del universo.
 *
 *
 * ALCANCE
 * --------------------------------------------------------------
 * Esta capa será el punto único de integración para todos los
 * sistemas ópticos presentes y futuros.
 *
 * Ejemplos:
 *
 * • Stellar Optical Corona
 * • Lens Bloom
 * • Lens Flare
 * • Optical Glare
 * • Light Diffusion
 * • Chromatic Aberration
 * • HDR Optical Pipeline
 * • Sensor Artifacts
 * • Future Cinematic Effects
 *
 *
 * REGLAS ARQUITECTÓNICAS
 * --------------------------------------------------------------
 * • Ningún efecto óptico deberá implementarse dentro de
 *   StellarLayer.
 *
 * • Ningún efecto óptico deberá implementarse dentro de
 *   PlanetLayer.
 *
 * • Ningún efecto óptico deberá depender de la jerarquía física
 *   del universo cuando su naturaleza corresponda al sistema
 *   óptico de la cámara.
 *
 * • Toda nueva implementación deberá incorporarse aquí antes de
 *   crear una nueva capa visual.
 *
 *
 * FILOSOFÍA
 * --------------------------------------------------------------
 * Universe™ no busca únicamente representar un universo
 * tridimensional.
 *
 * Busca reproducir la experiencia cinematográfica de observarlo.
 *
 * Por ese motivo, la simulación física y la percepción óptica
 * evolucionan como sistemas independientes.
 *
 * ==============================================================
 */
function OpticalLayer({
  stellarCoreRef,
  planetRef,
}) {
  return (
    <>
      <OpticalEngine
  stellarCoreRef={stellarCoreRef}
  planetRef={planetRef}
/>
    </>
  );
}

/**
 * ==============================================================
 * ARCHITECTURAL CONTRACT
 * Optical Engine
 * ==============================================================
 *
 * PROPÓSITO
 * --------------------------------------------------------------
 * Administrar todos los fenómenos ópticos generados por la cámara
 * virtual.
 *
 * RESPONSABILIDADES
 * --------------------------------------------------------------
 * • Coordinar los sistemas ópticos.
 * • Compartir información entre efectos.
 * • Mantener un único punto de entrada para el motor óptico.
 *
 * SISTEMAS
 * --------------------------------------------------------------
 * • Stellar Optical Corona
 * • Lens Bloom
 * • Lens Flare
 * • HDR Pipeline
 * • Future Optical Systems
 * ==============================================================
 */
function OpticalEngine({
  stellarCoreRef,
  planetRef,
}) {
    const { camera } = useThree();

    const systems = [
  {
    id: "stellar-corona",
    component: (
      <StellarOpticalCorona
        key="stellar-corona"
        camera={camera}
        star={stellarCoreRef}
        planet={planetRef}
      />
    ),
  },

  {
    id: "stellar-cross",
    component: (
      <StellarOpticalCross
        key="stellar-cross"
        camera={camera}
        star={stellarCoreRef}
        planet={planetRef}
      />
    ),
  },
];

    return (
        <>
           {systems.map(
  ({ component }) => component
)}
        </>
);
}

function StellarOpticalCorona({
  camera,
  star,
  planet,
}) {
  const coronaRef = useRef(null);
  const coronaTexture = useRef(null);
  const planetWorldPosition = useRef(
  new THREE.Vector3()
);

const planetProjectedPosition = useRef(
  new THREE.Vector3()
);

  const stellarWorldPosition = useRef(
    new THREE.Vector3()
  );

  const projectedPosition = useRef(
    new THREE.Vector3()
  );

  const rayPoint = useRef(
    new THREE.Vector3()
  );

  const rayDirection = useRef(
    new THREE.Vector3()
  );

  if (!coronaTexture.current) {
    const canvas =
      document.createElement("canvas");

    canvas.width = 512;
    canvas.height = 512;

    const context =
      canvas.getContext("2d");

    const gradient =
      context.createRadialGradient(
        256,
        256,
        0,
        256,
        256,
        256
      );

    gradient.addColorStop(
      0,
      "rgba(255,255,255,1)"
    );

    gradient.addColorStop(
      0.08,
      "rgba(225,245,255,1)"
    );

    gradient.addColorStop(
      0.22,
      "rgba(110,185,255,0.95)"
    );

    gradient.addColorStop(
      0.5,
      "rgba(45,105,255,0.5)"
    );

    gradient.addColorStop(
      1,
      "rgba(0,20,100,0)"
    );

    context.fillStyle = gradient;
    context.fillRect(
      0,
      0,
      512,
      512
    );

    coronaTexture.current =
      new THREE.CanvasTexture(canvas);
  }

  useFrame((state) => {
    if (
  !star?.current ||
  !planet?.current ||
  !coronaRef.current
) {
  return;
}

    star.current.getWorldPosition(
      stellarWorldPosition.current
    );

    planet.current.getWorldPosition(
  planetWorldPosition.current
);

planetProjectedPosition.current
  .copy(planetWorldPosition.current)
  .project(camera);

    projectedPosition.current
      .copy(stellarWorldPosition.current)
      .project(camera);

    const projectedDistance =
  projectedPosition.current.distanceTo(
    planetProjectedPosition.current
  );

  const occlusion = THREE.MathUtils.clamp(
  1 - projectedDistance / 0.42,
  0,
  1
);

coronaRef.current.material.opacity = occlusion;

    rayPoint.current
      .set(
        projectedPosition.current.x,
        projectedPosition.current.y,
        0.5
      )
      .unproject(camera);

    rayDirection.current
      .copy(rayPoint.current)
      .sub(camera.position)
      .normalize();

    coronaRef.current.position
      .copy(camera.position)
      .addScaledVector(
        rayDirection.current,
        18
      );

    const pulse =
      1 +
      Math.sin(
        state.clock.elapsedTime * 0.28
      ) * 0.004;

    coronaRef.current.scale.set(
      6.8 * pulse,
      6.8 * pulse,
      1
    );
  });

  return (
    <sprite ref={coronaRef}>
      <spriteMaterial
        map={coronaTexture.current}
        transparent
        opacity={0.95}
        depthWrite={false}
        depthTest
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

function StellarOpticalCross({
  camera,
  star,
  planet,
}) {
  const crossRef = useRef(null);
  const crossTexture = useRef(null);

  const stellarWorldPosition = useRef(
    new THREE.Vector3()
  );

  const planetWorldPosition = useRef(
    new THREE.Vector3()
  );

  const stellarProjectedPosition = useRef(
    new THREE.Vector3()
  );

  const planetProjectedPosition = useRef(
    new THREE.Vector3()
  );

  const rayPoint = useRef(
    new THREE.Vector3()
  );

  const rayDirection = useRef(
    new THREE.Vector3()
  );

  if (!crossTexture.current) {
    const canvas =
      document.createElement("canvas");

    canvas.width = 1024;
    canvas.height = 1024;

    const context =
      canvas.getContext("2d");

    const center = 512;

    // Núcleo óptico extremadamente pequeño.
    const coreGradient =
      context.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        75
      );

    coreGradient.addColorStop(
      0,
      "rgba(255,255,255,0.90)"
    );

    coreGradient.addColorStop(
      0.18,
      "rgba(210,235,255,0.35)"
    );

    coreGradient.addColorStop(
      1,
      "rgba(90,150,255,0)"
    );

    context.fillStyle = coreGradient;

    context.fillRect(
      center - 75,
      center - 75,
      150,
      150
    );

    // Haz horizontal.
    const horizontalGradient =
      context.createLinearGradient(
        0,
        center,
        1024,
        center
      );

    horizontalGradient.addColorStop(
      0,
      "rgba(70,130,255,0)"
    );

    horizontalGradient.addColorStop(
      0.40,
      "rgba(120,180,255,0.015)"
    );

    horizontalGradient.addColorStop(
      0.485,
      "rgba(210,235,255,0.16)"
    );

    horizontalGradient.addColorStop(
      0.5,
      "rgba(255,255,255,0.42)"
    );

    horizontalGradient.addColorStop(
      0.515,
      "rgba(210,235,255,0.16)"
    );

    horizontalGradient.addColorStop(
      0.60,
      "rgba(120,180,255,0.015)"
    );

    horizontalGradient.addColorStop(
      1,
      "rgba(70,130,255,0)"
    );

    context.fillStyle = horizontalGradient;

    context.fillRect(
      0,
      center - 3,
      1024,
      6
    );

    // Haz vertical más corto.
    const verticalGradient =
      context.createLinearGradient(
        center,
        160,
        center,
        864
      );

    verticalGradient.addColorStop(
      0,
      "rgba(70,130,255,0)"
    );

    verticalGradient.addColorStop(
      0.44,
      "rgba(180,220,255,0.025)"
    );

    verticalGradient.addColorStop(
      0.5,
      "rgba(245,250,255,0.28)"
    );

    verticalGradient.addColorStop(
      0.56,
      "rgba(180,220,255,0.025)"
    );

    verticalGradient.addColorStop(
      1,
      "rgba(70,130,255,0)"
    );

    context.fillStyle = verticalGradient;

    context.fillRect(
      center - 2,
      160,
      4,
      704
    );

    crossTexture.current =
      new THREE.CanvasTexture(canvas);
  }

  useFrame(() => {
    if (
      !star?.current ||
      !planet?.current ||
      !crossRef.current
    ) {
      return;
    }

    star.current.getWorldPosition(
      stellarWorldPosition.current
    );

    planet.current.getWorldPosition(
      planetWorldPosition.current
    );

    stellarProjectedPosition.current
      .copy(stellarWorldPosition.current)
      .project(camera);

    planetProjectedPosition.current
      .copy(planetWorldPosition.current)
      .project(camera);

    const projectedDistance =
      stellarProjectedPosition.current.distanceTo(
        planetProjectedPosition.current
      );

    // La cruz nace únicamente cuando
    // la estrella se aproxima visualmente a HOi.
    const presence =
      THREE.MathUtils.clamp(
        1 - projectedDistance / 0.32,
        0,
        1
      );

    crossRef.current.material.opacity =
      presence * 0.42;

    rayPoint.current
      .set(
        stellarProjectedPosition.current.x,
        stellarProjectedPosition.current.y,
        0.5
      )
      .unproject(camera);

    rayDirection.current
      .copy(rayPoint.current)
      .sub(camera.position)
      .normalize();

    crossRef.current.position
      .copy(camera.position)
      .addScaledVector(
        rayDirection.current,
        17.8
      );

    crossRef.current.scale.set(
      9.5,
      9.5,
      1
    );
  });

  return (
    <sprite ref={crossRef}>
      <spriteMaterial
        map={crossTexture.current}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

function DeepSpaceLayer() {
  return (
    <>
      <DeepSpaceGradient />

      <GalaxyRegion
        position={[-6.8, 4.2, -18]}
        rotation={[0, 0, -0.42]}
        scale={[18, 7, 1]}
        coolColor="#286fd1"
        warmColor="#d0522f"
        opacity={0.22}
        seed={2.4}
        pointerInfluence={0}
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
        pointerInfluence={0}
        rotationSpeed={-0.00005}
      />

      <DeepSpaceStars />
      <MidSpaceStars />
    </>
  );
}

function NearCameraLayer() {
  return (
    <>
      <SpaceDust />
      <NearSpaceParticles />
    </>
  );
}

function StellarLayer({
  stellarCoreRef,
}) {
  return (
    <StellarBody
      stellarCoreRef={stellarCoreRef}
    />
  );
}

function PlanetLayer({
  travelProgress,
  stellarCoreRef,
  planetRef,
}) {
  return (
    <HOIPlanet
      travelProgress={travelProgress}
      stellarCoreRef={stellarCoreRef}
      planetRef={planetRef}
    />
  );
}

function UniverseScene({ travelProgress }) {
  const stellarCoreRef = useRef(null);
  const planetRef = useRef(null);
  return (
    <>
      <color
        attach="background"
        args={["#010207"]}
      />

      <ambientLight intensity={0.015} />

      {/* Luz estelar direccional independiente del cuerpo visual */}
<directionalLight
  position={[
    -8,
    2.8,
    THREE.MathUtils.lerp(
      -6,
      -24,
      travelProgress
    ),
  ]}
  intensity={THREE.MathUtils.lerp(
    5.5,
    4.2,
    travelProgress
  )}
  color="#dcebff"
/>

      <DeepSpaceLayer />

      <NearCameraLayer />

      <StellarLayer
  travelProgress={travelProgress}
  stellarCoreRef={stellarCoreRef}
/>

      <PlanetLayer
  travelProgress={travelProgress}
  stellarCoreRef={stellarCoreRef}
  planetRef={planetRef}
/>
      <OpticalLayer
  stellarCoreRef={stellarCoreRef}
  planetRef={planetRef}
/>
      <CameraExperience
        travelProgress={travelProgress}
      />
    </>
  );
}

export default function HSUUniversePOC() {
  const targetTravelRef = useRef(0);
  const currentTravelRef = useRef(0);

  const [travelProgress, setTravelProgress] = useState(0);

  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();

      // La rueda modifica únicamente el destino.
      targetTravelRef.current = clamp(
        targetTravelRef.current + event.deltaY * 0.00032,
        0,
        1
      );
    };

    window.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    let animationFrameId;

    const animateTravel = () => {
      // Suavizado/inercia del viaje.
      currentTravelRef.current = THREE.MathUtils.lerp(
        currentTravelRef.current,
        targetTravelRef.current,
        0.016
      );

      setTravelProgress(
        currentTravelRef.current
      );

      animationFrameId =
        requestAnimationFrame(animateTravel);
    };

    animationFrameId =
      requestAnimationFrame(animateTravel);

    return () => {
      window.removeEventListener(
        "wheel",
        handleWheel
      );

      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
  <main className="hsu-universe-poc">

    <HOIIdentityOverlay
      travelProgress={travelProgress}
    />

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
        <UniverseScene
          travelProgress={travelProgress}
        />
      </Canvas>
    </main>
  );
}

