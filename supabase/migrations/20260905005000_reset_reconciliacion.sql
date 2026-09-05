-- =============================================================================
-- MIGRACIÓN: 20260905005000_reset_reconciliacion.sql
-- MOTIVO: Limpieza de objetos superados identificados en RECONCILIACION.md.
--         Los esquemas auth y storage se conservan intactos.
--         Esta migración elimina ordenadamente en cascada:
--         1. Trigger en auth.users: on_auth_user_created
--         2. Triggers en tablas de public: trg_despachar_orden
--         3. Funciones obsoletas: fn_cerrar_y_transferir_lote, fn_despachar_orden,
--            get_user_role, handle_new_user
--         4. Vistas: vista_rendimiento_cecos
--         5. Tablas: libro_diario, mermas_operativas, orden_detalles, ordenes,
--            inventario_lote, lote_cecos, receta_detalles, lotes, platos,
--            insumos, usuarios
--         6. Tipos Enum: app_rol, estado_lote, estado_orden,
--            tipo_asiento_diario, tipo_baja_merma, tipo_domicilio
-- =============================================================================

-- 1. Trigger en auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Triggers en public
DROP TRIGGER IF EXISTS trg_despachar_orden ON public.ordenes;

-- 3. Funciones
DROP FUNCTION IF EXISTS public.fn_cerrar_y_transferir_lote(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_despachar_orden() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Vistas
DROP VIEW IF EXISTS public.vista_rendimiento_cecos CASCADE;

-- 5. Tablas
DROP TABLE IF EXISTS public.libro_diario CASCADE;
DROP TABLE IF EXISTS public.mermas_operativas CASCADE;
DROP TABLE IF EXISTS public.orden_detalles CASCADE;
DROP TABLE IF EXISTS public.ordenes CASCADE;
DROP TABLE IF EXISTS public.inventario_lote CASCADE;
DROP TABLE IF EXISTS public.lote_cecos CASCADE;
DROP TABLE IF EXISTS public.receta_detalles CASCADE;
DROP TABLE IF EXISTS public.lotes CASCADE;
DROP TABLE IF EXISTS public.platos CASCADE;
DROP TABLE IF EXISTS public.insumos CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- 6. Enums
DROP TYPE IF EXISTS public.app_rol CASCADE;
DROP TYPE IF EXISTS public.estado_lote CASCADE;
DROP TYPE IF EXISTS public.estado_orden CASCADE;
DROP TYPE IF EXISTS public.tipo_asiento_diario CASCADE;
DROP TYPE IF EXISTS public.tipo_baja_merma CASCADE;
DROP TYPE IF EXISTS public.tipo_domicilio CASCADE;
