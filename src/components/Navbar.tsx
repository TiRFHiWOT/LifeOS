'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import LifeOSLogo from '@/components/LifeOSLogo';
import { Menu, Calendar } from 'lucide-react';

interface NavbarProps {
  userEmail?: string;
  isGoogleConnected?: boolean;
}

export default function Navbar({ userEmail, isGoogleConnected }: NavbarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#090d16]/90 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          {/* Hamburger Trigger & Brand Logo on the Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <LifeOSLogo size={28} className="w-7 h-7" />
              <span className="font-bold text-slate-100 text-base tracking-tight">LifeOS</span>
            </div>
          </div>

          {/* Google Sync Indicator / Profile indicator on the Right */}
          <div className="flex items-center gap-3">
            {isGoogleConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendar Synced</span>
              </span>
            ) : (
              <a
                href="/api/google/auth"
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-full transition"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Connect Calendar</span>
              </a>
            )}

            {userEmail && (
              <div 
                className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm"
                title={userEmail}
              >
                {userEmail[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-over Drawer Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userEmail={userEmail}
        isGoogleConnected={isGoogleConnected}
      />
    </>
  );
}
