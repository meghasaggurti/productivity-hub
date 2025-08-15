'use client';

import { useEffect } from 'react';

type ThemeChoice = 'light' | 'dark' | 'sepia' | 'system';

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  const classes = ['theme-light', 'theme-dark', 'theme-sepia'];
  classes.forEach((c) => root.classList.remove(c));

  let finalTheme: Exclude<ThemeChoice, 'system'> = 'light';
  if (theme === 'system') {
    finalTheme = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } else {
    finalTheme = theme;
  }

  root.classList.add(`theme-${finalTheme}`);
  root.setAttribute('data-theme', finalTheme);
}

export default function ThemeListener() {
  useEffect(() => {
    // Initial apply
    const stored = (localStorage.getItem('theme') as ThemeChoice | null) ?? 'system';
    applyTheme(stored);

    // React to OS-level changes when using 'system'
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const current = (localStorage.getItem('theme') as ThemeChoice | null) ?? 'system';
      if (current === 'system') applyTheme('system');
    };
    mq.addEventListener?.('change', onChange);

    // Sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const next = (e.newValue as ThemeChoice | null) ?? 'system';
        applyTheme(next);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mq.removeEventListener?.('change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
