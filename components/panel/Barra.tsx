import React from 'react';

interface BarraProps {
  valor: number; // 0 - 100
  color?: string;
  className?: string;
}

export default function Barra({ valor, color, className = '' }: BarraProps) {
  const pct = Math.min(Math.max(valor, 0), 100);
  return (
    <div
      className={`panel-barra-wrap ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="panel-barra-fill"
        style={{
          width: `${pct}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
}
