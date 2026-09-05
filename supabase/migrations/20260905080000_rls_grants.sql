-- =============================================================================
-- LA CASA · 08 · RLS y permisos
-- =============================================================================
-- Dos correcciones de fondo frente al esquema original:
--
--  1. Allí solo se activó RLS en 7 tablas. `insumos`, `platos`,
--     `receta_detalles` y `orden_detalles` quedaron fuera. En Supabase los
--     roles `anon` y `authenticated` reciben GRANTs por defecto sobre el
--     esquema public, así que una tabla sin RLS queda legible y escribible
--     por cualquiera con la anon key — que está en el bundle del navegador.
--     Las recetas y los datos de los clientes eran públicos.
--
--  2. get_user_role() se envuelve en (SELECT ...). Sin el envoltorio, Postgres
--     la evalúa una vez POR FILA; con él la trata como InitPlan y la evalúa
--     una sola vez por consulta.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ACTIVAR RLS EN TODO
-- ---------------------------------------------------------------------------
ALTER TABLE public.usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_detalles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lote_cecos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_lote    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_detalles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mermas_operativas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_detalles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libro_diario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lote_gastos        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- HELPERS DE ROL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_es_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (SELECT public.get_user_role()) = 'admin' $$;

CREATE OR REPLACE FUNCTION public.fn_es_cocina()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (SELECT public.get_user_role()) IN ('admin', 'cocina') $$;

CREATE OR REPLACE FUNCTION public.fn_es_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (SELECT public.get_user_role()) IN ('admin', 'cocina', 'repartidor') $$;

-- ---------------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------------
CREATE POLICY "usuarios_ver_propio"   ON public.usuarios FOR SELECT TO authenticated
    USING (auth.uid() = id OR (SELECT public.fn_es_admin()));
CREATE POLICY "usuarios_admin_total"  ON public.usuarios FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

-- ---------------------------------------------------------------------------
-- MAESTROS
-- ---------------------------------------------------------------------------
CREATE POLICY "insumos_lectura_staff" ON public.insumos FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_cocina()));
CREATE POLICY "insumos_admin"         ON public.insumos FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

CREATE POLICY "platos_lectura_staff"  ON public.platos FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_staff()));
CREATE POLICY "platos_admin"          ON public.platos FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

-- Las recetas son el know-how del negocio: solo cocina y admin.
CREATE POLICY "recetas_lectura"       ON public.receta_detalles FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_cocina()));
CREATE POLICY "recetas_admin"         ON public.receta_detalles FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

-- ---------------------------------------------------------------------------
-- LOTES E INVENTARIO
-- ---------------------------------------------------------------------------
CREATE POLICY "lotes_lectura_staff"   ON public.lotes FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_staff()));
CREATE POLICY "lotes_admin"           ON public.lotes FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

CREATE POLICY "lote_cecos_lectura"    ON public.lote_cecos FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_staff()));
CREATE POLICY "lote_cecos_admin"      ON public.lote_cecos FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

CREATE POLICY "inventario_lectura"    ON public.inventario_lote FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_cocina()));
CREATE POLICY "inventario_conteo"     ON public.inventario_lote FOR UPDATE TO authenticated
    USING ((SELECT public.fn_es_cocina())) WITH CHECK ((SELECT public.fn_es_cocina()));
CREATE POLICY "inventario_admin"      ON public.inventario_lote FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

CREATE POLICY "compras_admin"         ON public.compras FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));
CREATE POLICY "compra_detalles_admin" ON public.compra_detalles FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

CREATE POLICY "mermas_lectura"        ON public.mermas_operativas FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_cocina()));
CREATE POLICY "mermas_reporte"        ON public.mermas_operativas FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.fn_es_cocina()));

CREATE POLICY "gastos_lote_admin"     ON public.lote_gastos FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

-- ---------------------------------------------------------------------------
-- ÓRDENES
-- ---------------------------------------------------------------------------
CREATE POLICY "ordenes_lectura_staff" ON public.ordenes FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_staff()));
CREATE POLICY "ordenes_despacho"      ON public.ordenes FOR UPDATE TO authenticated
    USING ((SELECT public.fn_es_cocina())) WITH CHECK ((SELECT public.fn_es_cocina()));
CREATE POLICY "ordenes_admin"         ON public.ordenes FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

CREATE POLICY "detalles_lectura"      ON public.orden_detalles FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_staff()));
CREATE POLICY "detalles_admin"        ON public.orden_detalles FOR ALL TO authenticated
    USING ((SELECT public.fn_es_admin())) WITH CHECK ((SELECT public.fn_es_admin()));

-- ---------------------------------------------------------------------------
-- LIBRO DIARIO
-- ---------------------------------------------------------------------------
-- Solo lectura, solo admin. Nadie escribe a mano: los asientos entran por los
-- triggers y funciones SECURITY DEFINER de la migración 06. UPDATE y DELETE
-- están bloqueados además por trigger, que sí aplica a service_role.
CREATE POLICY "diario_lectura_admin"  ON public.libro_diario FOR SELECT TO authenticated
    USING ((SELECT public.fn_es_admin()));

-- ---------------------------------------------------------------------------
-- GRANTS EXPLÍCITOS
-- ---------------------------------------------------------------------------
-- Se cierra la puerta primero y se abre solo lo necesario.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- El público solo ve el menú de la semana...
GRANT SELECT ON public.vista_menu_publico TO anon, authenticated;

-- ...y solo puede llamar una función: la de crear su pedido.
GRANT EXECUTE ON FUNCTION public.fn_crear_orden_publica(TEXT, TEXT, TEXT, DATE, TEXT, JSONB, tipo_domicilio)
    TO anon, authenticated;

-- Funciones de operación: solo staff autenticado. La validación de rol vive
-- dentro de cada función, porque SECURITY DEFINER se salta el RLS.
REVOKE ALL ON FUNCTION public.fn_registrar_compra(UUID, TEXT, TEXT, JSONB)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_cerrar_y_transferir_lote(UUID, UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_anular_orden_despachada(UUID, TEXT)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_preparar_inventario_lote(UUID)                  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fn_registrar_compra(UUID, TEXT, TEXT, JSONB)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cerrar_y_transferir_lote(UUID, UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_anular_orden_despachada(UUID, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_preparar_inventario_lote(UUID)               TO authenticated;

GRANT USAGE ON SEQUENCE public.seq_codigo_orden TO anon, authenticated;

REVOKE ALL ON FUNCTION public.fn_liquidar_domiciliario(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_liquidar_domiciliario(UUID, NUMERIC) TO authenticated;
