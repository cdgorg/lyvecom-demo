"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ColorStop {
  pos: number;
  color: string;
}

export interface ShaderParams {
  circleSize: number;       // max radius in px
  spacing: number;          // cell size in px
  noiseScale: number;       // frequency
  noiseSeed: number;        // offset
  noiseSpeed: number;       // animation speed
  noiseOctaves: number;     // fBm layers
  contrast: number;         // sharpness of light/dark transitions
  waveFrequency: number;    // frequency of the wave distortion
  waveAmplitude: number;    // strength of the wave distortion
  waveAngle: number;        // direction of waves in degrees
  bloomStrength: number;    // glow intensity
  bloomThreshold: number;   // brightness cutoff
  playing: boolean;
  noiseEnabled: boolean;
  waveEnabled: boolean;
  distortionEnabled: boolean;
  distortionAmount: number;   // strength of grid distortion
  distortionScale: number;    // frequency of distortion noise
  colorStops: ColorStop[];    // variable-length color stop list
}

interface ShaderCanvasProps {
  params: ShaderParams;
  className?: string;
}

export interface ShaderCanvasHandle {
  capture4K: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function getUniforms<T extends string>(gl: WebGL2RenderingContext, prog: WebGLProgram, names: T[]): Record<T, WebGLUniformLocation | null> {
  const out = {} as Record<T, WebGLUniformLocation | null>;
  for (const n of names) out[n] = gl.getUniformLocation(prog, n);
  return out;
}

function createFBO(gl: WebGL2RenderingContext, w: number, h: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex };
}

// ── Shader sources ─────────────────────────────────────────────────────────────

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

// Simplex 3D noise (Stefan Gustavson, MIT license)
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

const DOT_GRID_FS = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uCircleSize;
uniform float uSpacing;
uniform float uNoiseScale;
uniform float uNoiseSeed;
uniform float uNoiseSpeed;
uniform int   uNoiseOctaves;
uniform float uContrast;
uniform float uWaveFreq;
uniform float uWaveAmp;
uniform float uWaveAngle;

uniform float uNoiseEnabled;
uniform float uWaveEnabled;
uniform float uDistortionEnabled;
uniform float uDistortionAmount;
uniform float uDistortionScale;

uniform int   uNumStops;
uniform float uStopPos[10];
uniform vec3  uStopCol[10];

${SIMPLEX_NOISE_GLSL}

float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

vec3 colorRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  if (uNumStops <= 1) return uStopCol[0];
  if (t <= uStopPos[0]) return uStopCol[0];
  for (int i = 1; i < 10; i++) {
    if (i >= uNumStops) break;
    if (t < uStopPos[i]) {
      float segT = (t - uStopPos[i-1]) / max(uStopPos[i] - uStopPos[i-1], 0.001);
      return mix(uStopCol[i-1], uStopCol[i], segT);
    }
  }
  return uStopCol[uNumStops - 1];
}

