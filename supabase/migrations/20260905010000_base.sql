-- =============================================================================
-- LA CASA · 01 · Base: extensiones, tipos y helpers
-- =============================================================================
-- Convenciones del proyecto:
--   * Toda fecha "de negocio" se calcula en America/Bogota, nunca en UTC.
--     Supabase corre en UTC; un pedido de las 8pm del sábado en Medellín es
--     domingo en UTC y se contabilizaría en el lote equivocado.
--   * Todo dinero es NUMERIC. Nunca float.
--   * Cantidades de insumo en NUMERIC(12,4) (gramos / ml con decimales).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
CREATE TYPE estado_lote     AS ENUM ('borrador', 'activo', 'cerrado', 'conciliado');
CREATE TYPE estado_orden    AS ENUM ('recibida', 'confirmada', 'en_preparacion', 'empacado', 'despachado', 'cancelada');
CREATE TYPE tipo_domicilio  AS ENUM ('pagado_cliente', 'cubierto_por_lote', 'retiro_en_sede');
CREATE TYPE tipo_baja_merma AS ENUM ('descomposicion', 'dano_cocina', 'caducidad', 'ajuste_inventario', 'perecedero_no_transferible');
CREATE TYPE app_rol         AS ENUM ('pendiente', 'repartidor', 'cocina', 'admin');
CREATE TYPE canal_orden     AS ENUM ('web', 'whatsapp', 'mostrador');

-- Naturaleza del asiento (para leer el diario por evento de negocio).
CREATE TYPE tipo_asiento_diario AS ENUM (
    'compra_insumo',
    'venta_almuerzo',
    'costo_mercancia_vendida',   -- FALTABA: el diario original solo registraba ingresos
    'cobro_domicilio_tercero',
    'liquidacion_domiciliario',
    'gasto_domicilio',
    'gasto_mano_obra',
    'cif_general',
    'baja_merma',
    'anulacion'
);

-- Cuentas mínimas para partida doble. Se mantiene corto a propósito:
-- un catálogo PUC completo es ruido para una operación de fin de semana.
CREATE TYPE cuenta_contable AS ENUM (
    'caja_bancos',
    'cuentas_por_cobrar',
    'inventario',
    'pasivo_domiciliario',        -- flete cobrado al cliente que aún no se paga al repartidor
    'ingresos_ventas',
    'costo_mercancia_vendida',
    'gasto_logistica',
    'gasto_mano_obra',
    'cif',
    'perdida_merma'
);

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_hoy_bogota()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$ SELECT (now() AT TIME ZONE 'America/Bogota')::date $$;

COMMENT ON FUNCTION public.fn_hoy_bogota() IS
'Fecha de negocio en hora Colombia. Usar SIEMPRE en lugar de CURRENT_DATE.';

-- Mantiene updated_at. El esquema original declaraba la columna pero nunca
-- la actualizaba: todos los registros quedaban con la fecha de creación.
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Solo dígitos, para validar celulares colombianos.
CREATE OR REPLACE FUNCTION public.fn_solo_digitos(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT regexp_replace(COALESCE(p_texto, ''), '[^0-9]', '', 'g') $$;

-- Secuencia para el consecutivo de órdenes.
CREATE SEQUENCE IF NOT EXISTS public.seq_codigo_orden START 1;
