export interface AgentActivityEntry {
  id: string;
  type: 'plan_created' | 'calendar_checked' | 'proactive_alert' | 'weather_checked' | 'confirmation_requested' | 'item_created';
  title: string;
  details: string;
  timestamp: string;
  status: 'completed' | 'info' | 'warning' | 'alert';
}

const activityLogsMemory: AgentActivityEntry[] = [
  {
    id: 'log-1',
    type: 'plan_created',
    title: 'Multi-Step Plan Executed',
    details: 'Generated 4-step plan for Nairobi trip (Tasks & Reminders scheduled)',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'completed',
  },
  {
    id: 'log-2',
    type: 'weather_checked',
    title: 'Weather Intelligence Checked',
    details: 'Retrieved forecast for outdoor activity: Rainy/Showers expected (65% precip)',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'info',
  },
  {
    id: 'log-3',
    type: 'proactive_alert',
    title: 'Proactive Preparation Alert',
    details: 'Detected upcoming event tomorrow with 2 unfinished preparation tasks',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: 'alert',
  },
];

export function getAgentActivityLogs(): AgentActivityEntry[] {
  return [...activityLogsMemory];
}

export function logAgentActivity(entry: Omit<AgentActivityEntry, 'id' | 'timestamp'>): AgentActivityEntry {
  const newEntry: AgentActivityEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
  };
  activityLogsMemory.unshift(newEntry);
  if (activityLogsMemory.length > 50) {
    activityLogsMemory.pop();
  }
  return newEntry;
}
