'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useMembers } from '@/lib/hooks/use-members';
import { formatCents, parseCentsFromEuros, formatMonth } from '@/lib/format';
import { Plus, RefreshCw, Play, Pause, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface RecurringExpense {
  id: string;
  name: string;
  amountCents: number;
  splitConfig: { type: string; shares?: Record<string, number> };
  active: boolean;
  lastGeneratedMonth: string | null;
  expenses: { id: string; month: string }[];
}

interface RecurringSectionProps {
  isAdmin: boolean;
  onRefresh: () => void;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function RecurringSection({ isAdmin, onRefresh }: RecurringSectionProps) {
  const { members } = useMembers();
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Generate form
  const [generateMonth, setGenerateMonth] = useState(getCurrentMonth());
  const [generatePaidBy, setGeneratePaidBy] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRecurring();
  }, []);

  useEffect(() => {
    if (members.length > 0 && !generatePaidBy) {
      setGeneratePaidBy(members[0]?.id ?? '');
    }
  }, [members, generatePaidBy]);

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recurring');
      const data = await res.json();
      setRecurring(data?.recurring ?? []);
    } catch {
      setRecurring([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      toast.error('Please fill all fields');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    let splitConfig: any;
    if (splitType === 'equal') {
      splitConfig = { type: 'equal' };
    } else {
      const shares: Record<string, number> = {};
      let total = 0;
      for (const m of members) {
        const val = parseCentsFromEuros(customSplits[m.id] || '0');
        shares[m.id] = val;
        total += val;
      }
      if (total !== amountCents) {
        toast.error(`Split total (\u20ac${(total/100).toFixed(2)}) must equal amount (\u20ac${(amountCents/100).toFixed(2)})`);
        return;
      }
      splitConfig = { type: 'custom', shares };
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), amountCents, splitConfig })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to create');
      }

      toast.success('Recurring expense created');
      setAddOpen(false);
      setName('');
      setAmount('');
      setSplitType('equal');
      setCustomSplits({});
      fetchRecurring();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateOpen || !generateMonth || !generatePaidBy) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/recurring/${generateOpen}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: generateMonth, paidById: generatePaidBy })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to generate');
      }

      toast.success('Expense generated for ' + formatMonth(generateMonth));
      setGenerateOpen(null);
      fetchRecurring();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring/${id}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle');
      toast.success('Status updated');
      fetchRecurring();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Create Recurring
        </Button>
      </div>

      <Card className="border-[var(--border)] shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)]">Recurring Expenses</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : recurring.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No recurring expenses set up</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recurring.map((rec, idx) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="px-6 py-5 hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--foreground)]">{rec.name}</p>
                        <Badge variant={rec.active ? 'success' : 'secondary'}>
                          {rec.active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                        {formatCents(rec.amountCents)}
                        <span className="text-sm text-[var(--muted-foreground)] font-normal ml-2">
                          ({rec.splitConfig?.type === 'equal' ? 'Equal split' : 'Custom split'})
                        </span>
                      </p>
                      {rec.lastGeneratedMonth && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          Last generated: {formatMonth(rec.lastGeneratedMonth)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(rec.id)}
                        title={rec.active ? 'Pause' : 'Resume'}
                        className="w-9 h-9 p-0"
                      >
                        {rec.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      {rec.active && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setGenerateOpen(rec.id)}
                        >
                          <Calendar className="w-4 h-4 mr-1" /> Generate
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Create Recurring Expense" className="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Monthly Rent"
            required
          />
          <Input
            label="Amount (\u20ac)"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Split Type</label>
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant={splitType === 'equal' ? 'default' : 'secondary'}
                onClick={() => setSplitType('equal')}
              >
                Equal
              </Button>
              <Button
                type="button"
                size="sm"
                variant={splitType === 'custom' ? 'default' : 'secondary'}
                onClick={() => setSplitType('custom')}
              >
                Custom
              </Button>
            </div>
            {splitType === 'custom' && (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-sm text-[var(--foreground)] w-24">{m.displayName}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customSplits[m.id] ?? ''}
                      onChange={(e) => setCustomSplits(prev => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            Create
          </Button>
        </form>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={!!generateOpen} onClose={() => setGenerateOpen(null)} title="Generate Monthly Expense">
        <div className="space-y-4">
          <Input
            label="Month"
            type="month"
            value={generateMonth}
            onChange={(e) => setGenerateMonth(e.target.value)}
          />
          <Select
            label="Paid By"
            value={generatePaidBy}
            onChange={(value) => setGeneratePaidBy(value)}
            options={members.map(m => ({ value: m.id, label: m.displayName }))}
          />
          <Button onClick={handleGenerate} className="w-full" loading={generating}>
            Generate Expense
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
