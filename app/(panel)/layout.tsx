import './panel.css';
import React from 'react';
import ThemeCleaner from '@/components/panel/ThemeCleaner';

export const metadata = {
  title: 'Panel de Operaciones — La casa',
  description: 'Sistema de operaciones, cocina, inventario y finanzas',
};

export default function PanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="panel-root">
      <ThemeCleaner />
      {children}
    </div>
  );
}
