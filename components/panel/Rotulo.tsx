import React from 'react';

interface RotuloProps {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'p' | 'div' | 'label';
}

export default function Rotulo({ children, className = '', as: Component = 'span' }: RotuloProps) {
  return <Component className={`panel-rotulo ${className}`}>{children}</Component>;
}
