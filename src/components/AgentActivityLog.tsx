'use client';

import { Activity, Sparkles, CheckCircle, AlertTriangle, CloudRain, ShieldAlert, Calendar } from 'lucide-react';
import { AgentActivityEntry } from '@/services/agentActivityLog';

interface AgentActivityLogProps {
  activities: AgentActivityEntry[];
}

export default function AgentActivityLog({ activities }: AgentActivityLogProps) {
  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
          <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>Agent Activity Timeline</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
          {activities.length} Events
        </span>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {activities.map((act) => {
          const Icon =
            act.type === 'plan_created'
              ? Sparkles
              : act.type === 'weather_checked'
              ? CloudRain
              : act.type === 'proactive_alert'
              ? AlertTriangle
              : act.type === 'confirmation_requested'
              ? ShieldAlert
              : act.type === 'calendar_checked'
              ? Calendar
              : CheckCircle;

          const badgeClass =
            act.status === 'completed'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : act.status === 'alert'
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : act.status === 'warning'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';

          const formattedTime = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={act.id} className="bg-slate-950/70 p-3 rounded-xl border border-white/5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <p className="font-semibold text-slate-200">{act.title}</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full border uppercase ${badgeClass}`}>
                    {act.status}
                  </span>
                  <span className="text-slate-500">{formattedTime}</span>
                </div>
              </div>
              <p className="text-slate-400 pl-7 text-[11px] leading-relaxed">{act.details}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
