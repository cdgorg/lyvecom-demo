"use client";

import { useRef, useState } from "react";
import ShaderCanvas, { type ShaderParams, type ShaderCanvasHandle } from "./components/ShaderCanvas";
import ControlPanel from "./components/ControlPanel";

const DEFAULT_PARAMS: ShaderParams = {
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
  colorStops: [
    { pos: 0.3, color: "#323334" },
    { pos: 0.5, color: "#AEAFB3" },
    { pos: 0.795, color: "#677494"},
    { pos: 0.6, color: "#72A1BF"},
    { pos: 0.895, color: "#E7DAD2"},
    { pos: 1, color: "#e7dad2"},
    { pos: 0.855, color: "#ccb4a4"}
  ],
  playing: true,
};


export default function Home() {
  const [params, setParams] = useState<ShaderParams>(DEFAULT_PARAMS);
  const shaderRef = useRef<ShaderCanvasHandle>(null);

  return (
    <>
      <ShaderCanvas ref={shaderRef} params={params} />
      <ControlPanel params={params} onChange={setParams} onCapture4K={() => shaderRef.current?.capture4K()} />
    </>
  );
}
