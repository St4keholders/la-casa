'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Rotulo from './Rotulo';
import { createClient } from '@/lib/supabase/client';

export interface PanelShellProps {
  children: React.ReactNode;
  loteCodigo?: string;
  rol?: string;
}

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  roles: string[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/panel', label: 'Resumen', exact: true, roles: ['admin'] },
  { href: '/panel/comandas', label: 'Comandas', roles: ['admin', 'cocina', 'repartidor'] },
  { href: '/panel/cocina', label: 'Cocina', roles: ['admin', 'cocina'] },
  { href: '/panel/inventario', label: 'Inventario', roles: ['admin', 'cocina'] },
  { href: '/panel/lotes', label: 'Lotes', roles: ['admin'] },
  { href: '/panel/finanzas', label: 'Finanzas', roles: ['admin'] },
];

export function PanelShell({
  children,
  loteCodigo = 'LOTE-2026-W37',
  rol = 'admin',
}: PanelShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isLinkActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(rol));

  const handleCerrarSesion = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/entrar');
      router.refresh();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
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
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--p-ink)', fontWeight: 600 }}>
              {rol}
            </span>
          </div>
          <button
            onClick={handleCerrarSesion}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.72rem',
              color: 'var(--p-muted)',
              background: 'transparent',
              border: '1px solid var(--p-line)',
              borderRadius: '3px',
              padding: '0.3rem 0.6rem',
              cursor: 'pointer',
            }}
          >
            Salir
          </button>
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
            {navItems.map((item) => {
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
