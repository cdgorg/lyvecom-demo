"use client";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { evolvePath, getPointAtLength, getLength } from "@remotion/paths";

const FULL_TEXT =
  "Based on historical data, content that educates the audience about your product has seen higher conversion and lower return rates.";

const STATS = [
  { value: "87%", label: "Hook Rate" },
  { value: "200K", label: "Views" },
  { value: "152K", label: "Engagement" },
];

const LINE_PATH =
  "M -40 220 C 0 210, 20 190, 40 188 C 60 186, 100 195, 160 225 C 220 255, 270 265, 310 255 C 350 245, 390 195, 420 130";

export type TextRevealMode = "blur-stream" | "word-fade-blur" | "gradient-mask";

export const CardOneComposition: React.FC<{
  textRevealMode?: TextRevealMode;
}> = ({ textRevealMode = "blur-stream" }) => {
  const frame = useCurrentFrame();

  // --- Global fade out (frames 345-380) via overlay ---
  const overlayOpacity = interpolate(frame, [345, 380], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Line graph draw (frames 0-90) ---
  const lineProgress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lineEvolution = evolvePath(lineProgress, LINE_PATH);
  const pathLength = getLength(LINE_PATH);
  const tipPoint = getPointAtLength(LINE_PATH, lineProgress * pathLength);
  const tipX = tipPoint.x;
  const MAX_FADE = 60;
  const FADE_WIDTH = Math.min(MAX_FADE, 420 - tipX);

  // --- Stat cards (staggered, starting frame 80) ---
  const statAnimations = STATS.map((_, i) => {
    const start = 80 + i * 10;
    const end = start + 25;
    const opacity = interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(frame, [start, end], [12, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const blur = interpolate(frame, [start, end], [4, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity, translateY, blur };
  });

  // --- Ad Insights chip (frames 120-145 fade+blur, 140-165 shine) ---
  const chipOpacity = interpolate(frame, [120, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chipBlur = interpolate(frame, [120, 145], [6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shineX = interpolate(frame, [140, 185], [-100, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Text box (fades in after shine completes at 165, words stream 185-270) ---
  const textBoxOpacity = interpolate(frame, [168, 188], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const WORDS = FULL_TEXT.split(" ");
  const streamProgress = interpolate(frame, [185, 270], [0, WORDS.length + 1.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const LINE_HEIGHT_PX = 20.8;
  const TEXT_PADDING_V = 24;
  const CHARS_PER_LINE = 42;
  const HEIGHT_TRANSITION_FRAMES = 12;
  const visibleWordCount = Math.floor(Math.min(streamProgress, WORDS.length));
  const visibleChars = WORDS.slice(0, visibleWordCount).join(" ").length;
  const lineBreakFrames: number[] = [];
  for (let line = 2; line <= 3; line++) {
    const charAtBreak = CHARS_PER_LINE * (line - 1);
    if (charAtBreak < FULL_TEXT.length) {
      const breakFrame = Math.round(
        interpolate(charAtBreak, [0, FULL_TEXT.length], [185, 270])
      );
      lineBreakFrames.push(breakFrame);
    }
  }
  let smoothLines = 1;
  for (const bf of lineBreakFrames) {
    smoothLines += interpolate(frame, [bf, bf + HEIGHT_TRANSITION_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  }
  const textBoxHeight = textRevealMode === "gradient-mask"
    ? 3 * LINE_HEIGHT_PX + TEXT_PADDING_V
    : smoothLines * LINE_HEIGHT_PX + TEXT_PADDING_V;

  const gradientRevealPos = interpolate(frame, [185, 270], [-10, 110], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#101010",
        fontFamily: "'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          opacity: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 24,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* SVG line graph background */}
        <svg
          viewBox="0 0 400 400"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E7DAD2" stopOpacity={0.06} />
              <stop offset="100%" stopColor="#E7DAD2" stopOpacity={0} />
            </linearGradient>
            <mask id="revealMask">
              <rect x="-40" y="0" width={Math.max(0, tipX - FADE_WIDTH + 40)} height="400" fill="white" />
              <rect x={Math.max(-40, tipX - FADE_WIDTH)} y="0" width={FADE_WIDTH} height="400" fill="url(#fadeMaskGrad)" />
            </mask>
            <linearGradient id="fadeMaskGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </linearGradient>
          </defs>
          {/* Gradient fill area below the line, revealed with soft edge */}
          <path
            d={`${LINE_PATH} L 420 400 L -40 400 Z`}
            fill="url(#areaGrad)"
            mask="url(#revealMask)"
          />
          {/* Stroke line */}
          <path
            d={LINE_PATH}
            fill="none"
            stroke="#E7DAD2"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={lineEvolution.strokeDasharray}
            strokeDashoffset={lineEvolution.strokeDashoffset}
            opacity={0.32}
          />
        </svg>

        {/* Content area */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "flex-start",
            paddingTop: 100,
            gap: 12,
          }}
        >
          {/* Ad Insights chip */}
          <div
            style={{
              opacity: chipOpacity,
              filter: `blur(${chipBlur}px)`,
              overflow: "hidden",
              alignSelf: "flex-start",
              borderRadius: 8,
              position: "relative",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(114,161,191,0.10)",
                color: "#72A1BF",
                fontSize: 11,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid rgba(114,161,191,0.07)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle
                  cx="6"
                  cy="6"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M4 6L6 4L8 6M6 4V8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Ad Insights
            </span>
            {/* Blue shine wipe overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(180deg, transparent 0%, rgba(114,161,191,0.15) 45%, rgba(114,161,191,0.20) 50%, rgba(114,161,191,0.15) 55%, transparent 100%)`,
                transform: `translateY(${shineX}%)`,
                filter: "blur(7px)",
                borderRadius: 8,
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Text box */}
          <div
            style={{
              opacity: textBoxOpacity,
              backgroundColor: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(50px)",
              WebkitBackdropFilter: "blur(50px)",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.06)",
              maxWidth: 340,
              height: textBoxHeight,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.22)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.6,
                margin: 0,
                wordWrap: "break-word",
                position: "relative",
              }}
            >
              {textRevealMode === "blur-stream" &&
                WORDS.map((word, i) => {
                  const wordArrival = i;
                  const wordProgress = interpolate(
                    streamProgress,
                    [wordArrival, wordArrival + 2.5],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  const wordBlur = interpolate(wordProgress, [0, 1], [8, 0]);
                  if (wordProgress <= 0) return null;
                  return (
                    <span
                      key={i}
                      style={{
                        opacity: wordProgress,
                        filter: `blur(${wordBlur}px)`,
                      }}
                    >
                      {word}{i < WORDS.length - 1 ? " " : ""}
                    </span>
                  );
                })}

              {textRevealMode === "word-fade-blur" &&
                WORDS.map((word, i) => {
                  const wordArrival = i;
                  const wordProgress = interpolate(
                    streamProgress,
                    [wordArrival, wordArrival + 2],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  const wordBlur = interpolate(wordProgress, [0, 1], [6, 0]);
                  const wordY = interpolate(wordProgress, [0, 1], [8, 0]);
                  if (wordProgress <= 0) return null;
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        opacity: wordProgress,
                        filter: `blur(${wordBlur}px)`,
                        transform: `translateY(${wordY}px)`,
                        marginRight: i < WORDS.length - 1 ? 4 : 0,
                      }}
                    >
                      {word}
                    </span>
                  );
                })}

              {textRevealMode === "gradient-mask" && (
                <span
                  style={{
                    backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.65) ${gradientRevealPos - 2}%, rgba(255,255,255,0.65) ${gradientRevealPos}%, transparent ${gradientRevealPos + 8}%, transparent 100%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                >
                  {FULL_TEXT}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Stat cards row at bottom */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: "auto",
            justifyContent: "center",
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                flex: "0 1 100px",
                opacity: statAnimations[i].opacity,
                transform: `translateY(${statAnimations[i].translateY}px)`,
                filter: `blur(${statAnimations[i].blur}px)`,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 8,
                padding: "8px 14px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                style={{
                  color: "white",
                  fontSize: 15,
                  fontWeight: 600,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 10,
                  margin: "2px 0 0 0",
                  fontWeight: 400,
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* Fade-out overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#101010",
          opacity: overlayOpacity,
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
};

const NOTIFICATIONS = [
  {
    title: "Content Approved",
    date: "10 Jan, 2026 | 11:30 am",
    accent: "Published",
    accentColor: "#2DD4BF",
  },
  {
    title: "Campaign Matched",
    date: "11 Jan, 2026 | 03:15 pm",
    accent: "Nike",
    accentColor: "#60A5FA",
  },
  {
    title: "Payout Credited",
    date: "12 Jan, 2026 | 09:00 am",
    accent: "+$274.54",
    accentColor: "#4ADE80",
  },
];

const NotificationCard: React.FC<{
  title: string;
  date: string;
  accent: string;
  accentColor: string;
  opacity: number;
  blur: number;
  translateY: number;
  scale: number;
}> = ({ title, date, accent, accentColor, opacity, blur, translateY, scale }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        opacity,
        filter: `blur(${blur}px)`,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: "center bottom",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        borderRadius: 8,
        padding: "14px 14px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <img
        src="/notification%20logo.png"
        alt=""
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontWeight: 400,
            lineHeight: 1.3,
          }}
        >
          {date}
        </p>
        <p
          style={{
            margin: "3px 0 0 0",
            fontSize: 15,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: accentColor,
          flexShrink: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {accent}
      </span>
    </div>
  );
};

export const CardTwoComposition = () => {
  const frame = useCurrentFrame();

  const ENTER_DURATION = 40;
  const ENTER_STAGGER = 60;

  const enterAnimations = NOTIFICATIONS.map((_, i) => {
    const start = i * ENTER_STAGGER;
    const end = start + ENTER_DURATION;

    const progress = interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return progress;
  });

  const cardStates = NOTIFICATIONS.map((_, i) => {
    const enterProgress = enterAnimations[i];

    const cardOpacity = interpolate(enterProgress, [0, 1], [0, 1]);
    const cardBlur = interpolate(enterProgress, [0, 1], [8, 0]);
    const cardEnterY = interpolate(enterProgress, [0, 1], [30, 0]);

    let recedeScale = 1;
    let recedeOpacity = 1;
    let recedeY = 0;

    for (let j = i + 1; j < NOTIFICATIONS.length; j++) {
      const laterStart = j * ENTER_STAGGER;
      const laterEnd = laterStart + ENTER_DURATION;
      const depth = j - i;

      const recedeProgress = interpolate(frame, [laterStart, laterEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });

      recedeScale -= recedeProgress * 0.05;
      recedeOpacity -= recedeProgress * 0.25;
      recedeY -= recedeProgress * 12;
    }

    const exitStart = 220 + i * 12;
    const exitEnd = exitStart + 45;
    const exitProgress = interpolate(frame, [exitStart, exitEnd], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    });
    const exitY = interpolate(exitProgress, [0, 1], [0, 50]);
    const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
    const exitBlur = interpolate(exitProgress, [0, 1], [0, 6]);

    const finalOpacity = cardOpacity * recedeOpacity * exitOpacity;
    const finalY = cardEnterY + recedeY + exitY;
    const finalBlur = cardBlur + exitBlur;
    const finalScale = recedeScale;

    return {
      opacity: Math.max(0, finalOpacity),
      blur: finalBlur,
      translateY: finalY,
      scale: Math.max(0.8, finalScale),
    };
  });

  const overlayOpacity = interpolate(frame, [285, 320], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#101010",
        fontFamily: "'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {NOTIFICATIONS.map((notif, i) => (
          <NotificationCard
            key={notif.title}
            title={notif.title}
            date={notif.date}
            accent={notif.accent}
            accentColor={notif.accentColor}
            opacity={cardStates[i].opacity}
            blur={cardStates[i].blur}
            translateY={cardStates[i].translateY}
            scale={cardStates[i].scale}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#101010",
          opacity: overlayOpacity,
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
};

const LOOP_FRAMES = 300;

export const CardThreeComposition = () => {
  const frame = useCurrentFrame();
  const t = (frame / LOOP_FRAMES) * 2 * Math.PI;

  const coinRotateX = Math.sin(t) * 6;
  const coinRotateY = Math.cos(t * 2) * 8;
  const coinTranslateY = Math.sin(t * 3) * 3;

  const PULSE_DURATION = 85;
  const PULSE_OFFSETS = [0, 90, 180];

  const pulses = PULSE_OFFSETS.map((offset) => {
    const localFrame = frame - offset;
    const radius = interpolate(localFrame, [0, PULSE_DURATION], [0, 90], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    const opacity = interpolate(localFrame, [0, PULSE_DURATION * 0.25, PULSE_DURATION * 0.55, PULSE_DURATION], [0, 1, 0.6, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const trail = 25;
    const inner = Math.max(0, radius - trail);
    return { opacity, inner, radius };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#101010",
        fontFamily: "'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <img
        src="/card3_bg.svg"
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />

      {pulses.map((pulse, i) =>
        pulse.opacity > 0 ? (
          <svg
            key={i}
            width="380"
            height="380"
            viewBox="0 0 380 380"
            fill="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: pulse.opacity,
              maskImage: `radial-gradient(circle at 50% 50%, transparent ${pulse.inner}%, #FFFFFF33 ${pulse.radius - 3}%, transparent ${pulse.radius + 2}%)`,
              WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${pulse.inner}%, #FFFFFF33 ${pulse.radius - 3}%, transparent ${pulse.radius + 2}%)`,
              pointerEvents: "none",
              filter: "blur(1px)",
            }}
          >
            <g clipPath="url(#pulseClip)">
              <path d="M764.061 -177.917L284.283 99.0828V156.083L159.283 228.252M-46.2166 346.897L27.5 303.914M750.061 -186L270.283 91V148L-60.2166 338.814M738.783 -197.277L259.006 79.7226V136.723L-71.4939 327.537M728.06 -208L248.283 69V126L83.0327 221.407M-82.2173 316.814L83.0327 221.407M83.0327 221.407V99.0828L-143 -31.4172M83.0327 83.0828L-143 -47.4173M83.0327 69.0828L-143 -61.4172M83.0327 54.0828L-143 -76.4173M159.283 228.252L312.678 316.814V524.583M159.283 228.252L27.5 303.914M300.955 323.583V531.351M289.696 330.083V537.851M277.783 336.961V544.729M27.5 303.914V502.5M18.5 309.533V508.119M9.5 314.729V513.315" stroke="white" strokeWidth="1.5" />
              <path d="M676.279 458.044L196.502 181.044L196.501 35.4174L71.5005 -36.7515L-61.2827 -113.414L-133.999 -155.397M662.279 466.127L182.502 189.126L182.501 43.5003L-147.999 -147.314M651.001 477.404L171.224 200.404L171.223 54.7776L-159.277 -136.037M640.278 488.126L160.501 211.126L160.5 65.5002L-4.75 -29.9069L-170 -125.314" stroke="white" strokeWidth="1.5" />
              <path d="M70 332.973L186 266L197.75 272.784M209.5 279.568V441.973M209.5 279.568L197.75 272.784M209.5 279.568L70 360.108M197.75 272.784L70 346.54" stroke="white" strokeWidth="1.5" />
            </g>
            <defs>
              <clipPath id="pulseClip">
                <rect width="380" height="380" fill="white" />
              </clipPath>
            </defs>
          </svg>
        ) : null
      )}

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 160,
          height: 160,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(231,218,210,0.15) 0%, rgba(231,218,210,0.04) 50%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

      <img
        src="/coin.png"
        alt=""
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 160,
          height: 160,
          objectFit: "contain",
          transform: `translate(-50%, -50%) perspective(800px) rotateX(${coinRotateX}deg) rotateY(${coinRotateY}deg) translateY(${coinTranslateY}px)`,
          willChange: "transform",
          mixBlendMode: "lighten",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
