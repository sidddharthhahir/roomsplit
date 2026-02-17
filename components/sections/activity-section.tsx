'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { formatCents } from '@/lib/format';
import { Activity, Receipt, RefreshCw, UserPlus, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityLog {
  id: string;
  type: string;
  metadata: any;
  createdAt: string;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'expense_added': 
      return (
        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        </div>
      );
    case 'settlement_recorded': 
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
      );
    case 'recurring_generated': 
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
      );
    case 'member_joined': 
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      );
    default: 
      return (
        <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
          <Activity className="w-4 h-4 text-[var(--muted-foreground)]" />
        </div>
      );
  }
}

function getActivityText(log: ActivityLog): string {
  const m = log.metadata ?? {};
  switch (log.type) {
    case 'expense_added':
      return `${m.addedBy ?? 'Someone'} added "${m.description ?? 'expense'}" for ${formatCents(m.amountCents ?? 0)} (paid by ${m.paidBy ?? 'unknown'})`;
    case 'settlement_recorded':
      return `${m.from ?? 'Someone'} paid ${formatCents(m.amountCents ?? 0)} to ${m.to ?? 'someone'} (recorded by ${m.recordedBy ?? 'unknown'})`;
    case 'recurring_generated':
      return `Recurring "${m.name ?? 'expense'}" generated for ${m.month ?? 'unknown month'} - ${formatCents(m.amountCents ?? 0)}`;
    case 'member_joined':
      return `${m.displayName ?? 'Someone'} joined the group`;
    default:
      return 'Activity logged';
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivitySection() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity?limit=50');
      const data = await res.json();
      setLogs(data?.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[var(--border)] shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="font-semibold text-[var(--foreground)]">Activity Feed</h2>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {logs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="flex items-start gap-3 px-6 py-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                {getActivityIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)]">{getActivityText(log)}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{formatRelativeTime(log.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
