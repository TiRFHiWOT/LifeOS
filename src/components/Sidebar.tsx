'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LifeOSLogo from '@/components/LifeOSLogo';
import { Home, Calendar, CheckSquare, FileText, Bell, X, LogOut, Globe } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  isGoogleConnected?: boolean;
}

export default function Sidebar({ isOpen, onClose, userEmail, isGoogleConnected }: SidebarProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Notes', href: '/notes', icon: FileText },
    { label: 'Reminders', href: '/reminders', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-white/10 p-6 flex flex-col justify-between h-full z-10 shadow-2xl transition-transform duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <LifeOSLogo size={30} className="w-8 h-8" />
              <span className="font-bold text-lg text-slate-100 tracking-tight">LifeOS</span>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          {/* Google Calendar Sync status */}
          <div className="px-2">
            {isGoogleConnected ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Calendar Synced</span>
              </div>
            ) : (
              <a
                href="/api/google/auth"
                className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition"
              >
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Connect Google Calendar</span>
              </a>
            )}
          </div>

          {userEmail && (
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="min-w-0 pr-2">
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