void main() {
  vec2 fragCoord = vUv * uResolution;

  // Grid cell (no distortion — grid stays stable)
  vec2 cell = floor(fragCoord / uSpacing);
  vec2 cellCenter = (cell + 0.5) * uSpacing;

  // Normalised cell position
  vec2 uv = cellCenter / uResolution.y;

  float t = uTime * uNoiseSpeed;
  float n = 0.5;

  if (uNoiseEnabled > 0.5) {
    // ── Wave domain-warping ──────────────────────────────────────
    vec2 warpedUv = uv * uNoiseScale;
    if (uWaveEnabled > 0.5) {
      float rad = uWaveAngle * 3.14159265 / 180.0;
      vec2 waveDir = vec2(cos(rad), sin(rad));
      vec2 waveTangent = vec2(-waveDir.y, waveDir.x);
      float proj = dot(uv, waveDir);
      float wave1 = sin(proj * uWaveFreq + t * 1.5 + uNoiseSeed) * uWaveAmp;
      float wave2 = sin(proj * uWaveFreq * 2.3 + t * 0.8 + uNoiseSeed * 1.7) * uWaveAmp * 0.4;
      warpedUv += waveTangent * (wave1 + wave2);
    }

    // ── Distortion: noise-based domain warp on UV ───────────────
    if (uDistortionEnabled > 0.5) {
      vec2 dUv = uv * uDistortionScale;
      float dn1 = snoise(vec3(dUv, t * 0.5 + uNoiseSeed));
      float dn2 = snoise(vec3(dUv + 50.0, t * 0.5 + uNoiseSeed));
      warpedUv += vec2(dn1, dn2) * uDistortionAmount;
    }

    // ── Noise sampling ───────────────────────────────────────────
    vec3 noiseCoord = vec3(warpedUv, t + uNoiseSeed);
    n = fbm(noiseCoord, uNoiseOctaves);
    n = n * 0.5 + 0.5;

    // ── Contrast sharpening ──────────────────────────────────────
    n = clamp(n, 0.0, 1.0);
    n = n - 0.5;
    n = n * uContrast;
    n = clamp(n + 0.5, 0.0, 1.0);
    n = pow(n, 0.5 + uContrast * 0.5);
    n = clamp(n, 0.0, 1.0);
  }

  // Circle radius
  float radius = mix(0.5, uCircleSize, n);

  // Distance from pixel to cell center
  float dist = length(fragCoord - cellCenter);

  // Anti-aliased circle
  float edge = fwidth(dist) * 1.2;
  float circle = 1.0 - smoothstep(radius - edge, radius + edge, dist);

  // Color from ramp
  vec3 color = colorRamp(n);

  fragColor = vec4(color * circle, 1.0);
}
`;

const BRIGHT_EXTRACT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uThreshold;

void main() {
  vec4 c = texture(uTexture, vUv);
  float brightness = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  float contrib = max(brightness - uThreshold, 0.0);
  fragColor = vec4(c.rgb * (contrib / max(brightness, 0.001)), 1.0);
}
`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uDirection;

void main() {
  // Optimised 9-tap Gaussian (from 13-tap via bilinear sampling)
  vec4 result = texture(uTexture, vUv) * 0.227027;

  vec2 off1 = uDirection * 1.3846153846;
  vec2 off2 = uDirection * 3.2307692308;

  result += texture(uTexture, vUv + off1) * 0.3162162162;
  result += texture(uTexture, vUv - off1) * 0.3162162162;
  result += texture(uTexture, vUv + off2) * 0.0702702703;
  result += texture(uTexture, vUv - off2) * 0.0702702703;

  fragColor = result;
}
`;

const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;

void main() {
  vec3 scene = texture(uScene, vUv).rgb;
  vec3 bloom = texture(uBloom, vUv).rgb;
  fragColor = vec4(scene + bloom * uBloomStrength, 1.0);
}
`;

// ── Cached uniform location types ──────────────────────────────────────────────

type DotUniforms = Record<
  "uResolution" | "uTime" | "uCircleSize" | "uSpacing" |
  "uNoiseScale" | "uNoiseSeed" | "uNoiseSpeed" | "uNoiseOctaves" |
  "uContrast" | "uWaveFreq" | "uWaveAmp" | "uWaveAngle" |
  "uNoiseEnabled" | "uWaveEnabled" |
  "uDistortionEnabled" | "uDistortionAmount" | "uDistortionScale" |
  "uNumStops" | "uStopPos" | "uStopCol",
  WebGLUniformLocation | null
>;

type BrightUniforms = Record<"uTexture" | "uThreshold", WebGLUniformLocation | null>;
type BlurUniforms = Record<"uTexture" | "uDirection", WebGLUniformLocation | null>;
type CompositeUniforms = Record<"uScene" | "uBloom" | "uBloomStrength", WebGLUniformLocation | null>;

