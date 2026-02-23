"use client";

import { useState } from "react";
import { type ShaderParams } from "./ShaderCanvas";
import GradientSlider from "./GradientSlider";

interface ControlPanelProps {
  params: ShaderParams;
  onChange: (params: ShaderParams) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-[140px] ${disabled ? "opacity-35 pointer-events-none" : ""}`}>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-zinc-500">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-zinc-200"
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider
                  border transition-colors shrink-0
                  ${value
                    ? "bg-zinc-700 border-zinc-500 text-zinc-200"
                    : "bg-zinc-900 border-zinc-700 text-zinc-500"}`}
      title={`${value ? "Disable" : "Enable"} ${label}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${value ? "bg-green-400" : "bg-zinc-600"}`} />
      {label}
    </button>
  );
}

export default function ControlPanel({ params, onChange }: ControlPanelProps) {
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof ShaderParams>(key: K, value: ShaderParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const copyParams = () => {
    const { playing, ...rest } = params;
    navigator.clipboard.writeText(JSON.stringify(rest, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed bottom-12 left-12 right-12 z-50 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-700/50">
      <div className="px-4 py-3 pb-4 flex flex-wrap items-end gap-x-5 gap-y-3 max-w-[1800px] mx-auto">
        {/* Play / Pause */}
        <button
          onClick={() => set("playing", !params.playing)}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700
                     border border-zinc-600 text-white transition-colors shrink-0"
          title={params.playing ? "Pause" : "Play"}
        >
          {params.playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="2,0 14,7 2,14" />
            </svg>
          )}
        </button>

        {/* Copy Params */}
        <button
          onClick={copyParams}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700
                     border border-zinc-600 text-white transition-colors shrink-0"
          title="Copy params to clipboard"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" />

        {/* Circle controls */}
        <Slider
          label="Circle Size"
          value={params.circleSize}
          min={1}
          max={20}
          step={0.5}
          onChange={(v) => set("circleSize", v)}
        />
        <Slider
          label="Spacing"
          value={params.spacing}
          min={4}
          max={40}
          step={1}
          onChange={(v) => set("spacing", v)}
        />

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" />

        {/* Noise controls */}
        <Toggle label="Noise" value={params.noiseEnabled} onChange={(v) => set("noiseEnabled", v)} />
        <Slider
          label="Noise Scale"
          value={params.noiseScale}
          min={0.5}
          max={10}
          step={0.1}
          onChange={(v) => set("noiseScale", v)}
          disabled={!params.noiseEnabled}
        />
        <Slider
          label="Noise Seed"
          value={params.noiseSeed}
          min={0}
          max={100}
          step={0.5}
          onChange={(v) => set("noiseSeed", v)}
          disabled={!params.noiseEnabled}
        />
        <Slider
          label="Noise Speed"
          value={params.noiseSpeed}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => set("noiseSpeed", v)}
          disabled={!params.noiseEnabled}
        />
        <Slider
          label="Octaves"
          value={params.noiseOctaves}
          min={1}
          max={8}
          step={1}
          onChange={(v) => set("noiseOctaves", v)}
          disabled={!params.noiseEnabled}
        />
        <Slider
          label="Contrast"
          value={params.contrast}
          min={0.5}
          max={5}
          step={0.1}
          onChange={(v) => set("contrast", v)}
          disabled={!params.noiseEnabled}
        />

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" />

        {/* Wave controls */}
        <Toggle label="Wave" value={params.waveEnabled} onChange={(v) => set("waveEnabled", v)} />
        <Slider
          label="Wave Freq"
          value={params.waveFrequency}
          min={0}
          max={20}
          step={0.1}
          onChange={(v) => set("waveFrequency", v)}
          disabled={!params.waveEnabled || !params.noiseEnabled}
        />
        <Slider
          label="Wave Amp"
          value={params.waveAmplitude}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => set("waveAmplitude", v)}
          disabled={!params.waveEnabled || !params.noiseEnabled}
        />
        <Slider
          label="Wave Angle"
          value={params.waveAngle}
          min={0}
          max={360}
          step={1}
          onChange={(v) => set("waveAngle", v)}
          disabled={!params.waveEnabled || !params.noiseEnabled}
        />

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" />

        {/* Distortion controls */}
        <Toggle label="Distortion" value={params.distortionEnabled} onChange={(v) => set("distortionEnabled", v)} />
        <Slider
          label="Distort Amt"
          value={params.distortionAmount}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => set("distortionAmount", v)}
          disabled={!params.distortionEnabled || !params.noiseEnabled}
        />
        <Slider
          label="Distort Scale"
          value={params.distortionScale}
          min={0.5}
          max={10}
          step={0.1}
          onChange={(v) => set("distortionScale", v)}
          disabled={!params.distortionEnabled || !params.noiseEnabled}
        />

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" />

        {/* Bloom controls */}
        <Slider
          label="Bloom"
          value={params.bloomStrength}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => set("bloomStrength", v)}
        />
        <Slider
          label="Bloom Thresh"
          value={params.bloomThreshold}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set("bloomThreshold", v)}
        />

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" />

        {/* Gradient color ramp */}
        <GradientSlider
          colorStops={params.colorStops}
          onChange={(colorStops) => onChange({ ...params, colorStops })}
        />
      </div>
    </div>
  );
}
