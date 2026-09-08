'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
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
      <Link className="brand" href="/">
        <span className="bowl" aria-hidden="true" />
        La casa
      </Link>
      <Link
        href="/entrar"
        id="loginBtn"
        className="header-login-btn"
        aria-label="Iniciar sesión para acceder al panel"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--accent-ink)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--ink) 6%, transparent)';
          e.currentTarget.style.color = 'var(--ink)';
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ink) 35%, transparent)';
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          textDecoration: 'none',
          padding: '0.45rem 0.9rem',
          borderRadius: '999px',
          border: '1.5px solid color-mix(in srgb, var(--ink) 35%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--ink) 6%, transparent)',
          transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          width={14}
          height={14}
          aria-hidden="true"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Iniciar sesión</span>
      </Link>
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
