# Informe de Reconciliación del Esquema Supabase

**Fecha:** 2026-09-05  
**Proyecto Ref:** `wclotnwdxzmsdqbknsml` (`LA CASA`)  
**Estado de datos reales:** Sin datos en ninguna tabla (`0` filas en todas las tablas, incluyendo `ordenes`, `libro_diario` y `mermas_operativas`). Seguro para resetear.

---

## 1. Tablas en `public`

| Objeto | Tipo | Clasificación | Motivo |
|---|---|---|---|
| `public.insumos` | Tabla | `superado` | Reemplazada en `20260905020000_maestros.sql` con nuevos constraints y campos. |
| `public.platos` | Tabla | `superado` | Reemplazada en `20260905020000_maestros.sql` con campos vitrina (`kicker`, `palabra`, `foto_url`, `nota`, `ficha`, `color_*`, `garnish`, `orden_vitrina`). |
| `public.receta_detalles` | Tabla | `superado` | Reemplazada en `20260905020000_maestros.sql` (`cantidad_bruta` → `cantidad_neta`). |
| `public.lotes` | Tabla | `superado` | Reemplazada en `20260905030000_lotes_inventario.sql` con tarifas de cliente y domiciliario separadas. |
| `public.lote_cecos` | Tabla | `superado` | Reemplazada en `20260905030000_lotes_inventario.sql` con `unidades_reservadas`, `unidades_vendidas`, `horas_coccion_estimadas`. |
| `public.inventario_lote` | Tabla | `superado` | Reemplazada en `20260905030000_lotes_inventario.sql` con `saldo_teorico` y auditoría de conteo físico. |
| `public.mermas_operativas` | Tabla | `superado` | Reemplazada en `20260905060000_operaciones.sql` con trigger automático a libro diario. |
| `public.ordenes` | Tabla | `superado` | Reemplazada en `20260905040000_ordenes.sql` con canal, fecha_entrega, total y restricciones de no sobreventa. |
| `public.orden_detalles` | Tabla | `superado` | Reemplazada en `20260905040000_ordenes.sql` con `costo_mp_unitario_congelado`. |
| `public.libro_diario` | Tabla | `superado` | Reemplazada en `20260905050000_contabilidad.sql` con `transaccion_id`, `cuenta` (partida doble estricta) e inmutabilidad. |
| `public.usuarios` | Tabla | `superado` | Reemplazada en `20260905020000_maestros.sql` con rol `pendiente` por defecto y RLS para el panel. |

---

## 2. Vistas en `public`

| Objeto | Tipo | Clasificación | Motivo |
|---|---|---|---|
| `public.vista_rendimiento_cecos` | Vista | `superado` | Reemplazada en `20260905070000_vistas.sql` con costeo por lotes de 3 niveles y security_invoker. |

---

## 3. Funciones y Triggers

| Objeto | Tipo | Clasificación | Motivo |
|---|---|---|---|
| `public.fn_cerrar_y_transferir_lote` | Función | `superado` | Reemplazada en `20260905060000_operaciones.sql` con transferencia selectiva de no perecederos y asientos contables. |
| `public.fn_despachar_orden` | Función | `superado` | Reemplazada en `20260905060000_operaciones.sql` con validación de inventario, congelación de costo y partida doble. |
| `public.get_user_role` | Función | `superado` | Reemplazada en `20260905080000_rls_grants.sql` adaptada al enum `app_rol` con 'pendiente'. |
| `public.handle_new_user` | Función | `superado` | Reemplazada en `20260905020000_maestros.sql` asignando rol inicial 'pendiente'. |
| `public.trg_despachar_orden` | Trigger en `ordenes` | `superado` | Se elimina con la tabla `ordenes` y se recrea en `20260905060000_operaciones.sql`. |
| `auth.on_auth_user_created` | Trigger en `auth.users` | `superado` | Debe recrearse para apuntar a la nueva implementación de `handle_new_user`. |

---

## 4. Tipos Enum

| Objeto | Tipo | Clasificación | Motivo |
|---|---|---|---|
| `public.app_rol` | Enum | `superado` | Reemplazado en `20260905010000_base.sql` agregando el valor `'pendiente'`. |
| `public.estado_lote` | Enum | `superado` | Se recrea en `20260905010000_base.sql`. |
| `public.estado_orden` | Enum | `superado` | Reemplazado en `20260905010000_base.sql` agregando el valor `'confirmada'`. |
| `public.tipo_asiento_diario` | Enum | `superado` | Reemplazado en `20260905010000_base.sql` con 10 eventos de negocio en lugar de 6. |
| `public.tipo_baja_merma` | Enum | `superado` | Reemplazado en `20260905010000_base.sql` agregando `'perecedero_no_transferible'`. |
| `public.tipo_domicilio` | Enum | `superado` | Se recrea en `20260905010000_base.sql`. |

---

## 5. Conclusión para la Fase 3

Todos los objetos existentes en el esquema `public` están clasificados como **`superado`**. No existen filas de datos reales en ninguna tabla. Se procederá a generar la migración de reset `20260905005000_reset_reconciliacion.sql` que limpie estos objetos en orden seguro antes de aplicar las 8 migraciones canónicas.
