import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile, getActiveLote } from '@/lib/panel/auth';
import PanelShell from '@/components/panel/PanelShell';
import PendienteAprobacion from '@/components/panel/PendienteAprobacion';
export const dynamic = 'force-dynamic';

export default async function PanelAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();


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
