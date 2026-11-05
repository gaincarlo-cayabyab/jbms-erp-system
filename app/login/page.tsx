import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | JAPA Core ERP",
  description: "Sign in to access JAPA Core ERP — Enterprise Management System.",
};

function LoginLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md animate-pulse glass-panel p-8 sm:p-10 rounded-2xl shadow-modern">
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
      <div className="min-h-screen w-full flex bg-slate-50 text-slate-900">
        {/* Left Branding Panel */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-500 p-12 text-white relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-grid-overlay pointer-events-none" />

          <div className="z-10">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/images/JAPA_logo.jpg"
                alt="JAPA Core Logo"
                width={48}
                height={48}
                className="rounded-xl shadow-lg border border-white/20 object-cover"
                priority
              />
              <span className="text-2xl font-bold tracking-tight">JAPA Core ERP</span>
            </div>
          </div>

          <div className="z-10 max-w-md space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight">
              Next-Gen Operations Management System
            </h1>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Streamlining inventory, sales orders, production queues, and financial records in one centralized workspace.
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

        {/* Right Login Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-8 glass-panel p-8 sm:p-10 rounded-2xl shadow-modern">
            <div className="text-center">
              <div className="lg:hidden flex justify-center mb-4">
                <Image
                  src="/assets/images/JAPA_logo.jpg"
                  alt="JAPA Logo"
                  width={56}
                  height={56}
                  className="rounded-xl shadow-md object-cover"
                  priority
                />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
              <p className="text-sm text-slate-600 mt-1">
                Sign in with your email and password to access the system
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
