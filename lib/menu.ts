import { createClient } from '@/lib/supabase/client';
import type { Dish, GarnishKey } from './types';

export async function getMenu(): Promise<Dish[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vista_menu_publico')
      .select('*')
      .order('orden_vitrina', { ascending: true });

    if (error || !data) {
      console.error('Error al obtener menú público:', error);
      return [];
    }

    return data.map((row, index): Dish => ({
      id: index,
      platoId: row.plato_id ?? '',
      kick: row.kicker ?? '',
      word: row.palabra ?? '',
      name: row.nombre ?? '',
      foto: row.foto_url ?? '',
      price: typeof row.precio === 'string' ? parseFloat(row.precio) : Number(row.precio ?? 0),
      left: Number(row.disponibles ?? 0),
      note: row.nota ?? '',
      rows: (Array.isArray(row.ficha) ? row.ficha : []) as [string, string][],
      bg: row.color_bg ?? '#2F6B4B',
      ink: row.color_ink ?? '#F2F7EC',
      accent: row.color_accent ?? '#F4C95D',
      aink: row.color_accent_ink ?? '#241A12',
      garnish: (row.garnish ?? []) as GarnishKey[],
    }));
  } catch (err) {
    console.error('Error inesperado en getMenu:', err);
    return [];
  }
}
