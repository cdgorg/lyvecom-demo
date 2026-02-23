"use client";

import { useState, useCallback, useRef } from "react";
import WaterShaderCanvas, {
  DEFAULT_WATER_PARAMS,
  type WaterParams,
} from "../components/WaterShaderCanvas";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <div className="flex justify-between text-[11px] text-white/60">
        <span>{label}</span>
        <span className="tabular-nums">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-white/80 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
      />
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <span className="text-[11px] text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer
            [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
        />
        <span className="text-[11px] text-white/40 tabular-nums uppercase">{value}</span>
      </div>
    </div>
  );
}

export default function WaterPage() {
  const [params, setParams] = useState<WaterParams>(DEFAULT_WATER_PARAMS);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const update = useCallback(
    <K extends keyof WaterParams>(key: K, value: WaterParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const copyParams = useCallback(() => {
    const code = `const WATER_PARAMS: WaterParams = ${JSON.stringify(params, null, 2)};`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      clearTimeout(copiedTimeout.current);
      copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [params]);

  const bakeParams = useCallback(() => {
    const code =
      `<WaterShaderCanvas params={${JSON.stringify(params, null, 2)}} />`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      clearTimeout(copiedTimeout.current);
      copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [params]);

  const resetParams = useCallback(() => {
    setParams(DEFAULT_WATER_PARAMS);
  }, []);

  return (
    <>
      <WaterShaderCanvas params={params} />

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 w-8 h-8 flex items-center justify-center
          rounded-full bg-white/10 backdrop-blur-md border border-white/10
          text-white/60 hover:text-white hover:bg-white/20 transition-colors text-sm"
        title={open ? "Hide controls" : "Show controls"}
      >
        {open ? "\u2715" : "\u2699"}
      </button>

      {/* Control panel */}
      {open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40
            bg-black/60 backdrop-blur-xl border-t border-white/10
            px-6 py-4 flex flex-wrap items-start gap-x-6 gap-y-3"
        >
          <ColorPicker
            label="Caustic Color"
            value={params.color}
            onChange={(v) => update("color", v)}
          />
          <ColorPicker
            label="Background"
            value={params.bgColor}
            onChange={(v) => update("bgColor", v)}
          />

          <div className="w-px h-10 bg-white/10 self-center hidden sm:block" />

          <Slider
            label="Speed"
            value={params.speed}
            min={0}
            max={4}
            step={0.1}
            onChange={(v) => update("speed", v)}
          />
          <Slider
            label="Scale"
            value={params.scale}
            min={0.5}
            max={8}
            step={0.1}
            onChange={(v) => update("scale", v)}
          />
          <Slider
            label="Sharpness"
            value={params.sharpness}
            min={1}
            max={10}
            step={0.1}
            onChange={(v) => update("sharpness", v)}
          />
          <Slider
            label="Brightness"
            value={params.brightness}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => update("brightness", v)}
          />

          <div className="w-px h-10 bg-white/10 self-center hidden sm:block" />

          <Slider
            label="Mouse Strength"
            value={params.mouseStrength}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => update("mouseStrength", v)}
          />
          <Slider
            label="Mouse Radius"
            value={params.mouseRadius}
            min={1}
            max={30}
            step={0.5}
            onChange={(v) => update("mouseRadius", v)}
          />

          <div className="w-px h-10 bg-white/10 self-center hidden sm:block" />

          {/* Actions */}
          <div className="flex flex-col gap-1.5 self-center">
            <button
              onClick={copyParams}
              className="px-3 py-1 text-[11px] rounded bg-white/10 border border-white/10
                text-white/70 hover:text-white hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy Params"}
            </button>
            <button
              onClick={bakeParams}
              className="px-3 py-1 text-[11px] rounded bg-white/10 border border-white/10
                text-white/70 hover:text-white hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy JSX"}
            </button>
            <button
              onClick={resetParams}
              className="px-3 py-1 text-[11px] rounded bg-white/5 border border-white/10
                text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </>
  );
}
