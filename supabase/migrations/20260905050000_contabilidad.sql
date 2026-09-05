-- =============================================================================
-- LA CASA · 05 · Libro diario (partida doble) y gastos de Nivel 2 / Nivel 3
-- =============================================================================
-- El diario original registraba la venta como un solo crédito y nunca
-- registraba el costo. Un P&G armado sobre esa tabla mostraba ingresos sin
-- COGS: utilidad del 100%. Aquí cada evento genera un asiento cuadrado.
-- =============================================================================

CREATE TABLE public.libro_diario (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaccion_id    UUID NOT NULL,              -- agrupa las partidas de un mismo asiento
    lote_id           UUID NOT NULL REFERENCES public.lotes(id)   ON DELETE RESTRICT,
    ceco_id           UUID REFERENCES public.platos(id)           ON DELETE SET NULL,
    orden_id          UUID REFERENCES public.ordenes(id)          ON DELETE SET NULL,
    tipo_asiento      tipo_asiento_diario NOT NULL,
    cuenta            cuenta_contable NOT NULL,
    descripcion       TEXT NOT NULL,
    debito            NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (debito  >= 0),
    credito           NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (credito >= 0),
    es_pasivo_tercero BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro    TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_contable    DATE NOT NULL DEFAULT public.fn_hoy_bogota(),

    CONSTRAINT chk_partida_unica CHECK (
        (debito > 0 AND credito = 0) OR (credito > 0 AND debito = 0)
    )
);

CREATE INDEX idx_libro_diario_ceco   ON public.libro_diario (ceco_id, lote_id);
CREATE INDEX idx_libro_diario_lote   ON public.libro_diario (lote_id, fecha_contable);
CREATE INDEX idx_libro_diario_txn    ON public.libro_diario (transaccion_id);
CREATE INDEX idx_libro_diario_cuenta ON public.libro_diario (cuenta, lote_id);

-- Cuadre diferido: se valida al final de la transacción, cuando ya están
-- insertadas todas las partidas del asiento.
CREATE OR REPLACE FUNCTION public.fn_validar_cuadre_asiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debitos  NUMERIC(14, 2);
    v_creditos NUMERIC(14, 2);
BEGIN
    SELECT COALESCE(SUM(debito), 0), COALESCE(SUM(credito), 0)
    INTO v_debitos, v_creditos
    FROM public.libro_diario
    WHERE transaccion_id = NEW.transaccion_id;

    IF v_debitos <> v_creditos THEN
        RAISE EXCEPTION
            'Asiento descuadrado (transacción %): débitos % ≠ créditos %',
            NEW.transaccion_id, v_debitos, v_creditos
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_cuadre_asiento
    AFTER INSERT ON public.libro_diario
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_cuadre_asiento();

-- Inmutabilidad a nivel de motor, no solo de RLS.
-- Las políticas RLS del esquema original bloqueaban UPDATE/DELETE para el rol
-- `authenticated`, pero `service_role` (el que usa cualquier route handler de
-- Next con la service key) las salta por completo. Este trigger no lo salta
-- nadie salvo que lo deshabiliten a propósito.
CREATE OR REPLACE FUNCTION public.fn_diario_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'El libro diario es inmutable. Para corregir, registra un asiento de reversión.'
        USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_diario_no_update
    BEFORE UPDATE OR DELETE ON public.libro_diario
    FOR EACH ROW EXECUTE FUNCTION public.fn_diario_inmutable();

-- ---------------------------------------------------------------------------
-- NIVEL 2 y NIVEL 3: los costos que el modelo describía pero no modelaba
-- ---------------------------------------------------------------------------
CREATE TYPE tipo_gasto_lote AS ENUM ('mano_obra', 'logistica', 'cif');
CREATE TYPE inductor_prorrateo AS ENUM ('directo', 'unidades_vendidas', 'horas_coccion', 'ingreso_bruto');

ALTER TABLE public.lote_cecos
    ADD COLUMN horas_coccion NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (horas_coccion >= 0);

COMMENT ON COLUMN public.lote_cecos.horas_coccion IS
'Inductor de Nivel 3. Sin un driver almacenado, el prorrateo de servicios
públicos y arriendo se reparte por unidades y una sopa de 4 horas absorbe lo
mismo que una hamburguesa de 8 minutos: exactamente el subsidio cruzado que el
modelo dice querer eliminar.';

CREATE TABLE public.lote_gastos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id      UUID NOT NULL REFERENCES public.lotes(id)  ON DELETE CASCADE,
    ceco_id      UUID REFERENCES public.platos(id)          ON DELETE RESTRICT,
    tipo         tipo_gasto_lote NOT NULL,
    inductor     inductor_prorrateo NOT NULL DEFAULT 'unidades_vendidas',
    concepto     TEXT NOT NULL,
    monto        NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
    fecha        DATE NOT NULL DEFAULT public.fn_hoy_bogota(),
    registrado_por UUID REFERENCES public.usuarios(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 'directo' exige CeCo (Nivel 2); cualquier otro inductor lo reparte (Nivel 3).
    CONSTRAINT chk_directo_tiene_ceco CHECK (
        (inductor = 'directo' AND ceco_id IS NOT NULL) OR
        (inductor <> 'directo' AND ceco_id IS NULL)
    )
);

CREATE INDEX idx_lote_gastos_lote ON public.lote_gastos (lote_id, tipo);
