"use client";

import { useState } from "react";
import { FeatureCardPlayer } from "../components/FeatureCardPlayer";
import type { TextRevealMode } from "../components/FeatureCardComposition";

const cards = [
  { key: "one" as const, label: "Card One" },
  { key: "two" as const, label: "Card Two" },
  { key: "three" as const, label: "Card Three" },
];

const TEXT_MODES: { value: TextRevealMode; label: string }[] = [
  { value: "blur-stream", label: "Blur Stream" },
  { value: "word-fade-blur", label: "Word Fade + Blur" },
  { value: "gradient-mask", label: "Gradient Mask" },
];

export default function FeaturesPage() {
  const [textRevealMode, setTextRevealMode] = useState<TextRevealMode>("blur-stream");

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-[1200px] flex flex-col gap-[27px]">
        {/* Section Header */}
        <div className="mb-12 flex flex-col gap-1.5">
          <p className="text-[#8b9a7e] text-sm font-thin mb-4 tracking-[-0.4px]">
            Features
          </p>
          <h2 className="text-white text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-tight">
            It&rsquo;s obvious.
          </h2>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.key} className="flex flex-col gap-[22px]">
              <div
                className="overflow-hidden aspect-square"
                style={{
                  backgroundColor: "#101010",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                }}
              >
                <FeatureCardPlayer card={card.key} textRevealMode={textRevealMode} />
              </div>
              <h3 className="text-white text-2xl font-extralight">
                {card.label}
              </h3>
            </div>
          ))}
        </div>

        {/* Text Reveal Mode Toggle */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {TEXT_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setTextRevealMode(mode.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                border: textRevealMode === mode.value
                  ? "1px solid rgba(114,161,191,0.4)"
                  : "1px solid rgba(255,255,255,0.1)",
                backgroundColor: textRevealMode === mode.value
                  ? "rgba(114,161,191,0.12)"
                  : "rgba(255,255,255,0.04)",
                color: textRevealMode === mode.value
                  ? "#72A1BF"
                  : "rgba(255,255,255,0.5)",
                transition: "all 0.2s ease",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
