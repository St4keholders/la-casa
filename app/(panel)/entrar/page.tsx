'use client';

import React, { useState } from 'react';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import Rotulo from '@/components/panel/Rotulo';
import Garnishes from '@/components/Garnishes';
import { createClient } from '@/lib/supabase/client';

export default function EntrarPage() {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      setEnviado(true);
    } catch (err: unknown) {
      console.error('Error al solicitar magic link:', err);
      setErrorMsg('No pudimos enviar el enlace. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        backgroundColor: 'var(--p-bg)',
      }}
    >
      <Garnishes variant="ambiente" />

      <div style={{ maxWidth: '420px', width: '100%', position: 'relative', zIndex: 10 }}>
        <Comanda>
          <ComandaHeader>
            <Rotulo>LA CASA · OPERACIONES</Rotulo>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--p-muted)' }}>
              ACCESO
            </span>
          </ComandaHeader>

          <ComandaTitle>Ingreso al panel</ComandaTitle>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--p-muted)', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
            Entrada exclusiva para el equipo de cocina, despacho y administración.
          </p>

          {enviado ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--p-despachado)',
                  color: '#fff',
                  marginBottom: '1rem',
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <h4 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: 'var(--p-ink)' }}>
                Enlace enviado
              </h4>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', color: 'var(--p-ink)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Revisa tu bandeja de entrada en <strong>{email}</strong>. Te enviamos un enlace de acceso directo al panel.
              </p>
              <button
                type="button"
                onClick={() => setEnviado(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--p-muted)',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Ingresar otro correo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--p-muted)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="usuario@lacasa.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.9rem',
                    color: 'var(--p-ink)',
                    backgroundColor: 'var(--p-bg)',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {errorMsg && (
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '0.82rem',
                    color: 'var(--p-recibida)',
                    marginBottom: '1rem',
                    fontWeight: 500,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: 'var(--p-ink)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  opacity: cargando ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {cargando ? 'Enviando enlace…' : 'Enviar enlace de acceso →'}
              </button>
            </form>
          )}
        </Comanda>
      </div>
    </div>
  );
}
