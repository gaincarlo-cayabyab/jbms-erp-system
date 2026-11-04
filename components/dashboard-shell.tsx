'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import { Menu, X, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: slide-over */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden text-sm font-semibold text-zinc-700 lg:block">
            JAPA Core ERP System
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              className="relative rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

