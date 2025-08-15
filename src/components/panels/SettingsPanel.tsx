'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebaseDb';
import { deactivateAccount } from '@/lib/ops';

type Props = { wsId: string; onClose: () => void };

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'sepia', label: 'Sepia' },
];

export default function SettingsPanel({ wsId, onClose }: Props) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Theme (localStorage + ThemeListener)
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch {
      return 'light';
    }
  });

  function applyTheme(next: string) {
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: next } }));
    } catch {}
  }

  // Display name (client-only preview; keep basic for now)
  const currentUser = auth.currentUser;
  const [displayName, setDisplayName] = useState<string>(currentUser?.displayName || '');

  // You can later wire this to Firebase Auth updateProfile if desired
  function saveSettings() {
    // For now: only theme is persisted (localStorage). Display name is UI only.
    onClose();
  }

  const panelRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Backdrop (click to close) */}
      <div
        className="pointer-events-auto fixed inset-0 bg-black/40"
        aria-hidden="true"
        onClick={(e) => {
          // Only close if the actual backdrop is clicked
          if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* Sliding panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="pointer-events-auto fixed right-0 top-0 h-full w-[min(760px,90vw)] bg-white shadow-xl border-l border-neutral-200 flex flex-col"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h2 className="text-sm font-medium tracking-wide uppercase text-neutral-700">
            Settings
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              className="rounded-md px-3 py-1.5 border border-neutral-800 text-neutral-900 hover:bg-neutral-100"
            >
              Save
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Account */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-3">
              Account
            </div>

            <div className="grid gap-4">
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-xs text-neutral-600 mb-1"
                >
                  Display name
                </label>
                <input
                  id="display-name"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.currentTarget.value)}
                  placeholder="Your name"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-300"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  (Optional) Only used inside the app UI.
                </p>
              </div>

              <div>
                <label className="block text-xs text-neutral-600 mb-1">Signed in</label>
                <div className="rounded-md border border-neutral-200 px-3 py-2 text-[13px] bg-neutral-50">
                  {currentUser?.email || currentUser?.uid || 'Unknown'}
                </div>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-3">
              Appearance
            </div>
            <fieldset className="grid sm:grid-cols-3 gap-3" aria-label="Theme">
              {THEMES.map((t) => (
                <label
                  key={t.id}
                  htmlFor={`theme-${t.id}`}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-[13px] ${
                    theme === t.id
                      ? 'border-neutral-900 bg-neutral-100'
                      : 'border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    id={`theme-${t.id}`}
                    name="theme"
                    type="radio"
                    value={t.id}
                    checked={theme === t.id}
                    onChange={() => applyTheme(t.id)}
                    className="mr-2 align-middle"
                  />
                  {t.label}
                </label>
              ))}
            </fieldset>
          </section>

          {/* Danger zone */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-3">
              Danger zone
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-4 space-y-3">
              <p className="text-[13px] text-red-800">
                Deactivate account removes all workspaces you own and leaves any you
                don’t own. Your profile document is deleted and you’ll be signed out.
                You can sign back in later and you’ll get a fresh, empty workspace.
              </p>
              <button
                onClick={async () => {
                  const ok = confirm(
                    'Deactivate your account now? This deletes your data. You can sign in later to start fresh.'
                  );
                  if (!ok) return;
                  try {
                    await deactivateAccount();
                  } catch (e) {
                    alert((e as Error)?.message || 'Deactivate failed.');
                  }
                }}
                className="rounded-md px-3 py-2 border border-red-600 text-red-700 hover:bg-red-100"
              >
                Deactivate account
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

