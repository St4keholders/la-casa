import React from 'react';

export interface ComandaProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function Comanda({ children, className = '', compact = false, onClick }: ComandaProps) {
  return (
    <article
      className={`panel-comanda ${compact ? 'panel-comanda-compact' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </article>
  );
}

export function ComandaHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`panel-comanda-header ${className}`}>{children}</div>;
}

export function ComandaTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`panel-comanda-title ${className}`}>{children}</h3>;
}

export default Comanda;
