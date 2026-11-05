import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";
import { FullscreenToggle } from "@/components/ui/auto-fullscreen";

export const metadata: Metadata = {
  title: "Sign In | JAPA Core ERP",
  description: "Sign in to access JAPA Core ERP — Enterprise Management System.",
};

function LoginLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md animate-pulse bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-xl">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-200" />
        <div className="mx-auto h-6 w-48 rounded bg-slate-200" />
        <div className="mt-8 space-y-4">
          <div className="h-10 rounded-xl bg-slate-100" />
          <div className="h-10 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-indigo-100" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-100 text-slate-900 relative">
        {/* Floating Kiosk / Fullscreen Toggle */}
        <div className="absolute top-4 right-4 z-30">
          <FullscreenToggle className="bg-white shadow-sm border-slate-200" />
        </div>
        {/* Left Branding Panel */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-500 p-12 text-white relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-grid-overlay pointer-events-none" />

          <div className="z-10">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white shadow-lg border border-white/20 p-1">
                <Image
                  src="/assets/images/JAPA_logo.jpg"
                  alt="JAPA Core Logo"
                  width={48}
                  height={48}
                  className="rounded-lg object-contain w-full h-full"
                  priority
                  unoptimized
                />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-white block">
                  JAPA Core ERP
                </span>
                <span className="text-xs text-indigo-100 font-medium">
                  Enterprise Operations Workspace
                </span>
              </div>
            </div>
          </div>

          <div className="z-10 max-w-md space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight">
              Next-Gen Operations Management System
            </h1>
            <p className="text-indigo-100 text-base leading-relaxed">
              Streamlining multi-store retail, inventory, sales orders, 7-stage production queues, and financial records in one centralized workspace.
            </p>
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">✓</span>
                Multi-Store Inventory & Real-Time Stock Tracking
              </div>
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">✓</span>
                7-Stage Customized Apparel & Sublimation Pipeline
              </div>
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">✓</span>
                Automated Payroll, Cash Flow & Financial Analytics
              </div>
            </div>
          </div>

          <div className="z-10 text-xs text-indigo-200">
            © 2026 JAPA Global Trading. All rights reserved.
          </div>
        </div>

        {/* Right Login Form Container — Polished light background with contrast */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 relative">
          {/* Subtle background glow accents for depth */}
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />

          {/* Elevated Crisp White Card */}
          <div className="w-full max-w-md space-y-6 bg-white border border-slate-200/90 p-8 sm:p-10 rounded-2xl shadow-xl relative z-10">
            <div className="text-center">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center justify-center gap-3 mb-5">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white shadow-md border border-slate-200 p-1">
                  <Image
                    src="/assets/images/JAPA_logo.jpg"
                    alt="JAPA Logo"
                    width={48}
                    height={48}
                    className="rounded-lg object-contain w-full h-full"
                    priority
                    unoptimized
                  />
                </div>
                <div className="text-left">
                  <span className="text-xl font-bold tracking-tight text-slate-900 block">
                    JAPA Core ERP
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Operations Portal
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                Sign In to Your Account
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your credentials to access the ERP management console
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
