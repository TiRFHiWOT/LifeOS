export interface AgentActivityEntry {
  id: string;
  type: 'plan_created' | 'calendar_checked' | 'proactive_alert' | 'weather_checked' | 'confirmation_requested' | 'item_created';
  title: string;
  details: string;
  timestamp: string;
  status: 'completed' | 'info' | 'warning' | 'alert';
}

const activityLogsMemory: AgentActivityEntry[] = [];

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
