-- =============================================================================
-- LA CASA · 04 · Órdenes, líneas de pedido y reserva de cupos
-- =============================================================================

CREATE TABLE public.ordenes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id                 UUID NOT NULL REFERENCES public.lotes(id) ON DELETE RESTRICT,
    codigo_orden            VARCHAR(50) UNIQUE NOT NULL,
    canal                   canal_orden NOT NULL DEFAULT 'web',

    cliente_nombre          VARCHAR(150) NOT NULL CHECK (length(btrim(cliente_nombre)) >= 3),
    cliente_telefono        VARCHAR(50)  NOT NULL,
    direccion_entrega       TEXT,
    nota_cliente            TEXT,

    fecha_entrega           DATE NOT NULL,
    estado                  estado_orden NOT NULL DEFAULT 'recibida',
    tipo_domicilio          tipo_domicilio NOT NULL DEFAULT 'pagado_cliente',

    valor_domicilio_cobrado NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor_domicilio_cobrado >= 0),
    costo_domicilio_real    NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_domicilio_real >= 0),
    subtotal_platos         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal_platos >= 0),
    total_orden             NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_orden >= 0),
    costo_mp_total          NUMERIC(14, 2) NOT NULL DEFAULT 0,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    despachado_at           TIMESTAMPTZ,
    cancelado_at            TIMESTAMPTZ,
    motivo_cancelacion      TEXT,

    CONSTRAINT chk_celular_10_digitos
        CHECK (length(public.fn_solo_digitos(cliente_telefono)) = 10),

    -- Si hay domicilio, tiene que haber a dónde llevarlo.
    CONSTRAINT chk_direccion_si_domicilio
        CHECK (tipo_domicilio = 'retiro_en_sede' OR length(btrim(COALESCE(direccion_entrega, ''))) >= 10),

    -- Requerida por la FK compuesta desde orden_detalles: impide que una línea
    -- apunte a un plato de un lote distinto al de su propia orden.
    CONSTRAINT uq_orden_lote UNIQUE (id, lote_id)
);

CREATE INDEX idx_ordenes_lote_estado ON public.ordenes (lote_id, estado);
CREATE INDEX idx_ordenes_entrega     ON public.ordenes (fecha_entrega, estado);
CREATE INDEX idx_ordenes_telefono    ON public.ordenes (public.fn_solo_digitos(cliente_telefono));

