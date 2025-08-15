'use client';

import * as React from 'react';

export function PanelSection({
  title,
  subtitle,
  children,
  dense,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-black/10 bg-[var(--card)]
                  shadow-sm ${dense ? 'p-3' : 'p-5'} space-y-4`}
    >
      <header className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Buttons (neutral + outline + danger, none are black) */
const base =
  'inline-flex items-center justify-center rounded-md text-sm h-9 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 disabled:pointer-events-none';

export function Btn({
  kind = 'neutral',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'neutral' | 'outline' | 'danger' }) {
  let styles = '';
  if (kind === 'neutral') styles = 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300';
  if (kind === 'outline') styles = 'bg-[var(--card)] text-neutral-900 border border-neutral-300 hover:bg-neutral-50';
  if (kind === 'danger') styles = 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100';
  return <button {...props} className={`${base} ${styles} ${className}`} />;
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium opacity-80">{children}</span>;
}

export function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-xs border
        ${active ? 'bg-neutral-900/5 border-neutral-400' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'}`}
    >
      {children}
    </button>
  );
}

export function Divider() {
  return <div className="h-px bg-black/10" />;
}
