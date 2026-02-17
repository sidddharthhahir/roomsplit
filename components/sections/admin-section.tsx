'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, RefreshCw, Copy, Check, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface InviteCode {
  id: string;
  code: string;
  forMemberName: string | null;
  used: boolean;
}

export function AdminSection() {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchInviteCodes = async () => {
    try {
      const res = await fetch('/api/admin/invite-codes');
      const data = await res.json();
      setInviteCodes(data?.codes ?? []);
    } catch {
      toast.error('Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const handleRegenerate = async (codeId: string) => {
    setRegenerating(codeId);
    try {
      const res = await fetch(`/api/admin/invite-codes/${codeId}/regenerate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data?.error ?? 'Failed to regenerate');
        return;
      }
      toast.success('Code regenerated');
      fetchInviteCodes();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRegenerating(null);
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600">
        <CardContent className="py-6 px-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              <p className="text-white/80 text-sm">Manage invite codes for your roommates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Codes */}
      <Card className="border-[var(--border)] shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)]">Invite Codes</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {inviteCodes.map((invite, idx) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center font-semibold text-sm text-[var(--muted-foreground)]">
                    {(invite.forMemberName ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {invite.forMemberName ?? 'Unknown Member'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="font-mono text-sm bg-[var(--muted)] px-2 py-0.5 rounded text-[var(--foreground)]">
                        {invite.code}
                      </code>
                      {invite.used ? (
                        <Badge variant="success" className="text-xs">Joined</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!invite.used && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(invite.code)}
                        className="w-9 h-9 p-0"
                      >
                        {copiedCode === invite.code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-[var(--muted-foreground)]" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(invite.id)}
                        disabled={regenerating === invite.id}
                        className="w-9 h-9 p-0"
                      >
                        {regenerating === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-[var(--muted-foreground)]" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
