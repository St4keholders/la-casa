-- =============================================================================
-- LA CASA · 03 · Lotes semanales, inventario perpetuo, compras y mermas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- LOTES
-- ---------------------------------------------------------------------------
CREATE TABLE public.lotes (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_lote              VARCHAR(50) UNIQUE NOT NULL,
    fecha_apertura           DATE NOT NULL DEFAULT public.fn_hoy_bogota(),
    fecha_entrega_desde      DATE NOT NULL,
    fecha_entrega_hasta      DATE NOT NULL,
    fecha_cierre             DATE,
    estado                   estado_lote NOT NULL DEFAULT 'borrador',
    nombre_domiciliario      VARCHAR(150),
    -- Lo que LA CASA le paga al repartidor por el turno completo.
    tarifa_fija_domiciliario NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tarifa_fija_domiciliario >= 0),
    -- Lo que se le cobra al cliente por envío. Vive en el lote, NUNCA llega
    -- desde el navegador: si el precio del flete viaja en el payload, cualquiera
    -- puede mandar 0 con las devtools abiertas.
    tarifa_domicilio_cliente NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tarifa_domicilio_cliente >= 0),
    lote_anterior_id         UUID REFERENCES public.lotes(id),
    notas                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ventana_entrega CHECK (fecha_entrega_hasta >= fecha_entrega_desde)
);

-- Solo puede haber un lote activo a la vez: es lo que permite que la tienda
-- pública resuelva "¿a qué lote entra este pedido?" sin ambigüedad.
CREATE UNIQUE INDEX uq_lote_activo ON public.lotes ((estado)) WHERE estado = 'activo';

CREATE TRIGGER trg_lotes_updated_at
    BEFORE UPDATE ON public.lotes
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- CeCos HABILITADOS EN EL LOTE (la carta de la semana)
-- ---------------------------------------------------------------------------
CREATE TABLE public.lote_cecos (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id               UUID NOT NULL REFERENCES public.lotes(id)  ON DELETE CASCADE,
    plato_id              UUID NOT NULL REFERENCES public.platos(id) ON DELETE RESTRICT,
    unidades_proyectadas  INTEGER NOT NULL DEFAULT 0 CHECK (unidades_proyectadas >= 0),
    unidades_reservadas   INTEGER NOT NULL DEFAULT 0 CHECK (unidades_reservadas >= 0),
    precio_venta_lote     NUMERIC(12, 2) NOT NULL CHECK (precio_venta_lote >= 0),
    UNIQUE (lote_id, plato_id),

    -- Esta es la garantía real contra la sobreventa. Bajo READ COMMITTED,
    -- `SET unidades_reservadas = unidades_reservadas + n` toma el lock de fila
    -- y reevalúa el CHECK contra el valor ya actualizado, así que dos pedidos
    -- simultáneos por la última porción no pueden pasar los dos.
    -- Para vender de más, el admin sube unidades_proyectadas. Nunca se parchea.
    CONSTRAINT chk_no_sobreventa CHECK (unidades_reservadas <= unidades_proyectadas)
);

-- Requerido por la FK compuesta desde orden_detalles.
CREATE UNIQUE INDEX uq_lote_cecos_lote_plato ON public.lote_cecos (lote_id, plato_id);

-- ---------------------------------------------------------------------------
-- INVENTARIO PERPETUO POR LOTE
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventario_lote (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id                UUID NOT NULL REFERENCES public.lotes(id)   ON DELETE CASCADE,
    insumo_id              UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
    stock_inicial          NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (stock_inicial >= 0),
    entradas_compras       NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (entradas_compras >= 0),
    consumo_teorico        NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (consumo_teorico >= 0),
    bajas_merma            NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (bajas_merma >= 0),
    stock_final_real       NUMERIC(12, 4) CHECK (stock_final_real IS NULL OR stock_final_real >= 0),
    costo_unitario_aplicado NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (costo_unitario_aplicado >= 0),
    UNIQUE (lote_id, insumo_id)
);

-- Saldo teórico como columna generada: evita que cada consulta lo recalcule
-- distinto. Puede quedar negativo a propósito — un negativo es la señal de que
-- se despachó sin haber cargado la compra, y hay que verlo, no esconderlo.
ALTER TABLE public.inventario_lote
    ADD COLUMN saldo_teorico NUMERIC(12, 4)
    GENERATED ALWAYS AS (stock_inicial + entradas_compras - consumo_teorico - bajas_merma) STORED;

ALTER TABLE public.inventario_lote
    ADD COLUMN varianza_conteo NUMERIC(12, 4)
    GENERATED ALWAYS AS (
        CASE WHEN stock_final_real IS NULL THEN NULL
             ELSE stock_final_real - (stock_inicial + entradas_compras - consumo_teorico - bajas_merma)
        END
    ) STORED;

CREATE INDEX idx_inventario_lote_lookup ON public.inventario_lote (lote_id, insumo_id);
CREATE INDEX idx_inventario_negativo ON public.inventario_lote (lote_id) WHERE saldo_teorico < 0;

-- ---------------------------------------------------------------------------
-- COMPRAS
-- ---------------------------------------------------------------------------
-- No existían en el esquema original: `entradas_compras` era un número suelto
-- sin documento soporte y sin precio, así que costo_unitario_aplicado nunca se
-- podía recalcular. Sin esto el costeo se congela en la primera carga.
CREATE TABLE public.compras (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id      UUID NOT NULL REFERENCES public.lotes(id) ON DELETE RESTRICT,
    proveedor    VARCHAR(150),
    documento    VARCHAR(80),
    fecha        DATE NOT NULL DEFAULT public.fn_hoy_bogota(),
    registrado_por UUID REFERENCES public.usuarios(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.compra_detalles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id       UUID NOT NULL REFERENCES public.compras(id)  ON DELETE CASCADE,
    insumo_id       UUID NOT NULL REFERENCES public.insumos(id)  ON DELETE RESTRICT,
    cantidad        NUMERIC(12, 4) NOT NULL CHECK (cantidad > 0),
    costo_unitario  NUMERIC(12, 4) NOT NULL CHECK (costo_unitario >= 0),
    subtotal        NUMERIC(14, 2) GENERATED ALWAYS AS (ROUND(cantidad * costo_unitario, 2)) STORED
);

CREATE INDEX idx_compra_detalles_compra ON public.compra_detalles (compra_id);

-- ---------------------------------------------------------------------------
-- MERMAS
-- ---------------------------------------------------------------------------
CREATE TABLE public.mermas_operativas (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id              UUID NOT NULL REFERENCES public.lotes(id)   ON DELETE CASCADE,
    ceco_id              UUID REFERENCES public.platos(id)           ON DELETE SET NULL,
    insumo_id            UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
    cantidad             NUMERIC(10, 4) NOT NULL CHECK (cantidad > 0),
    tipo_baja            tipo_baja_merma NOT NULL,
    motivo               TEXT NOT NULL CHECK (length(btrim(motivo)) >= 5),
    costo_total_perdida  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reportado_por        UUID REFERENCES public.usuarios(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mermas_lote ON public.mermas_operativas (lote_id, created_at DESC);

COMMENT ON TABLE public.mermas_operativas IS
'La documentación decía que la merma "deduce stock y carga el costo al CeCo",
pero en el esquema original no existía ningún trigger que lo hiciera: la tabla
era un cuaderno de notas sin efecto contable. El trigger vive en la migración 06.';
