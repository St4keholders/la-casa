import React from 'react';

interface CifraProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export default function Cifra({ children, size = 'md', className = '', style }: CifraProps) {
  const sizeClass = size === 'sm' ? 'panel-cifra-sm' : size === 'lg' ? 'panel-cifra-lg' : '';
  return <div className={`panel-cifra ${sizeClass} ${className}`} style={style}>{children}</div>;
}
