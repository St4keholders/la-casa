'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { dishes } from '@/lib/dishes';
import type { CartLine, Step } from '@/lib/types';

type CartApi = {
  lines: CartLine[];
  units: number;
  total: number;
  add: (id: number) => void;
  bump: (id: number, delta: 1 | -1) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  step: Step;
  setStep: (s: Step) => void;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpenRaw] = useState(false);
  const [step, setStep] = useState<Step>(1);

  const units = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const total = useMemo(
    () => lines.reduce((s, l) => s + dishes[l.id].price * l.qty, 0),
    [lines]
  );

  const add = useCallback((id: number) => {
    setLines(prev => {
      const l = prev.find(x => x.id === id);
      if (l) return prev.map(x => x.id === id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { id, qty: 1 }];
    });
  }, []);

  const bump = useCallback((id: number, delta: 1 | -1) => {
    setLines(prev => {
      const l = prev.find(x => x.id === id);
      if (!l) return prev;
      if (l.qty + delta <= 0) return prev.filter(x => x.id !== id);
      return prev.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x);
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const setOpen = useCallback((v: boolean) => {
    setOpenRaw(v);
    if (!v) setStep(1);
  }, []);

  // body.locked
  useEffect(() => {
    document.body.classList.toggle('locked', open);
    return () => { document.body.classList.remove('locked'); };
  }, [open]);

  // Escape closes cart
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  return (
    <CartContext.Provider value={{ lines, units, total, add, bump, clear, open, setOpen, step, setStep }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
