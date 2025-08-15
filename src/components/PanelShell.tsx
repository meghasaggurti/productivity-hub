'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  title: string;
  children: React.ReactNode;
  width?: number;          // panel width in px
  footer?: React.ReactNode;
  onClose?: () => void;    // NEW: optional custom close handler
};

export default function PanelShell({
  title,
  children,
  width = 560,
  footer,
  onClose,
}: Props) {
  const router = useRouter();

  const close = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      router.back();
    }
  };

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={close}
      />

      {/* Panel */}
      <aside
        className="absolute right-0 top-0 h-full bg-[var(--card)] text-[var(--text)]
                   shadow-2xl border-l border-black/10
                   rounded-none md:rounded-l-2xl overflow-hidden
                   flex flex-col"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3
                        border-b border-black/10 bg-[color-mix(in_oklab,var(--card)_90%,black_10%)]/40">
          <h2 className="text-sm font-medium tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-md px-2 py-1 text-xs border border-black/10
                       hover:bg-black/5 active:bg-black/10"
          >
            Cancel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-black/10 bg-[color-mix(in_oklab,var(--card)_92%,black_8%)]/40">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

