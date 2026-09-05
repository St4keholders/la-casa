import React from 'react';

export type EstadoOrden =
  | 'recibida'
  | 'confirmada'
  | 'en_preparacion'
  | 'empacado'
  | 'despachado'
  | 'cancelada';

interface EstadoPillProps {
  estado: EstadoOrden | string;
  className?: string;
}

const LABELS: Record<string, string> = {
  recibida: 'Recibida',
  confirmada: 'Confirmada',
  en_preparacion: 'En preparación',
  empacado: 'Empacado',
  despachado: 'Despachado',
  cancelada: 'Cancelada',
};

export default function EstadoPill({ estado, className = '' }: EstadoPillProps) {
  const norm = estado === 'confirmada' ? 'recibida' : estado;
  const label = LABELS[estado] || estado;

  return <span className={`panel-pill ${norm} ${className}`}>{label}</span>;
}
