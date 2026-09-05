'use client';

import { useEffect, useRef, useState } from 'react';
import { G } from '@/lib/garnishes';
import type { GarnishKey } from '@/lib/types';

interface GarnishesProps {
  garnish?: GarnishKey[];
  variant?: 'hero' | 'ambiente';
}

const IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
const DEFAULT_AMBIENTE_GARNISH: GarnishKey[] = ['lime', 'arepa', 'aguacate', 'tomate', 'platano', 'cebolla'];

export default function Garnishes({ garnish, variant = 'hero' }: GarnishesProps) {
  const activeGarnish = garnish ?? (variant === 'ambiente' ? DEFAULT_AMBIENTE_GARNISH : []);
  const [svgs, setSvgs] = useState<string[]>(Array(6).fill(''));
  const [visible, setVisible] = useState<boolean[]>(Array(6).fill(false));
  const mounted = useRef(false);
  const prevGarnish = useRef<GarnishKey[]>(activeGarnish);

  useEffect(() => {
    if (!mounted.current) {
      // First mount — just show with current garnish
      mounted.current = true;
      setSvgs(activeGarnish.map(k => G[k] ?? ''));
      setVisible(Array(6).fill(true));
      prevGarnish.current = activeGarnish;
      return;
    }

    if (prevGarnish.current === activeGarnish) return;
    prevGarnish.current = activeGarnish;

    // Fade out, swap SVG, fade in
    setVisible(Array(6).fill(false));
    const t = setTimeout(() => {
      setSvgs(activeGarnish.map(k => G[k] ?? ''));
      setVisible(Array(6).fill(true));
    }, 110);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGarnish]);

  const variantClass = variant === 'ambiente' ? 'garnish-ambiente' : '';

  return (
    <>
      {IDS.map((id, i) => (
        <div
          key={id}
          className={`garnish ${id}${visible[i] ? ' on' : ''} ${variantClass}`}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: svgs[i] }}
        />
      ))}
    </>
  );
}
