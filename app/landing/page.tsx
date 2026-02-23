"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useSpring, useMotionValue, animate, useScroll, useTransform, useInView } from "framer-motion";
import ShaderCanvas, { type ShaderParams } from "../components/ShaderCanvas";
import WaterShaderCanvas, { DEFAULT_WATER_PARAMS } from "../components/WaterShaderCanvas";

const LANDING_PARAMS: ShaderParams = {
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

const LANDING_WATER_PARAMS = {
  color: "#202024",
  bgColor: "#000000",
  speed: 1,
  scale: 1.1,
  sharpness: 1.3,
  brightness: 0.6,
  mouseStrength: 0.25,
  mouseRadius: 8
};

const STEPPED_ANIMATION_DURATION = 1.8;
const STEPPED_ANIMATION_EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];


const BRAND_NAMES = [
  "GORGIAS",
  "REBUY",
  "TAPCART",
  "YOTPO",
  "KLAVIYO",
  "ATTENTIVE",
  "POSTSCRIPT",
  "OKENDO",
  "LOOP",
];

const gradientTextStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(14deg, #fff 61%, #999 125%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);
  const springConfig = { stiffness: 180, damping: 18, mass: 0.8 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);
  const borderRadius = useMotionValue(2);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const PROXIMITY = 450;

      const overButton =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;

      if (overButton) {
        x.set(dx * 0.35);
        y.set(dy * 0.35);
        if (!isHovered.current) {
          const pill = Math.ceil(rect.height / 2);
          animate(borderRadius, pill, { duration: 0.5, ease: [0.4, 0, 0.2, 1] });
          isHovered.current = true;
        }
      } else if (distance < PROXIMITY) {
        const factor = (1 - distance / PROXIMITY) * 0.15;
        x.set(dx * factor);
        y.set(dy * factor);
        if (isHovered.current) {
          animate(borderRadius, 2, { duration: 0.5, ease: [0.4, 0, 0.2, 1] });
          isHovered.current = false;
        }
      } else {
        x.set(0);
        y.set(0);
        if (isHovered.current) {
          animate(borderRadius, 2, { duration: 0.5, ease: [0.4, 0, 0.2, 1] });
          isHovered.current = false;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y, borderRadius]);

  return (
    <motion.div
      ref={ref}
      style={{ x, y, borderRadius, width: "fit-content" }}
      className="flex items-center gap-3 bg-white text-black font-semibold text-lg px-10 py-5 cursor-pointer select-none overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function LyvecomLogo() {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.svg" alt="Lyvecom Logo" className="w-30" />
    </div>
  );
}

