'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { JoinScreen } from './join-screen';
import { Dashboard } from './dashboard';
import { Loader2 } from 'lucide-react';

export function AppWrapper() {
  const { user, loading, logout, refetch } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    return <JoinScreen onJoin={refetch} />;
  }

  return <Dashboard user={user} onLogout={logout} />;
}