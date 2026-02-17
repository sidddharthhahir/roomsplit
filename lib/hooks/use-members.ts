'use client';

import { useState, useEffect, useCallback } from 'react';

interface Member {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data?.members ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}