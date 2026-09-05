import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserProfile, getActiveLote } from '@/lib/panel/auth';
import PanelShell from '@/components/panel/PanelShell';
import PendienteAprobacion from '@/components/panel/PendienteAprobacion';

export default async function PanelAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';

  const profile = await getCurrentUserProfile();

  // Para /panel/disenio, si no hay sesión permitimos ver la vitrina de diseño con rol admin
  if (pathname === '/panel/disenio' && !profile) {
    return (
      <PanelShell loteCodigo="LOTE-2026-W37" rol="admin">
        {children}
      </PanelShell>
    );
  }

  if (!profile) {
    redirect('/entrar');
  }

  if (profile.rol === 'pendiente') {
    return <PendienteAprobacion email={profile.email} />;
  }

  const activeLote = await getActiveLote();

  return (
    <PanelShell
      loteCodigo={activeLote?.codigo_lote ?? 'SIN LOTE'}
      rol={profile.rol}
    >
      {children}
    </PanelShell>
  );
}
