import { createClient } from '@/lib/supabase/client';

export type EstadoLote = 'borrador' | 'activo' | 'cerrado' | 'conciliado';
export type TipoGastoLote = 'mano_obra' | 'logistica' | 'cif';
export type InductorProrrateo = 'directo' | 'unidades_vendidas' | 'horas_coccion' | 'ingreso_bruto';

export interface LoteResumen {
  id: string;
  codigo_lote: string;
  fecha_apertura: string;
  fecha_entrega_desde: string;
  fecha_entrega_hasta: string;
  fecha_cierre: string | null;
  estado: EstadoLote;
  nombre_domiciliario: string | null;
  tarifa_fija_domiciliario: number;
  tarifa_domicilio_cliente: number;
  utilidad_operacional: number | null;
  ingresos: number | null;
}

export interface PlatoCatalogo {
  id: string;
  nombre: string;
  palabra: string;
  kicker: string;
  precio_venta_sugerido: number;
  codigo_ceco: string;
}

export interface ItemCartaInput {
  plato_id: string;
  unidades_proyectadas: number;
  precio_venta_lote: number;
  horas_coccion: number;
}

export interface GastoLote {
  id: string;
  lote_id: string;
  ceco_id: string | null;
  plato_nombre?: string;
  tipo: TipoGastoLote;
  inductor: InductorProrrateo;
  concepto: string;
  monto: number;
  fecha: string;
  created_at: string;
}

export interface PrevisualizacionCierre {
  lote_id: string;
  codigo_lote: string;
  ordenes_pendientes: number;
  transferibles: Array<{
    insumo_id: string;
    nombre: string;
    unidad_medida: string;
    saldo: number;
    costo_unitario: number;
  }>;
  perecederos_a_baja: Array<{
    insumo_id: string;
    nombre: string;
    unidad_medida: string;
    saldo: number;
    costo_unitario: number;
    costo_perdida: number;
  }>;
  costo_total_perdida: number;
}

export async function getLotes(): Promise<LoteResumen[]> {
  const supabase = createClient();

  const [{ data: lotesData, error: lotesErr }, { data: pnlData }] = await Promise.all([
    supabase
      .from('lotes')
      .select('*')
      .order('fecha_entrega_desde', { ascending: false }),
    supabase.from('vista_pnl_lote').select('codigo_lote, ingresos, utilidad_operacional'),
  ]);

  if (lotesErr || !lotesData) {
    console.error('Error al obtener lotes:', lotesErr);
    return [];
  }

  const pnlMap = new Map<string, { ingresos: number; utilidad_operacional: number }>();
  if (pnlData) {
    pnlData.forEach((p) => {
      if (p.codigo_lote) {
        pnlMap.set(p.codigo_lote, {
          ingresos: Number(p.ingresos ?? 0),
          utilidad_operacional: Number(p.utilidad_operacional ?? 0),
        });
      }
    });
  }

  return (lotesData as any[]).map((l) => {
    const pnl = pnlMap.get(l.codigo_lote ?? '');
    return {
      id: l.id,
      codigo_lote: l.codigo_lote,
      fecha_apertura: l.fecha_apertura,
      fecha_entrega_desde: l.fecha_entrega_desde,
      fecha_entrega_hasta: l.fecha_entrega_hasta,
      fecha_cierre: l.fecha_cierre,
      estado: l.estado as EstadoLote,
      nombre_domiciliario: l.nombre_domiciliario,
      tarifa_fija_domiciliario: Number(l.tarifa_fija_domiciliario ?? 0),
      tarifa_domicilio_cliente: Number(l.tarifa_domicilio_cliente ?? 0),
      utilidad_operacional: pnl ? pnl.utilidad_operacional : null,
      ingresos: pnl ? pnl.ingresos : null,
    };
  });
}

export async function getPlatosCatalogo(): Promise<PlatoCatalogo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('platos')
    .select('id, nombre, palabra, kicker, precio_venta_sugerido, codigo_ceco')
    .eq('activo', true)
    .order('orden_vitrina', { ascending: true });

  if (error || !data) {
    console.error('Error al obtener platos:', error);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    palabra: p.palabra ?? '',
    kicker: p.kicker ?? '',
    precio_venta_sugerido: Number(p.precio_venta_sugerido),
    codigo_ceco: p.codigo_ceco,
  }));
}

export async function crearLote(payload: {
  codigo_lote: string;
  fecha_apertura: string;
  fecha_entrega_desde: string;
  fecha_entrega_hasta: string;
  nombre_domiciliario: string;
  tarifa_fija_domiciliario: number;
  tarifa_domicilio_cliente: number;
  estado?: EstadoLote;
  items_carta: ItemCartaInput[];
}): Promise<string> {
  const supabase = createClient();

  // 1. Insertar lote
  const { data: loteInsertado, error: loteErr } = await supabase
    .from('lotes')
    .insert({
      codigo_lote: payload.codigo_lote,
      fecha_apertura: payload.fecha_apertura,
      fecha_entrega_desde: payload.fecha_entrega_desde,
      fecha_entrega_hasta: payload.fecha_entrega_hasta,
      nombre_domiciliario: payload.nombre_domiciliario.trim() || null,
      tarifa_fija_domiciliario: payload.tarifa_fija_domiciliario,
      tarifa_domicilio_cliente: payload.tarifa_domicilio_cliente,
      estado: payload.estado ?? 'borrador',
    })
    .select('id')
    .single();

  if (loteErr || !loteInsertado) {
    throw new Error(loteErr?.message || 'Error al crear el lote');
  }

  const loteId = loteInsertado.id;

  // 2. Insertar platos en la carta (lote_cecos)
  if (payload.items_carta.length > 0) {
    const cecosToInsert = payload.items_carta.map((item) => ({
      lote_id: loteId,
      plato_id: item.plato_id,
      unidades_proyectadas: item.unidades_proyectadas,
      precio_venta_lote: item.precio_venta_lote,
      horas_coccion: item.horas_coccion,
    }));

    const { error: cecoErr } = await supabase.from('lote_cecos').insert(cecosToInsert);
    if (cecoErr) {
      throw new Error(`Lote creado pero falló la carta: ${cecoErr.message}`);
    }
  }

  // 3. Preparar inventario
  const { error: prepErr } = await supabase.rpc('fn_preparar_inventario_lote', {
    p_lote_id: loteId,
  });

  if (prepErr) {
    console.warn('Aviso: no se preparó inventario automáticamente:', prepErr.message);
  }

  return loteId;
}

