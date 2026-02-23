"use client";

import { useRef, useCallback } from "react";
import { type ColorStop } from "./ShaderCanvas";

interface GradientSliderProps {
  colorStops: ColorStop[];
  onChange: (stops: ColorStop[]) => void;
}

function interpolateColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const ca = parse(a), cb = parse(b);
  const mix = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export default function GradientSlider({ colorStops, onChange }: GradientSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<number | null>(null);

  const getPosition = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  // Sort stops by position for rendering the gradient
  const sorted = [...colorStops]
    .map((s, i) => ({ ...s, origIdx: i }))
    .sort((a, b) => a.pos - b.pos);

  const handleDragStart = useCallback(
    (origIdx: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      draggingRef.current = origIdx;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const idx = draggingRef.current;
      if (idx === null) return;
      const pos = getPosition(e.clientX);
      const newStops = colorStops.map((s, i) =>
        i === idx ? { ...s, pos: Math.round(pos * 1000) / 1000 } : s
      );
      onChange(newStops);
    },
    [colorStops, getPosition, onChange]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const handleColorChange = (origIdx: number, value: string) => {
    const newStops = colorStops.map((s, i) =>
      i === origIdx ? { ...s, color: value } : s
    );
    onChange(newStops);
  };

  const handleTrackDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-stop-thumb]")) return;
    const pos = getPosition(e.clientX);
    let color = sorted[0]?.color ?? "#888888";
    for (let i = 0; i < sorted.length - 1; i++) {
      if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
        const t = (pos - sorted[i].pos) / Math.max(sorted[i + 1].pos - sorted[i].pos, 0.001);
        color = interpolateColor(sorted[i].color, sorted[i + 1].color, t);
        break;
      }
    }
    if (pos > sorted[sorted.length - 1].pos) color = sorted[sorted.length - 1].color;
    onChange([...colorStops, { pos: Math.round(pos * 1000) / 1000, color }]);
  };

  const handleRemove = (origIdx: number) => {
    if (colorStops.length <= 2) return;
    onChange(colorStops.filter((_, i) => i !== origIdx));
  };

  const gradientCSS = sorted.map((s) => `${s.color} ${s.pos * 100}%`).join(", ");

  return (
    <div className="flex flex-col gap-1.5 min-w-[260px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Color Ramp
        </span>
        <span className="text-[9px] text-zinc-600">double-click to add</span>
      </div>
      {/* Track with extra bottom padding for the color picker squares */}
      <div
        ref={trackRef}
        className="relative h-7 rounded-md cursor-crosshair select-none mb-4"
        style={{ background: `linear-gradient(to right, ${gradientCSS})` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleTrackDoubleClick}
      >
        {sorted.map((stop) => (
          <div
            key={stop.origIdx}
            data-stop-thumb
            className="absolute top-1/2 -translate-x-1/2 flex flex-col items-center group"
            style={{
              left: `${stop.pos * 100}%`,
              top: "50%",
              transform: `translateX(-50%) translateY(-50%)`,
              zIndex: draggingRef.current === stop.origIdx ? 10 : 1,
            }}
          >
            {/* Delete button — top right, visible on hover */}
            {colorStops.length > 2 && (
              <button
                className="absolute -top-2 -right-3 w-3.5 h-3.5 rounded-full bg-red-500/90 text-white
                           text-[8px] leading-none flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400
                           z-20"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(stop.origIdx);
                }}
                title="Remove stop"
              >
                x
              </button>
            )}

            {/* Drag handle — the circle */}
            <div
              className="w-5 h-5 rounded-full border-2 border-white/80 shadow-md
                         hover:border-white cursor-grab active:cursor-grabbing"
              style={{ backgroundColor: stop.color }}
              onPointerDown={handleDragStart(stop.origIdx)}
            />

            {/* Color picker trigger — small square below the circle */}
            <div
              className="relative w-3 h-3 rounded-sm border border-white/60 shadow-sm mt-1
                         hover:border-white hover:scale-125 transition-transform cursor-pointer overflow-hidden"
              style={{ backgroundColor: stop.color }}
            >
              <input
                type="color"
                value={stop.color}
                onChange={(e) => handleColorChange(stop.origIdx, e.target.value)}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
              <div
                className="w-full h-full pointer-events-none"
                style={{ backgroundColor: stop.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
