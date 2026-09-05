import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

export type EstadoOrden = Database['public']['Enums']['estado_orden'];

export interface ComandaDetalle {
  id: string;
  plato_id: string;
  plato_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface ComandaItem {
  id: string;
  codigo_orden: string;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion_entrega: string;
  fecha_entrega: string;
  nota: string | null;
  estado: EstadoOrden;
  total_orden: number;
  subtotal_platos: number;
  valor_domicilio_cobrado: number;
  created_at: string;
  detalles: ComandaDetalle[];
}

export async function getComandas(
  loteId?: string,
  dia?: string, // 'sabado' | 'domingo' | 'todos'
  telefono?: string
): Promise<ComandaItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('ordenes')
    .select(`
      id,
      codigo_orden,
      cliente_nombre,
      cliente_telefono,
      direccion_entrega,
      fecha_entrega,
      nota,
      estado,
      total_orden,
      subtotal_platos,
      valor_domicilio_cobrado,
      created_at,
      orden_detalles (
        id,
        plato_id,
        cantidad,
        precio_unitario,
        subtotal,
        platos (
          nombre
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (loteId) {
    query = query.eq('lote_id', loteId);
  }

  if (telefono && telefono.trim().length > 0) {
    const cleanTel = telefono.replace(/\D/g, '');
    if (cleanTel.length > 0) {
      query = query.ilike('cliente_telefono', `%${cleanTel}%`);
    }
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching comandas:', error);
    return [];
  }

  type RawDetalle = {
    id: string;
    plato_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    platos: { nombre: string } | null;
  };

  type RawOrden = {
    id: string;
    codigo_orden: string;
    cliente_nombre: string;
    cliente_telefono: string;
    direccion_entrega: string;
    fecha_entrega: string;
    nota: string | null;
    estado: string;
    total_orden: number;
    subtotal_platos: number;
    valor_domicilio_cobrado: number;
    created_at: string;
    orden_detalles: RawDetalle[];
  };

  let items: ComandaItem[] = (data as unknown as RawOrden[]).map((o) => ({
    id: o.id,
    codigo_orden: o.codigo_orden,
    cliente_nombre: o.cliente_nombre,
    cliente_telefono: o.cliente_telefono,
    direccion_entrega: o.direccion_entrega,
    fecha_entrega: o.fecha_entrega,
    nota: o.nota,
    estado: o.estado as EstadoOrden,
    total_orden: Number(o.total_orden),
    subtotal_platos: Number(o.subtotal_platos),
    valor_domicilio_cobrado: Number(o.valor_domicilio_cobrado),
    created_at: o.created_at,
    detalles: (o.orden_detalles || []).map((d) => ({
      id: d.id,
      plato_id: d.plato_id,
      plato_nombre: d.platos?.nombre ?? 'Plato',
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      subtotal: Number(d.subtotal),
    })),
  }));

  if (dia && dia !== 'todos') {
    items = items.filter((item) => {
      const parts = item.fecha_entrega.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayOfWeek = d.getDay(); // 6 = Saturday, 0 = Sunday
        if (dia === 'sabado') return dayOfWeek === 6;
        if (dia === 'domingo') return dayOfWeek === 0;
      }
      return true;
    });
  }

  return items;
}

export async function actualizarEstadoOrden(
  ordenId: string,
  nuevoEstado: EstadoOrden
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('ordenes')
    .update({ estado: nuevoEstado })
    .eq('id', ordenId);

  if (error) {
    throw error;
  }
}

export async function anularOrdenDespachada(
  ordenId: string,
  motivo: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('fn_anular_orden_despachada', {
    p_orden_id: ordenId,
    p_motivo: motivo,
  });

  if (error) {
    throw error;
  }
}
