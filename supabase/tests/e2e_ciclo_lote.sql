-- =============================================================================
-- LA CASA · Prueba end-to-end de un ciclo semanal completo
-- Correr con:  psql -v ON_ERROR_STOP=1 -f e2e_ciclo_lote.sql
-- =============================================================================
\set QUIET on
SET client_min_messages = warning;

-- Usuario admin simulado -----------------------------------------------------
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin@lacasa.co', '{"nombre":"Admin"}');
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '── 1. Rol del primer usuario (esperado: admin)'
SELECT rol FROM public.usuarios;

-- Maestros -------------------------------------------------------------------
INSERT INTO public.insumos (id, codigo, nombre, categoria, unidad_medida, costo_unitario_promedio, es_perecedero) VALUES
 ('a0000000-0000-0000-0000-000000000001','POLLO','Pechuga de pollo','proteina','g', 22.0000, TRUE),
 ('a0000000-0000-0000-0000-000000000002','ARROZ','Arroz blanco',    'grano',   'g',  4.5000, FALSE),
 ('a0000000-0000-0000-0000-000000000003','TARR', 'Tarrina hermética','empaque','unidad', 900.0000, FALSE);

INSERT INTO public.platos (id, codigo_ceco, nombre, precio_venta_sugerido, palabra, kicker, garnish) VALUES
 ('b0000000-0000-0000-0000-000000000001','CC-POLLO','Pechuga a la plancha', 22000, 'Pollo', 'Pechuga',
  ARRAY['lime','chili','cilantro','arepa','aguacate','corn']);

INSERT INTO public.receta_detalles (plato_id, insumo_id, cantidad_neta, porcentaje_merma_esperado) VALUES
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001', 180, 10),  -- 198 g brutos
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002', 150, 0),
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',   1, 0);

\echo '── 2. cantidad_bruta_calculada (esperado 198 para el pollo)'
SELECT i.codigo, rd.cantidad_neta, rd.porcentaje_merma_esperado, rd.cantidad_bruta_calculada
FROM public.receta_detalles rd JOIN public.insumos i ON i.id = rd.insumo_id ORDER BY i.codigo;

-- Lote -----------------------------------------------------------------------
INSERT INTO public.lotes (id, codigo_lote, fecha_entrega_desde, fecha_entrega_hasta, estado,
                          tarifa_fija_domiciliario, tarifa_domicilio_cliente)
VALUES ('c0000000-0000-0000-0000-000000000001','LOTE-2026-W38','2026-09-12','2026-09-13','activo', 90000, 6000);

INSERT INTO public.lote_cecos (lote_id, plato_id, unidades_proyectadas, precio_venta_lote, horas_coccion)
VALUES ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001', 20, 22000, 0.25);

SELECT public.fn_preparar_inventario_lote('c0000000-0000-0000-0000-000000000001');

SELECT public.fn_registrar_compra(
  'c0000000-0000-0000-0000-000000000001', 'Carnes El Poblado', 'FV-001',
  '[{"insumo_id":"a0000000-0000-0000-0000-000000000001","cantidad":5000,"costo_unitario":24},
    {"insumo_id":"a0000000-0000-0000-0000-000000000002","cantidad":4000,"costo_unitario":4.5},
    {"insumo_id":"a0000000-0000-0000-0000-000000000003","cantidad":30,"costo_unitario":900}]'::jsonb);

-- Pedido público (sesión anónima) --------------------------------------------
SELECT set_config('request.jwt.claim.sub', '', false);

\echo '── 3. Pedido creado desde la tienda'
SELECT * FROM public.fn_crear_orden_publica(
  'María Restrepo', '3025219775', 'Cra 43A #7-50, Poblado, al lado de la panadería',
  '2026-09-12', 'Sin picante',
  '[{"plato_id":"b0000000-0000-0000-0000-000000000001","cantidad":3}]'::jsonb
);

\echo '── 4. El precio lo pone la base, no el cliente (esperado 22000 y total 72000)'
SELECT codigo_orden, subtotal_platos, valor_domicilio_cobrado, total_orden FROM public.ordenes;

\echo '── 5. Cupo reservado (esperado 3 de 20)'
SELECT unidades_proyectadas, unidades_reservadas FROM public.lote_cecos;

\echo '── 6. Intento de sobreventa: 25 unidades más sobre 17 disponibles'
DO $$
BEGIN
  PERFORM public.fn_crear_orden_publica(
    'Atacante','3001234567','Calle falsa 123 con carrera inventada','2026-09-12',NULL,
    '[{"plato_id":"b0000000-0000-0000-0000-000000000001","cantidad":25}]'::jsonb);
  RAISE EXCEPTION 'FALLO: la sobreventa pasó';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK · sobreventa rechazada: %', SQLERRM;
END $$;

