import { createClient } from '@/lib/supabase/client';

export interface AlertaInventario {
  codigo_lote: string;
  insumo: string;
  unidad_medida: string;
  saldo_teorico: number;
  stock_final_real: number | null;
  varianza_conteo: number | null;
  valor_saldo: number;
  alerta: 'sobreconsumo' | 'varianza_alta' | 'agotado' | 'ok';
}

export interface FilaInventario {
  insumo_id: string;
  nombre: string;
  unidad_medida: string;
  costo_unitario_aplicado: number;
  stock_inicial: number;
  entradas_compras: number;
  consumo_teorico: number;
  bajas_merma: number;
  saldo_teorico: number;
  stock_final_real: number | null;
  varianza_conteo: number | null;
}

export async function getAlertasInventario(codigoLote?: string): Promise<AlertaInventario[]> {
  const supabase = createClient();
  let query = supabase.from('vista_alertas_inventario').select('*');

  if (codigoLote) {
    query = query.eq('codigo_lote', codigoLote);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error al consultar alertas:', error);
    return [];
  }

  return (data as unknown as Record<string, unknown>[])
    .filter((a) => a.alerta !== 'ok')
    .map((a) => ({
      codigo_lote: String(a.codigo_lote ?? ''),
      insumo: String(a.insumo ?? ''),
      unidad_medida: String(a.unidad_medida ?? ''),
      saldo_teorico: Number(a.saldo_teorico ?? 0),
      stock_final_real: a.stock_final_real !== null && a.stock_final_real !== undefined ? Number(a.stock_final_real) : null,
      varianza_conteo: a.varianza_conteo !== null && a.varianza_conteo !== undefined ? Number(a.varianza_conteo) : null,
      valor_saldo: Number(a.valor_saldo ?? 0),
      alerta: a.alerta as AlertaInventario['alerta'],
    }));
}

export async function getInventarioPerpetuo(loteId: string): Promise<FilaInventario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventario_lote')
    .select(`
      insumo_id,
      costo_unitario_aplicado,
      stock_inicial,
      entradas_compras,
      consumo_teorico,
      bajas_merma,
      saldo_teorico,
      stock_final_real,
      varianza_conteo,
      insumos (
        nombre,
        unidad_medida
      )
    `)
    .eq('lote_id', loteId)
    .order('saldo_teorico', { ascending: true });

  if (error || !data) {
    console.error('Error al consultar inventario perpetuo:', error);
    return [];
  }

  type RawFila = {
    insumo_id: string;
    costo_unitario_aplicado: number;
    stock_inicial: number;
    entradas_compras: number;
    consumo_teorico: number;
    bajas_merma: number;
    saldo_teorico: number;
    stock_final_real: number | null;
    varianza_conteo: number | null;
    insumos: {
      nombre: string;
      unidad_medida: string;
    } | null;
  };

  return (data as unknown as RawFila[]).map((r) => ({
    insumo_id: r.insumo_id,
    nombre: r.insumos?.nombre ?? 'Insumo',
    unidad_medida: r.insumos?.unidad_medida ?? 'un',
    costo_unitario_aplicado: Number(r.costo_unitario_aplicado ?? 0),
    stock_inicial: Number(r.stock_inicial ?? 0),
    entradas_compras: Number(r.entradas_compras ?? 0),
    consumo_teorico: Number(r.consumo_teorico ?? 0),
    bajas_merma: Number(r.bajas_merma ?? 0),
    saldo_teorico: Number(r.saldo_teorico ?? 0),
    stock_final_real: r.stock_final_real !== null ? Number(r.stock_final_real) : null,
    varianza_conteo: r.varianza_conteo !== null ? Number(r.varianza_conteo) : null,
  }));
}

export async function guardarConteoFisico(
  loteId: string,
  insumoId: string,
  conteo: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inventario_lote')
    .update({ stock_final_real: conteo })
    .eq('lote_id', loteId)
    .eq('insumo_id', insumoId);

  if (error) {
    throw error;
  }
}

export async function registrarCompra(payload: {
  lote_id: string;
  proveedor: string;
  documento: string;
  insumo_id: string;
  cantidad: number;
  costo_unitario: number;
}): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('fn_registrar_compra', {
    p_lote_id: payload.lote_id,
    p_proveedor: payload.proveedor,
    p_documento: payload.documento,
    p_items: [
      {
        insumo_id: payload.insumo_id,
        cantidad: payload.cantidad,
        costo_unitario: payload.costo_unitario,
      },
    ],
  });

  if (error) {
    throw error;
  }

  return data as string;
}
