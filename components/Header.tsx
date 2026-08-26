'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const { units, setOpen } = useCart();
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Pulso del badge al cambiar units
  useEffect(() => {
    if (units === 0) return;
    const badge = badgeRef.current;
    if (!badge) return;
    badge.classList.remove('pulse');
    void badge.offsetWidth; // reflow para reiniciar animación
    badge.classList.add('pulse');
    const t = setTimeout(() => badge.classList.remove('pulse'), 450);
    return () => clearTimeout(t);
  }, [units]);

  return (
    <header className="top">
      <a className="brand" href="#">
        <span className="bowl" aria-hidden="true" />
        La casa
      </a>
      <nav className="nav" aria-label="Principal">
        <a href="#menu" className="is-key">Ver el menú</a>
      </nav>
      <div className="status">
        <i aria-hidden="true" />
        <span>Entregas sábado y domingo</span>
      </div>
      <button
        className="cart-btn"
        id="openCart"
        aria-label="Ver tu pedido"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <path d="M3 6h18"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        Pedido{' '}
        <span className="badge" ref={badgeRef}>{units}</span>
      </button>
    </header>
  );
}
