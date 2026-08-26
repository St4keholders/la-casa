'use client';

import { useEffect, useRef, useState } from 'react';
import { G } from '@/lib/garnishes';
import type { GarnishKey } from '@/lib/types';

interface GarnishesProps {
  garnish: GarnishKey[];
}

const IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;

export default function Garnishes({ garnish }: GarnishesProps) {
  const [svgs, setSvgs] = useState<string[]>(Array(6).fill(''));
  const [visible, setVisible] = useState<boolean[]>(Array(6).fill(false));
  const mounted = useRef(false);
  const prevGarnish = useRef<GarnishKey[]>(garnish);

  useEffect(() => {
    if (!mounted.current) {
      // First mount — just show with current garnish
      mounted.current = true;
      setSvgs(garnish.map(k => G[k] ?? ''));
      setVisible(Array(6).fill(true));
      prevGarnish.current = garnish;
      return;
    }

    if (prevGarnish.current === garnish) return;
    prevGarnish.current = garnish;

    // Fade out, swap SVG, fade in
    setVisible(Array(6).fill(false));
    const t = setTimeout(() => {
      setSvgs(garnish.map(k => G[k] ?? ''));
      setVisible(Array(6).fill(true));
    }, 110);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garnish]);

  return (
    <>
      {IDS.map((id, i) => (
        <div
          key={id}
          className={`garnish ${id}${visible[i] ? ' on' : ''}`}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: svgs[i] }}
        />
      ))}
    </>
  );
}
