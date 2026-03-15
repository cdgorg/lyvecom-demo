/**
 * Lyve Dot Grid Shader — standalone bundle
 * Sem dependências. Funciona em qualquer página HTML.
 *
 * Uso básico:
 *   <canvas id="lyve-bg"></canvas>
 *   <script src="lyve-shader.js"></script>
 *   <script>
 *     LyveShader.init('lyve-bg', LyveShader.LYVE_PARAMS);
 *   </script>
 *
 * API:
 *   LyveShader.init(canvasIdOrElement, params)  → instance
 *   instance.updateParams(partialParams)
 *   instance.destroy()
 *   LyveShader.LYVE_PARAMS   — preset da hero do Lyve
 *   LyveShader.DEFAULT_PARAMS — preset genérico
 */
(function (global) {
  "use strict";

  // ─── GLSL Sources ────────────────────────────────────────────────────────────

  var FULLSCREEN_VS = [
    "#version 300 es",
    "precision highp float;",
    "out vec2 vUv;",
    "void main() {",
    "  float x = float((gl_VertexID & 1) << 2);",
    "  float y = float((gl_VertexID & 2) << 1);",
    "  vUv = vec2(x * 0.5, y * 0.5);",
    "  gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);",
    "}",
  ].join("\n");

  var SIMPLEX_NOISE_GLSL = [
    "vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }",
    "vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }",
    "vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }",
    "vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }",
    "float snoise(vec3 v) {",
    "  const vec2 C = vec2(1.0/6.0, 1.0/3.0);",
    "  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);",
    "  vec3 i  = floor(v + dot(v, C.yyy));",
    "  vec3 x0 = v - i + dot(i, C.xxx);",
    "  vec3 g = step(x0.yzx, x0.xyz);",
    "  vec3 l = 1.0 - g;",
    "  vec3 i1 = min(g.xyz, l.zxy);",
    "  vec3 i2 = max(g.xyz, l.zxy);",
    "  vec3 x1 = x0 - i1 + C.xxx;",
    "  vec3 x2 = x0 - i2 + C.yyy;",
    "  vec3 x3 = x0 - D.yyy;",
    "  i = mod289(i);",
    "  vec4 p = permute(permute(permute(",
    "      i.z + vec4(0.0, i1.z, i2.z, 1.0))",
    "    + i.y + vec4(0.0, i1.y, i2.y, 1.0))",
    "    + i.x + vec4(0.0, i1.x, i2.x, 1.0));",
    "  float n_ = 0.142857142857;",
    "  vec3 ns = n_ * D.wyz - D.xzx;",
    "  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);",
    "  vec4 x_ = floor(j * ns.z);",
    "  vec4 y_ = floor(j - 7.0 * x_);",
    "  vec4 x = x_ * ns.x + ns.yyyy;",
    "  vec4 y = y_ * ns.x + ns.yyyy;",
    "  vec4 h = 1.0 - abs(x) - abs(y);",
    "  vec4 b0 = vec4(x.xy, y.xy);",
    "  vec4 b1 = vec4(x.zw, y.zw);",
    "  vec4 s0 = floor(b0)*2.0 + 1.0;",
    "  vec4 s1 = floor(b1)*2.0 + 1.0;",
    "  vec4 sh = -step(h, vec4(0.0));",
    "  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;",
    "  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;",
    "  vec3 p0 = vec3(a0.xy, h.x);",
    "  vec3 p1 = vec3(a0.zw, h.y);",
    "  vec3 p2 = vec3(a1.xy, h.z);",
    "  vec3 p3 = vec3(a1.zw, h.w);",
    "  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));",
    "  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;",
    "  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);",
    "  m = m * m;",
    "  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));",
    "}",
  ].join("\n");

  var DOT_GRID_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "out vec4 fragColor;",
    "uniform vec2 uResolution;",
    "uniform float uTime;",
    "uniform float uCircleSize;",
    "uniform float uSpacing;",
    "uniform float uNoiseScale;",
    "uniform float uNoiseSeed;",
    "uniform float uNoiseSpeed;",
    "uniform int   uNoiseOctaves;",
    "uniform float uContrast;",
    "uniform float uWaveFreq;",
    "uniform float uWaveAmp;",
    "uniform float uWaveAngle;",
    "uniform float uNoiseEnabled;",
    "uniform float uWaveEnabled;",
    "uniform float uDistortionEnabled;",
    "uniform float uDistortionAmount;",
    "uniform float uDistortionScale;",
    "uniform int   uNumStops;",
    "uniform float uStopPos[10];",
    "uniform vec3  uStopCol[10];",
    SIMPLEX_NOISE_GLSL,
    "float fbm(vec3 p, int octaves) {",
    "  float value = 0.0;",
    "  float amplitude = 0.5;",
    "  float frequency = 1.0;",
    "  for (int i = 0; i < 8; i++) {",
    "    if (i >= octaves) break;",
    "    value += amplitude * snoise(p * frequency);",
    "    frequency *= 2.0;",
    "    amplitude *= 0.5;",
    "  }",
    "  return value;",
    "}",
    "vec3 colorRamp(float t) {",
    "  t = clamp(t, 0.0, 1.0);",
    "  if (uNumStops <= 1) return uStopCol[0];",
    "  if (t <= uStopPos[0]) return uStopCol[0];",
    "  for (int i = 1; i < 10; i++) {",
    "    if (i >= uNumStops) break;",
    "    if (t < uStopPos[i]) {",
    "      float segT = (t - uStopPos[i-1]) / max(uStopPos[i] - uStopPos[i-1], 0.001);",
    "      return mix(uStopCol[i-1], uStopCol[i], segT);",
    "    }",
    "  }",
    "  return uStopCol[uNumStops - 1];",
    "}",
    "void main() {",
    "  vec2 fragCoord = vUv * uResolution;",
    "  vec2 cell = floor(fragCoord / uSpacing);",
    "  vec2 cellCenter = (cell + 0.5) * uSpacing;",
    "  vec2 uv = cellCenter / uResolution.y;",
    "  float t = uTime * uNoiseSpeed;",
    "  float n = 0.5;",
    "  if (uNoiseEnabled > 0.5) {",
    "    vec2 warpedUv = uv * uNoiseScale;",
    "    if (uWaveEnabled > 0.5) {",
    "      float rad = uWaveAngle * 3.14159265 / 180.0;",
    "      vec2 waveDir = vec2(cos(rad), sin(rad));",
    "      vec2 waveTangent = vec2(-waveDir.y, waveDir.x);",
    "      float proj = dot(uv, waveDir);",
    "      float wave1 = sin(proj * uWaveFreq + t * 1.5 + uNoiseSeed) * uWaveAmp;",
    "      float wave2 = sin(proj * uWaveFreq * 2.3 + t * 0.8 + uNoiseSeed * 1.7) * uWaveAmp * 0.4;",
    "      warpedUv += waveTangent * (wave1 + wave2);",
    "    }",
    "    if (uDistortionEnabled > 0.5) {",
    "      vec2 dUv = uv * uDistortionScale;",
    "      float dn1 = snoise(vec3(dUv, t * 0.5 + uNoiseSeed));",
    "      float dn2 = snoise(vec3(dUv + 50.0, t * 0.5 + uNoiseSeed));",
    "      warpedUv += vec2(dn1, dn2) * uDistortionAmount;",
    "    }",
    "    vec3 noiseCoord = vec3(warpedUv, t + uNoiseSeed);",
    "    n = fbm(noiseCoord, uNoiseOctaves);",
    "    n = n * 0.5 + 0.5;",
    "    n = clamp(n, 0.0, 1.0);",
    "    n = n - 0.5;",
    "    n = n * uContrast;",
    "    n = clamp(n + 0.5, 0.0, 1.0);",
    "    n = pow(n, 0.5 + uContrast * 0.5);",
    "    n = clamp(n, 0.0, 1.0);",
    "  }",
    "  float radius = mix(0.5, uCircleSize, n);",
    "  float dist = length(fragCoord - cellCenter);",
    "  float edge = fwidth(dist) * 1.2;",
    "  float circle = 1.0 - smoothstep(radius - edge, radius + edge, dist);",
    "  vec3 color = colorRamp(n);",
    "  fragColor = vec4(color * circle, 1.0);",
    "}",
  ].join("\n");

  var BRIGHT_EXTRACT_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "out vec4 fragColor;",
    "uniform sampler2D uTexture;",
    "uniform float uThreshold;",
    "void main() {",
    "  vec4 c = texture(uTexture, vUv);",
    "  float brightness = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));",
    "  float contrib = max(brightness - uThreshold, 0.0);",
    "  fragColor = vec4(c.rgb * (contrib / max(brightness, 0.001)), 1.0);",
    "}",
  ].join("\n");

  var BLUR_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "out vec4 fragColor;",
    "uniform sampler2D uTexture;",
    "uniform vec2 uDirection;",
    "void main() {",
    "  vec4 result = texture(uTexture, vUv) * 0.227027;",
    "  vec2 off1 = uDirection * 1.3846153846;",
    "  vec2 off2 = uDirection * 3.2307692308;",
    "  result += texture(uTexture, vUv + off1) * 0.3162162162;",
    "  result += texture(uTexture, vUv - off1) * 0.3162162162;",
    "  result += texture(uTexture, vUv + off2) * 0.0702702703;",
    "  result += texture(uTexture, vUv - off2) * 0.0702702703;",
    "  fragColor = result;",
    "}",
  ].join("\n");

  var COMPOSITE_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "out vec4 fragColor;",
    "uniform sampler2D uScene;",
    "uniform sampler2D uBloom;",
    "uniform float uBloomStrength;",
    "void main() {",
    "  vec3 scene = texture(uScene, vUv).rgb;",
    "  vec3 bloom = texture(uBloom, vUv).rgb;",
    "  fragColor = vec4(scene + bloom * uBloomStrength, 1.0);",
    "}",
  ].join("\n");

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function hexToVec3(hex) {
    var h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255,
    ];
  }

  function compileShader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error("Shader compile error: " + info);
    }
    return s;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var info = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error("Program link error: " + info);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return p;
  }

  function getUniforms(gl, prog, names) {
    var out = {};
    for (var i = 0; i < names.length; i++) {
      out[names[i]] = gl.getUniformLocation(prog, names[i]);
    }
    return out;
  }

  function createFBO(gl, w, h) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo: fbo, tex: tex };
  }

  // ─── Core instance ───────────────────────────────────────────────────────────

  function ShaderInstance(canvas, params) {
    this.canvas = canvas;
    this.params = Object.assign({}, params);
    this.gl = null;
    this.raf = null;
    this.time = 0;
    this.lastFrame = 0;
    this.res = null;

    this._render = this._render.bind(this);
    this._onResize = this._onResize.bind(this);

    this._setup();
    this.raf = requestAnimationFrame(this._render);
    window.addEventListener("resize", this._onResize);
  }

  ShaderInstance.prototype.updateParams = function (partial) {
    Object.assign(this.params, partial);
  };

  ShaderInstance.prototype.destroy = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this._onResize);
    this.gl = null;
    this.res = null;
  };

  ShaderInstance.prototype._onResize = function () {
    this._setup();
  };

  ShaderInstance.prototype._setup = function () {
    var canvas = this.canvas;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.offsetWidth || window.innerWidth;
    var h = canvas.offsetHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    var gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.error("[LyveShader] WebGL2 não suportado neste browser.");
      return;
    }

    gl.getExtension("EXT_color_buffer_float");
    this.gl = gl;

    var dotProg = createProgram(gl, FULLSCREEN_VS, DOT_GRID_FS);
    var brightProg = createProgram(gl, FULLSCREEN_VS, BRIGHT_EXTRACT_FS);
    var blurProg = createProgram(gl, FULLSCREEN_VS, BLUR_FS);
    var compositeProg = createProgram(gl, FULLSCREEN_VS, COMPOSITE_FS);

    var dotU = getUniforms(gl, dotProg, [
      "uResolution", "uTime", "uCircleSize", "uSpacing",
      "uNoiseScale", "uNoiseSeed", "uNoiseSpeed", "uNoiseOctaves",
      "uContrast", "uWaveFreq", "uWaveAmp", "uWaveAngle",
      "uNoiseEnabled", "uWaveEnabled",
      "uDistortionEnabled", "uDistortionAmount", "uDistortionScale",
      "uNumStops", "uStopPos", "uStopCol",
    ]);
    var brightU = getUniforms(gl, brightProg, ["uTexture", "uThreshold"]);
    var blurU = getUniforms(gl, blurProg, ["uTexture", "uDirection"]);
    var compositeU = getUniforms(gl, compositeProg, ["uScene", "uBloom", "uBloomStrength"]);

    var cw = canvas.width;
    var ch = canvas.height;
    var halfW = Math.max(1, Math.round(cw / 2));
    var halfH = Math.max(1, Math.round(ch / 2));

    this.res = {
      dotProg: dotProg, dotU: dotU,
      brightProg: brightProg, brightU: brightU,
      blurProg: blurProg, blurU: blurU,
      compositeProg: compositeProg, compositeU: compositeU,
      sceneFBO: createFBO(gl, cw, ch),
      brightFBO: createFBO(gl, halfW, halfH),
      blurFBO1: createFBO(gl, halfW, halfH),
      blurFBO2: createFBO(gl, halfW, halfH),
      vao: gl.createVertexArray(),
      width: cw, height: ch,
      halfW: halfW, halfH: halfH,
      dpr: dpr,
    };
  };

  ShaderInstance.prototype._render = function (timestamp) {
    var gl = this.gl;
    var res = this.res;
    if (!gl || !res) {
      this.raf = requestAnimationFrame(this._render);
      return;
    }

    var p = this.params;

    if (this.lastFrame === 0) this.lastFrame = timestamp;
    var dt = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;
    if (p.playing !== false) this.time += dt;

    var dotProg = res.dotProg, dotU = res.dotU;
    var brightProg = res.brightProg, brightU = res.brightU;
    var blurProg = res.blurProg, blurU = res.blurU;
    var compositeProg = res.compositeProg, compositeU = res.compositeU;
    var sceneFBO = res.sceneFBO, brightFBO = res.brightFBO;
    var blurFBO1 = res.blurFBO1, blurFBO2 = res.blurFBO2;
    var width = res.width, height = res.height;
    var halfW = res.halfW, halfH = res.halfH;
    var dpr = res.dpr;

    gl.bindVertexArray(res.vao);

    // Pass 1: Dot Grid → sceneFBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.fbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(dotProg);
    gl.uniform2f(dotU.uResolution, width, height);
    gl.uniform1f(dotU.uTime, this.time);
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

    var sorted = p.colorStops.slice().sort(function (a, b) { return a.pos - b.pos; });
    var numStops = Math.min(sorted.length, 10);
    var posArr = new Float32Array(10);
    var colArr = new Float32Array(30);
    for (var i = 0; i < numStops; i++) {
      posArr[i] = sorted[i].pos;
      var rgb = hexToVec3(sorted[i].color);
      colArr[i * 3] = rgb[0];
      colArr[i * 3 + 1] = rgb[1];
      colArr[i * 3 + 2] = rgb[2];
    }
    gl.uniform1i(dotU.uNumStops, numStops);
    gl.uniform1fv(dotU.uStopPos, posArr);
    gl.uniform3fv(dotU.uStopCol, colArr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 2: Bright extract → brightFBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, brightFBO.fbo);
    gl.viewport(0, 0, halfW, halfH);
    gl.useProgram(brightProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
    gl.uniform1i(brightU.uTexture, 0);
    gl.uniform1f(brightU.uThreshold, p.bloomThreshold);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Passes 3-4: Separable Gaussian blur (2 iterações)
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO1.fbo);
    gl.bindTexture(gl.TEXTURE_2D, blurFBO2.tex);
    gl.uniform2f(blurU.uDirection, 1.0 / halfW, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO2.fbo);
    gl.bindTexture(gl.TEXTURE_2D, blurFBO1.tex);
    gl.uniform2f(blurU.uDirection, 0.0, 1.0 / halfH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 5: Composite → screen
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

    this.raf = requestAnimationFrame(this._render);
  };

  // ─── Public API ──────────────────────────────────────────────────────────────

  var LyveShader = {
    /** Preset idêntico ao da hero do Lyve */
    LYVE_PARAMS: {
      circleSize: 5.5,
      spacing: 12,
      noiseScale: 0.6,
      noiseSeed: 0,
      noiseSpeed: 0.05,
      noiseOctaves: 3,
      contrast: 2.5,
      waveFrequency: 2.6,
      waveAmplitude: 0.65,
      waveAngle: 120,
      bloomStrength: 0.6,
      bloomThreshold: 0.35,
      noiseEnabled: true,
      waveEnabled: true,
      distortionEnabled: true,
      distortionAmount: 0.1,
      distortionScale: 0.6,
      playing: true,
      colorStops: [
        { pos: 0.3,   color: "#323334" },
        { pos: 0.5,   color: "#AEAFB3" },
        { pos: 0.795, color: "#677494" },
        { pos: 0.6,   color: "#72A1BF" },
        { pos: 0.895, color: "#E7DAD2" },
        { pos: 1.0,   color: "#e7dad2" },
        { pos: 0.855, color: "#ccb4a4" },
      ],
    },

    /** Preset genérico (cinza neutro) */
    DEFAULT_PARAMS: {
      circleSize: 5.0,
      spacing: 12,
      noiseScale: 0.6,
      noiseSeed: 0,
      noiseSpeed: 0.04,
      noiseOctaves: 3,
      contrast: 2.0,
      waveFrequency: 2.0,
      waveAmplitude: 0.5,
      waveAngle: 90,
      bloomStrength: 0.5,
      bloomThreshold: 0.3,
      noiseEnabled: true,
      waveEnabled: true,
      distortionEnabled: false,
      distortionAmount: 0.1,
      distortionScale: 0.6,
      playing: true,
      colorStops: [
        { pos: 0.0, color: "#111111" },
        { pos: 0.5, color: "#555555" },
        { pos: 1.0, color: "#ffffff" },
      ],
    },

    /**
     * Inicializa o shader em um canvas.
     * @param {string|HTMLCanvasElement} target  ID do canvas ou o elemento diretamente
     * @param {object} params  Parâmetros do shader (use LyveShader.LYVE_PARAMS)
     * @returns {ShaderInstance}
     */
    init: function (target, params) {
      var canvas = typeof target === "string"
        ? document.getElementById(target)
        : target;

      if (!canvas || canvas.tagName !== "CANVAS") {
        throw new Error('[LyveShader] "' + target + '" não é um canvas válido.');
      }

      return new ShaderInstance(canvas, params || LyveShader.DEFAULT_PARAMS);
    },
  };

  global.LyveShader = LyveShader;
})(typeof window !== "undefined" ? window : this);
