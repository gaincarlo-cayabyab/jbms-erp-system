import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";
import { Store, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Authentication | JAPA Global — Enterprise Operations",
  description: "Sign in to access JAPA Global — Enterprise Operations Workspace & POS Terminal.",
};

function LoginLoading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm animate-pulse bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-slate-100" />
        <div className="mx-auto h-5 w-40 rounded bg-slate-100" />
        <div className="mt-6 space-y-3">
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-indigo-100" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      {/* Preload video so it's buffered before auth */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <link
        rel="preload"
        href="/assets/video/JAPA_loading_animation.mp4"
        as="video"
        type="video/mp4"
      />

      {/* Full viewport — no scroll, entire page fits in screen on tablet & POS */}
      <div className="h-screen w-full flex flex-col lg:flex-row bg-[#faf9f5] text-stone-900 overflow-hidden select-none">

        {/* ── Left Visual Panel: 3D Print in Motion Animation ───────── */}
        <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 h-full bg-[#f1f0e9] relative overflow-hidden select-none border-r border-[#dedfd6]">
          {/* Top Logo Overlay - Compact and neatly positioned */}
          <div className="absolute top-4 left-6 z-20 pointer-events-none">
            <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-[#dedfd6] shadow-xs">
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden bg-white shadow-2xs border border-[#dedfd6] p-0.5 shrink-0">
                <Image
                  src="/assets/images/JAPA_logo.jpg"
                  alt="JAPA Global Logo"
                  width={32}
                  height={32}
                  className="rounded-lg object-contain w-full h-full"
                  priority
                  unoptimized
                />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black tracking-tight text-stone-900 block leading-tight">
                  JAPA Global
                </span>
                <span className="text-[9px] text-stone-500 font-bold tracking-wide block leading-tight">
                  Enterprise Operations Workspace
                </span>
              </div>
            </div>
          </div>

          {/* 3D Interactive Crafting Studio iframe */}
          <div className="w-full h-full relative z-10">
            <iframe
              src="/print-animation/index.html?embed=1"
              title="JAPA Global 3D Print &amp; Apparel Crafting Studio"
              className="w-full h-full border-0 block"
              style={{ minHeight: '520px' }}
            />
          </div>

          {/* Bottom Footer Overlay */}
          <div className="absolute bottom-3 left-6 right-6 z-20 flex items-center justify-between text-xs pointer-events-none">
            <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#dedfd6] text-[11px] font-medium text-stone-600 shadow-2xs">
              &copy; 2026 JAPA Global Trading
            </span>
            <div className="flex items-center gap-1.5 font-bold bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#dedfd6] text-[11px] text-emerald-800 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              <span>Dagupan &amp; Manila Nodes</span>
            </div>
          </div>
        </div>

        {/* ── Right Auth Panel: Warm studio cream tone matching the beige ──────────── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#faf9f5] relative">
          {/* Subtle warm ambient glows */}
          <div className="absolute top-1/6 right-1/4 w-96 h-96 bg-amber-100/35 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/6 left-1/4 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

          {/* Centered container — fits in viewport on tablet/POS without scroll */}
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 lg:p-6 overflow-hidden">

            {/* Main Auth Card — Wider, Taller, Large Touch Targets for POS & Tablet */}
            <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl min-h-[480px] sm:min-h-[550px] max-h-[94vh] bg-white/95 backdrop-blur-md border border-[#dedfd6] rounded-3xl shadow-2xl shadow-stone-900/5 relative z-10 flex flex-col justify-between">

              {/* Card Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#ecebe4] shrink-0">
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white shadow-2xs border border-[#dedfd6] p-0.5 shrink-0">
                  <Image
                    src="/assets/images/JAPA_logo.jpg"
                    alt="JAPA Global Logo"
                    width={40}
                    height={40}
                    className="rounded-lg object-contain w-full h-full"
                    priority
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900 leading-tight">
                    JAPA Global
                  </h2>
                  <p className="text-[11px] sm:text-xs font-semibold text-stone-500 leading-tight">
                    Enterprise Operations
                  </p>
                </div>
                {/* Branch status pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-bold shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>DAG &amp; MNL</span>
                </div>
              </div>

              {/* Form Body — zero scroll, comfortable touch layout */}
              <div className="px-6 py-4 sm:py-5 overflow-y-auto flex-1 flex flex-col justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <LoginForm />
              </div>
            </div>
          </div>

          {/* Security Footer — pinned to bottom right corner */}
          <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 z-20 pointer-events-none">
            <p className="text-[10px] sm:text-[11px] text-stone-500 font-semibold inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#dedfd6] shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Encrypted Session &bull; Enterprise Role-Based Access Control</span>
            </p>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
