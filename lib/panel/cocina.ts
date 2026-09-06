import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

export type TipoBajaMerma = Database['public']['Enums']['tipo_baja_merma'];

export interface ProduccionPlato {
  codigo_ceco: string;
  platillo: string;
  por_preparar: number;
  empacados: number;
  despachados: number;
  total_comprometido: number;
}

export interface InsumoOption {
  insumo_id: string;
  nombre: string;
  unidad_medida: string;
  costo_unitario: number;
  saldo_teorico: number;
}

export interface MermaItem {
  id: string;
  created_at: string;
  insumo_nombre: string;
  unidad_medida: string;
  cantidad: number;
  tipo_baja: TipoBajaMerma;
  motivo: string;
  costo_total_perdida: number;
  plato_nombre?: string | null;
}

export interface RecetaItem {
  plato_id: string;
  plato_nombre: string;
  codigo_ceco: string;
  ingredientes: {
    insumo_id: string;
    insumo_nombre: string;
    unidad_medida: string;
    cantidad_neta: number;
    cantidad_bruta: number;
    merma_esperada: number;
  }[];
}

export async function getLoteActivo(): Promise<{ id: string; codigo_lote: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lotes')
    .select('id, codigo_lote')
    .eq('estado', 'activo')
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getProduccionDia(loteId: string): Promise<ProduccionPlato[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vista_produccion_dia')
    .select('*')
    .eq('lote_id', loteId);

  if (error || !data) {
    console.error('Error al consultar producción del día:', error);
    return [];
  }

  return data.map((r) => ({
    codigo_ceco: r.codigo_ceco ?? '',
    platillo: r.platillo ?? '',
    por_preparar: Number(r.por_preparar ?? 0),
    empacados: Number(r.empacados ?? 0),
    despachados: Number(r.despachados ?? 0),
    total_comprometido: Number(r.total_comprometido ?? 0),
  }));
}

export async function getInsumosLote(loteId: string): Promise<InsumoOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventario_lote')
    .select(`
      insumo_id,
      saldo_teorico,
      costo_unitario_aplicado,
      insumos (
        nombre,
        unidad_medida
      )
    `)
    .eq('lote_id', loteId);

  if (error || !data) {
    console.error('Error al consultar insumos del lote:', error);
    return [];
  }

  type RawInventario = {
    insumo_id: string;
    saldo_teorico: number;
    costo_unitario_aplicado: number;
    insumos: {
      nombre: string;
      unidad_medida: string;
    } | null;
  };

  return (data as unknown as RawInventario[]).map((r) => ({
    insumo_id: r.insumo_id,
    nombre: r.insumos?.nombre ?? 'Insumo',
    unidad_medida: r.insumos?.unidad_medida ?? 'un',
    costo_unitario: Number(r.costo_unitario_aplicado ?? 0),
    saldo_teorico: Number(r.saldo_teorico ?? 0),
  }));
}

export async function getMermas(loteId: string): Promise<MermaItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mermas_operativas')
    .select(`
      id,
      created_at,
      cantidad,
      tipo_baja,
      motivo,
      costo_total_perdida,
      insumos (
        nombre,
        unidad_medida
      ),
      platos (
        nombre
      )
    `)
    .eq('lote_id', loteId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error al consultar mermas:', error);
    return [];
  }

  type RawMerma = {
    id: string;
    created_at: string;
    cantidad: number;
    tipo_baja: TipoBajaMerma;
    motivo: string;
    costo_total_perdida: number;
    insumos: { nombre: string; unidad_medida: string } | null;
    platos: { nombre: string } | null;
  };

  return (data as unknown as RawMerma[]).map((m) => ({
    id: m.id,
    created_at: m.created_at,
    insumo_nombre: m.insumos?.nombre ?? 'Insumo',
    unidad_medida: m.insumos?.unidad_medida ?? '',
    cantidad: Number(m.cantidad),
    tipo_baja: m.tipo_baja,
    motivo: m.motivo,
    costo_total_perdida: Number(m.costo_total_perdida),
    plato_nombre: m.platos?.nombre ?? null,
  }));
}

export async function registrarMerma(payload: {
  lote_id: string;
  insumo_id: string;
  ceco_id?: string | null;
  cantidad: number;
  tipo_baja: TipoBajaMerma;
  motivo: string;
}): Promise<number> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('mermas_operativas')
    .insert({
      lote_id: payload.lote_id,
      insumo_id: payload.insumo_id,
      ceco_id: payload.ceco_id || null,
      cantidad: payload.cantidad,
      tipo_baja: payload.tipo_baja,
      motivo: payload.motivo,
      reportado_por: userData?.user?.id ?? null,
    })
    .select('costo_total_perdida')
    .single();

  if (error) {
    throw error;
  }

  return Number(data?.costo_total_perdida ?? 0);
}

export async function getRecetasPlatos(): Promise<RecetaItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('platos')
    .select(`
      id,
      nombre,
      codigo_ceco,
      receta_detalles (
        insumo_id,
        cantidad_neta,
        cantidad_bruta_calculada,
        porcentaje_merma_esperado,
        insumos (
          nombre,
          unidad_medida
        )
      )
    `)
    .eq('activo', true)
    .order('orden_vitrina', { ascending: true });

  if (error || !data) {
    console.error('Error al consultar recetas:', error);
    return [];
  }

  type RawRecetaDetalle = {
    insumo_id: string;
    cantidad_neta: number;
    cantidad_bruta_calculada: number;
    porcentaje_merma_esperado: number;
    insumos: { nombre: string; unidad_medida: string } | null;
  };

  type RawPlatoConReceta = {
    id: string;
    nombre: string;
    codigo_ceco: string;
    receta_detalles: RawRecetaDetalle[];
  };

  return (data as unknown as RawPlatoConReceta[]).map((p) => ({
    plato_id: p.id,
    plato_nombre: p.nombre,
    codigo_ceco: p.codigo_ceco,
    ingredientes: (p.receta_detalles || []).map((rd) => ({
      insumo_id: rd.insumo_id,
      insumo_nombre: rd.insumos?.nombre ?? 'Insumo',
      unidad_medida: rd.insumos?.unidad_medida ?? 'g',
      cantidad_neta: Number(rd.cantidad_neta),
      cantidad_bruta: Number(rd.cantidad_bruta_calculada),
      merma_esperada: Number(rd.porcentaje_merma_esperado),
    })),
  }));
}
