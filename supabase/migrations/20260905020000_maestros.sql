-- =============================================================================
-- LA CASA · 02 · Maestros: usuarios, insumos, platos (CeCos) y escandallos
-- =============================================================================

-- ---------------------------------------------------------------------------
-- USUARIOS (RBAC)
-- ---------------------------------------------------------------------------
CREATE TABLE public.usuarios (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      VARCHAR(255) NOT NULL,
    nombre     VARCHAR(150),
    rol        app_rol NOT NULL DEFAULT 'pendiente',
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.usuarios.rol IS
'Default ''pendiente'': quien se registre no obtiene permisos hasta que un admin
lo promueva. El esquema original daba ''cocina'' automáticamente, así que
cualquiera con el enlace de signup entraba a ver el inventario.';

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- Perfil automático al registrarse.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_es_primero BOOLEAN;
BEGIN
    -- Lock explícito: sin él, dos signups simultáneos podían crear dos admins.
    SELECT NOT EXISTS (SELECT 1 FROM public.usuarios) INTO v_es_primero;

    INSERT INTO public.usuarios (id, email, nombre, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        CASE WHEN v_es_primero THEN 'admin'::app_rol ELSE 'pendiente'::app_rol END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper de rol. STABLE + SECURITY DEFINER para poder consultarse dentro de
-- las políticas RLS de la propia tabla usuarios sin recursión infinita.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_rol
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol FROM public.usuarios WHERE id = auth.uid() AND activo
$$;

-- Guardia para funciones SECURITY DEFINER. El enum app_rol está declarado en
-- orden ascendente de privilegio (pendiente < repartidor < cocina < admin),
-- así que `<` funciona como jerarquía.
-- Hace falta porque el cuerpo de una función SECURITY DEFINER corre como owner
-- y no pasa por RLS: un GRANT EXECUTE a `authenticated` deja entrar incluso a
-- un usuario recién registrado con rol 'pendiente'.
CREATE OR REPLACE FUNCTION public.fn_exigir_rol(p_minimo app_rol)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rol app_rol := (SELECT public.get_user_role());
BEGIN
    IF v_rol IS NULL OR v_rol < p_minimo THEN
        RAISE EXCEPTION 'No tienes permiso para esta operación (rol requerido: %).', p_minimo
            USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- INSUMOS
-- ---------------------------------------------------------------------------
CREATE TABLE public.insumos (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo                   VARCHAR(50) UNIQUE,
    nombre                   VARCHAR(150) NOT NULL,
    categoria                VARCHAR(50)  NOT NULL,
    unidad_medida            VARCHAR(20)  NOT NULL,
    costo_unitario_promedio  NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (costo_unitario_promedio >= 0),
    es_perecedero            BOOLEAN NOT NULL DEFAULT TRUE,
    vida_util_dias           INTEGER CHECK (vida_util_dias IS NULL OR vida_util_dias > 0),
    activo                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_insumo_categoria CHECK (
        categoria IN ('proteina','vegetal','grano','lacteo','salsa','condimento','bebida','empaque','desechable','otro')
    ),
    CONSTRAINT chk_insumo_unidad CHECK (unidad_medida IN ('g','ml','unidad'))
);

CREATE TRIGGER trg_insumos_updated_at
    BEFORE UPDATE ON public.insumos
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- PLATOS = CENTROS DE COSTO
-- ---------------------------------------------------------------------------
-- Incluye los campos de presentación que hoy viven hardcodeados en
-- lib/dishes.ts. Sin esto, la fase 2 obliga a mantener el menú en dos sitios.
CREATE TABLE public.platos (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_ceco            VARCHAR(50) UNIQUE NOT NULL,
    nombre                 VARCHAR(150) NOT NULL,
    descripcion            TEXT,
    precio_venta_sugerido  NUMERIC(12, 2) NOT NULL CHECK (precio_venta_sugerido >= 0),
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,

    -- Presentación (espejo de lib/types.ts → Dish)
    kicker                 VARCHAR(60),        -- "Pechuga"
    palabra                VARCHAR(60),        -- "Pollo" (la palabra gigante del carrusel)
    foto_url               TEXT,               -- Vercel Blob
    nota                   TEXT,
    ficha                  JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [["Sopa","Ajiaco"], ...]
    color_bg               VARCHAR(24),
    color_ink              VARCHAR(24),
    color_accent           VARCHAR(24),
    color_accent_ink       VARCHAR(24),
    garnish                TEXT[] NOT NULL DEFAULT '{}',
    orden_vitrina          SMALLINT NOT NULL DEFAULT 0,

    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_ficha_es_arreglo CHECK (jsonb_typeof(ficha) = 'array'),
    CONSTRAINT chk_garnish_seis CHECK (cardinality(garnish) IN (0, 6))
);

COMMENT ON CONSTRAINT chk_garnish_seis ON public.platos IS
'El Hero pinta exactamente 6 ingredientes flotando (g1..g6). Cualquier otro
número rompe el layout, así que se valida en la base y no solo en el front.';

CREATE TRIGGER trg_platos_updated_at
    BEFORE UPDATE ON public.platos
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RECETAS / ESCANDALLOS (BOM)
-- ---------------------------------------------------------------------------
CREATE TABLE public.receta_detalles (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plato_id                  UUID NOT NULL REFERENCES public.platos(id)  ON DELETE CASCADE,
    insumo_id                 UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
    cantidad_neta             NUMERIC(10, 4) NOT NULL CHECK (cantidad_neta > 0),
    porcentaje_merma_esperado NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (porcentaje_merma_esperado >= 0 AND porcentaje_merma_esperado < 100),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plato_id, insumo_id)
);

-- El campo se llamaba `cantidad_bruta` y coexistía con un
-- `porcentaje_merma_esperado` que ninguna función leía: o el porcentaje sobra,
-- o la cantidad es neta. Se define aquí de forma unívoca.
COMMENT ON COLUMN public.receta_detalles.cantidad_neta IS
'Cantidad que llega al plato servido, en la unidad del insumo.';

COMMENT ON COLUMN public.receta_detalles.porcentaje_merma_esperado IS
'Pérdida esperada por limpieza/cocción sobre la cantidad neta. El consumo real
descontado del inventario es cantidad_bruta_calculada, no cantidad_neta.';

-- Columna generada: el consumo que de verdad sale de la bodega.
ALTER TABLE public.receta_detalles
    ADD COLUMN cantidad_bruta_calculada NUMERIC(12, 4)
    GENERATED ALWAYS AS (cantidad_neta * (1 + porcentaje_merma_esperado / 100)) STORED;

CREATE INDEX idx_receta_insumo ON public.receta_detalles (insumo_id);
