'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { formatCents, formatMonth } from '@/lib/format';
import { BarChart3, Users, TrendingUp, Download, ChevronLeft, ChevronRight, Loader2, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Insights {
  month: string;
  totalExpense: number;
  averagePerPerson: number;
  memberStats: {
    memberId: string;
    displayName: string;
    paid: number;
    share: number;
  }[];
  topSpender: {
    memberId: string;
    displayName: string;
    paid: number;
  } | null;
  expenseCount: number;
}

interface InsightsSectionProps {
  month: string;
  onMonthChange: (month: string) => void;
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

export function InsightsSection({ month, onMonthChange }: InsightsSectionProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [month]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/insights?month=${month}`);
      const data = await res.json();
      setInsights(data);
    } catch {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });

      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-12 text-[var(--muted-foreground)]">
        Failed to load insights
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MonthSelector month={month} onChange={onMonthChange} />
        <Button onClick={handleExportPdf} variant="secondary" size="sm" loading={exporting}>
          <Download className="w-4 h-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-cyan-600">
            <CardContent className="py-5 px-4">
              <BarChart3 className="w-7 h-7 text-white/80 mb-3" />
              <p className="text-xs text-white/70 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCents(insights.totalExpense)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <CardContent className="py-5 px-4">
              <Users className="w-7 h-7 text-white/80 mb-3" />
              <p className="text-xs text-white/70 font-medium">Avg per Person</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCents(insights.averagePerPerson)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <CardContent className="py-5 px-4">
              <TrendingUp className="w-7 h-7 text-white/80 mb-3" />
              <p className="text-xs text-white/70 font-medium">Expense Count</p>
              <p className="text-2xl font-bold text-white mt-1">{insights.expenseCount}</p>
            </CardContent>
          </Card>
        </motion.div>

        {insights.topSpender && insights.topSpender.paid > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-400 to-amber-500">
              <CardContent className="py-5 px-4">
                <Crown className="w-7 h-7 text-white/80 mb-3" />
                <p className="text-xs text-white/70 font-medium">Top Spender</p>
                <p className="text-xl font-bold text-white mt-1">{insights.topSpender.displayName}</p>
                <p className="text-xs text-white/80">{formatCents(insights.topSpender.paid)}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Member Breakdown */}
      <Card className="border-[var(--border)] shadow-md">
        <CardContent className="py-5">
          <h3 className="font-semibold mb-5 text-[var(--foreground)]">Member Breakdown</h3>
          <div className="space-y-5">
            {(insights.memberStats ?? []).map((stat, idx) => (
              <motion.div
                key={stat.memberId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center font-semibold text-xs text-[var(--muted-foreground)]">
                      {stat.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-[var(--foreground)]">{stat.displayName}</span>
                  </div>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Paid: {formatCents(stat.paid)} • Share: {formatCents(stat.share)}
                  </span>
                </div>
                <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.totalExpense > 0 ? (stat.paid / insights.totalExpense) * 100 : 0}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
