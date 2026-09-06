import { createClient } from '@/lib/supabase/client';

export interface RendimientoCeCo {
  codigo_lote: string;
  estado_lote: string;
  codigo_ceco: string;
  platillo: string;
  precio_venta_lote: number;
  unidades_proyectadas: number;
  unidades_vendidas: number;
  ingreso_bruto: number;
  costo_nivel1_materia_prima: number;
  costo_nivel2_directo: number;
  costo_nivel3_estructural: number;
  costo_merma: number;
  utilidad_bruta: number;
  utilidad_neta: number;
  margen_bruto_porcentaje: number;
  margen_neto_porcentaje: number;
  cumplimiento_proyeccion_porcentaje: number;
}

export interface PnlLote {
  codigo_lote: string;
  estado: string;
  ingresos: number;
  costo_mercancia_vendida: number;
  perdida_merma: number;
  gasto_logistica: number;
  gasto_mano_obra: number;
  cif: number;
  pasivo_domiciliario_pendiente: number;
  utilidad_operacional: number;
}

export interface AsientoDiario {
  id: string;
  transaccion_id: string;
  tipo_asiento: string;
  cuenta: string;
  descripcion: string;
  debito: number;
  credito: number;
  es_pasivo_tercero: boolean;
  fecha_registro: string;
}

export interface TransaccionDiario {
  transaccion_id: string;
  tipo_asiento: string;
  fecha_registro: string;
  descripcion_general: string;
  total_debito: number;
  total_credito: number;
  cuadrada: boolean;
  asientos: AsientoDiario[];
}

export async function getRendimientoCecos(codigoLote: string): Promise<RendimientoCeCo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vista_rendimiento_cecos')
    .select('*')
    .eq('codigo_lote', codigoLote)
    .order('codigo_ceco', { ascending: true });

  if (error || !data) {
    console.error('Error al consultar rendimiento CeCos:', error);
    return [];
  }

  return (data as any[]).map((r) => ({
    codigo_lote: r.codigo_lote ?? '',
    estado_lote: r.estado_lote ?? '',
    codigo_ceco: r.codigo_ceco ?? '',
    platillo: r.platillo ?? '',
    precio_venta_lote: Number(r.precio_venta_lote ?? 0),
    unidades_proyectadas: Number(r.unidades_proyectadas ?? 0),
    unidades_vendidas: Number(r.unidades_vendidas ?? 0),
    ingreso_bruto: Number(r.ingreso_bruto ?? 0),
    costo_nivel1_materia_prima: Number(r.costo_nivel1_materia_prima ?? 0),
    costo_nivel2_directo: Number(r.costo_nivel2_directo ?? 0),
    costo_nivel3_estructural: Number(r.costo_nivel3_estructural ?? 0),
    costo_merma: Number(r.costo_merma ?? 0),
    utilidad_bruta: Number(r.utilidad_bruta ?? 0),
    utilidad_neta: Number(r.utilidad_neta ?? 0),
    margen_bruto_porcentaje: Number(r.margen_bruto_porcentaje ?? 0),
    margen_neto_porcentaje: Number(r.margen_neto_porcentaje ?? 0),
    cumplimiento_proyeccion_porcentaje: Number(r.cumplimiento_proyeccion_porcentaje ?? 0),
  }));
}

export async function getPnlLote(codigoLote: string): Promise<PnlLote | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vista_pnl_lote')
    .select('*')
    .eq('codigo_lote', codigoLote)
    .single();

  if (error || !data) {
    console.error('Error al consultar P&G de lote:', error);
    return null;
  }

  const p = data as any;
  return {
    codigo_lote: p.codigo_lote ?? '',
    estado: p.estado ?? '',
    ingresos: Number(p.ingresos ?? 0),
    costo_mercancia_vendida: Number(p.costo_mercancia_vendida ?? 0),
    perdida_merma: Number(p.perdida_merma ?? 0),
    gasto_logistica: Number(p.gasto_logistica ?? 0),
    gasto_mano_obra: Number(p.gasto_mano_obra ?? 0),
    cif: Number(p.cif ?? 0),
    pasivo_domiciliario_pendiente: Number(p.pasivo_domiciliario_pendiente ?? 0),
    utilidad_operacional: Number(p.utilidad_operacional ?? 0),
  };
}

export async function getPnlHistorico(): Promise<PnlLote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vista_pnl_lote')
    .select('*');

  if (error || !data) {
    console.error('Error al consultar P&G histórico:', error);
    return [];
  }

  return (data as any[]).map((p) => ({
    codigo_lote: p.codigo_lote ?? '',
    estado: p.estado ?? '',
    ingresos: Number(p.ingresos ?? 0),
    costo_mercancia_vendida: Number(p.costo_mercancia_vendida ?? 0),
    perdida_merma: Number(p.perdida_merma ?? 0),
    gasto_logistica: Number(p.gasto_logistica ?? 0),
    gasto_mano_obra: Number(p.gasto_mano_obra ?? 0),
    cif: Number(p.cif ?? 0),
    pasivo_domiciliario_pendiente: Number(p.pasivo_domiciliario_pendiente ?? 0),
    utilidad_operacional: Number(p.utilidad_operacional ?? 0),
  }));
}

export async function liquidarDomiciliario(loteId: string, monto?: number): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('fn_liquidar_domiciliario', {
    p_lote_id: loteId,
    p_monto: monto,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

export async function getLibroDiario(loteId?: string): Promise<TransaccionDiario[]> {
  const supabase = createClient();
  let query = supabase
    .from('libro_diario')
    .select('*')
    .order('fecha_registro', { ascending: false });

  if (loteId) {
    query = query.eq('lote_id', loteId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error al consultar libro diario:', error);
    return [];
  }

  // Agrupar por transaccion_id
  const mapa = new Map<string, TransaccionDiario>();

  (data as any[]).forEach((row) => {
    const txnId = row.transaccion_id;
    const deb = Number(row.debito ?? 0);
    const cred = Number(row.credito ?? 0);

    const asiento: AsientoDiario = {
      id: row.id,
      transaccion_id: txnId,
      tipo_asiento: row.tipo_asiento,
      cuenta: row.cuenta,
      descripcion: row.descripcion,
      debito: deb,
      credito: cred,
      es_pasivo_tercero: Boolean(row.es_pasivo_tercero),
      fecha_registro: row.fecha_registro,
    };

    if (!mapa.has(txnId)) {
      mapa.set(txnId, {
        transaccion_id: txnId,
        tipo_asiento: row.tipo_asiento,
        fecha_registro: row.fecha_registro,
        descripcion_general: row.descripcion,
        total_debito: deb,
        total_credito: cred,
        cuadrada: false,
        asientos: [asiento],
      });
    } else {
      const txn = mapa.get(txnId)!;
      txn.total_debito += deb;
      txn.total_credito += cred;
      txn.asientos.push(asiento);
    }
  });

  const transacciones = Array.from(mapa.values());
  transacciones.forEach((t) => {
    // Tolerancia de redondeo de 1 centavo
    t.cuadrada = Math.abs(t.total_debito - t.total_credito) < 0.05;
  });

  return transacciones;
}