CREATE TRIGGER trg_ordenes_updated_at
    BEFORE UPDATE ON public.ordenes
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- LÍNEAS
-- ---------------------------------------------------------------------------
CREATE TABLE public.orden_detalles (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id           UUID NOT NULL REFERENCES public.ordenes(id) ON DELETE CASCADE,
    lote_id            UUID NOT NULL,
    plato_id           UUID NOT NULL,
    cantidad           INTEGER NOT NULL CHECK (cantidad > 0 AND cantidad <= 30),
    precio_unitario    NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal           NUMERIC(14, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,

    -- Costo de materia prima congelado en el momento del despacho.
    -- Sin este snapshot, editar una receta reescribe los márgenes históricos:
    -- la vista original recalculaba el costo de octubre con la receta de hoy.
    costo_mp_unitario  NUMERIC(12, 4),

    UNIQUE (orden_id, plato_id),

    -- La línea pertenece al mismo lote que su orden...
    FOREIGN KEY (orden_id, lote_id) REFERENCES public.ordenes (id, lote_id) ON DELETE CASCADE,
    -- ...y el plato tiene que estar de verdad en la carta de ese lote.
    -- El esquema original permitía pedir un plato que esa semana no se ofrecía.
    FOREIGN KEY (lote_id, plato_id) REFERENCES public.lote_cecos (lote_id, plato_id) ON DELETE RESTRICT
);

CREATE INDEX idx_orden_detalles_orden ON public.orden_detalles (orden_id);
CREATE INDEX idx_orden_detalles_plato ON public.orden_detalles (lote_id, plato_id);

-- ---------------------------------------------------------------------------
-- RESERVA DE CUPOS  (el "quedan N" real de la tienda)
-- ---------------------------------------------------------------------------
-- El modelo original solo descontaba en 'despachado'. Entre el pedido del
-- viernes y el despacho del sábado no existía reserva, así que la tienda podía
-- vender 40 porciones de un plato del que solo hay 20.
CREATE OR REPLACE FUNCTION public.fn_reservar_cupo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_delta INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_delta := NEW.cantidad;
    ELSIF TG_OP = 'UPDATE' THEN
        v_delta := NEW.cantidad - OLD.cantidad;
    ELSE
        v_delta := -OLD.cantidad;
    END IF;

    IF v_delta <> 0 THEN
        UPDATE public.lote_cecos
        SET unidades_reservadas = unidades_reservadas + v_delta
        WHERE lote_id = COALESCE(NEW.lote_id, OLD.lote_id)
          AND plato_id = COALESCE(NEW.plato_id, OLD.plato_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_reservar_cupo
    AFTER INSERT OR UPDATE OF cantidad OR DELETE ON public.orden_detalles
    FOR EACH ROW EXECUTE FUNCTION public.fn_reservar_cupo();

-- ---------------------------------------------------------------------------
-- TOTALES DE LA ORDEN
-- ---------------------------------------------------------------------------
-- total_orden era un campo suelto que el cliente podía mandar con el valor que
-- quisiera. Aquí lo calcula siempre la base a partir de las líneas.
CREATE OR REPLACE FUNCTION public.fn_recalcular_total_orden()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_orden_id UUID := COALESCE(NEW.orden_id, OLD.orden_id);
BEGIN
    UPDATE public.ordenes o
    SET subtotal_platos = COALESCE(t.suma, 0),
        total_orden     = COALESCE(t.suma, 0) + o.valor_domicilio_cobrado
    FROM (
        SELECT SUM(subtotal) AS suma
        FROM public.orden_detalles
        WHERE orden_id = v_orden_id
    ) t
    WHERE o.id = v_orden_id;

    RETURN NULL;
END;
$$;

-- OJO con el alcance: si el trigger escuchara todo UPDATE, escribir el snapshot
-- costo_mp_unitario durante el despacho volvería a tocar `ordenes` y se
-- reentraría al trigger de contabilización.
CREATE TRIGGER trg_recalcular_total
    AFTER INSERT OR DELETE OR UPDATE OF cantidad, precio_unitario ON public.orden_detalles
    FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_total_orden();

-- ---------------------------------------------------------------------------
-- MÁQUINA DE ESTADOS
-- ---------------------------------------------------------------------------
-- Sin esto, una orden podía ir despachado → cancelada → despachado y duplicar
-- asientos contables y consumo de inventario en cada vuelta.
CREATE OR REPLACE FUNCTION public.fn_validar_transicion_orden()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_lote estado_lote;
BEGIN
    -- Bandera local a la transacción que solo activa fn_anular_orden_despachada().
    -- Es preferible a `ALTER TABLE ... DISABLE TRIGGER`, que toma un lock
    -- ACCESS EXCLUSIVE sobre `ordenes` y congela toda la operación del sábado.
    IF coalesce(current_setting('la_casa.reversion_autorizada', true), 'off') = 'on' THEN
        RETURN NEW;
    END IF;

    IF NEW.estado IS DISTINCT FROM OLD.estado THEN

        IF OLD.estado = 'despachado' THEN
            RAISE EXCEPTION
                'La orden % ya fue despachada. Para revertirla usa fn_anular_orden_despachada(), que genera el asiento de reversión.',
                OLD.codigo_orden
                USING ERRCODE = 'check_violation';
        END IF;

        IF OLD.estado = 'cancelada' THEN
            RAISE EXCEPTION 'La orden % está cancelada y no se puede reabrir.', OLD.codigo_orden
                USING ERRCODE = 'check_violation';
        END IF;

        IF NEW.estado = 'despachado' THEN
            SELECT estado INTO v_estado_lote FROM public.lotes WHERE id = NEW.lote_id;
            IF v_estado_lote <> 'activo' THEN
                RAISE EXCEPTION 'No se puede despachar sobre el lote % (estado: %).', NEW.lote_id, v_estado_lote
                    USING ERRCODE = 'check_violation';
            END IF;
            NEW.despachado_at := now();
        END IF;

        IF NEW.estado = 'cancelada' THEN
            NEW.cancelado_at := now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_transicion_orden
    BEFORE UPDATE ON public.ordenes
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_transicion_orden();

-- Cancelar libera el cupo reservado.
CREATE OR REPLACE FUNCTION public.fn_liberar_cupo_al_cancelar()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.estado = 'cancelada' AND OLD.estado <> 'cancelada' THEN
        UPDATE public.lote_cecos lc
        SET unidades_reservadas = GREATEST(lc.unidades_reservadas - od.cantidad, 0)
        FROM public.orden_detalles od
        WHERE od.orden_id = NEW.id
          AND lc.lote_id = od.lote_id
          AND lc.plato_id = od.plato_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_liberar_cupo_al_cancelar
    AFTER UPDATE OF estado ON public.ordenes
    FOR EACH ROW EXECUTE FUNCTION public.fn_liberar_cupo_al_cancelar();
