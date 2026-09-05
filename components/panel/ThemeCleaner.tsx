'use client';

import { useEffect } from 'react';

export default function ThemeCleaner() {
  useEffect(() => {
    const r = document.documentElement.style;
    r.removeProperty('--bg');
    r.removeProperty('--ink');
    r.removeProperty('--accent');
    r.removeProperty('--accent-ink');
  }, []);

  return null;
}
