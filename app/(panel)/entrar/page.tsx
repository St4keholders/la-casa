'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import Rotulo from '@/components/panel/Rotulo';
import Garnishes from '@/components/Garnishes';
import { createClient } from '@/lib/supabase/client';

export default function EntrarPage() {
  const [authMode, setAuthMode] = useState<'password' | 'magiclink'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password) {
      setErrorMsg('Ingresa tu contraseña.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMsg('Correo o contraseña incorrectos. Verifica tus credenciales.');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMsg('El correo aún no ha sido confirmado en Supabase.');
        } else {
          setErrorMsg(error.message || 'Error al iniciar sesión.');
        }
        return;
      }

      if (data.session) {
        // Redirigir al panel recargando para que el layout lea la sesión
        window.location.href = '/panel';
      }
    } catch (err: unknown) {
      console.error('Error al iniciar sesión con contraseña:', err);
      setErrorMsg('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
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

      <div style={{ maxWidth: '440px', width: '100%', position: 'relative', zIndex: 10 }}>
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

          {/* Selector de modo de autenticación */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--p-bg)',
              borderRadius: '4px',
              padding: '0.25rem',
              marginBottom: '1.25rem',
              border: '1px solid var(--p-line)',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setErrorMsg(null);
                setEnviado(false);
              }}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                border: 'none',
                borderRadius: '3px',
                fontFamily: 'var(--mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 600,
                backgroundColor: authMode === 'password' ? 'var(--p-surface)' : 'transparent',
                color: authMode === 'password' ? 'var(--p-ink)' : 'var(--p-muted)',
                boxShadow: authMode === 'password' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Contraseña
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('magiclink');
                setErrorMsg(null);
                setEnviado(false);
              }}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                border: 'none',
                borderRadius: '3px',
                fontFamily: 'var(--mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 600,
                backgroundColor: authMode === 'magiclink' ? 'var(--p-surface)' : 'transparent',
                color: authMode === 'magiclink' ? 'var(--p-ink)' : 'var(--p-muted)',
                boxShadow: authMode === 'magiclink' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Enlace mágico
            </button>
          </div>

          {authMode === 'password' ? (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: '1rem' }}>
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
                  autoComplete="email"
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="password"
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
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.5rem 0.7rem 0.85rem',
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--p-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
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
                  transition: 'opacity 0.2s ease',
                }}
              >
                {cargando ? 'Iniciando sesión…' : 'Ingresar al panel →'}
              </button>
            </form>
          ) : enviado ? (
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
            <form onSubmit={handleMagicLinkSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="magic-email"
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
                  id="magic-email"
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
                  transition: 'opacity 0.2s ease',
                }}
              >
                {cargando ? 'Enviando enlace…' : 'Enviar enlace de acceso →'}
              </button>
            </form>
          )}

          {/* Enlace de regreso */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--p-line)', paddingTop: '0.75rem' }}>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.72rem',
                color: 'var(--p-muted)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              ← Volver a la tienda
            </Link>
          </div>
        </Comanda>
      </div>
    </div>
  );
}
