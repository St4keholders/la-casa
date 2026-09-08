import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../database.types';

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si las variables de entorno de Supabase no están configuradas (ej. en Vercel antes de cargarlas),
  // evitamos que el middleware lance una excepción no capturada (MIDDLEWARE_INVOCATION_FAILED)
  if (!supabaseUrl || !supabaseAnonKey) {
    if (request.nextUrl.pathname.startsWith('/panel')) {
      const url = request.nextUrl.clone();
      url.pathname = '/entrar';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Si intenta entrar a cualquier ruta de /panel sin sesión
    if (pathname.startsWith('/panel')) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/entrar';
        return NextResponse.redirect(url);
      }
    }

    // Si ya tiene sesión activa y visita /entrar, lo llevamos directo al panel
    if (pathname === '/entrar' && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/panel';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('[Supabase Middleware] Error al validar sesión:', error);
    return supabaseResponse;
  }

  return supabaseResponse;
}

