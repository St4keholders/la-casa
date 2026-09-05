-- =============================================================================
-- LA CASA · 07 · Vistas
-- =============================================================================
-- Nota sobre `security_invoker`: en Postgres una vista se ejecuta por defecto
-- con los permisos de su DUEÑO, así que una vista creada por `postgres` sobre
-- tablas con RLS SE SALTA EL RLS. Es el error clásico de Supabase: se blinda
-- `libro_diario` con políticas y luego una vista de reportes lo deja abierto
-- a cualquier usuario autenticado. Todas las vistas internas van con
-- security_invoker = on. La única definer es la del menú público, y lo es
-- a propósito y con columnas escogidas a mano.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 7.1 MENÚ PÚBLICO  (lo que consume la tienda, sin login)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vista_menu_publico AS
SELECT
    l.codigo_lote,
    l.fecha_entrega_desde,
    l.fecha_entrega_hasta,
    l.tarifa_domicilio_cliente,
    p.id                AS plato_id,
    p.codigo_ceco,
    p.nombre,
    p.descripcion,
    p.kicker,
    p.palabra,
    p.foto_url,
    p.nota,
    p.ficha,
    p.color_bg,
    p.color_ink,
    p.color_accent,
    p.color_accent_ink,
    p.garnish,
    p.orden_vitrina,
    lc.precio_venta_lote AS precio,
    GREATEST(lc.unidades_proyectadas - lc.unidades_reservadas, 0) AS disponibles
FROM public.lotes l
JOIN public.lote_cecos lc ON lc.lote_id = l.id
JOIN public.platos p      ON p.id = lc.plato_id
WHERE l.estado = 'activo'
  AND p.activo;

COMMENT ON VIEW public.vista_menu_publico IS
'Contrato con el frontend. Reemplaza lib/dishes.ts: mismos campos que el tipo
Dish, más `disponibles`, que es el "quedan N" real en vez del número fijo.
No expone costos, ni proyecciones, ni márgenes.';

