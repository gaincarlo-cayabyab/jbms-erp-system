import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";
import { Store, ShieldCheck, CheckCircle2 } from "lucide-react";

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

      {/* Full viewport — no scroll */}
      <div className="h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-900 overflow-hidden">

        {/* ── Left Branding Panel (desktop/wide tablet only) ─────────── */}
        <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-900 p-10 xl:p-14 text-white relative overflow-hidden select-none">
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-grid-overlay pointer-events-none" />

          {/* Top Logo */}
          <div className="z-10">
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white shadow-md border border-white/30 p-1.5 shrink-0">
                <Image
                  src="/assets/images/JAPA_logo.jpg"
                  alt="JAPA Global Logo"
                  width={56}
                  height={56}
                  className="rounded-xl object-contain w-full h-full"
                  priority
                  unoptimized
                />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white block">
                  JAPA Global
                </span>
                <span className="text-xs text-indigo-200 font-semibold tracking-wide">
                  Enterprise Operations Workspace
                </span>
              </div>
            </div>
          </div>

          {/* Central Hero */}
          <div className="z-10 max-w-lg space-y-5 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-indigo-100 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Branch POS & Production Terminal</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
              Unified Point of Sale &amp; Operational ERP
            </h1>

            <p className="text-indigo-100/90 text-sm xl:text-base leading-relaxed">
              Fast, touch-optimized multi-user authentication designed for retail cashiers,
              warehouse inventory auditors, and 7-stage custom apparel line operators.
            </p>

            <div className="space-y-3 pt-1">
              {[
                'Quick 4-Digit Role & PIN POS Cashier sign-in',
                'Multi-Store Inventory & Real-Time Stock Auditing',
                'Live 7-Stage Apparel & Sublimation Production Queue',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-sm text-indigo-100">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="z-10 flex items-center justify-between text-xs text-indigo-200/80 border-t border-white/10 pt-4">
            <span>© 2026 JAPA Global Trading</span>
            <div className="flex items-center gap-1.5 font-medium">
              <Store className="h-3.5 w-3.5 text-emerald-400" />
              <span>Dagupan & Manila Nodes</span>
            </div>
          </div>
        </div>

        {/* ── Right Auth Panel ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
          {/* Ambient blobs */}
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

          {/* Scrollable inner — only the form card scrolls if needed */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Main white card */}
            <div className="w-full max-w-md xl:max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-sm relative z-10">

              {/* Card Header */}
              <div className="text-center space-y-2 px-5 pt-5 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm border border-slate-200 p-1 shrink-0">
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
                  <div className="text-left">
                    <h2 className="text-base font-black tracking-tight text-slate-900 leading-tight">
                      JAPA Global
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Enterprise Operations
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Dagupan Main Store &amp; Manila Operations</span>
                </div>
              </div>

              {/* Form Body */}
              <div className="px-5 py-4">
                <LoginForm />
              </div>
            </div>

            {/* Security Footer */}
            <div className="pt-3 text-center z-10">
              <p className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Encrypted Session • Enterprise Role-Based Access Control</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
