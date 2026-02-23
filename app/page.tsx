"use client";

import { useState } from "react";
import ShaderCanvas, { type ShaderParams } from "./components/ShaderCanvas";
import ControlPanel from "./components/ControlPanel";

const DEFAULT_PARAMS: ShaderParams = {
  circleSize: 6,
  spacing: 12,
  noiseScale: 2.5,
  noiseSeed: 0,
  noiseSpeed: 0.25,
  noiseOctaves: 3,
  contrast: 2.5,
  waveFrequency: 8.0,
  waveAmplitude: 1.2,
  waveAngle: 120,
  bloomStrength: 0.6,
  bloomThreshold: 0.35,
  playing: true,
  noiseEnabled: true,
  waveEnabled: true,
  distortionEnabled: false,
  distortionAmount: 1.5,
  distortionScale: 2.0,
  colorStops: [
    { pos: 0,    color: "#AEAFB3" },
    { pos: 0.25, color: "#677494" },
    { pos: 0.5,  color: "#72A1BF" },
    { pos: 0.75, color: "#E7DAD2" },
    { pos: 1.0,  color: "#FDFBF8" },
  ],
};

export default function Home() {
  const [params, setParams] = useState<ShaderParams>(DEFAULT_PARAMS);

  return (
    <>
      <ShaderCanvas params={params} />
      <ControlPanel params={params} onChange={setParams} />
    </>
  );
}
