import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JAPA Global — Enterprise Operations",
    template: "%s | JAPA Global",
  },
  description:
    "JAPA Global Enterprise Operations — Multi-store CRM, 7-Stage Production, Inventory, Financials & Payroll",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC]">
        {children}
        {/* Global Sonner toast notifications — bottom-right */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast:
                "font-sans text-sm shadow-lg border border-zinc-200 rounded-xl",
            },
          }}
        />
      </body>
    </html>
  );
}
