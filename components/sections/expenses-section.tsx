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
import { Plus, Receipt, Camera, Trash2, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  description: string;
  amountCents: number;
  paidBy: { id: string; displayName: string };
  month: string;
  isRecurring: boolean;
  billPhotoUrl?: string;
  splits: { memberId: string; shareCents: number; member: { displayName: string } }[];
  createdAt: string;
}

interface ExpensesSectionProps {
  month: string;
  onMonthChange: (month: string) => void;
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

export function ExpensesSection({ month, onMonthChange, onRefresh }: ExpensesSectionProps) {
  const { members } = useMembers();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Expense | null>(null);
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [billFile, setBillFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [month]);

  useEffect(() => {
    if (members.length > 0 && !paidById) {
      setPaidById(members[0]?.id ?? '');
    }
  }, [members, paidById]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      setExpenses(data?.expenses ?? []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setPaidById(members[0]?.id ?? '');
    setSplitType('equal');
    setCustomSplits({});
    setBillFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !paidById) {
      toast.error('Please fill all required fields');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    let splits: { memberId: string; shareCents: number }[];
    if (splitType === 'equal') {
      const share = Math.floor(amountCents / members.length);
      const remainder = amountCents - (share * members.length);
      splits = members.map((m, idx) => ({
        memberId: m.id,
        shareCents: share + (idx === 0 ? remainder : 0)
      }));
    } else {
      const customTotal = Object.values(customSplits).reduce((sum, v) => sum + parseCentsFromEuros(v || '0'), 0);
      if (customTotal !== amountCents) {
        toast.error(`Split total (€${(customTotal/100).toFixed(2)}) must equal expense total (€${(amountCents/100).toFixed(2)})`);
        return;
      }
      splits = members.map(m => ({
        memberId: m.id,
        shareCents: parseCentsFromEuros(customSplits[m.id] || '0')
      }));
    }

    setSubmitting(true);
    try {
      let billPhotoUrl, billPhotoPath;

      // Upload bill photo if present
      if (billFile) {
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: billFile.name, contentType: billFile.type })
        });
        const presignedData = await presignedRes.json();

        if (presignedData?.uploadUrl) {
          // Check if content-disposition is in signed headers
          const hasContentDisposition = presignedData.uploadUrl.includes('content-disposition');
          const headers: HeadersInit = { 'Content-Type': billFile.type };
          if (hasContentDisposition) {
            headers['Content-Disposition'] = 'attachment';
          }
          
          await fetch(presignedData.uploadUrl, {
            method: 'PUT',
            headers,
            body: billFile
          });
          billPhotoPath = presignedData.cloud_storage_path;
          // Construct public URL
          billPhotoUrl = `https://cdn.prod.website-files.com/5dd3ac2a77520f09d34aa5b0/67e698e17c69c83e451cb377_6698abcc7a2b9f113e361139_AD_4nXcv4OPUn_Ei4z2E2AyVXYYPTE6UMYDEscY_TbpIWnRXTn7bvgtTkBUmsXvW3007YAVtWhFeawgHDROkcApnWR-QYfdn4v44N1V-coCWOmruKVcqQLbzyP64pgpcAVaZY8buRGgCnFzvqAQsxC0IE9OPgeQ1.png ?? 'storage'}.s3.amazonaws.com/${billPhotoPath}`;
        }
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amountCents,
          paidById,
          month,
          splits,
          billPhotoUrl,
          billPhotoPath
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to add expense');
      }

