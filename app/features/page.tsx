import { AdInsightsPlayer } from "../components/AdInsightsPlayer";

export default function FeaturesPage() {
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

        {/* Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Card 1 — Data-Driven Insights */}
          <div className="col-span-1 flex flex-col gap-[22px] max-w-lg">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden aspect-[3/4] mb-4">
              <AdInsightsPlayer />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-white text-2xl font-extralight">
                Data-Driven Insights
              </h3>
              <p className="text-white/50 text-base leading-relaxed">
                Gain deep insights into user behavior across your video commerce
                ecosystem
              </p>
            </div>
          </div>

          {/* Card 2 — Get paid in days */}
          <div className="col-span-1 flex flex-col gap-[22px] max-w-lg">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 flex flex-col justify-center items-center aspect-[3/4] mb-4">
              {/* Payout notification */}
              <div className="bg-[#111] rounded-xl p-3.5 border border-white/[0.04] flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 12L8 4L12 8"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40">
                    12 Jan 2026 | 09:00 am
                  </p>
                  <p className="text-xs text-white font-medium">
                    Payout Credited
                  </p>
                </div>
                <span className="text-[#4ade80] text-sm font-semibold whitespace-nowrap">
                  +$274.54
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-white text-2xl font-extralight">
                Get paid in days, not weeks
              </h3>
              <p className="text-white/50 text-base leading-relaxed">
                Payouts from LYVECOM will let your business and cash flow run
                non-stop
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