function CardGrid() {
  const cards = Array.from({ length: 5 });

  return (
    <div
      className="absolute top-1/2 hidden lg:flex z-[5] gap-[22px] overflow-hidden"
      style={{
        left: "52%",
        right: "-12%",
        transform: "translateY(-50%)",
        height: "100vh",
        width: "60vw"
      }}
    >
      {/* Column 1 — scrolls up */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex flex-col gap-5"
          style={{ animation: "scroll-up 34s linear infinite" }}
        >
          {[...cards, ...cards].map((_, i) => (
            <div key={i} className="h-[780px] shrink-0 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-[10px]" />
          ))}
        </div>
      </div>

      {/* Column 2 — scrolls down */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex flex-col gap-5"
          style={{ animation: "scroll-down 34s linear infinite" }}
        >
          {[...cards, ...cards].map((_, i) => (
            <div key={i} className="h-[780px] shrink-0 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-[10px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingCards() {
  const cards: { width: number; height: number; top: string; left?: string; right?: string; duration: string; delay: string }[] = [
    { width: 260, height: 400, top: "18%", left: "5%", duration: "7s", delay: "0s" },
    { width: 260, height: 400, top: "55%", right: "8%", duration: "8s", delay: "1s" },
    { width: 260, height: 400, top: "65%", left: "35%", duration: "9s", delay: "2s" },
    { width: 260, height: 400, top: "14%", right: "22%", duration: "7.5s", delay: "0.5s" },
  ];

  return (
    <>
      {cards.map((card, i) => (
        <div
          key={i}
          className="absolute z-[1] rounded-[8px] border border-white/15 bg-white/5 backdrop-blur-sm"
          style={{
            width: card.width,
            height: card.height,
            top: card.top,
            left: card.left,
            right: card.right,
            animation: `float ${card.duration} ease-in-out ${card.delay} infinite`,
            scale: 1.5,
          }}
        />
      ))}
    </>
  );
}

function LogoMarquee() {
  const doubled = [...BRAND_NAMES, ...BRAND_NAMES];

  return (
    <div className="relative w-full overflow-hidden py-12">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />

      <div
        className="flex items-center gap-16 whitespace-nowrap"
        style={{ animation: "marquee 30s linear infinite" }}
      >
        {doubled.map((name, i) => (
          <span
            key={i}
            className="flex-shrink-0 text-white/30 text-lg font-medium tracking-[0.2em]"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedStatValue({
  value,
  suffix,
  start,
}: {
  value: number;
  suffix: string;
  start: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!start) {
      setDisplayValue(0);
      return;
    }

    const controls = animate(0, value, {
      duration: STEPPED_ANIMATION_DURATION,
      ease: STEPPED_ANIMATION_EASE,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });

    return () => controls.stop();
  }, [start, value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

export default function LandingPage() {
  const monetizeSectionRef = useRef<HTMLElement>(null);
  const steppedMaskSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: monetizeScrollProgress } = useScroll({
    target: monetizeSectionRef,
    offset: ["start end", "end start"],
  });
  const cardsParallaxY = useTransform(monetizeScrollProgress, [0, 1], [120, -240]);
  const steppedMaskInView = useInView(steppedMaskSectionRef, { once: true, amount: 0.35 });
  const stackedTextTargetWidths = ["25vw", "45vw", "65vw", "87vw"];
  const steppedStats = [
    { label: "Higher ROI", value: 10, suffix: "x" },
    { label: "More Engagement", value: 40, suffix: "%" },
    { label: "More Conversions", value: 25, suffix: "%" },
    { label: "Session Time", value: 5, suffix: "x" },
  ];

  return (
    <main>
      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative z-[2] min-h-screen overflow-hidden">
        {/* Shader background */}
        <ShaderCanvas
          params={LANDING_PARAMS}
          className="absolute inset-0 w-full h-full"
        />

        {/* Dark gradient overlay — fades from bottom-right */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to top left, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)",
          }}
        />

        {/* Content layer */}
        <div className="relative z-10 min-h-screen flex flex-col px-8 md:px-12 lg:px-[50px] py-[50px]">
          {/* Logo — top left */}
          <LyvecomLogo />

          {/* Headline + CTA — vertically centered, left side */}
          <div className="flex-1 flex flex-col h-full justify-end gap-10 max-w-3xl mb-12">
            <h1
              className="text-5xl md:text-7xl lg:text-[120px] xl:text-[160px] font-regular leading-[0.95] tracking-tight mb-10"
              style={gradientTextStyle}
            >
              Make and monetize content people love.
            </h1>

            <MagneticButton>
              Get Started Today
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10H16M16 10L11 5M16 10L11 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </MagneticButton>
          </div>
        </div>

        {/* Card grid — right side, partially off-screen */}
        <CardGrid />
      </section>

      <div className="relative">
        <WaterShaderCanvas
          params={LANDING_WATER_PARAMS}
          className="fixed inset-0 z-0 h-screen w-screen pointer-events-none"
        />

        {/* ─── Social Proof + Content Section ───────────────────────────── */}
        <section className="relative z-[1] py-24 px-8 md:px-12 lg:px-[50px]">
          {/* "Trusted by" heading */}
          <p className="text-center text-2xl font-regular mb-4" style={gradientTextStyle}>
            Trusted by brands you know and love
          </p>

          {/* Scrolling logo marquee */}
          <LogoMarquee />

          {/* Main content block */}
          <div className="w-full mx-auto mt-24">
            <h2
              className="text-5xl md:text-7xl lg:text-[120px] xl:text-[160px] font-regular leading-[0.95] tracking-tight mb-8 pb-12"
              style={gradientTextStyle}
            >
              Your content is fire,<br/> let&apos;s bring it to life
            </h2>

            <p className="text-2xl md:text-2xl lg:text-2xl font-light text-white/70 w-1/5 ml-160">
            Engage your audience the way they&apos;re accustomed, but with an endless scroll of your video content sparking discovery and conversions.
            </p>
          </div>
        </section>

        {/* ─── Monetize Section ───────────────────────────────────────── */}
        <section
          ref={monetizeSectionRef}
          className="relative z-[1] py-40 px-8 md:px-12 lg:px-[50px] overflow-hidden min-h-[100vh] flex items-center justify-center"
        >
          <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ y: cardsParallaxY }}>
            <FloatingCards />
          </motion.div>
          <h2
            className="relative z-[0] text-center text-5xl md:text-7xl lg:text-[110px] xl:text-[110px] font-regular leading-[0.95] tracking-tight"
            style={gradientTextStyle}
          >
            Monetize your content<br />on your terms
          </h2>
        </section>

        <section ref={steppedMaskSectionRef} className="relative z-[1] pb-24">
          <div className="relative h-[60vh] w-full">
            <motion.div
              className="h-full w-full bg-[#708797]"
              initial={{
                clipPath:
                  "polygon(20% 0%, 100% 0%, 100% 100%, 20% 100%, 20% 75%, 20% 75%, 20% 50%, 20% 50%, 20% 25%, 20% 25%)",
              }}
              animate={{
                clipPath:
                  steppedMaskInView
                    ? "polygon(25% 0%, 100% 0%, 100% 100%, 87% 100%, 87% 75%, 65% 75%, 65% 50%, 45% 50%, 45% 25%, 25% 25%)"
                    : "polygon(20% 0%, 100% 0%, 100% 100%, 20% 100%, 20% 75%, 20% 75%, 20% 50%, 20% 50%, 20% 25%, 20% 25%)",
              }}
              transition={{ duration: STEPPED_ANIMATION_DURATION, ease: STEPPED_ANIMATION_EASE }}
            />
            <div className="absolute inset-0 z-[2] pointer-events-none flex flex-col">
              {stackedTextTargetWidths.map((targetWidth, i) => (
                <motion.div
                  key={i}
                  className="h-1/4 flex items-end justify-end pr-10 md:pr-14 lg:pr-20"
                  initial={{ width: "20vw" }}
                  animate={{ width: steppedMaskInView ? targetWidth : "20vw" }}
                  transition={{ duration: STEPPED_ANIMATION_DURATION, ease: STEPPED_ANIMATION_EASE }}
                >
                  <div className="flex w-full items-end gap-4 md:gap-6">
                    <motion.div
                      className="h-px flex-1 bg-white/15 mb-2 md:mb-3 origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: steppedMaskInView ? 1 : 0 }}
                      transition={{ duration: STEPPED_ANIMATION_DURATION, ease: STEPPED_ANIMATION_EASE }}
                    />
                    <div className="flex flex-col gap-6">
                      <p className="text-white/90 text-xl md:text-3xl leading-none">
                        {steppedStats[i].label}
                      </p>
                      <p className="text-white text-7xl md:text-9xl leading-[0.9] tracking-tight">
                        <AnimatedStatValue
                          value={steppedStats[i].value}
                          suffix={steppedStats[i].suffix}
                          start={steppedMaskInView}
                        />
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