      toast.success('Expense added');
      setAddOpen(false);
      resetForm();
      fetchExpenses();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      toast.success('Expense deleted');
      fetchExpenses();
      onRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openEditModal = (expense: Expense) => {
    setDescription(expense.description);
    setAmount((expense.amountCents / 100).toFixed(2));
    setPaidById(expense.paidBy?.id ?? '');
    
    // Check if splits are equal
    const allEqual = expense.splits.every((s, _, arr) => s.shareCents === arr[0]?.shareCents);
    if (allEqual && expense.splits.length === members.length) {
      setSplitType('equal');
      setCustomSplits({});
    } else {
      setSplitType('custom');
      const splits: Record<string, string> = {};
      expense.splits.forEach(s => {
        splits[s.memberId] = (s.shareCents / 100).toFixed(2);
      });
      setCustomSplits(splits);
    }
    setEditOpen(expense);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOpen || !description.trim() || !amount || !paidById) {
      toast.error('Please fill all required fields');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    let splits: { memberId: string; shareCents: number }[];
    if (splitType === 'equal') {
      const share = Math.floor(amountCents / members.length);
      const remainder = amountCents - (share * members.length);
      splits = members.map((m, idx) => ({
        memberId: m.id,
        shareCents: share + (idx === 0 ? remainder : 0)
      }));
    } else {
      const customTotal = Object.values(customSplits).reduce((sum, v) => sum + parseCentsFromEuros(v || '0'), 0);
      if (customTotal !== amountCents) {
        toast.error(`Split total (€${(customTotal/100).toFixed(2)}) must equal expense total (€${(amountCents/100).toFixed(2)})`);
        return;
      }
      splits = members.map(m => ({
        memberId: m.id,
        shareCents: parseCentsFromEuros(customSplits[m.id] || '0')
      }));
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${editOpen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amountCents,
          paidById,
          splits
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to update expense');
      }

      toast.success('Expense updated');
      setEditOpen(null);
      resetForm();
      fetchExpenses();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const total = expenses.reduce((sum, e) => sum + (e?.amountCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MonthSelector month={month} onChange={onMonthChange} />
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Total Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-cyan-600">
        <CardContent className="py-5 px-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Total for {formatMonth(month)}</p>
              <p className="text-3xl font-bold text-white mt-1">{formatCents(total)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Receipt className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card className="border-[var(--border)] shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)]">Expenses</h2>
            <Badge variant="secondary">{expenses.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No expenses for this month</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {expenses.map((expense, idx) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="px-6 py-4 hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--foreground)]">{expense.description}</p>
                        {expense.isRecurring && <Badge variant="warning">Recurring</Badge>}
                        {expense.billPhotoUrl && (
                          <button
                            onClick={() => setPhotoOpen(expense.billPhotoUrl ?? null)}
                            className="p-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
                          >
                            <ImageIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Paid by {expense.paidBy?.displayName ?? 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-[var(--foreground)]">{formatCents(expense.amountCents)}</span>
                      {!expense.isRecurring && (
                        <>
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[var(--muted-foreground)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--muted-foreground)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Expense" className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Groceries"
            required
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
          <Select
            label="Paid By"
            value={paidById}
            onChange={(value) => setPaidById(value)}
            options={members.map(m => ({ value: m.id, label: m.displayName }))}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Split</label>
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
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Bill Photo (optional)</label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-teal-500 transition-colors bg-[var(--muted)]/30">
              <Camera className="w-5 h-5 text-[var(--muted-foreground)]" />
              <span className="text-sm text-[var(--muted-foreground)]">
                {billFile ? billFile.name : 'Upload bill photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            Add Expense
          </Button>
        </form>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editOpen} onClose={() => { setEditOpen(null); resetForm(); }} title="Edit Expense" className="max-w-lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Groceries"
            required
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
          <Select
            label="Paid By"
            value={paidById}
            onChange={(value) => setPaidById(value)}
            options={members.map(m => ({ value: m.id, label: m.displayName }))}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Split</label>
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
            Update Expense
          </Button>
        </form>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={!!photoOpen} onClose={() => setPhotoOpen(null)} title="Bill Photo">
        {photoOpen && (
          <img src={photoOpen} alt="Bill" className="w-full rounded-lg" />
        )}
      </Dialog>
    </div>
  );
}