\echo '── 7. Plato que no está en la carta de la semana'
DO $$
BEGIN
  PERFORM public.fn_crear_orden_publica(
    'Curioso','3001234567','Calle falsa 123 con carrera inventada','2026-09-12',NULL,
    '[{"plato_id":"b0000000-0000-0000-0000-0000000000ff","cantidad":1}]'::jsonb);
  RAISE EXCEPTION 'FALLO: aceptó un plato inexistente';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK · plato fuera de carta rechazado';
END $$;

-- Despacho -------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
UPDATE public.ordenes SET estado = 'despachado';

\echo '── 8. Inventario tras despachar 3 almuerzos (pollo: 5000 - 594 = 4406)'
SELECT i.codigo, il.entradas_compras, il.consumo_teorico, il.saldo_teorico, il.costo_unitario_aplicado
FROM public.inventario_lote il JOIN public.insumos i ON i.id = il.insumo_id ORDER BY i.codigo;

\echo '── 9. Costo MP congelado por unidad (198*24 + 150*4.5 + 1*900 = 6327)'
SELECT cantidad, precio_unitario, costo_mp_unitario FROM public.orden_detalles;

\echo '── 10. Libro diario: todo asiento debe cuadrar'
SELECT tipo_asiento, cuenta, debito, credito FROM public.libro_diario ORDER BY fecha_registro, cuenta;

\echo '── 11. Cuadre global por transacción (esperado: 0 descuadres)'
SELECT count(*) AS descuadres FROM (
  SELECT transaccion_id FROM public.libro_diario
  GROUP BY transaccion_id HAVING SUM(debito) <> SUM(credito)) x;

\echo '── 12. Re-despachar la misma orden (debe fallar, no duplicar asientos)'
DO $$
BEGIN
  UPDATE public.ordenes SET estado = 'despachado';
  RAISE NOTICE 'Sin cambio de estado: no reentra (correcto)';
  UPDATE public.ordenes SET estado = 'empacado';
  RAISE EXCEPTION 'FALLO: permitió salir de despachado';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK · transición desde despachado bloqueada';
END $$;

-- Merma ----------------------------------------------------------------------
\echo '── 13. Merma de 400 g de pollo quemado'
INSERT INTO public.mermas_operativas (lote_id, ceco_id, insumo_id, cantidad, tipo_baja, motivo)
VALUES ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001', 400, 'dano_cocina', 'Pechugas quemadas en plancha');

SELECT costo_total_perdida FROM public.mermas_operativas;
SELECT bajas_merma, saldo_teorico FROM public.inventario_lote
WHERE insumo_id = 'a0000000-0000-0000-0000-000000000001';

-- Nivel 2 y 3 ----------------------------------------------------------------
INSERT INTO public.lote_gastos (lote_id, ceco_id, tipo, inductor, concepto, monto) VALUES
 ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','mano_obra','directo','Refuerzo de cocina sábado', 40000),
 ('c0000000-0000-0000-0000-000000000001', NULL, 'cif','horas_coccion','Gas y energía', 30000);

\echo '── 14. Rentabilidad por CeCo con los 3 niveles'
SELECT codigo_ceco, unidades_vendidas, ingreso_bruto,
       costo_nivel1_materia_prima, costo_nivel2_directo, costo_nivel3_estructural, costo_merma,
       utilidad_neta, margen_bruto_porcentaje, margen_neto_porcentaje
FROM public.vista_rendimiento_cecos;

\echo '── 15. P&G del lote'
SELECT ingresos, costo_mercancia_vendida, perdida_merma, pasivo_domiciliario_pendiente, utilidad_operacional
FROM public.vista_pnl_lote;

\echo '── 16. El libro diario es inmutable'
DO $$
BEGIN
  UPDATE public.libro_diario SET debito = 1;
  RAISE EXCEPTION 'FALLO: permitió editar el diario';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK · diario inmutable';
END $$;

-- Cierre ---------------------------------------------------------------------
INSERT INTO public.lotes (id, codigo_lote, fecha_entrega_desde, fecha_entrega_hasta, estado)
VALUES ('c0000000-0000-0000-0000-000000000002','LOTE-2026-W39','2026-09-19','2026-09-20','borrador');
INSERT INTO public.lote_cecos (lote_id, plato_id, unidades_proyectadas, precio_venta_lote)
VALUES ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001', 20, 22000);

\echo '── 17. Cierre y traspaso (perecedero se da de baja, no perecedero viaja)'
SELECT * FROM public.fn_cerrar_y_transferir_lote(
  'c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002');

SELECT i.codigo, i.es_perecedero, il.stock_inicial
FROM public.inventario_lote il JOIN public.insumos i ON i.id = il.insumo_id
WHERE il.lote_id = 'c0000000-0000-0000-0000-000000000002' ORDER BY i.codigo;

\echo '── 18. Menú público de la tienda'
SELECT codigo_ceco, nombre, precio, disponibles FROM public.vista_menu_publico;