-- ---------------------------------------------------------------------------
-- 7.2 RENTABILIDAD POR CeCo · los 3 niveles del modelo ABC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vista_rendimiento_cecos
WITH (security_invoker = on) AS
WITH ventas AS (
    SELECT od.lote_id,
           od.plato_id,
           SUM(od.cantidad)  AS unidades_vendidas,
           SUM(od.subtotal)  AS ingreso_bruto,
           -- Snapshot congelado en el despacho. Editar una receta hoy ya no
           -- reescribe el margen del mes pasado.
           ROUND(SUM(od.cantidad * COALESCE(od.costo_mp_unitario, 0)), 2) AS costo_mp
    FROM public.orden_detalles od
    JOIN public.ordenes o ON o.id = od.orden_id
    WHERE o.estado = 'despachado'
    GROUP BY od.lote_id, od.plato_id
),
base AS (
    SELECT lc.lote_id,
           lc.plato_id,
           lc.precio_venta_lote,
           lc.unidades_proyectadas,
           lc.horas_coccion,
           COALESCE(v.unidades_vendidas, 0)   AS unidades_vendidas,
           COALESCE(v.ingreso_bruto,   0.00)  AS ingreso_bruto,
           COALESCE(v.costo_mp,        0.00)  AS costo_mp
    FROM public.lote_cecos lc
    LEFT JOIN ventas v ON v.lote_id = lc.lote_id AND v.plato_id = lc.plato_id
),
totales_lote AS (
    SELECT lote_id,
           SUM(unidades_vendidas)                  AS tot_unidades,
           SUM(ingreso_bruto)                      AS tot_ingreso,
           SUM(horas_coccion * unidades_vendidas)  AS tot_horas
    FROM base
    GROUP BY lote_id
),
merma AS (
    SELECT lote_id, ceco_id, SUM(costo_total_perdida) AS costo_merma
    FROM public.mermas_operativas
    WHERE ceco_id IS NOT NULL
    GROUP BY lote_id, ceco_id
),
nivel2 AS (   -- gastos atribuidos directamente a un platillo
    SELECT lote_id, ceco_id, SUM(monto) AS gasto_directo
    FROM public.lote_gastos
    WHERE inductor = 'directo'
    GROUP BY lote_id, ceco_id
),
nivel3 AS (   -- estructurales, repartidos por inductor
    SELECT b.lote_id,
           b.plato_id,
           ROUND(COALESCE(SUM(
               CASE g.inductor
                   WHEN 'unidades_vendidas' THEN
                       g.monto * (b.unidades_vendidas::NUMERIC / NULLIF(t.tot_unidades, 0))
                   WHEN 'ingreso_bruto' THEN
                       g.monto * (b.ingreso_bruto / NULLIF(t.tot_ingreso, 0))
                   WHEN 'horas_coccion' THEN
                       g.monto * ((b.horas_coccion * b.unidades_vendidas) / NULLIF(t.tot_horas, 0))
                   ELSE 0
               END
           ), 0), 2) AS cif_absorbido
    FROM base b
    JOIN totales_lote t ON t.lote_id = b.lote_id
    LEFT JOIN public.lote_gastos g
           ON g.lote_id = b.lote_id AND g.inductor <> 'directo'
    GROUP BY b.lote_id, b.plato_id
)
SELECT
    l.codigo_lote,
    l.estado                              AS estado_lote,
    p.codigo_ceco,
    p.nombre                              AS platillo,
    b.precio_venta_lote,
    b.unidades_proyectadas,
    b.unidades_vendidas,
    b.ingreso_bruto,
    b.costo_mp                            AS costo_nivel1_materia_prima,
    COALESCE(n2.gasto_directo, 0.00)      AS costo_nivel2_directo,
    COALESCE(n3.cif_absorbido, 0.00)      AS costo_nivel3_estructural,
    COALESCE(m.costo_merma, 0.00)         AS costo_merma,
    (b.ingreso_bruto - b.costo_mp)        AS utilidad_bruta,
    (b.ingreso_bruto
        - b.costo_mp
        - COALESCE(n2.gasto_directo, 0.00)
        - COALESCE(n3.cif_absorbido, 0.00)
        - COALESCE(m.costo_merma, 0.00))  AS utilidad_neta,
    ROUND(
        CASE WHEN b.ingreso_bruto > 0
             THEN ((b.ingreso_bruto - b.costo_mp) / b.ingreso_bruto) * 100
             ELSE 0 END, 2)               AS margen_bruto_porcentaje,
    ROUND(
        CASE WHEN b.ingreso_bruto > 0
             THEN ((b.ingreso_bruto - b.costo_mp
                    - COALESCE(n2.gasto_directo, 0.00)
                    - COALESCE(n3.cif_absorbido, 0.00)
                    - COALESCE(m.costo_merma, 0.00)) / b.ingreso_bruto) * 100
             ELSE 0 END, 2)               AS margen_neto_porcentaje,
    ROUND(
        CASE WHEN b.unidades_proyectadas > 0
             THEN (b.unidades_vendidas::NUMERIC / b.unidades_proyectadas) * 100
             ELSE 0 END, 2)               AS cumplimiento_proyeccion_porcentaje
FROM base b
JOIN public.lotes  l ON l.id = b.lote_id
JOIN public.platos p ON p.id = b.plato_id
LEFT JOIN merma  m  ON m.lote_id  = b.lote_id AND m.ceco_id  = b.plato_id
LEFT JOIN nivel2 n2 ON n2.lote_id = b.lote_id AND n2.ceco_id = b.plato_id
LEFT JOIN nivel3 n3 ON n3.lote_id = b.lote_id AND n3.plato_id = b.plato_id;

