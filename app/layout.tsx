import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import AutoFullscreenManager from "@/components/ui/auto-fullscreen";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { AuthProvider } from "@/lib/auth-context";
import { BranchProvider } from "@/lib/branch-context";
import { DeviceProvider } from "@/lib/device-context";
import { ModeSelectionModal } from "@/components/ui/mode-selection-modal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: {
    default: "JAPA Core ERP — Enterprise Management System",
    template: "%s | JAPA Core ERP",
  },
  description:
    "Enterprise Resource Planning System for JAPA Global Trading — Multi-store CRM, 7-Stage Production, Inventory, Financials & Payroll",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JAPA Core ERP",
  },
  icons: {
    icon: [
      { url: "/assets/images/JAPA_favicon.ico", sizes: "any" },
      { url: "/assets/images/JAPA_favicon.png", type: "image/png" },
    ],
    shortcut: "/assets/images/JAPA_favicon.png",
    apple: "/assets/images/JAPA_favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} light h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <AutoFullscreenManager />
        <AuthProvider>
          <BranchProvider>
            <DeviceProvider>
              <ConfirmDialogProvider>
                {children}
                <ModeSelectionModal />
              </ConfirmDialogProvider>
            </DeviceProvider>
          </BranchProvider>
        </AuthProvider>
        {/* Global Sonner toast notifications — bottom-right */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast:
                "font-sans text-sm shadow-xl border border-slate-200 rounded-2xl",
            },
          }}
        />
      </body>
    </html>
  );
}
