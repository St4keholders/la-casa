import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export type AppRol = Database['public']['Enums']['app_rol'];

export interface UserProfile {
  id: string;
  email: string;
  nombre: string | null;
  rol: AppRol;
}

export interface ActiveLote {
  id: string;
  codigo_lote: string;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        id: user.id,
        email: user.email ?? '',
        nombre: user.user_metadata?.nombre ?? null,
        rol: 'pendiente',
      };
    }

    return profile;
  } catch (err) {
    console.error('Error in getCurrentUserProfile:', err);
    return null;
  }
}

export async function getActiveLote(): Promise<ActiveLote | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lotes')
      .select('id, codigo_lote')
      .eq('estado', 'activo')
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