-- ---------------------------------------------------------------------------
-- 7.3 P&G DEL LOTE (desde el diario, no desde las órdenes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vista_pnl_lote
WITH (security_invoker = on) AS
SELECT
    l.codigo_lote,
    l.estado,
    SUM(CASE WHEN ld.cuenta = 'ingresos_ventas'         THEN ld.credito - ld.debito ELSE 0 END) AS ingresos,
    SUM(CASE WHEN ld.cuenta = 'costo_mercancia_vendida' THEN ld.debito - ld.credito ELSE 0 END) AS costo_mercancia_vendida,
    SUM(CASE WHEN ld.cuenta = 'perdida_merma'           THEN ld.debito - ld.credito ELSE 0 END) AS perdida_merma,
    SUM(CASE WHEN ld.cuenta = 'gasto_logistica'         THEN ld.debito - ld.credito ELSE 0 END) AS gasto_logistica,
    SUM(CASE WHEN ld.cuenta = 'gasto_mano_obra'         THEN ld.debito - ld.credito ELSE 0 END) AS gasto_mano_obra,
    SUM(CASE WHEN ld.cuenta = 'cif'                     THEN ld.debito - ld.credito ELSE 0 END) AS cif,
    -- Saldo pendiente de entregar al domiciliario. Si no da cero al final de
    -- la semana, o falta liquidarle o se cobró un flete que nadie llevó.
    SUM(CASE WHEN ld.cuenta = 'pasivo_domiciliario'     THEN ld.credito - ld.debito ELSE 0 END) AS pasivo_domiciliario_pendiente,
    SUM(CASE WHEN ld.cuenta = 'ingresos_ventas'         THEN ld.credito - ld.debito ELSE 0 END)
      - SUM(CASE WHEN ld.cuenta IN ('costo_mercancia_vendida','perdida_merma','gasto_logistica','gasto_mano_obra','cif')
                 THEN ld.debito - ld.credito ELSE 0 END) AS utilidad_operacional
FROM public.lotes l
LEFT JOIN public.libro_diario ld ON ld.lote_id = l.id
GROUP BY l.id, l.codigo_lote, l.estado;

-- ---------------------------------------------------------------------------
-- 7.4 ALERTAS DE INVENTARIO
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vista_alertas_inventario
WITH (security_invoker = on) AS
SELECT
    l.codigo_lote,
    i.nombre        AS insumo,
    i.unidad_medida,
    il.saldo_teorico,
    il.stock_final_real,
    il.varianza_conteo,
    ROUND(il.saldo_teorico * il.costo_unitario_aplicado, 2) AS valor_saldo,
    CASE
        WHEN il.saldo_teorico < 0 THEN 'sobreconsumo'
        WHEN il.varianza_conteo IS NOT NULL AND abs(il.varianza_conteo) > il.saldo_teorico * 0.05 THEN 'varianza_alta'
        WHEN il.saldo_teorico = 0 THEN 'agotado'
        ELSE 'ok'
    END AS alerta
FROM public.inventario_lote il
JOIN public.lotes   l ON l.id = il.lote_id
JOIN public.insumos i ON i.id = il.insumo_id;

COMMENT ON VIEW public.vista_alertas_inventario IS
'`sobreconsumo` significa que se despachó más de lo que había cargado: la
función de cierre original lo tapaba con GREATEST(saldo, 0) y el faltante
desaparecía sin dejar rastro.';

-- ---------------------------------------------------------------------------
-- 7.5 TABLERO DEL FIN DE SEMANA (cocina y despacho)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vista_produccion_dia
WITH (security_invoker = on) AS
SELECT
    o.lote_id,
    o.fecha_entrega,
    p.codigo_ceco,
    p.nombre AS platillo,
    SUM(od.cantidad) FILTER (WHERE o.estado IN ('recibida','confirmada','en_preparacion')) AS por_preparar,
    SUM(od.cantidad) FILTER (WHERE o.estado = 'empacado')   AS empacados,
    SUM(od.cantidad) FILTER (WHERE o.estado = 'despachado')  AS despachados,
    SUM(od.cantidad) FILTER (WHERE o.estado <> 'cancelada')  AS total_comprometido
FROM public.ordenes o
JOIN public.orden_detalles od ON od.orden_id = o.id
JOIN public.platos p ON p.id = od.plato_id
GROUP BY o.lote_id, o.fecha_entrega, p.codigo_ceco, p.nombre;
