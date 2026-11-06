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

      {/* Full viewport — no scroll, entire page fits in screen */}
      <div className="h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-900 overflow-hidden">

        {/* ── Left Visual Panel: 3D Print in Motion Animation ───────── */}
        <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 h-full bg-[#f1f0e9] relative overflow-hidden select-none border-r border-slate-200">
          {/* Top Logo Overlay */}
          <div className="absolute top-6 left-8 z-20">
            <div className="flex items-center gap-3 bg-white/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-white shadow-2xs border border-slate-200 p-0.5 shrink-0">
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
                <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
                  JAPA Global
                </span>
                <span className="text-[10px] text-slate-500 font-bold tracking-wide block leading-tight">
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
              style={{ minHeight: '560px' }}
            />
          </div>

          {/* Bottom Footer Overlay */}
          <div className="absolute bottom-4 left-8 right-8 z-20 flex items-center justify-between text-xs pointer-events-none">
            <span className="bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 text-[11px] font-medium text-slate-600 shadow-2xs">
              &copy; 2026 JAPA Global Trading
            </span>
            <div className="flex items-center gap-1.5 font-bold bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 text-[11px] text-emerald-700 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              <span>Dagupan &amp; Manila Nodes</span>
            </div>
          </div>
        </div>

        {/* ── Right Auth Panel ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
          {/* Ambient blobs */}
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

          {/* Centered container — fits in viewport, card scrolls internally if needed */}
          <div className="flex-1 flex flex-col items-center justify-center px-3 py-2 sm:px-5 sm:py-4 overflow-hidden">

            {/* Main white card — compact header + scrollable body */}
            <div className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-sm relative z-10 flex flex-col max-h-[92vh]">

              {/* Card Header — compact single row */}
              <div className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 border-b border-slate-100 shrink-0">
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden bg-white shadow-sm border border-slate-200 p-0.5 shrink-0">
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
                <div className="flex-1 min-w-0">
                  <h2 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-tight">
                    JAPA Global
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 leading-tight">
                    Enterprise Operations
                  </p>
                </div>
                {/* Branch status pill — right aligned */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>DAG &amp; MNL</span>
                </div>
              </div>

              {/* Form Body — zero scroll, snug fit */}
              <div className="px-3.5 sm:px-4 py-2.5 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <LoginForm />
              </div>
            </div>
          </div>

          {/* Security Footer — pinned to bottom right corner */}
          <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 z-20 pointer-events-none">
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200/90 shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Encrypted Session &bull; Enterprise Role-Based Access Control</span>
            </p>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
