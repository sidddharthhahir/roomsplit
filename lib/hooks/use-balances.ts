'use client';

import { useState, useEffect, useCallback } from 'react';

interface Balance {
  memberId: string;
  displayName: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

interface SimplifiedDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
}

export function useBalances() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [simplifyDebts, setSimplifyDebts] = useState(false);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch('/api/balances');
      const data = await res.json();
      setBalances(data?.balances ?? []);
      setSimplifyDebts(data?.simplifyDebts ?? false);
      setSimplifiedDebts(data?.simplifiedDebts ?? []);
    } catch {
      setBalances([]);
      setSimplifyDebts(false);
      setSimplifiedDebts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, simplifyDebts, simplifiedDebts, loading, refetch: fetchBalances };
}