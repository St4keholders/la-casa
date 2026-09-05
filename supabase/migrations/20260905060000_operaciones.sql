-- =============================================================================
-- LA CASA · 06 · Lógica de negocio
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 PREPARAR EL INVENTARIO DEL LOTE
-- ---------------------------------------------------------------------------
-- El trigger original hacía `UPDATE inventario_lote ... WHERE lote_id = ...`.
-- Si la fila no existía, el UPDATE afectaba 0 filas y no pasaba nada: se
-- despachaba comida sin descontar un solo gramo, en silencio. Esta función
-- garantiza que la fila exista para todo insumo de las recetas del lote.
CREATE OR REPLACE FUNCTION public.fn_preparar_inventario_lote(p_lote_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_creadas INTEGER;
BEGIN
    PERFORM public.fn_exigir_rol('cocina');

    INSERT INTO public.inventario_lote (lote_id, insumo_id, costo_unitario_aplicado)
    SELECT DISTINCT p_lote_id, rd.insumo_id, i.costo_unitario_promedio
    FROM public.lote_cecos lc
    JOIN public.receta_detalles rd ON rd.plato_id = lc.plato_id
    JOIN public.insumos i ON i.id = rd.insumo_id
    WHERE lc.lote_id = p_lote_id
    ON CONFLICT (lote_id, insumo_id) DO NOTHING;

    GET DIAGNOSTICS v_creadas = ROW_COUNT;
    RETURN v_creadas;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6.2 COMPRAS · costo promedio ponderado + asiento
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_registrar_compra(
    p_lote_id   UUID,
    p_proveedor TEXT,
    p_documento TEXT,
    p_items     JSONB   -- [{"insumo_id":"...","cantidad":5000,"costo_unitario":12.5}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_compra_id UUID;
    v_txn       UUID := gen_random_uuid();
    v_total     NUMERIC(14, 2) := 0;
    r           RECORD;
BEGIN
    PERFORM public.fn_exigir_rol('admin');

    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La compra no tiene items.';
    END IF;

    INSERT INTO public.compras (lote_id, proveedor, documento, registrado_por)
    VALUES (p_lote_id, p_proveedor, p_documento, auth.uid())
    RETURNING id INTO v_compra_id;

    FOR r IN
        SELECT (it->>'insumo_id')::UUID     AS insumo_id,
               (it->>'cantidad')::NUMERIC   AS cantidad,
               (it->>'costo_unitario')::NUMERIC AS costo_unitario
        FROM jsonb_array_elements(p_items) it
    LOOP
        INSERT INTO public.compra_detalles (compra_id, insumo_id, cantidad, costo_unitario)
        VALUES (v_compra_id, r.insumo_id, r.cantidad, r.costo_unitario);

        INSERT INTO public.inventario_lote (lote_id, insumo_id, entradas_compras, costo_unitario_aplicado)
        VALUES (p_lote_id, r.insumo_id, r.cantidad, r.costo_unitario)
        ON CONFLICT (lote_id, insumo_id) DO UPDATE
        SET entradas_compras = inventario_lote.entradas_compras + EXCLUDED.entradas_compras,
            -- Promedio ponderado sobre el saldo disponible antes de la entrada.
            costo_unitario_aplicado = CASE
                WHEN GREATEST(inventario_lote.saldo_teorico, 0) + r.cantidad > 0 THEN
                    ROUND((
                        GREATEST(inventario_lote.saldo_teorico, 0) * inventario_lote.costo_unitario_aplicado
                        + r.cantidad * r.costo_unitario
                    ) / (GREATEST(inventario_lote.saldo_teorico, 0) + r.cantidad), 4)
                ELSE r.costo_unitario
            END;

        -- Mantener sincronizado el costo de referencia del maestro.
        UPDATE public.insumos
        SET costo_unitario_promedio = r.costo_unitario
        WHERE id = r.insumo_id;

        v_total := v_total + ROUND(r.cantidad * r.costo_unitario, 2);
    END LOOP;

    -- Asiento: entra inventario, sale caja.
    INSERT INTO public.libro_diario (transaccion_id, lote_id, tipo_asiento, cuenta, descripcion, debito)
    VALUES (v_txn, p_lote_id, 'compra_insumo', 'inventario',
            'Compra de insumos ' || COALESCE(p_documento, '(sin documento)'), v_total);

    INSERT INTO public.libro_diario (transaccion_id, lote_id, tipo_asiento, cuenta, descripcion, credito)
    VALUES (v_txn, p_lote_id, 'compra_insumo', 'caja_bancos',
            'Pago compra ' || COALESCE(p_proveedor, 'proveedor'), v_total);

    RETURN v_compra_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6.3 PEDIDO PÚBLICO desde la tienda
-- ---------------------------------------------------------------------------
-- Esta es la pieza que faltaba por completo. Todas las políticas RLS del
-- esquema original eran `TO authenticated` con rol admin/cocina/repartidor, y
-- no había ninguna política de INSERT sobre `ordenes`: con ese esquema tal
-- cual, un cliente anónimo en la tienda NO PUEDE crear un pedido. Nadie puede.
--
-- El precio, el flete y el lote los resuelve la base. Del navegador solo se
-- aceptan datos de contacto y la lista de (plato, cantidad).
CREATE OR REPLACE FUNCTION public.fn_crear_orden_publica(
    p_cliente_nombre   TEXT,
    p_cliente_telefono TEXT,
    p_direccion        TEXT,
    p_fecha_entrega    DATE,
    p_nota             TEXT,
    p_items            JSONB,          -- [{"plato_id":"...","cantidad":2}]
    p_tipo_domicilio   tipo_domicilio DEFAULT 'pagado_cliente'
)
RETURNS TABLE (orden_id UUID, codigo_orden TEXT, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lote      RECORD;
    v_orden_id  UUID;
    v_codigo    TEXT;
    v_flete     NUMERIC(12, 2) := 0;
    v_items     INTEGER;
    v_unidades  INTEGER;
BEGIN
    IF jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Formato de pedido inválido.' USING ERRCODE = 'check_violation';
    END IF;

    v_items := jsonb_array_length(p_items);
    IF v_items = 0 OR v_items > 10 THEN
        RAISE EXCEPTION 'El pedido debe tener entre 1 y 10 platos distintos.'
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT SUM((it->>'cantidad')::INTEGER) INTO v_unidades
    FROM jsonb_array_elements(p_items) it;

    -- Tope antiabuso. La tienda es pública; sin límite, un script deja el lote
    -- en cero reservado y nadie más puede pedir.
    IF v_unidades IS NULL OR v_unidades < 1 OR v_unidades > 30 THEN
        RAISE EXCEPTION 'Cantidad total fuera de rango (1 a 30 almuerzos).'
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO v_lote FROM public.lotes WHERE estado = 'activo';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay pedidos abiertos en este momento.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_fecha_entrega < v_lote.fecha_entrega_desde OR p_fecha_entrega > v_lote.fecha_entrega_hasta THEN
        RAISE EXCEPTION 'La fecha de entrega no está dentro de la semana habilitada.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_tipo_domicilio = 'pagado_cliente' THEN
        v_flete := v_lote.tarifa_domicilio_cliente;
    END IF;

    v_codigo := 'PED-' || to_char(now() AT TIME ZONE 'America/Bogota', 'YYMMDD')
                || '-' || lpad(nextval('public.seq_codigo_orden')::TEXT, 4, '0');

    INSERT INTO public.ordenes (
        lote_id, codigo_orden, canal, cliente_nombre, cliente_telefono,
        direccion_entrega, nota_cliente, fecha_entrega, tipo_domicilio,
        valor_domicilio_cobrado
    ) VALUES (
        v_lote.id, v_codigo, 'web', btrim(p_cliente_nombre), btrim(p_cliente_telefono),
        NULLIF(btrim(COALESCE(p_direccion, '')), ''), NULLIF(btrim(COALESCE(p_nota, '')), ''),
        p_fecha_entrega, p_tipo_domicilio, v_flete
    )
    RETURNING id INTO v_orden_id;

    -- El precio SIEMPRE sale de lote_cecos. El JOIN además actúa de validación:
    -- un plato que no esté en la carta de la semana simplemente no inserta fila,
    -- y el conteo de abajo lo detecta.
    INSERT INTO public.orden_detalles (orden_id, lote_id, plato_id, cantidad, precio_unitario)
    SELECT v_orden_id,
           v_lote.id,
           lc.plato_id,
           (it->>'cantidad')::INTEGER,
           lc.precio_venta_lote
    FROM jsonb_array_elements(p_items) it
    JOIN public.lote_cecos lc
      ON lc.lote_id = v_lote.id
     AND lc.plato_id = (it->>'plato_id')::UUID;

    IF (SELECT COUNT(*) FROM public.orden_detalles WHERE orden_detalles.orden_id = v_orden_id) <> v_items THEN
        RAISE EXCEPTION 'Uno de los platos ya no está disponible esta semana.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN QUERY
    SELECT o.id, o.codigo_orden::TEXT, o.total_orden
    FROM public.ordenes o WHERE o.id = v_orden_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6.4 DESPACHO · explosión BOM + COGS + asientos
-- ---------------------------------------------------------------------------
-- Va en AFTER UPDATE, no en BEFORE. En un BEFORE trigger los INSERT al diario
-- ya quedan escritos aunque otro trigger posterior cancele el UPDATE de la
-- orden: se contabiliza una venta que nunca cambió de estado.
CREATE OR REPLACE FUNCTION public.fn_contabilizar_despacho()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_txn_venta  UUID := gen_random_uuid();
    v_txn_cogs   UUID := gen_random_uuid();
    v_txn_flete  UUID := gen_random_uuid();
    v_faltantes  TEXT;
    v_costo_tot  NUMERIC(14, 2);
BEGIN
    IF NOT (NEW.estado = 'despachado' AND OLD.estado IS DISTINCT FROM 'despachado') THEN
        RETURN NULL;
    END IF;

    -- Fallar ruidosamente si falta inventario cargado.
    SELECT string_agg(DISTINCT i.nombre, ', ')
    INTO v_faltantes
    FROM public.orden_detalles od
    JOIN public.receta_detalles rd ON rd.plato_id = od.plato_id
    JOIN public.insumos i ON i.id = rd.insumo_id
    LEFT JOIN public.inventario_lote il
           ON il.lote_id = NEW.lote_id AND il.insumo_id = rd.insumo_id
    WHERE od.orden_id = NEW.id AND il.id IS NULL;

    IF v_faltantes IS NOT NULL THEN
        RAISE EXCEPTION
            'El lote no tiene inventario cargado para: %. Corre fn_preparar_inventario_lote() antes de despachar.',
            v_faltantes
            USING ERRCODE = 'check_violation';
    END IF;

    -- 1. Congelar el costo unitario de materia prima de cada línea.
    UPDATE public.orden_detalles od
    SET costo_mp_unitario = c.costo_unit
    FROM (
        SELECT od2.id,
               ROUND(SUM(rd.cantidad_bruta_calculada * il.costo_unitario_aplicado), 4) AS costo_unit
        FROM public.orden_detalles od2
        JOIN public.receta_detalles rd ON rd.plato_id = od2.plato_id
        JOIN public.inventario_lote il
             ON il.lote_id = od2.lote_id AND il.insumo_id = rd.insumo_id
        WHERE od2.orden_id = NEW.id
        GROUP BY od2.id
    ) c
    WHERE od.id = c.id;

    -- 2. Descontar inventario (explosión de recetas, agregada en una sola pasada).
    UPDATE public.inventario_lote il
    SET consumo_teorico = il.consumo_teorico + x.gasto
    FROM (
        SELECT rd.insumo_id, SUM(od.cantidad * rd.cantidad_bruta_calculada) AS gasto
        FROM public.orden_detalles od
        JOIN public.receta_detalles rd ON rd.plato_id = od.plato_id
        WHERE od.orden_id = NEW.id
        GROUP BY rd.insumo_id
    ) x
    WHERE il.lote_id = NEW.lote_id AND il.insumo_id = x.insumo_id;

    -- 3. Asiento de venta: caja contra ingresos, con el ingreso abierto por CeCo.
    IF NEW.subtotal_platos > 0 THEN
        INSERT INTO public.libro_diario (transaccion_id, lote_id, orden_id, tipo_asiento, cuenta, descripcion, debito)
        VALUES (v_txn_venta, NEW.lote_id, NEW.id, 'venta_almuerzo', 'caja_bancos',
                'Venta almuerzos orden ' || NEW.codigo_orden, NEW.subtotal_platos);

        INSERT INTO public.libro_diario (transaccion_id, lote_id, ceco_id, orden_id, tipo_asiento, cuenta, descripcion, credito)
        SELECT v_txn_venta, NEW.lote_id, od.plato_id, NEW.id, 'venta_almuerzo', 'ingresos_ventas',
               'Ingreso ' || p.codigo_ceco || ' · orden ' || NEW.codigo_orden, od.subtotal
        FROM public.orden_detalles od
        JOIN public.platos p ON p.id = od.plato_id
        WHERE od.orden_id = NEW.id;
    END IF;

    -- 4. Asiento de costo: COGS por CeCo contra inventario.
    SELECT ROUND(SUM(od.cantidad * COALESCE(od.costo_mp_unitario, 0)), 2)
    INTO v_costo_tot
    FROM public.orden_detalles od WHERE od.orden_id = NEW.id;

    IF COALESCE(v_costo_tot, 0) > 0 THEN
        INSERT INTO public.libro_diario (transaccion_id, lote_id, ceco_id, orden_id, tipo_asiento, cuenta, descripcion, debito)
        SELECT v_txn_cogs, NEW.lote_id, od.plato_id, NEW.id, 'costo_mercancia_vendida', 'costo_mercancia_vendida',
               'Costo MP ' || p.codigo_ceco || ' · orden ' || NEW.codigo_orden,
               ROUND(od.cantidad * COALESCE(od.costo_mp_unitario, 0), 2)
        FROM public.orden_detalles od
        JOIN public.platos p ON p.id = od.plato_id
        WHERE od.orden_id = NEW.id
          AND ROUND(od.cantidad * COALESCE(od.costo_mp_unitario, 0), 2) > 0;

        INSERT INTO public.libro_diario (transaccion_id, lote_id, orden_id, tipo_asiento, cuenta, descripcion, credito)
        VALUES (v_txn_cogs, NEW.lote_id, NEW.id, 'costo_mercancia_vendida', 'inventario',
                'Salida de inventario · orden ' || NEW.codigo_orden, v_costo_tot);

        UPDATE public.ordenes SET costo_mp_total = v_costo_tot WHERE id = NEW.id;
    END IF;

    -- 5. Logística. Flete cobrado al cliente = plata de terceros, no ingreso.
    IF NEW.tipo_domicilio = 'pagado_cliente' AND NEW.valor_domicilio_cobrado > 0 THEN
        INSERT INTO public.libro_diario (transaccion_id, lote_id, orden_id, tipo_asiento, cuenta, descripcion, debito, es_pasivo_tercero)
        VALUES (v_txn_flete, NEW.lote_id, NEW.id, 'cobro_domicilio_tercero', 'caja_bancos',
                'Recaudo flete orden ' || NEW.codigo_orden, NEW.valor_domicilio_cobrado, TRUE);

        INSERT INTO public.libro_diario (transaccion_id, lote_id, orden_id, tipo_asiento, cuenta, descripcion, credito, es_pasivo_tercero)
        VALUES (v_txn_flete, NEW.lote_id, NEW.id, 'cobro_domicilio_tercero', 'pasivo_domiciliario',
                'Flete por entregar al domiciliario · orden ' || NEW.codigo_orden, NEW.valor_domicilio_cobrado, TRUE);

    ELSIF NEW.tipo_domicilio = 'cubierto_por_lote' AND NEW.costo_domicilio_real > 0 THEN
        INSERT INTO public.libro_diario (transaccion_id, lote_id, orden_id, tipo_asiento, cuenta, descripcion, debito)
        VALUES (v_txn_flete, NEW.lote_id, NEW.id, 'gasto_domicilio', 'gasto_logistica',
                'Domicilio asumido · orden ' || NEW.codigo_orden, NEW.costo_domicilio_real);

        INSERT INTO public.libro_diario (transaccion_id, lote_id, orden_id, tipo_asiento, cuenta, descripcion, credito)
        VALUES (v_txn_flete, NEW.lote_id, NEW.id, 'gasto_domicilio', 'caja_bancos',
                'Pago domicilio · orden ' || NEW.codigo_orden, NEW.costo_domicilio_real);
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_contabilizar_despacho
    AFTER UPDATE OF estado ON public.ordenes
    FOR EACH ROW EXECUTE FUNCTION public.fn_contabilizar_despacho();

-- ---------------------------------------------------------------------------
-- 6.5 MERMA · descuenta stock y golpea el CeCo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_contabilizar_merma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_txn   UUID := gen_random_uuid();
    v_costo NUMERIC(14, 2);
BEGIN
    SELECT ROUND(NEW.cantidad * il.costo_unitario_aplicado, 2)
    INTO v_costo
    FROM public.inventario_lote il
    WHERE il.lote_id = NEW.lote_id AND il.insumo_id = NEW.insumo_id;

    IF v_costo IS NULL THEN
        RAISE EXCEPTION 'El insumo no está cargado en el inventario del lote.'
            USING ERRCODE = 'check_violation';
    END IF;

    UPDATE public.inventario_lote
    SET bajas_merma = bajas_merma + NEW.cantidad
    WHERE lote_id = NEW.lote_id AND insumo_id = NEW.insumo_id;

    UPDATE public.mermas_operativas
    SET costo_total_perdida = v_costo
    WHERE id = NEW.id;

    IF v_costo > 0 THEN
        INSERT INTO public.libro_diario (transaccion_id, lote_id, ceco_id, tipo_asiento, cuenta, descripcion, debito)
        VALUES (v_txn, NEW.lote_id, NEW.ceco_id, 'baja_merma', 'perdida_merma',
                'Merma ' || NEW.tipo_baja || ': ' || NEW.motivo, v_costo);

        INSERT INTO public.libro_diario (transaccion_id, lote_id, tipo_asiento, cuenta, descripcion, credito)
        VALUES (v_txn, NEW.lote_id, 'baja_merma', 'inventario',
                'Baja de inventario por merma', v_costo);
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_contabilizar_merma
    AFTER INSERT ON public.mermas_operativas
    FOR EACH ROW EXECUTE FUNCTION public.fn_contabilizar_merma();

-- ---------------------------------------------------------------------------
-- 6.6 CIERRE Y TRASPASO
-- ---------------------------------------------------------------------------
-- La versión original leía `i.es_perecedero` en el cursor y nunca lo usaba:
-- el pollo crudo del domingo pasaba tal cual como stock inicial del lote
-- siguiente. Aquí lo perecedero se da de baja como merma (con su asiento) y
-- solo lo no perecedero viaja.
CREATE OR REPLACE FUNCTION public.fn_cerrar_y_transferir_lote(
    p_lote_actual_id UUID,
    p_lote_nuevo_id  UUID
)
RETURNS TABLE (insumos_transferidos INTEGER, insumos_dados_de_baja INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r_inv       RECORD;
    v_saldo     NUMERIC(12, 4);
    v_transf    INTEGER := 0;
    v_baja      INTEGER := 0;
    v_pendientes INTEGER;
BEGIN
    PERFORM public.fn_exigir_rol('admin');

    SELECT COUNT(*) INTO v_pendientes
    FROM public.ordenes
    WHERE lote_id = p_lote_actual_id
      AND estado NOT IN ('despachado', 'cancelada');

    IF v_pendientes > 0 THEN
        RAISE EXCEPTION 'Quedan % órdenes sin despachar ni cancelar en el lote.', v_pendientes
            USING ERRCODE = 'check_violation';
    END IF;

    FOR r_inv IN
        SELECT il.insumo_id,
               il.costo_unitario_aplicado,
               i.es_perecedero,
               COALESCE(il.stock_final_real, il.saldo_teorico) AS saldo
        FROM public.inventario_lote il
        JOIN public.insumos i ON i.id = il.insumo_id
        WHERE il.lote_id = p_lote_actual_id
    LOOP
        v_saldo := GREATEST(r_inv.saldo, 0);
        CONTINUE WHEN v_saldo <= 0;

        IF r_inv.es_perecedero THEN
            INSERT INTO public.mermas_operativas (
                lote_id, insumo_id, cantidad, tipo_baja, motivo, reportado_por
            ) VALUES (
                p_lote_actual_id, r_inv.insumo_id, v_saldo, 'perecedero_no_transferible',
                'Saldo perecedero al cierre del lote: no se traslada', auth.uid()
            );
            v_baja := v_baja + 1;
        ELSE
            INSERT INTO public.inventario_lote (
                lote_id, insumo_id, stock_inicial, costo_unitario_aplicado
            ) VALUES (
                p_lote_nuevo_id, r_inv.insumo_id, v_saldo, r_inv.costo_unitario_aplicado
            )
            ON CONFLICT (lote_id, insumo_id) DO UPDATE
            SET stock_inicial = inventario_lote.stock_inicial + EXCLUDED.stock_inicial;
            v_transf := v_transf + 1;
        END IF;
    END LOOP;

    UPDATE public.lotes
    SET estado = 'cerrado', fecha_cierre = public.fn_hoy_bogota()
    WHERE id = p_lote_actual_id;

    UPDATE public.lotes
    SET estado = 'activo', lote_anterior_id = p_lote_actual_id
    WHERE id = p_lote_nuevo_id;

    PERFORM public.fn_preparar_inventario_lote(p_lote_nuevo_id);

    RETURN QUERY SELECT v_transf, v_baja;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6.7 ANULAR UNA ORDEN YA DESPACHADA
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_anular_orden_despachada(
    p_orden_id UUID,
    p_motivo   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_txn UUID := gen_random_uuid();
    v_o   RECORD;
BEGIN
    PERFORM public.fn_exigir_rol('admin');

    SELECT * INTO v_o FROM public.ordenes WHERE id = p_orden_id;
    IF v_o.estado <> 'despachado' THEN
        RAISE EXCEPTION 'Solo se anulan órdenes despachadas.' USING ERRCODE = 'check_violation';
    END IF;

    -- Reversión espejo. No se borra nada: el diario es inmutable.
    INSERT INTO public.libro_diario (transaccion_id, lote_id, ceco_id, orden_id, tipo_asiento, cuenta, descripcion, debito, credito, es_pasivo_tercero)
    SELECT v_txn, ld.lote_id, ld.ceco_id, ld.orden_id, 'anulacion', ld.cuenta,
           'REVERSIÓN · ' || p_motivo || ' · ' || ld.descripcion,
           ld.credito, ld.debito, ld.es_pasivo_tercero
    FROM public.libro_diario ld
    WHERE ld.orden_id = p_orden_id AND ld.tipo_asiento <> 'anulacion';

    -- Devolver el inventario consumido.
    UPDATE public.inventario_lote il
    SET consumo_teorico = GREATEST(il.consumo_teorico - x.gasto, 0)
    FROM (
        SELECT rd.insumo_id, SUM(od.cantidad * rd.cantidad_bruta_calculada) AS gasto
        FROM public.orden_detalles od
        JOIN public.receta_detalles rd ON rd.plato_id = od.plato_id
        WHERE od.orden_id = p_orden_id
        GROUP BY rd.insumo_id
    ) x
    WHERE il.lote_id = v_o.lote_id AND il.insumo_id = x.insumo_id;

    -- Liberar cupos y marcar. Se salta la máquina de estados a propósito:
    -- esta función ES el camino autorizado para revertir. La bandera es local
    -- a la transacción (tercer argumento TRUE), así que no se filtra a otras
    -- sesiones ni sobrevive al commit.
    PERFORM set_config('la_casa.reversion_autorizada', 'on', TRUE);

    UPDATE public.ordenes
    SET estado = 'cancelada', motivo_cancelacion = p_motivo, cancelado_at = now()
    WHERE id = p_orden_id;

    PERFORM set_config('la_casa.reversion_autorizada', 'off', TRUE);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6.8 GASTOS DE LOTE (Nivel 2 y 3) → libro diario
-- ---------------------------------------------------------------------------
-- Sin esto, `vista_rendimiento_cecos` descuenta la mano de obra y el CIF del
-- margen por platillo, pero `vista_pnl_lote` (que se arma desde el diario) no
-- los ve: los dos reportes dan utilidades distintas para la misma semana.
CREATE OR REPLACE FUNCTION public.fn_contabilizar_gasto_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_txn    UUID := gen_random_uuid();
    v_cuenta cuenta_contable;
    v_tipo   tipo_asiento_diario;
BEGIN
    SELECT CASE NEW.tipo
             WHEN 'mano_obra' THEN 'gasto_mano_obra'::cuenta_contable
             WHEN 'logistica' THEN 'gasto_logistica'::cuenta_contable
             ELSE 'cif'::cuenta_contable
           END,
           CASE NEW.tipo
             WHEN 'mano_obra' THEN 'gasto_mano_obra'::tipo_asiento_diario
             WHEN 'logistica' THEN 'gasto_domicilio'::tipo_asiento_diario
             ELSE 'cif_general'::tipo_asiento_diario
           END
    INTO v_cuenta, v_tipo;

    INSERT INTO public.libro_diario (transaccion_id, lote_id, ceco_id, tipo_asiento, cuenta, descripcion, debito)
    VALUES (v_txn, NEW.lote_id, NEW.ceco_id, v_tipo, v_cuenta, NEW.concepto, NEW.monto);

    INSERT INTO public.libro_diario (transaccion_id, lote_id, tipo_asiento, cuenta, descripcion, credito)
    VALUES (v_txn, NEW.lote_id, v_tipo, 'caja_bancos', 'Pago · ' || NEW.concepto, NEW.monto);

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_contabilizar_gasto_lote
    AFTER INSERT ON public.lote_gastos
    FOR EACH ROW EXECUTE FUNCTION public.fn_contabilizar_gasto_lote();

-- ---------------------------------------------------------------------------
-- 6.9 LIQUIDAR AL DOMICILIARIO
-- ---------------------------------------------------------------------------
-- Cierra el pasivo de terceros: los fletes cobrados a los clientes salen de
-- caja hacia el repartidor y `pasivo_domiciliario_pendiente` vuelve a cero.
-- El modelo describía el flete como "pasivo transitorio neutro" pero no tenía
-- la segunda mitad del movimiento, así que el pasivo crecía para siempre.
CREATE OR REPLACE FUNCTION public.fn_liquidar_domiciliario(
    p_lote_id UUID,
    p_monto   NUMERIC DEFAULT NULL   -- NULL = liquidar todo lo pendiente
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_txn        UUID := gen_random_uuid();
    v_pendiente  NUMERIC(14, 2);
    v_monto      NUMERIC(14, 2);
    v_nombre     TEXT;
BEGIN
    PERFORM public.fn_exigir_rol('admin');

    SELECT COALESCE(SUM(credito - debito), 0) INTO v_pendiente
    FROM public.libro_diario
    WHERE lote_id = p_lote_id AND cuenta = 'pasivo_domiciliario';

    v_monto := COALESCE(p_monto, v_pendiente);

    IF v_monto <= 0 THEN
        RETURN 0;
    END IF;
    IF v_monto > v_pendiente THEN
        RAISE EXCEPTION 'El monto (%) supera el pasivo pendiente (%).', v_monto, v_pendiente
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT nombre_domiciliario INTO v_nombre FROM public.lotes WHERE id = p_lote_id;

    INSERT INTO public.libro_diario (transaccion_id, lote_id, tipo_asiento, cuenta, descripcion, debito, es_pasivo_tercero)
    VALUES (v_txn, p_lote_id, 'liquidacion_domiciliario', 'pasivo_domiciliario',
            'Liquidación fletes a ' || COALESCE(v_nombre, 'domiciliario'), v_monto, TRUE);

    INSERT INTO public.libro_diario (transaccion_id, lote_id, tipo_asiento, cuenta, descripcion, credito, es_pasivo_tercero)
    VALUES (v_txn, p_lote_id, 'liquidacion_domiciliario', 'caja_bancos',
            'Salida de caja · liquidación domiciliario', v_monto, TRUE);

    RETURN v_monto;
END;
$$;
