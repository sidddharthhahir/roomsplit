'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 p-1 rounded-xl bg-[var(--muted)]/50', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            activeTab === tab.id
              ? 'text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-[var(--card)] rounded-lg shadow-sm"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
