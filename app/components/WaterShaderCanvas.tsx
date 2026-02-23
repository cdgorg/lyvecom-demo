"use client";

import { useEffect, useRef, useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface WaterParams {
  color: string;
  bgColor: string;
  speed: number;
  scale: number;
  sharpness: number;
  brightness: number;
  mouseStrength: number;
  mouseRadius: number;
}

export const DEFAULT_WATER_PARAMS: WaterParams = {
  color: "#ffffff",
  bgColor: "#000000",
  speed: 1.0,
  scale: 2.0,
  sharpness: 3.0,
  brightness: 1.2,
  mouseStrength: 0.4,
  mouseRadius: 8.0,
};

interface WaterShaderCanvasProps {
  params: WaterParams;
  className?: string;
}

// ── Helpers (from ShaderCanvas) ─────────────────────────────────────────────

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader compile error: ${info}`);
  }
  return s;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

function getUniforms<T extends string>(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  names: T[],
): Record<T, WebGLUniformLocation | null> {
  const out = {} as Record<T, WebGLUniformLocation | null>;
  for (const n of names) out[n] = gl.getUniformLocation(prog, n);
  return out;
}

// ── Shader sources ──────────────────────────────────────────────────────────

const FULLSCREEN_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  float x = float((gl_VertexID & 1) << 2);
  float y = float((gl_VertexID & 2) << 1);
  vUv = vec2(x * 0.5, y * 0.5);
  gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}
`;

const SIMPLEX_NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const WATER_FS = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uMouse;
uniform vec2  uMouseVel;
uniform vec3  uColor;
uniform vec3  uBgColor;
uniform float uSpeed;
uniform float uScale;
uniform float uSharpness;
uniform float uBrightness;
uniform float uMouseStrength;
uniform float uMouseRadius;

${SIMPLEX_NOISE_GLSL}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  uv.x *= aspect;

  // Mouse in same coordinate space
  vec2 mouse = uMouse;
  mouse.x *= aspect;

  // Velocity-based warp — distorts in the direction the mouse is moving
  float dist = length(uv - mouse);
  float influence = exp(-dist * dist * uMouseRadius);
  vec2 vel = uMouseVel;
  vel.x *= aspect;
  vec2 warp = vel * influence * uMouseStrength;

  float t = uTime * uSpeed;
  vec2 p = uv * uScale + warp;

  // 4 noise layers at different scales/speeds for organic interference
  float n1 = snoise(vec3(p * 1.0  + vec2(0.0, t * 0.15),  t * 0.1));
  float n2 = snoise(vec3(p * 2.0  + vec2(t * 0.1, 0.0),   t * 0.08 + 10.0));
  float n3 = snoise(vec3(p * 4.0  + vec2(-t * 0.05, t * 0.07), t * 0.12 + 20.0));
  float n4 = snoise(vec3(p * 6.0  + vec2(t * 0.06, -t * 0.04), t * 0.06 + 30.0));

  float combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.15 + n4 * 0.05;

  // Caustic lines at zero-crossings
  float caustic = abs(combined);
  caustic = 1.0 - caustic;
  caustic = pow(max(caustic, 0.0), uSharpness);
  caustic *= uBrightness;
  caustic = clamp(caustic, 0.0, 1.0);

  vec3 col = mix(uBgColor, uColor, caustic);
  fragColor = vec4(col, 1.0);
}
`;

// ── Uniform type ────────────────────────────────────────────────────────────

const UNIFORM_NAMES = [
  "uResolution", "uTime", "uMouse", "uMouseVel",
  "uColor", "uBgColor", "uSpeed", "uScale",
  "uSharpness", "uBrightness", "uMouseStrength", "uMouseRadius",
] as const;

type WaterUniforms = Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation | null>;

// ── Component ───────────────────────────────────────────────────────────────

export default function WaterShaderCanvas({ params, className }: WaterShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const prevSmoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothVelRef = useRef({ x: 0, y: 0 });
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<WaterUniforms | null>(null);
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
  const resolutionRef = useRef({ w: 1, h: 1 });
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const setupGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    resolutionRef.current = { w: canvas.width, h: canvas.height };

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }
    glRef.current = gl;

    const prog = createProgram(gl, FULLSCREEN_VS, WATER_FS);
    programRef.current = prog;
    uniformsRef.current = getUniforms(gl, prog, [...UNIFORM_NAMES]);
    vaoRef.current = gl.createVertexArray()!;
  }, []);

  const render = useCallback((timestamp: number) => {
    const gl = glRef.current;
    const prog = programRef.current;
    const u = uniformsRef.current;
    const vao = vaoRef.current;
    if (!gl || !prog || !u || !vao) return;

    const p = paramsRef.current;

    // Delta time
    if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
    const dt = Math.min((timestamp - lastFrameRef.current) / 1000, 0.1);
    lastFrameRef.current = timestamp;
    timeRef.current += dt;

    // Frame-rate-independent mouse smoothing
    const lerpFactor = 1 - Math.pow(0.05, dt);
    const sm = smoothMouseRef.current;
    const tm = mouseRef.current;
    const prev = prevSmoothMouseRef.current;

    // Save previous smooth position
    prev.x = sm.x;
    prev.y = sm.y;

    // Lerp toward target
    sm.x += (tm.x - sm.x) * lerpFactor;
    sm.y += (tm.y - sm.y) * lerpFactor;

    // Compute velocity from smooth position delta
    const rawVelX = dt > 0 ? (sm.x - prev.x) / dt : 0;
    const rawVelY = dt > 0 ? (sm.y - prev.y) / dt : 0;

    // Smooth the velocity too (decays when mouse stops)
    const velLerp = 1 - Math.pow(0.01, dt);
    const sv = smoothVelRef.current;
    sv.x += (rawVelX - sv.x) * velLerp;
    sv.y += (rawVelY - sv.y) * velLerp;

    const { w, h } = resolutionRef.current;
    const color = hexToVec3(p.color);
    const bgColor = hexToVec3(p.bgColor);

    gl.viewport(0, 0, w, h);
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(prog);
    gl.bindVertexArray(vao);

    gl.uniform2f(u.uResolution, w, h);
    gl.uniform1f(u.uTime, timeRef.current);
    gl.uniform2f(u.uMouse, sm.x, sm.y);
    gl.uniform2f(u.uMouseVel, sv.x, sv.y);
    gl.uniform3f(u.uColor, color[0], color[1], color[2]);
    gl.uniform3f(u.uBgColor, bgColor[0], bgColor[1], bgColor[2]);
    gl.uniform1f(u.uSpeed, p.speed);
    gl.uniform1f(u.uScale, p.scale);
    gl.uniform1f(u.uSharpness, p.sharpness);
    gl.uniform1f(u.uBrightness, p.brightness);
    gl.uniform1f(u.uMouseStrength, p.mouseStrength);
    gl.uniform1f(u.uMouseRadius, p.mouseRadius);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    setupGL();
    rafRef.current = requestAnimationFrame(render);

    const handleResize = () => setupGL();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: 1.0 - e.clientY / window.innerHeight,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: 0.5, y: 0.5 };
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [setupGL, render]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "fixed inset-0 w-full h-full"}
      style={{ display: "block", background: params.bgColor }}
    />
  );
}