export async function getPrevisualizacionCierre(loteId: string): Promise<PrevisualizacionCierre> {
  const supabase = createClient();

  // 1. Obtener info del lote
  const { data: lote, error: loteErr } = await supabase
    .from('lotes')
    .select('id, codigo_lote')
    .eq('id', loteId)
    .single();

  if (loteErr || !lote) {
    throw new Error('Lote no encontrado');
  }

  // 2. Contar órdenes pendientes
  const { count, error: ordErr } = await supabase
    .from('ordenes')
    .select('*', { count: 'exact', head: true })
    .eq('lote_id', loteId)
    .not('estado', 'in', '("despachado","cancelada")');

  if (ordErr) {
    console.error('Error contando órdenes pendientes:', ordErr);
  }

  // 3. Obtener inventario del lote
  const { data: invData, error: invErr } = await supabase
    .from('inventario_lote')
    .select(`
      insumo_id,
      costo_unitario_aplicado,
      stock_final_real,
      saldo_teorico,
      insumos (
        nombre,
        unidad_medida,
        es_perecedero
      )
    `)
    .eq('lote_id', loteId);

  if (invErr || !invData) {
    throw new Error(invErr?.message || 'Error al obtener inventario para previsualización');
  }

  const transferibles: PrevisualizacionCierre['transferibles'] = [];
  const perecederos_a_baja: PrevisualizacionCierre['perecederos_a_baja'] = [];
  let costo_total_perdida = 0;

  invData.forEach((row: any) => {
    const rawSaldo = row.stock_final_real !== null ? Number(row.stock_final_real) : Number(row.saldo_teorico);
    const saldo = Math.max(rawSaldo, 0);
    if (saldo <= 0) return;

    const insumo = row.insumos;
    const esPerecedero = Boolean(insumo?.es_perecedero);
    const costoUnit = Number(row.costo_unitario_aplicado ?? 0);

    if (esPerecedero) {
      const costoPerdida = saldo * costoUnit;
      costo_total_perdida += costoPerdida;
      perecederos_a_baja.push({
        insumo_id: row.insumo_id,
        nombre: insumo?.nombre ?? 'Insumo',
        unidad_medida: insumo?.unidad_medida ?? 'un',
        saldo,
        costo_unitario: costoUnit,
        costo_perdida: costoPerdida,
      });
    } else {
      transferibles.push({
        insumo_id: row.insumo_id,
        nombre: insumo?.nombre ?? 'Insumo',
        unidad_medida: insumo?.unidad_medida ?? 'un',
        saldo,
        costo_unitario: costoUnit,
      });
    }
  });

  return {
    lote_id: lote.id,
    codigo_lote: lote.codigo_lote,
    ordenes_pendientes: count ?? 0,
    transferibles,
    perecederos_a_baja,
    costo_total_perdida,
  };
}

export async function cerrarYTransferirLote(
  loteActualId: string,
  loteNuevoId: string
): Promise<{ insumos_transferidos: number; insumos_dados_de_baja: number }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('fn_cerrar_y_transferir_lote', {
    p_lote_actual_id: loteActualId,
    p_lote_nuevo_id: loteNuevoId,
  });

  if (error) {
    throw error;
  }

  const resultado = Array.isArray(data) ? data[0] : data;
  return {
    insumos_transferidos: resultado?.insumos_transferidos ?? 0,
    insumos_dados_de_baja: resultado?.insumos_dados_de_baja ?? 0,
  };
}

export async function getGastosLote(loteId: string): Promise<GastoLote[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('lote_gastos')
    .select(`
      id,
      lote_id,
      ceco_id,
      tipo,
      inductor,
      concepto,
      monto,
      fecha,
      created_at,
      platos (
        nombre
      )
    `)
    .eq('lote_id', loteId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error al obtener gastos:', error);
    return [];
  }

  return (data as any[]).map((g) => ({
    id: g.id,
    lote_id: g.lote_id,
    ceco_id: g.ceco_id,
    plato_nombre: g.platos?.nombre,
    tipo: g.tipo as TipoGastoLote,
    inductor: g.inductor as InductorProrrateo,
    concepto: g.concepto,
    monto: Number(g.monto ?? 0),
    fecha: g.fecha,
    created_at: g.created_at,
  }));
}

export async function registrarGastoLote(payload: {
  lote_id: string;
  concepto: string;
  monto: number;
  tipo: TipoGastoLote;
  inductor: InductorProrrateo;
  fecha: string;
  ceco_id?: string | null;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('lote_gastos').insert({
    lote_id: payload.lote_id,
    concepto: payload.concepto.trim(),
    monto: payload.monto,
    tipo: payload.tipo,
    inductor: payload.inductor,
    fecha: payload.fecha,
    ceco_id: payload.ceco_id || null,
  });

  if (error) {
    throw error;
  }
}