interface GLResources {
  dotProg: WebGLProgram;
  dotU: DotUniforms;
  brightProg: WebGLProgram;
  brightU: BrightUniforms;
  blurProg: WebGLProgram;
  blurU: BlurUniforms;
  compositeProg: WebGLProgram;
  compositeU: CompositeUniforms;
  sceneFBO: { fbo: WebGLFramebuffer; tex: WebGLTexture };
  brightFBO: { fbo: WebGLFramebuffer; tex: WebGLTexture };
  blurFBO1: { fbo: WebGLFramebuffer; tex: WebGLTexture };
  blurFBO2: { fbo: WebGLFramebuffer; tex: WebGLTexture };
  vao: WebGLVertexArrayObject;
  width: number;
  height: number;
  halfW: number;
  halfH: number;
  dpr: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

const ShaderCanvas = forwardRef<ShaderCanvasHandle, ShaderCanvasProps>(function ShaderCanvas({ params, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const paramsRef = useRef(params);
  const resourcesRef = useRef<GLResources | null>(null);

  // Keep params ref in sync without re-running effect
  paramsRef.current = params;

  useImperativeHandle(ref, () => ({
    capture4K: async () => {
      const gl = glRef.current;
      const res = resourcesRef.current;
      if (!gl || !res) return;

      const p = paramsRef.current;
      const W = 3840;
      const H = 2160;
      const HW = W >> 1;
      const HH = H >> 1;
      const captureDpr = W / (res.width / res.dpr);

      const tmpScene = createFBO(gl, W, H);
      const tmpBright = createFBO(gl, HW, HH);
      const tmpBlur1 = createFBO(gl, HW, HH);
      const tmpBlur2 = createFBO(gl, HW, HH);

      const tmpCompTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tmpCompTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const tmpCompFbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpCompFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tmpCompTex, 0);

      const {
        dotProg, dotU,
        brightProg, brightU,
        blurProg, blurU,
        compositeProg, compositeU,
        vao,
      } = res;

      gl.bindVertexArray(vao);

      // Pass 1: Dot Grid -> tmpScene
      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpScene.fbo);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(dotProg);
      gl.uniform2f(dotU.uResolution, W, H);
      gl.uniform1f(dotU.uTime, timeRef.current);
      gl.uniform1f(dotU.uCircleSize, p.circleSize * captureDpr);
      gl.uniform1f(dotU.uSpacing, p.spacing * captureDpr);
      gl.uniform1f(dotU.uNoiseScale, p.noiseScale);
      gl.uniform1f(dotU.uNoiseSeed, p.noiseSeed);
      gl.uniform1f(dotU.uNoiseSpeed, p.noiseSpeed);
      gl.uniform1i(dotU.uNoiseOctaves, p.noiseOctaves);
      gl.uniform1f(dotU.uContrast, p.contrast);
      gl.uniform1f(dotU.uWaveFreq, p.waveFrequency);
      gl.uniform1f(dotU.uWaveAmp, p.waveAmplitude);
      gl.uniform1f(dotU.uWaveAngle, p.waveAngle);
      gl.uniform1f(dotU.uNoiseEnabled, p.noiseEnabled ? 1.0 : 0.0);
      gl.uniform1f(dotU.uWaveEnabled, p.waveEnabled ? 1.0 : 0.0);
      gl.uniform1f(dotU.uDistortionEnabled, p.distortionEnabled ? 1.0 : 0.0);
      gl.uniform1f(dotU.uDistortionAmount, p.distortionAmount);
      gl.uniform1f(dotU.uDistortionScale, p.distortionScale);

      const sorted = [...p.colorStops].sort((a, b) => a.pos - b.pos);
      const numStops = Math.min(sorted.length, 10);
      const posArr = new Float32Array(10);
      const colArr = new Float32Array(30);
      for (let i = 0; i < numStops; i++) {
        posArr[i] = sorted[i].pos;
        const rgb = hexToVec3(sorted[i].color);
        colArr[i * 3] = rgb[0];
        colArr[i * 3 + 1] = rgb[1];
        colArr[i * 3 + 2] = rgb[2];
      }
      gl.uniform1i(dotU.uNumStops, numStops);
      gl.uniform1fv(dotU.uStopPos, posArr);
      gl.uniform3fv(dotU.uStopCol, colArr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2: Bright extract -> tmpBright
      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpBright.fbo);
      gl.viewport(0, 0, HW, HH);
      gl.useProgram(brightProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tmpScene.tex);
      gl.uniform1i(brightU.uTexture, 0);
      gl.uniform1f(brightU.uThreshold, p.bloomThreshold);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Passes 3-4: Two iterations of separable Gaussian blur
      gl.useProgram(blurProg);

      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpBlur1.fbo);
      gl.viewport(0, 0, HW, HH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tmpBright.tex);
      gl.uniform1i(blurU.uTexture, 0);
      gl.uniform2f(blurU.uDirection, 1.0 / HW, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpBlur2.fbo);
      gl.bindTexture(gl.TEXTURE_2D, tmpBlur1.tex);
      gl.uniform2f(blurU.uDirection, 0.0, 1.0 / HH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpBlur1.fbo);
      gl.bindTexture(gl.TEXTURE_2D, tmpBlur2.tex);
      gl.uniform2f(blurU.uDirection, 1.0 / HW, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpBlur2.fbo);
      gl.bindTexture(gl.TEXTURE_2D, tmpBlur1.tex);
      gl.uniform2f(blurU.uDirection, 0.0, 1.0 / HH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 5: Composite -> tmpCompFbo
      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpCompFbo);
      gl.viewport(0, 0, W, H);
      gl.useProgram(compositeProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tmpScene.tex);
      gl.uniform1i(compositeU.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tmpBlur2.tex);
      gl.uniform1i(compositeU.uBloom, 1);
      gl.uniform1f(compositeU.uBloomStrength, p.bloomStrength);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Read pixels and download as PNG
      const pixels = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const rowSize = W * 4;
      const flipped = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) {
        flipped.set(
          pixels.subarray((H - 1 - y) * rowSize, (H - y) * rowSize),
          y * rowSize,
        );
      }

      const offscreen = document.createElement("canvas");
      offscreen.width = W;
      offscreen.height = H;
      const ctx2d = offscreen.getContext("2d")!;
      ctx2d.putImageData(new ImageData(flipped, W, H), 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        offscreen.toBlob(resolve, "image/png"),
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `shader-4k-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Cleanup temporary resources
      gl.deleteFramebuffer(tmpScene.fbo);
      gl.deleteTexture(tmpScene.tex);
      gl.deleteFramebuffer(tmpBright.fbo);
      gl.deleteTexture(tmpBright.tex);
      gl.deleteFramebuffer(tmpBlur1.fbo);
      gl.deleteTexture(tmpBlur1.tex);
      gl.deleteFramebuffer(tmpBlur2.fbo);
      gl.deleteTexture(tmpBlur2.tex);
      gl.deleteFramebuffer(tmpCompFbo);
      gl.deleteTexture(tmpCompTex);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
  }));

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

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    gl.getExtension("EXT_color_buffer_float");
    glRef.current = gl;

    // Compile programs
    const dotProg = createProgram(gl, FULLSCREEN_VS, DOT_GRID_FS);
    const brightProg = createProgram(gl, FULLSCREEN_VS, BRIGHT_EXTRACT_FS);
    const blurProg = createProgram(gl, FULLSCREEN_VS, BLUR_FS);
    const compositeProg = createProgram(gl, FULLSCREEN_VS, COMPOSITE_FS);

    // Cache ALL uniform locations up front
    const dotU = getUniforms(gl, dotProg, [
      "uResolution", "uTime", "uCircleSize", "uSpacing",
      "uNoiseScale", "uNoiseSeed", "uNoiseSpeed", "uNoiseOctaves",
      "uContrast", "uWaveFreq", "uWaveAmp", "uWaveAngle",
      "uNoiseEnabled", "uWaveEnabled",
      "uDistortionEnabled", "uDistortionAmount", "uDistortionScale",
      "uNumStops", "uStopPos", "uStopCol",
    ]);
    const brightU = getUniforms(gl, brightProg, ["uTexture", "uThreshold"]);
    const blurU = getUniforms(gl, blurProg, ["uTexture", "uDirection"]);
    const compositeU = getUniforms(gl, compositeProg, ["uScene", "uBloom", "uBloomStrength"]);

    // FBOs
    const cw = canvas.width;
    const ch = canvas.height;
    const halfW = Math.max(1, Math.round(cw / 2));
    const halfH = Math.max(1, Math.round(ch / 2));

    const sceneFBO = createFBO(gl, cw, ch);
    const brightFBO = createFBO(gl, halfW, halfH);
    const blurFBO1 = createFBO(gl, halfW, halfH);
    const blurFBO2 = createFBO(gl, halfW, halfH);

    const vao = gl.createVertexArray()!;

    resourcesRef.current = {
      dotProg, dotU,
      brightProg, brightU,
      blurProg, blurU,
      compositeProg, compositeU,
      sceneFBO, brightFBO, blurFBO1, blurFBO2,
      vao, width: cw, height: ch, halfW, halfH, dpr,
    };
  }, []);

  const render = useCallback((timestamp: number) => {
    const gl = glRef.current;
    const res = resourcesRef.current;
    if (!gl || !res) return;

    const p = paramsRef.current;

    // Delta time
    if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
    const dt = (timestamp - lastFrameRef.current) / 1000;
    lastFrameRef.current = timestamp;
    if (p.playing) {
      timeRef.current += dt;
    }

    const {
      dotProg, dotU,
      brightProg, brightU,
      blurProg, blurU,
      compositeProg, compositeU,
      sceneFBO, brightFBO, blurFBO1, blurFBO2,
      vao, width, height, halfW, halfH, dpr,
    } = res;

    gl.bindVertexArray(vao);

    // ─── Pass 1: Dot Grid → sceneFBO ───────────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.fbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(dotProg);
    gl.uniform2f(dotU.uResolution, width, height);
    gl.uniform1f(dotU.uTime, timeRef.current);
    gl.uniform1f(dotU.uCircleSize, p.circleSize * dpr);
    gl.uniform1f(dotU.uSpacing, p.spacing * dpr);
    gl.uniform1f(dotU.uNoiseScale, p.noiseScale);
    gl.uniform1f(dotU.uNoiseSeed, p.noiseSeed);
    gl.uniform1f(dotU.uNoiseSpeed, p.noiseSpeed);
    gl.uniform1i(dotU.uNoiseOctaves, p.noiseOctaves);
    gl.uniform1f(dotU.uContrast, p.contrast);
    gl.uniform1f(dotU.uWaveFreq, p.waveFrequency);
    gl.uniform1f(dotU.uWaveAmp, p.waveAmplitude);
    gl.uniform1f(dotU.uWaveAngle, p.waveAngle);

    gl.uniform1f(dotU.uNoiseEnabled, p.noiseEnabled ? 1.0 : 0.0);
    gl.uniform1f(dotU.uWaveEnabled, p.waveEnabled ? 1.0 : 0.0);
    gl.uniform1f(dotU.uDistortionEnabled, p.distortionEnabled ? 1.0 : 0.0);
    gl.uniform1f(dotU.uDistortionAmount, p.distortionAmount);
    gl.uniform1f(dotU.uDistortionScale, p.distortionScale);

    // Sort color stops by position and upload as arrays
    const sorted = [...p.colorStops].sort((a, b) => a.pos - b.pos);
    const numStops = Math.min(sorted.length, 10);
    const posArr = new Float32Array(10);
    const colArr = new Float32Array(30);
    for (let i = 0; i < numStops; i++) {
      posArr[i] = sorted[i].pos;
      const rgb = hexToVec3(sorted[i].color);
      colArr[i * 3] = rgb[0];
      colArr[i * 3 + 1] = rgb[1];
      colArr[i * 3 + 2] = rgb[2];
    }
    gl.uniform1i(dotU.uNumStops, numStops);
    gl.uniform1fv(dotU.uStopPos, posArr);
    gl.uniform3fv(dotU.uStopCol, colArr);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ─── Pass 2: Bright extract → brightFBO ────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, brightFBO.fbo);
    gl.viewport(0, 0, halfW, halfH);

    gl.useProgram(brightProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
    gl.uniform1i(brightU.uTexture, 0);
    gl.uniform1f(brightU.uThreshold, p.bloomThreshold);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ─── Passes 3-4: Two iterations of separable Gaussian blur ─────────
    // First iteration
    gl.useProgram(blurProg);

    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO1.fbo);
    gl.viewport(0, 0, halfW, halfH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, brightFBO.tex);
    gl.uniform1i(blurU.uTexture, 0);
    gl.uniform2f(blurU.uDirection, 1.0 / halfW, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO2.fbo);
    gl.bindTexture(gl.TEXTURE_2D, blurFBO1.tex);
    gl.uniform2f(blurU.uDirection, 0.0, 1.0 / halfH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Second iteration (wider bloom)
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO1.fbo);
    gl.bindTexture(gl.TEXTURE_2D, blurFBO2.tex);
    gl.uniform2f(blurU.uDirection, 1.0 / halfW, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO2.fbo);
    gl.bindTexture(gl.TEXTURE_2D, blurFBO1.tex);
    gl.uniform2f(blurU.uDirection, 0.0, 1.0 / halfH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ─── Pass 5: Composite → screen ───────────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);

    gl.useProgram(compositeProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
    gl.uniform1i(compositeU.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurFBO2.tex);
    gl.uniform1i(compositeU.uBloom, 1);
    gl.uniform1f(compositeU.uBloomStrength, p.bloomStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    setupGL();
    rafRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      setupGL();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [setupGL, render]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "fixed inset-0 w-full h-full"}
      style={{ display: "block" }}
    />
  );
});

export default ShaderCanvas;
