import type { Metadata } from 'next';
import { Archivo, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import './globals.css';

// Archivo es variable: se pide el eje wdth
const display = Archivo({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['wdth'],
  variable: '--font-display',
  display: 'swap',
});

// Space Grotesk es variable
const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// IBM Plex Mono NO es variable: declarar los pesos
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'La casa — Almuerzos de fin de semana',
  description:
    'Cuatro almuerzos completos con sopa, seco y jugo. Entregas sábado y domingo en Medellín.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <div className="grain" aria-hidden="true" />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
