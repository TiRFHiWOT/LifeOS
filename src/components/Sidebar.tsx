'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LifeOSLogo from '@/components/LifeOSLogo';
import { Home, Calendar, CheckSquare, FileText, Bell, X, LogOut, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  isGoogleConnected?: boolean;
}

export default function Sidebar({ isOpen, onClose, userEmail, isGoogleConnected }: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    onClose();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Notes', href: '/notes', icon: FileText },
    { label: 'Reminders', href: '/reminders', icon: Bell },
  ];

  const handleSignOut = async () => {
    onClose();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-50 flex p-3 sm:p-4 pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Floating Sidebar Card */}
      <div className="relative w-72 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-6 flex flex-col justify-between h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] z-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] shadow-indigo-950/30 transition-all duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Link 
              href="/" 
              onClick={onClose} 
              className="flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer group"
            >
              <LifeOSLogo size={30} className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-lg text-slate-100 tracking-tight">LifeOS</span>
            </Link>
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
          {/* Only show Connect Google Calendar button if not connected */}
          {!isGoogleConnected && (
            <div className="px-2">
              <button
                onClick={handleConnectGoogle}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-300 font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition cursor-pointer"
              >
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Connect Google Calendar</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2 pt-2">
            <div className="min-w-0 pr-2">
              <p className="text-xs text-slate-400 truncate">{userEmail || 'Signed in'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
