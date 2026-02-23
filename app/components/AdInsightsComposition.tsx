"use client";
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";

const FULL_TEXT =
  "Content which talk about your product ingredients rather than just using and talking about the results seem to be performing better.";

const stats = [
  { value: "87%", label: "Hook Rate" },
  { value: "200K", label: "Views" },
  { value: "152K", label: "Engagement" },
];

export const AdInsightsComposition = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // --- Badge: fade in frames 0-20 ---
  const badgeOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // --- Quote card: fade in + slide up frames 20-45 ---
  const quoteProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const quoteOpacity = interpolate(quoteProgress, [0, 1], [0, 1]);
  const quoteTranslateY = interpolate(quoteProgress, [0, 1], [20, 0]);

  // --- Typewriter: starts at frame 35, types full text over ~60 frames ---
  const typeStart = 35;
  const charsPerFrame = FULL_TEXT.length / 60;
  const visibleChars = Math.min(
    FULL_TEXT.length,
    Math.max(0, Math.floor((frame - typeStart) * charsPerFrame))
  );
  const displayedText = FULL_TEXT.slice(0, visibleChars);

  // --- Stats: staggered fade in, one by one starting at frame 70 ---
  const statsAnimations = stats.map((_, i) => {
    const delay = 70 + i * 12;
    const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(frame, [delay, delay + 15], [10, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity, translateY };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'SF Pro Display', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Ad Insights badge */}
        <div style={{ opacity: badgeOpacity }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#1a2a1a",
              color: "#8b9a7e",
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 12px",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 10L5 3L8 7L10 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ad Insights
          </span>
        </div>

        {/* Quote card */}
        <div
          style={{
            opacity: quoteOpacity,
            transform: `translateY(${quoteTranslateY}px)`,
            backgroundColor: "#111",
            borderRadius: 12,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.04)",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.625,
              margin: 0,
              minHeight: 54,
            }}
          >
            {displayedText}
            {visibleChars < FULL_TEXT.length && (
              <span
                style={{
                  opacity: frame % 10 < 5 ? 1 : 0,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                |
              </span>
            )}
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                opacity: statsAnimations[i].opacity,
                transform: `translateY(${statsAnimations[i].translateY}px)`,
              }}
            >
              <p
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 10,
                  margin: 0,
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
