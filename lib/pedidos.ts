import { createClient } from '@/lib/supabase/client';
import type { CartLine, Delivery } from './types';

export interface PedidoCreado {
  orden_id: string;
  codigo_orden: string;
  total: number;
}

export async function crearPedido(
  d: Delivery,
  lines: CartLine[],
  platoIdPorIndice: Record<number, string>,
  fechaEntrega: string // 'YYYY-MM-DD'
): Promise<PedidoCreado> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('fn_crear_orden_publica', {
    p_cliente_nombre: d.nombre,
    p_cliente_telefono: d.tel,
    p_direccion: d.dir,
    p_fecha_entrega: fechaEntrega,
    p_nota: d.nota ? d.nota : '',
    p_items: lines.map(l => ({
      plato_id: platoIdPorIndice[l.id],
      cantidad: l.qty,
    })),
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('No se recibió confirmación del pedido.');
  }

  const row = data[0];
  return {
    orden_id: row.orden_id,
    codigo_orden: row.codigo_orden,
    total: typeof row.total === 'string' ? parseFloat(row.total) : Number(row.total),
  };
}

export function mapearErrorPedido(error: unknown): string {
  const msg = (
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '')
  ).toLowerCase();

  if (msg.includes('no hay pedidos abiertos')) {
    return 'Esta semana todavía no abrimos pedidos.';
  }
  if (msg.includes('chk_no_sobreventa') || msg.includes('sobreventa')) {
    return 'Se acabaron las porciones de ese almuerzo.';
  }
  if (msg.includes('ya no está disponible') || msg.includes('no esta disponible')) {
    return 'Ese plato salió del menú de esta semana.';
  }
  if (msg.includes('chk_celular_10_digitos') || msg.includes('celular') || msg.includes('10 dígitos') || msg.includes('10 digitos')) {
    return 'Necesitamos un celular de 10 dígitos.';
  }
  return 'No pudimos guardar el pedido. Intenta otra vez.';
}
