import React from 'react';
import CardSwap, { Card } from '@/components/ui/CardSwap';

const AuthShowcase = () => {
  return (
    <div className="group hidden lg:flex w-1/2 items-center justify-center p-12 relative overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-black to-slate-950 opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_45%)] mix-blend-screen opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-halftone opacity-15 pointer-events-none" />

      <div className="relative flex w-full max-w-5xl items-start gap-12">
        <div className="w-full max-w-sm space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">OpsNest</p>
        </div>

        <div className="relative w-[520px] h-[520px] flex flex-col items-center">
          <CardSwap
            width={360}
            height={460}
            cardDistance={64}
            verticalDistance={76}
            delay={5200}
            pauseOnHover
            swapOnClick
            className="relative flex h-full w-full items-center justify-center perspective-[1100px] overflow-visible"
          >
            <Card
              className="border-white/15 bg-gradient-to-b from-slate-900 via-black to-slate-950 text-white shadow-2xl shadow-black/50 backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-500 ease-out opacity-90 grayscale group-hover:grayscale-0 group-hover:opacity-100 hover:-translate-y-3 hover:rotate-1 hover:scale-[1.02]"
              style={{ width: 360, height: 460 }}
            >
              <div className="flex items-center justify-between text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  Smooth
                </span>
                <span className="text-white/60">Customizable</span>
              </div>
              <div className="space-y-4">
                <div className="text-7xl font-black text-white/90 drop-shadow-lg">3</div>
                <p className="text-white/80 text-lg leading-relaxed">
                  Card stacks have never looked so good. Just look at it go!
                </p>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Live environments</div>
            </Card>

            <Card
              className="border-white/15 bg-gradient-to-b from-slate-800 via-slate-950 to-black text-white shadow-2xl shadow-black/45 backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-500 ease-out opacity-90 grayscale group-hover:grayscale-0 group-hover:opacity-100 hover:-translate-y-3 hover:rotate-1 hover:scale-[1.02]"
              style={{ width: 360, height: 460 }}
            >
              <div className="flex items-center justify-between text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  Elastic
                </span>
                <span className="text-white/60">GSAP powered</span>
              </div>
              <div className="space-y-4">
                <div className="text-7xl font-black text-white/90 drop-shadow-lg">2</div>
                <p className="text-white/80 text-lg leading-relaxed">
                  Delightful motion that swaps, drops, and returns with physics-like timing.
                </p>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Responsive ready</div>
            </Card>

            <Card
              className="border-white/15 bg-gradient-to-b from-slate-900 via-black to-slate-950 text-white shadow-2xl shadow-black/45 backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-500 ease-out opacity-90 grayscale group-hover:grayscale-0 group-hover:opacity-100 hover:-translate-y-3 hover:rotate-1 hover:scale-[1.02]"
              style={{ width: 360, height: 460 }}
            >
              <div className="flex items-center justify-between text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  Stacked
                </span>
                <span className="text-white/60">Depth &amp; skew</span>
              </div>
              <div className="space-y-4">
                <div className="text-7xl font-black text-white/90 drop-shadow-lg">1</div>
                <p className="text-white/80 text-lg leading-relaxed">
                  Communicate confidence with layered cards, crisp borders, and subtle skew.
                </p>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Ops ready</div>
            </Card>
          </CardSwap>
        </div>

        <div className="absolute inset-x-0 -bottom-20 flex justify-center pointer-events-none z-30">
          <div className="grid w-full max-w-[520px] grid-cols-2 gap-3 text-xs font-semibold tracking-[0.2em] text-slate-100/90">
            {['Live previews', 'Polished mono', 'Hover pause', 'Built with gsap'].map((text) => (
              <div
                key={text}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-center"
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShowcase;

