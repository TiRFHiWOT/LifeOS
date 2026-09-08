'use client';

import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

interface NavbarProps {
  userEmail?: string;
  isGoogleConnected?: boolean;
}

export default function Navbar({ userEmail, isGoogleConnected }: NavbarProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
          L
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-base leading-none tracking-tight">{APP_NAME}</h1>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{APP_DESCRIPTION}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isGoogleConnected ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Google Calendar Synced
          </span>
        ) : (
          <a
            href="/api/google/auth"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition"
          >
            Connect Google Calendar
          </a>
        )}

        {userEmail && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <span className="text-xs text-slate-300 font-medium hidden md:inline">{userEmail}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                Sign Out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
