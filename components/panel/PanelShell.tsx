'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Rotulo from './Rotulo';

export interface PanelShellProps {
  children: React.ReactNode;
  loteCodigo?: string;
  rol?: string;
}

const NAV_ITEMS = [
  { href: '/panel', label: 'Resumen', exact: true },
  { href: '/panel/comandas', label: 'Comandas' },
  { href: '/panel/cocina', label: 'Cocina' },
  { href: '/panel/inventario', label: 'Inventario' },
  { href: '/panel/lotes', label: 'Lotes' },
  { href: '/panel/finanzas', label: 'Finanzas' },
];

export function PanelShell({ children, loteCodigo = 'LOTE-2026-W37', rol = 'Administrador' }: PanelShellProps) {
  const pathname = usePathname();

  const isLinkActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="panel-root">
      {/* Header superior */}
      <header className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/panel" className="panel-brand">
            La casa
          </Link>
          <span style={{ color: 'var(--p-line)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <Rotulo>Lote activo:</Rotulo>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--p-ink)' }}>
              {loteCodigo}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <Rotulo>Rol:</Rotulo>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-ink)' }}>
              {rol}
            </span>
          </div>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.72rem',
              color: 'var(--p-muted)',
              textDecoration: 'none',
              padding: '0.3rem 0.6rem',
              border: '1px solid var(--p-line)',
              borderRadius: '3px',
              backgroundColor: 'var(--p-bg)',
            }}
          >
            ← Tienda
          </Link>
        </div>
      </header>

      {/* Cuerpo con Sidebar y Main */}
      <div className="panel-shell">
        <aside className="panel-sidebar" aria-label="Navegación del panel">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {NAV_ITEMS.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`panel-nav-item ${active ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="panel-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default PanelShell;
