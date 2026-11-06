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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl animate-pulse bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-sm">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-slate-100" />
        <div className="mx-auto h-6 w-48 rounded bg-slate-100" />
        <div className="mt-8 space-y-4">
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-indigo-100" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      {/* Preload loading animation video so it buffers before authentication */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <link
        rel="preload"
        href="/assets/video/JAPA_loading_animation.mp4"
        as="video"
        type="video/mp4"
      />

      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-900 relative">
        {/* Left Branding Panel (Hidden on small mobile, visible on desktop & wide tablet) */}
        <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-900 p-10 xl:p-14 text-white relative overflow-hidden select-none">
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-grid-overlay pointer-events-none" />

          {/* Top Logo & Title */}
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

          {/* Central Hero Summary */}
          <div className="z-10 max-w-lg space-y-5 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-indigo-100 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Branch POS & Production Terminal</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
              Unified Point of Sale & Operational ERP
            </h1>

            <p className="text-indigo-100/90 text-sm xl:text-base leading-relaxed">
              Fast, touch-optimized multi-user authentication designed for retail cashiers, warehouse inventory auditors, and 7-stage custom apparel line operators.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Quick 4-Digit Role & PIN POS Cashier sign-in</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Multi-Store Inventory & Real-Time Stock Auditing</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Live 7-Stage Apparel & Sublimation Production Queue</span>
              </div>
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

        {/* Right Authentication Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-10 bg-slate-50 relative overflow-y-auto">
          {/* Subtle Ambient Background Depth */}
          <div className="absolute top-1/6 right-1/4 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/6 left-1/4 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

          {/* Main Elevated Crisp White Card */}
          <div className="w-full max-w-md xl:max-w-lg bg-white border border-slate-200/90 p-6 sm:p-8 rounded-2xl shadow-sm relative z-10 my-auto">
            {/* Header & Branding for Mobile / Tablet */}
            <div className="text-center space-y-3 mb-6">
              {/* Mobile / Tablet Header Logo */}
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200 p-1">
                  <Image
                    src="/assets/images/JAPA_logo.jpg"
                    alt="JAPA Global Logo"
                    width={48}
                    height={48}
                    className="rounded-xl object-contain w-full h-full"
                    priority
                    unoptimized
                  />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                    JAPA Global
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Enterprise Operations
                  </p>
                </div>
              </div>

              {/* Branch & Operational Status Indicator */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Dagupan Main Store & Manila Operations</span>
              </div>
            </div>

            {/* Multi-Step PIN Authentication Form */}
            <LoginForm />
          </div>

          {/* Bottom Security Assurance */}
          <div className="pt-4 text-center z-10">
            <p className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>Encrypted Session • Enterprise Role-Based Access Control</span>
            </p>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
