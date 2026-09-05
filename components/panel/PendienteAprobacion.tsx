'use client';

import React from 'react';
import { Comanda, ComandaHeader, ComandaTitle } from './Comanda';
import Rotulo from './Rotulo';
import Garnishes from '@/components/Garnishes';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PendienteAprobacionProps {
  email: string;
}

export default function PendienteAprobacion({ email }: PendienteAprobacionProps) {
  const router = useRouter();

  const handleCerrar = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/entrar');
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        backgroundColor: 'var(--p-bg)',
      }}
    >
      <Garnishes variant="ambiente" />

      <div style={{ maxWidth: '440px', width: '100%', position: 'relative', zIndex: 10 }}>
        <Comanda>
          <ComandaHeader>
            <Rotulo>OPERACIONES · ESTADO</Rotulo>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.65rem',
                backgroundColor: 'var(--p-accent)',
                color: 'var(--p-ink)',
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 600,
              }}
            >
              PENDIENTE
            </span>
          </ComandaHeader>

          <ComandaTitle>Cuenta en espera de aprobación</ComandaTitle>
          <p
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.9rem',
              color: 'var(--p-ink)',
              lineHeight: 1.5,
              margin: '0.5rem 0 1.25rem 0',
            }}
          >
            Tu usuario ha sido registrado con el correo <strong>{email}</strong>. Un administrador del equipo debe habilitar tu rol para acceder a las comandas, cocina o inventario.
          </p>

          <div
            style={{
              borderTop: '1px solid var(--p-line)',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--p-muted)' }}>
              ¿Necesitas entrar ya?
            </span>
            <button
              onClick={handleCerrar}
              style={{
                background: 'none',
                border: '1px solid var(--p-line)',
                padding: '0.35rem 0.75rem',
                borderRadius: '3px',
                fontFamily: 'var(--mono)',
                fontSize: '0.75rem',
                color: 'var(--p-muted)',
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </Comanda>
      </div>
    </div>
  );
}
