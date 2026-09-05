import React from 'react';

interface FilaFichaProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export default function FilaFicha({ label, value, className = '' }: FilaFichaProps) {
  return (
    <div className={`panel-fila ${className}`}>
      <span className="panel-fila-k">{label}</span>
      <span className="panel-fila-lead" aria-hidden="true" />
      <span className="panel-fila-v">{value}</span>
    </div>
  );
}
