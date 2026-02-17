'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useMembers } from '@/lib/hooks/use-members';
import { useBalances } from '@/lib/hooks/use-balances';
import { formatCents, parseCentsFromEuros, formatMonth } from '@/lib/format';
import { ArrowRight, Plus, RefreshCw, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Settlement {
  id: string;
  fromMember: { id: string; displayName: string };
  toMember: { id: string; displayName: string };
  amountCents: number;
  createdAt: string;
  month: string;
}

interface SettlementsSectionProps {
  month: string;
  onMonthChange: (month: string) => void;
  userId: string;
  onRefresh: () => void;
}

function MonthSelector({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const changeMonth = (delta: number) => {
    const [year, mon] = month.split('-').map(Number);
    let newMonth = mon + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    onChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-2 bg-[var(--muted)]/50 rounded-xl px-2 py-1">
      <button 
        onClick={() => changeMonth(-1)} 
        className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-[var(--muted-foreground)]" />
      </button>
      <span className="text-sm font-medium min-w-[120px] text-center text-[var(--foreground)]">
        {formatMonth(month)}
      </span>
      <button 
        onClick={() => changeMonth(1)} 
        className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
      </button>
    </div>
  );
}

export function SettlementsSection({ month, onMonthChange, userId, onRefresh }: SettlementsSectionProps) {
  const { members } = useMembers();
  const { balances, refetch: refetchBalances } = useBalances();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Settlement | null>(null);

  // Form state
  const [fromMemberId, setFromMemberId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSettlements();
  }, [month]);

  // Get members who owe money (negative balance)
  const debtors = balances.filter(b => b.netBalance < 0);
  const creditors = balances.filter(b => b.netBalance > 0);

  useEffect(() => {
    if (debtors.length > 0 && !fromMemberId) {
      setFromMemberId(debtors[0]?.memberId ?? '');
    }
    if (creditors.length > 0 && !toMemberId) {
      setToMemberId(creditors[0]?.memberId ?? '');
    }
  }, [debtors, creditors, fromMemberId, toMemberId]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settlements?month=${month}`);
      const data = await res.json();
      setSettlements(data?.settlements ?? []);
    } catch {
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromMemberId || !toMemberId || !amount) {
      toast.error('Please fill all fields');
      return;
    }

    if (fromMemberId === toMemberId) {
      toast.error('Cannot settle with yourself');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId,
          toMemberId,
          amountCents,
          month
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to record settlement');
      }

      toast.success('Settlement recorded');
      setAddOpen(false);
      setAmount('');
      fetchSettlements();
      refetchBalances();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (settlement: Settlement) => {
    setFromMemberId(settlement.fromMember?.id ?? '');
    setToMemberId(settlement.toMember?.id ?? '');
    setAmount((settlement.amountCents / 100).toFixed(2));
    setEditOpen(settlement);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOpen || !fromMemberId || !toMemberId || !amount) {
      toast.error('Please fill all fields');
      return;
    }

    if (fromMemberId === toMemberId) {
      toast.error('Cannot settle with yourself');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/settlements/${editOpen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId,
          toMemberId,
          amountCents
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to update settlement');
      }

      toast.success('Settlement updated');
      setEditOpen(null);
      setAmount('');
      fetchSettlements();
      refetchBalances();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this settlement?')) return;
    try {
      await fetch(`/api/settlements/${id}`, { method: 'DELETE' });
      toast.success('Settlement deleted');
      fetchSettlements();
      refetchBalances();
      onRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const selectedDebtor = balances.find(b => b.memberId === fromMemberId);
  const maxAmount = selectedDebtor ? Math.abs(selectedDebtor.netBalance) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MonthSelector month={month} onChange={onMonthChange} />
        <Button onClick={() => setAddOpen(true)} size="sm" disabled={debtors.length === 0}>
          <Plus className="w-4 h-4 mr-1" /> Record Settlement
        </Button>
      </div>

      {/* Settlements List */}
      <Card className="border-[var(--border)] shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)]">Settlements</h2>
            <Badge variant="secondary">{settlements.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No settlements for this month</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {settlements.map((settlement, idx) => (
                <motion.div
                  key={settlement.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {settlement.fromMember?.displayName ?? 'Unknown'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {settlement.toMember?.displayName ?? 'Unknown'}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="font-bold text-lg text-[var(--foreground)]">
                      {formatCents(settlement.amountCents)}
                    </span>
                    <button
                      onClick={() => openEditModal(settlement)}
                      className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[var(--muted-foreground)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(settlement.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--muted-foreground)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Settlement Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Record Settlement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Who paid?"
            value={fromMemberId}
            onChange={(value) => setFromMemberId(value)}
            options={debtors.map(d => ({
              value: d.memberId,
              label: `${d.displayName} (owes ${formatCents(Math.abs(d.netBalance))})`
            }))}
          />
          <Select
            label="Paid to?"
            value={toMemberId}
            onChange={(value) => setToMemberId(value)}
            options={creditors.map(c => ({
              value: c.memberId,
              label: `${c.displayName} (owed ${formatCents(c.netBalance)})`
            }))}
          />
          <Input
            label={`Amount (\u20ac) - Max: ${formatCents(maxAmount)}`}
            type="number"
            step="0.01"
            min="0.01"
            max={(maxAmount / 100).toFixed(2)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Record Settlement
          </Button>
        </form>
      </Dialog>

      {/* Edit Settlement Dialog */}
      <Dialog open={!!editOpen} onClose={() => { setEditOpen(null); setAmount(''); }} title="Edit Settlement">
        <form onSubmit={handleEdit} className="space-y-4">
          <Select
            label="Who paid?"
            value={fromMemberId}
            onChange={(value) => setFromMemberId(value)}
            options={members.map(m => ({
              value: m.id,
              label: m.displayName
            }))}
          />
          <Select
            label="Paid to?"
            value={toMemberId}
            onChange={(value) => setToMemberId(value)}
            options={members.map(m => ({
              value: m.id,
              label: m.displayName
            }))}
          />
          <Input
            label="Amount (€)"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Update Settlement
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
