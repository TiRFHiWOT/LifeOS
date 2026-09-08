'use client';

import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

interface NavbarProps {
  userEmail?: string;
  isGoogleConnected?: boolean;
}

export default function Navbar({ userEmail, isGoogleConnected }: NavbarProps) {
  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#090d16]/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & AI Status Badge */}
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl blur opacity-50 group-hover:opacity-80 transition duration-300"></div>
            <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-white/20 flex items-center justify-center font-extrabold text-white text-base shadow-inner">
              <span className="bg-gradient-to-tr from-indigo-400 to-emerald-300 bg-clip-text text-transparent">L</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base tracking-tight">{APP_NAME}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.0 AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">{APP_DESCRIPTION}</p>
          </div>
        </div>

        {/* Status Indicators & User Controls */}
        <div className="flex items-center gap-3">
          {/* Calendar Status */}
          {isGoogleConnected ? (
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Google Calendar</span> Synced
            </div>
          ) : (
            <a
              href="/api/google/auth"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-medium transition-all duration-200 shadow-sm hover:border-slate-600"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Connect Calendar
            </a>
          )}

          {/* User Profile / Auth */}
          {userEmail && (
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold flex items-center justify-center shadow-md">
                  {userInitial}
                </div>
                <span className="text-xs text-slate-300 font-medium hidden lg:inline max-w-[150px] truncate">
                  {userEmail}
                </span>
              </div>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-slate-300 border border-slate-700/80 transition-all duration-200"
                >
                  Sign Out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
