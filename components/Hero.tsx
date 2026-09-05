'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { Dish } from '@/lib/types';
import { pad } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import Plate from './Plate';
import Ticket from './Ticket';
import Garnishes from './Garnishes';

function offset(i: number, active: number, n: number): string {
  let o = i - active;
  if (o > n / 2) o -= n;
  if (o < -n / 2) o += n;
  return Math.abs(o) <= 2 ? String(o) : 'x';
}

interface HeroProps {
  dishes?: Dish[];
}

export default function Hero({ dishes = [] }: HeroProps) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [ctaText, setCtaText] = useState<'add' | 'done'>('add');
  const { add, open: cartOpen, setDishes } = useCart();
  const wordRef = useRef<HTMLSpanElement>(null);
  const carRef = useRef<HTMLElement>(null);
  const ctaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const pointerX = useRef<number | null>(null);

  // Sync dishes to CartContext
  useEffect(() => {
    if (dishes.length > 0) {
      setDishes(dishes);
    }
  }, [dishes, setDishes]);

  const go = useCallback((next: number, d?: 1 | -1) => {
    if (dishes.length === 0) return;
    const newActive = ((next % dishes.length) + dishes.length) % dishes.length;
    const newDir = d ?? (next > active ? 1 : -1);
    setDir(newDir as 1 | -1);
    setActive(newActive);
  }, [active, dishes.length]);

  // Apply colors to documentElement when active changes
  useEffect(() => {
    if (dishes.length === 0) return;
    const d = dishes[active];
    if (!d) return;
    const r = document.documentElement.style;
    r.setProperty('--bg', d.bg);
    r.setProperty('--ink', d.ink);
    r.setProperty('--accent', d.accent);
    r.setProperty('--accent-ink', d.aink);
  }, [active, dishes]);

  // Update live region
  useEffect(() => {
    if (dishes.length === 0) return;
    const d = dishes[active];
    if (d && liveRef.current) {
      liveRef.current.textContent = `${d.name}, $${d.price.toLocaleString('es-CO')}. Opción ${active + 1} de ${dishes.length}.`;
    }
  }, [active, dishes]);

  // fitWord
  const fitWord = useCallback(() => {
    const w = wordRef.current;
    const c = carRef.current;
    if (!w || !c) return;
    w.style.fontSize = '';
    const caja = c.clientWidth - 12;
    const ancho = w.scrollWidth;
    if (ancho > caja && caja > 0) {
      const fs = parseFloat(getComputedStyle(w).fontSize);
      w.style.fontSize = `${fs * caja / ancho}px`;
    }
  }, []);

  useLayoutEffect(() => {
    fitWord();
  }, [active, fitWord]);

  useEffect(() => {
    let fitT: ReturnType<typeof setTimeout>;
    const handler = () => { clearTimeout(fitT); fitT = setTimeout(fitWord, 120); };
    window.addEventListener('resize', handler);
    return () => { window.removeEventListener('resize', handler); clearTimeout(fitT); };
  }, [fitWord]);

  // Keyboard arrows — only when cart is closed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (cartOpen) return;
      if (e.key === 'ArrowRight') go(active + 1, 1);
      if (e.key === 'ArrowLeft') go(active - 1, -1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, cartOpen, go]);

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent) => { pointerX.current = e.clientX; };
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerX.current === null) return;
    const dx = e.clientX - pointerX.current;
    pointerX.current = null;
    if (Math.abs(dx) > 45) go(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };
  const onPointerCancel = () => { pointerX.current = null; };

  const handleAdd = () => {
    if (dishes.length === 0) return;
    add(active);
    const d = dishes[active];
    if (d && liveRef.current) {
      liveRef.current.textContent = `${d.name} añadido.`;
    }
    setCtaText('done');
    if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
    ctaTimerRef.current = setTimeout(() => setCtaText('add'), 1800);
  };

  // Estado vacío: si getMenu devuelve 0 platos (no hay lote activo)
  if (dishes.length === 0) {
    return (
      <main
        className="stage"
        style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <p className="kicker">La casa · Almuerzos de fin de semana</p>
        <h1
          style={{
            fontFamily: 'var(--display)',
            fontVariationSettings: "'wdth' 108, 'wght' 800",
            fontStyle: 'italic',
            textTransform: 'uppercase',
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            margin: '1.25rem 0',
            color: 'var(--ink, #1B3B2F)',
            lineHeight: 1.1,
          }}
        >
          Esta semana no hay pedidos abiertos
        </h1>
        <p
          style={{
            fontFamily: 'var(--sans)',
            color: 'var(--muted, #6B7C74)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.5,
            fontSize: '1rem',
          }}
        >
          Abrimos la carta cada semana para entregas de sábado y domingo. Vuelve pronto para pedir tu almuerzo del próximo fin de semana.
        </p>
      </main>
    );
  }

  const d = dishes[active] || dishes[0];

  return (
    <main className="stage">
      <p className="kicker">
        Almuerzo del día · {d.kick.toLowerCase()}
      </p>

      <section
        className="carousel"
        id="carousel"
        aria-roledescription="carrusel"
        aria-label="Escoge tu almuerzo"
        ref={carRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="wordmark" aria-hidden="true">
          <span
            className="word swap"
            key={active}
            ref={wordRef}
            style={{ '--from': dir > 0 ? '40px' : '-40px' } as React.CSSProperties}
          >
            {d.word}
          </span>
        </div>

        <Garnishes garnish={d.garnish} />

        <button
          className="arrow prev"
          aria-label="Almuerzo anterior"
          onClick={() => go(active - 1, -1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18L9 12l6-6"/>
          </svg>
        </button>
        <button
          className="arrow next"
          aria-label="Siguiente almuerzo"
          onClick={() => go(active + 1, 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <div id="plates">
          {dishes.map((dish, i) => (
            <Plate
              key={dish.id}
              dish={dish}
              offset={offset(i, active, dishes.length)}
              onActivate={() => go(i)}
            />
          ))}
        </div>
      </section>

      <Ticket dish={d} index={active} />

      <div className="foot">
        <button className="cta" onClick={handleAdd}>
          {ctaText === 'done' ? 'Añadido ✓' : <>Añadir al pedido <span aria-hidden="true">→</span></>}
        </button>
        <p className="aviso">Despachamos solo sábado y domingo</p>
        <a className="link" href="#menu">Ver todo el menú en tarjetas</a>
        <div className="dots" role="tablist" aria-label="Almuerzos disponibles">
          {dishes.map((dish, i) => (
            <button
              key={dish.id}
              className="dot"
              type="button"
              role="tab"
              aria-label={dish.name}
              aria-current={i === active ? 'true' : 'false'}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <span className="counter">{pad(active + 1)} / {pad(dishes.length)}</span>
      </div>

      <p className="sr" aria-live="polite" ref={liveRef} />
    </main>
  );
}
