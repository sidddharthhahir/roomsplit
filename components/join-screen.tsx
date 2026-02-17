'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Wallet, KeyRound, User, Sun, Moon, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useTheme } from './theme-provider';

interface JoinScreenProps {
  onJoin: () => void;
}

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [step, setStep] = useState<'code' | 'name' | 'admin'>('code');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      toast.error('Please enter the admin password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword.trim() })
      });
      if (res.ok) {
        toast.success('Welcome back, Admin!');
        onJoin();
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Admin login failed');
      }
    } catch {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    setStep('name');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), displayName: displayName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Welcome, ${displayName}!`);
        onJoin();
      } else {
        toast.error(data?.error ?? 'Failed to join');
      }
    } catch {
      toast.error('Join failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#5bc5a7] dark:bg-[#2a2a2a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-white">
          <Wallet className="w-7 h-7" />
          <span className="font-bold text-xl">RoomSplit</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-white" />
          ) : (
            <Moon className="w-5 h-5 text-white" />
          )}
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          {/* Welcome text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 'code' ? 'Welcome!' : step === 'admin' ? 'Admin Login' : 'Almost there!'}
            </h1>
            <p className="text-white/80 text-sm">
              {step === 'code' 
                ? 'Enter your invite code to join the group' 
                : step === 'admin'
                ? 'Enter your admin password to continue'
                : 'Enter your name to get started'}
            </p>
          </div>

          <Card className="bg-white dark:bg-[var(--card)] shadow-xl border-0">
            <CardContent className="p-6">
              {step === 'code' ? (
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Invite Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter code"
                        className="pl-11 h-12"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#5bc5a7] hover:bg-[#4ab396] text-white h-12 text-base font-medium"
                  >
                    Continue
                  </Button>

                  <div className="relative py-3">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[var(--border)]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-[var(--card)] px-2 text-[var(--muted-foreground)]">or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('admin')}
                    disabled={loading}
                    className="w-full h-12"
                  >
                    Admin Login
                  </Button>
                </form>
              ) : step === 'admin' ? (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Admin Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter password"
                        className="pl-11 pr-11 h-12"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#5bc5a7] hover:bg-[#4ab396] text-white h-12 text-base font-medium"
                  >
                    {loading ? 'Logging in...' : 'Login as Admin'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('code');
                      setAdminPassword('');
                    }}
                    className="w-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] py-2"
                  >
                    ← Back
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your name"
                        className="pl-11 h-12"
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#5bc5a7] hover:bg-[#4ab396] text-white h-12 text-base font-medium"
                  >
                    {loading ? 'Joining...' : 'Join Group'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep('code')}
                    className="w-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] py-2"
                  >
                    ← Back
                  </button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-white/60 text-xs mt-6">
            Split bills fairly with your roommates
          </p>
        </motion.div>
      </div>
    </div>
  );
}