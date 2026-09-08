import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="pie">
      <p><strong>La casa</strong> — almuerzos caseros, Medellín</p>
      <p>
        Entregas sábado y domingo ·{' '}
        <Link href="/entrar" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.75 }}>
          Acceso al panel
        </Link>
      </p>
    </footer>
  );
}

