import './panel.css';
import React from 'react';

export const metadata = {
  title: 'Panel de Operaciones — La casa',
  description: 'Sistema de operaciones, cocina, inventario y finanzas',
};

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="panel-root">{children}</div>;
}
