"use client";

import React, { useRef, useMemo, useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { cn } from "@/lib/utils";
import * as THREE from "three";

export interface MetallicSwirlProps {
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: string | number;
  /** Additional CSS classes */
  className?: string;
  /** Content rendered above the effect */
  children?: React.ReactNode;
  /** Animation speed multiplier */
  speed?: number;
  /** Zoom level of the pattern */
  zoom?: number;
  /** Number of flow iterations (1–12) */
  iterations?: number;
  /** Sampling epsilon for gradient computation */
  sampleGap?: number;
  /** Tangent flow strength per iteration */
  tangentForce?: number;
  /** Gradient push strength per iteration */
  gradientForce?: number;
  /** Color phase offset for red channel */
  colorPhaseR?: number;
  /** Color phase offset for green channel */
  colorPhaseG?: number;
  /** Color phase offset for blue channel */
  colorPhaseB?: number;
  /** Color saturation range (0–1) */
  colorRange?: number;
  /** Color midpoint brightness */
  colorBias?: number;
  /** Overall brightness multiplier */
  brightness?: number;
  /** Background color in hex */
  backgroundColor?: string;
  /** Master opacity (0–1) */
  opacity?: number;
  /** Enable cursor interaction to intensify flow turbulence near pointer */
  cursorInteraction?: boolean;
  /** Cursor effect strength multiplier (0–3) */
  cursorIntensity?: number;
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uZoom;
uniform int   uIter;
uniform float uEps;
uniform float uTangent;
uniform float uGrad;
uniform vec3  uPhase;
uniform float uRange;
uniform float uBias;
uniform float uBright;
uniform vec3  uBg;
uniform float uAlpha;
uniform vec2  uPointer;
uniform float uCursorActive;
uniform float uCursorIntensity;

float wave(vec2 p, float t) {
  return sin(p.x + sin(p.y + t * 0.1)) * sin(p.y * p.x * 0.1 + t * 0.2);
}

vec2 flow(vec2 p, float t) {
  vec2 ep = vec2(uEps, 0.0);
  vec2 out_v = vec2(0.0);
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    float s0 = wave(p, t);
    float sx = wave(p + ep, t);
    float sy = wave(p + ep.yx, t);
    vec2 g = vec2(sx - s0, sy - s0) / ep.xx;
    vec2 tang = vec2(-g.y, g.x);
    p += uTangent * tang + g * uGrad;
    out_v = tang;
  }
  return out_v;
}

void main() {
  vec2 st = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * uZoom;
  float t = uTime * uSpeed;

  vec2 pointerUv = (uPointer - 0.5) * vec2(uRes.x / uRes.y, 1.0) * uZoom;
  float cursorDist = length(st - pointerUv);
  float cursorInfluence = smoothstep(3.0, 0.0, cursorDist) * uCursorActive * uCursorIntensity;

  vec2 ep = vec2(uEps, 0.0);
  vec2 p = st;
  vec2 out_v = vec2(0.0);
  float localTangent = uTangent + cursorInfluence * 0.5;
  float localGrad = uGrad + cursorInfluence * 0.1;
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    float s0 = wave(p, t);
    float sx = wave(p + ep, t);
    float sy = wave(p + ep.yx, t);
    vec2 g = vec2(sx - s0, sy - s0) / ep.xx;
    vec2 tang = vec2(-g.y, g.x);
    p += localTangent * tang + g * localGrad;
    out_v = tang;
  }

  float val = out_v.x - out_v.y;
  vec3 col = sin(uPhase + val) * uRange + uBias;
  col *= uBright;

  col += cursorInfluence * 0.06 * uBright;

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 result = mix(uBg, col, clamp(lum * 4.0, 0.0, 1.0));

  gl_FragColor = vec4(result, uAlpha);
}
`;

function parseHexColor(hex: string): [number, number, number] {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1], 16) / 255,
    parseInt(match[2], 16) / 255,
    parseInt(match[3], 16) / 255,
  ];
}

interface SwirlSceneProps {
  speed: number;
  zoom: number;
  iterations: number;
  sampleGap: number;
  tangentForce: number;
  gradientForce: number;
  colorPhaseR: number;
  colorPhaseG: number;
  colorPhaseB: number;
  colorRange: number;
  colorBias: number;
  brightness: number;
  bgRgb: [number, number, number];
  opacity: number;
  pointer: [number, number];
  cursorInteraction: boolean;
  cursorIntensity: number;
}

const SwirlScene: React.FC<SwirlSceneProps> = ({
  speed,
  zoom,
  iterations,
  sampleGap,
  tangentForce,
  gradientForce,
  colorPhaseR,
  colorPhaseG,
  colorPhaseB,
  colorRange,
  colorBias,
  brightness,
  bgRgb,
  opacity,
  pointer,
  cursorInteraction,
  cursorIntensity,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();
  const smoothPointer = useRef(new THREE.Vector2(0.5, 0.5));

  const shaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSpeed: { value: speed },
      uZoom: { value: zoom },
      uIter: { value: iterations },
      uEps: { value: sampleGap },
      uTangent: { value: tangentForce },
      uGrad: { value: gradientForce },
      uPhase: {
        value: new THREE.Vector3(colorPhaseR, colorPhaseG, colorPhaseB),
      },
      uRange: { value: colorRange },
      uBias: { value: colorBias },
      uBright: { value: brightness },
      uBg: { value: new THREE.Vector3(...bgRgb) },
      uAlpha: { value: opacity },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uCursorActive: { value: 0 },
      uCursorIntensity: { value: 1 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;

    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uRes.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
    mat.uniforms.uSpeed.value = speed;
    mat.uniforms.uZoom.value = zoom;
    mat.uniforms.uIter.value = iterations;
    mat.uniforms.uEps.value = sampleGap;
    mat.uniforms.uTangent.value = tangentForce;
    mat.uniforms.uGrad.value = gradientForce;
    mat.uniforms.uPhase.value.set(colorPhaseR, colorPhaseG, colorPhaseB);
    mat.uniforms.uRange.value = colorRange;
    mat.uniforms.uBias.value = colorBias;
    mat.uniforms.uBright.value = brightness;
    mat.uniforms.uBg.value.set(...bgRgb);
    mat.uniforms.uAlpha.value = opacity;
    mat.uniforms.uCursorActive.value = cursorInteraction ? 1 : 0;
    mat.uniforms.uCursorIntensity.value = cursorIntensity;

    const ease = 1 - Math.exp(-delta / 0.15);
    smoothPointer.current.x += (pointer[0] - smoothPointer.current.x) * ease;
    smoothPointer.current.y += (pointer[1] - smoothPointer.current.y) * ease;
    mat.uniforms.uPointer.value.set(
      smoothPointer.current.x,
      smoothPointer.current.y,
    );
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={shaderUniforms}
        transparent
      />
    </mesh>
  );
};

const MetallicSwirl: React.FC<MetallicSwirlProps> = ({
  width = "100%",
  height = "100%",
  className,
  children,
  speed = 1,
  zoom = 6,
  iterations = 12,
  sampleGap = 0.095,
  tangentForce = 0.75,
  gradientForce = 0.15,
  colorPhaseR = 3.11,
  colorPhaseG = 3.11,
  colorPhaseB = 3.11,
  colorRange = 0.75,
  colorBias = 0.5,
  brightness = 1,
  backgroundColor = "#000000",
  opacity = 1,
  cursorInteraction = false,
  cursorIntensity = 1,
}) => {
  const bgRgb = useMemo(
    () => parseHexColor(backgroundColor),
    [backgroundColor],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<[number, number]>([0.5, 0.5]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!cursorInteraction) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1 - (e.clientY - rect.top) / rect.height;
      setPointer([nx, ny]);
    },
    [cursorInteraction],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height, backgroundColor }}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        className="absolute inset-0 h-full w-full"
        orthographic
        camera={{
          position: [0, 0, 1],
          zoom: 1,
          left: -1,
          right: 1,
          top: 1,
          bottom: -1,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <SwirlScene
          speed={speed}
          zoom={zoom}
          iterations={iterations}
          sampleGap={sampleGap}
          tangentForce={tangentForce}
          gradientForce={gradientForce}
          colorPhaseR={colorPhaseR}
          colorPhaseG={colorPhaseG}
          colorPhaseB={colorPhaseB}
          colorRange={colorRange}
          colorBias={colorBias}
          brightness={brightness}
          bgRgb={bgRgb}
          opacity={opacity}
          pointer={pointer}
          cursorInteraction={cursorInteraction}
          cursorIntensity={cursorIntensity}
        />
      </Canvas>
      {children && (
        <div className="pointer-events-none relative z-10">{children}</div>
      )}
    </div>
  );
};

MetallicSwirl.displayName = "MetallicSwirl";

export default MetallicSwirl;
