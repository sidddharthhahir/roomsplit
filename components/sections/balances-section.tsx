'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useBalances } from '@/lib/hooks/use-balances';
import { formatCents } from '@/lib/format';
import { Wallet, TrendingUp, TrendingDown, Sparkles, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface BalancesSectionProps {
  userId: string;
  onRefresh: () => void;
}

interface Suggestion {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
}

export function BalancesSection({ userId, onRefresh }: BalancesSectionProps) {
  const { balances, loading } = useBalances();
  const [smartSettleOpen, setSmartSettleOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const myBalance = balances.find(b => b.memberId === userId);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/smart-settle');
      const data = await res.json();
      setSuggestions(data?.suggestions ?? []);
    } catch {
      toast.error('Failed to compute settlements');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSmartSettle = () => {
    setSmartSettleOpen(true);
    fetchSuggestions();
  };

  const allSettled = balances.every(b => Math.abs(b.netBalance) < 1);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Balance Card */}
      {myBalance && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`overflow-hidden border-0 shadow-lg ${
            myBalance.netBalance >= 0 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
              : 'bg-gradient-to-br from-rose-500 to-red-600'
          }`}>
            <CardContent className="py-8 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1 font-medium">Your Balance</p>
                  <p className="text-4xl font-bold text-white">
                    {myBalance.netBalance >= 0 ? '+' : ''}{formatCents(myBalance.netBalance)}
                  </p>
                  <p className="text-sm text-white/80 mt-2">
                    {myBalance.netBalance > 0 
                      ? '✨ You are owed this amount'
                      : myBalance.netBalance < 0 
                        ? '💸 You owe this amount'
                        : '🎉 All settled up!'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
                  {myBalance.netBalance >= 0 
                    ? <TrendingUp className="w-10 h-10 text-white" />
                    : <TrendingDown className="w-10 h-10 text-white" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Smart Settle Button */}
      {!allSettled && (
        <Button 
          onClick={handleSmartSettle} 
          className="w-full h-14 text-base bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25" 
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Settle Smartly
        </Button>
      )}

      {allSettled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardContent className="py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">All Settled!</p>
                <p className="text-sm text-green-600/70 dark:text-green-400/70">Everyone is even. No payments needed.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All Members Balances */}
      <Card className="border-[var(--border)] shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)]">All Balances</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {balances.map((balance, idx) => (
              <motion.div
                key={balance.memberId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    balance.netBalance > 0 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : balance.netBalance < 0 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}>
                    {balance.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {balance.displayName}
                      {balance.memberId === userId && (
                        <span className="text-xs text-teal-600 dark:text-teal-400 ml-2 font-normal">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Paid: {formatCents(balance.totalPaid)} • Share: {formatCents(balance.totalShare)}
                    </p>
                  </div>
                </div>
                <span className={`font-bold text-lg ${
                  balance.netBalance > 0 ? 'text-green-600 dark:text-green-400' : 
                  balance.netBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--muted-foreground)]'
                }`}>
                  {balance.netBalance > 0 ? '+' : ''}{formatCents(balance.netBalance)}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Settle Dialog */}
      <Dialog open={smartSettleOpen} onClose={() => setSmartSettleOpen(false)} title="Smart Settle" className="max-w-md">
        {loadingSuggestions ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-[var(--muted-foreground)]">Everyone is settled up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Minimum transactions to settle all debts:
            </p>
            <div className="space-y-3">
              {suggestions.map((s, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-[var(--muted)]/50 rounded-xl"
                >
                  <span className="font-medium text-red-600 dark:text-red-400">{s.fromName}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span className="font-medium text-green-600 dark:text-green-400">{s.toName}</span>
                  <span className="ml-auto font-bold text-lg">{formatCents(s.amountCents)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
