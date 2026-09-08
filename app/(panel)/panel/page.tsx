import React from 'react';
import Link from 'next/link';
import { getCurrentUserProfile, getActiveLote } from '@/lib/panel/auth';
import Rotulo from '@/components/panel/Rotulo';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';

export const dynamic = 'force-dynamic';

interface ModuloInfo {
  href: string;
  titulo: string;
  descripcion: string;
  roles: string[];
  icono: string;
  badge: string;
}

const MODULOS: ModuloInfo[] = [
  {
    href: '/panel/comandas',
    titulo: 'Comandas',
    descripcion: 'Muro de preparación y despacho en tiempo real. Gestión de estados de pedidos y franjas de entrega.',
    roles: ['admin', 'cocina', 'repartidor'],
    icono: '📋',
    badge: 'Operación activa',
  },
  {
    href: '/panel/cocina',
    titulo: 'Cocina',
    descripcion: 'Producción del día por plato, reporte de mermas con valorización inmediata y consulta de recetas.',
    roles: ['admin', 'cocina'],
    icono: '🍳',
    badge: 'Línea de fuego',
  },
  {
    href: '/panel/inventario',
    titulo: 'Inventario & Compras',
    descripcion: 'Control perpetuo de insumos por lote, alertas de sobreconsumo negativo y registro de compras ponderadas.',
    roles: ['admin', 'cocina'],
    icono: '📦',
    badge: 'Stock semanal',
  },
  {
    href: '/panel/lotes',
    titulo: 'Ciclo de Lotes',
    descripcion: 'Apertura de la semana, fijación de carta y tarifas de reparto, cierre contable y transferencias.',
    roles: ['admin'],
    icono: '📅',
    badge: 'Gestión de semana',
  },
  {
    href: '/panel/finanzas',
    titulo: 'Finanzas & Rentabilidad',
    descripcion: 'P&G del lote, margen de utilidad por CeCo, pasivo pendiente de repartidores y libro diario inmutable.',
    roles: ['admin'],
    icono: '📊',
    badge: 'Solo Administrador',
  },
];

export default async function PanelHomePage() {
  const profile = await getCurrentUserProfile();
  const activeLote = await getActiveLote();
  const userRol = profile?.rol ?? 'pendiente';

  // Filtrar módulos según el rol del usuario
  const modulosDisponibles = MODULOS.filter((m) => m.roles.includes(userRol));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Encabezado del dashboard */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--p-line)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <Rotulo>PANEL DE CONTROL</Rotulo>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.7rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-line)',
                color: 'var(--p-muted)',
              }}
            >
              Rol: {userRol.toUpperCase()}
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
              margin: '0 0 0.4rem 0',
              color: 'var(--p-ink)',
            }}
          >
            Resumen Operativo
          </h1>
          <p
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.95rem',
              color: 'var(--p-muted)',
              margin: 0,
              maxWidth: '600px',
              lineHeight: 1.4,
            }}
          >
            Bienvenido, <strong>{profile?.nombre || profile?.email}</strong>. Selecciona un módulo para gestionar los almuerzos del fin de semana.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-line)',
            borderRadius: '6px',
            padding: '0.75rem 1.25rem',
            textAlign: 'right',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--p-muted)',
              marginBottom: '0.2rem',
            }}
          >
            Lote Activo
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--p-ink)',
            }}
          >
            {activeLote?.codigo_lote ?? 'SIN LOTE ACTIVO'}
          </div>
        </div>
      </div>

      {/* Cuadrícula de módulos operacionales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {modulosDisponibles.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
          >
            <div style={{ width: '100%', display: 'flex' }}>
              <Comanda className="panel-module-comanda">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <ComandaHeader>
                      <span style={{ fontSize: '1.4rem' }}>{mod.icono}</span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--p-muted)',
                          backgroundColor: 'var(--p-bg)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '3px',
                        }}
                      >
                        {mod.badge}
                      </span>
                    </ComandaHeader>

                    <ComandaTitle>
                      {mod.titulo}
                    </ComandaTitle>

                    <p
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: '0.88rem',
                        color: 'var(--p-muted)',
                        lineHeight: 1.45,
                        margin: '0.5rem 0 1.25rem 0',
                      }}
                    >
                      {mod.descripcion}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px dashed var(--p-line)',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--p-ink)',
                    }}
                  >
                    <span>Acceder al módulo</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </Comanda>
            </div>
          </Link>
        ))}

      </div>
    </div>
  );
}
