'use client';

import { useEffect, useReducer } from 'react';
import Link from 'next/link';
import LifeOSLogo from '@/components/LifeOSLogo';
import { Sparkles, Calendar, CheckSquare, FileText, Bell, ArrowRight } from 'lucide-react';

const DEMO_PROMPTS = [
  'Dentist appointment Friday at 3 PM. Remind me an hour before.',
  'Buy groceries tomorrow morning.',
  'Meeting with the team at 10 AM next Monday.',
  'My WiFi password is GuestNet2026.',
  'Call mum on Sunday afternoon.',
  'Submit the quarterly report by end of week.',
];

type TwState = { text: string; index: number; phase: 'typing' | 'pausing' | 'deleting' };
type TwAction = Partial<TwState>;

function twReducer(s: TwState, a: TwAction): TwState {
  return { ...s, ...a };
}

function useTypewriter(items: string[], typingSpeed = 42, pauseDuration = 2200, deletingSpeed = 18) {
  const [{ text, index, phase }, dispatch] = useReducer(twReducer, {
    text: '',
    index: 0,
    phase: 'typing' as const,
  });

  useEffect(() => {
    const current = items[index];
    let id: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (text.length < current.length) {
        id = setTimeout(() => dispatch({ text: current.slice(0, text.length + 1) }), typingSpeed);
      } else {
        id = setTimeout(() => dispatch({ phase: 'pausing' }), pauseDuration);
      }
    } else if (phase === 'pausing') {
      id = setTimeout(() => dispatch({ phase: 'deleting' }), 200);
    } else {
      if (text.length > 0) {
        id = setTimeout(() => dispatch({ text: text.slice(0, -1) }), deletingSpeed);
      } else {
        id = setTimeout(() => dispatch({ index: (index + 1) % items.length, phase: 'typing' }), 50);
      }
    }

    return () => clearTimeout(id);
  }, [text, phase, index, items, typingSpeed, pauseDuration, deletingSpeed]);

  return text;
}

const FEATURES = [
  {
    icon: Calendar,
    label: 'Calendar Events',
    description: 'Schedule appointments and meetings with natural phrasing. No forms.',
  },
  {
    icon: CheckSquare,
    label: 'Task Tracking',
    description: 'Turn anything into an actionable to-do with automatic due dates.',
  },
  {
    icon: FileText,
    label: 'Personal Notes',
    description: 'Store passwords, facts, and anything you need to remember later.',
  },
  {
    icon: Bell,
    label: 'Smart Reminders',
    description: 'Get notified before events and tasks — automatically calculated.',
  },
];

export default function LandingPage() {
  const typewritten = useTypewriter(DEMO_PROMPTS);

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer group">
          <LifeOSLogo size={32} className="w-8 h-8 group-hover:scale-105 transition-transform" />
          <span className="font-bold text-base tracking-tight text-slate-100">LifeOS</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 max-w-5xl mx-auto w-full text-center">

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8 tracking-wide">
          <Sparkles className="w-3 h-3" />
          Powered by Gemini AI
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08] mb-6 max-w-3xl">
          Your life,{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
            remembered
          </span>
          <br />
          for you.
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-xl mb-12 leading-relaxed">
          Just tell LifeOS what&apos;s on your mind. It turns plain language into tasks,
          events, reminders, and notes — no tapping through forms.
        </p>

        {/* Typewriter Demo */}
        <div className="w-full max-w-xl mb-12">
          <div className="relative bg-white/[0.04] border border-white/[0.09] rounded-2xl px-5 py-4 text-left shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500/60" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
              <span className="ml-2 text-xs text-slate-500 font-mono">lifeos.app</span>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-200 min-h-[2.5rem] leading-relaxed">
                {typewritten}
                <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-medium transition-all"
          >
            Sign in to your account
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {FEATURES.map(({ icon: Icon, label, description }) => (
            <div key={label} className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100 mb-1">{label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-slate-600">LifeOS Personal Assistant</span>
          <span className="text-xs text-slate-700 font-mono">&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
