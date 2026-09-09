'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

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
          {/* Hamburger Trigger & Brand Name on the Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <span className="font-bold text-slate-100 text-base tracking-tight">LifeOS</span>
          </div>

          {/* Google Sync Indicator / Profile indicator on the Right */}
          <div className="flex items-center gap-2">
            {isGoogleConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Google Calendar Synced"></span>
            )}
            {userEmail && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
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
