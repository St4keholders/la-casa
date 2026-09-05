# BACKEND.md — LA CASA · Fase 2

Corrección y extensión del esquema de costeo por lotes. Las 8 migraciones de
`supabase/migrations/` se aplicaron y probaron contra PostgreSQL 16 con un
shim que emula `auth.users` y los roles `anon` / `authenticated` de Supabase.
La prueba de ciclo completo está en `supabase/tests/e2e_ciclo_lote.sql`.

---

## 1. El hueco que bloquea todo lo demás

En el esquema original **un cliente no puede hacer un pedido**. Todas las
políticas RLS son `TO authenticated` con rol `admin`, `cocina` o `repartidor`,
y no existe ninguna política de `INSERT` sobre `ordenes` — ni siquiera para el
admin. La tienda es anónima: nadie inicia sesión para pedir un almuerzo.

Esto no se arregla agregando una política permisiva. Si `anon` puede insertar
en `ordenes` y `orden_detalles`, entonces el navegador manda el precio, y el
precio que manda el navegador es el que se cobra. Se arregla con una única
función `SECURITY DEFINER` expuesta a `anon`:

```
fn_crear_orden_publica(nombre, teléfono, dirección, fecha, nota, items[])
```

Del cliente solo se aceptan datos de contacto y pares (plato, cantidad). El
precio sale de `lote_cecos.precio_venta_lote`, el flete de
`lotes.tarifa_domicilio_cliente` y el lote de "el único que está activo".

---

## 2. Hallazgos del esquema original

Ordenados por lo que costaría descubrirlos en producción.

| # | Hallazgo | Consecuencia | Dónde se corrige |
|---|---|---|---|
| 1 | Sin ruta de creación de pedidos para usuarios anónimos | La tienda no funciona | `fn_crear_orden_publica` · migración 06 |
| 2 | `UPDATE inventario_lote ... WHERE` sin fila previa | El `UPDATE` afecta 0 filas y **se despacha sin descontar un gramo, en silencio** | `fn_preparar_inventario_lote` + excepción explícita · 06 |
| 3 | El diario registra la venta pero nunca el costo | P&G con ingresos y sin COGS: utilidad del 100% | Asiento COGS en `fn_contabilizar_despacho` · 06 |
| 4 | Reserva de cupo inexistente (solo se descuenta al despachar) | Entre el pedido del viernes y el despacho del sábado se pueden vender 40 porciones de 20 | `unidades_reservadas` + `chk_no_sobreventa` · 03/04 |
| 5 | El margen se recalcula con la receta *actual* | Editar una receta hoy reescribe los márgenes históricos | Snapshot `orden_detalles.costo_mp_unitario` · 04 |
| 6 | RLS activo en 7 tablas; faltaban `insumos`, `platos`, `receta_detalles`, `orden_detalles` | Con los GRANT por defecto de Supabase, **las recetas y los datos de los clientes eran legibles con la anon key** (que va en el bundle) | migración 08 |
| 7 | Trigger de despacho en `BEFORE UPDATE` con efectos secundarios | Los asientos quedan escritos aunque otro trigger cancele el `UPDATE` | `AFTER UPDATE OF estado` · 06 |
| 8 | Sin máquina de estados | `despachado → cancelada → despachado` duplica asientos y consumo en cada vuelta | `fn_validar_transicion_orden` · 04 |
| 9 | `es_perecedero` se leía en el cursor de cierre y nunca se usaba | El pollo crudo del domingo pasaba como stock inicial de la semana siguiente | `fn_cerrar_y_transferir_lote` · 06 |
| 10 | `mermas_operativas` sin trigger | La tabla era un cuaderno de notas: no descontaba stock ni generaba asiento | `fn_contabilizar_merma` · 06 |
| 11 | `GREATEST(saldo, 0)` en el cierre | El faltante por sobreconsumo desaparecía sin dejar rastro | `saldo_teorico` generado + `vista_alertas_inventario` · 03/07 |
| 12 | `porcentaje_merma_esperado` declarado y nunca leído, junto a un campo llamado `cantidad_bruta` | O el porcentaje sobra o la cantidad es neta; el consumo real quedaba subestimado | `cantidad_neta` + `cantidad_bruta_calculada` generada · 02 |
| 13 | Sin FK entre `orden_detalles.plato_id` y la carta del lote | Se podía pedir un plato que esa semana no se ofrecía | FK compuesta a `lote_cecos(lote_id, plato_id)` · 04 |
| 14 | `total_orden` y `subtotal` como campos sueltos | Divergen de las líneas; el subtotal lo escribía quien insertara | Columna generada + trigger de recálculo · 04 |
| 15 | `entradas_compras` sin documento ni precio | `costo_unitario_aplicado` se congela en la primera carga: no hay promedio ponderado | Tablas `compras` / `compra_detalles` + `fn_registrar_compra` · 03/06 |
| 16 | Fechas con `CURRENT_DATE` y `NOW()` en UTC | Un pedido de las 8pm del sábado en Medellín cae en domingo UTC y entra al lote equivocado | `fn_hoy_bogota()` · 01 |
| 17 | Primer usuario = admin sin lock; el resto entra como `cocina` | Cualquiera con el enlace de signup ve el inventario | Rol `pendiente` por defecto · 02 |
| 18 | Niveles 2 y 3 del modelo ABC descritos pero no modelados | La vista de rentabilidad solo restaba materia prima y la llamaba "utilidad" | `lote_gastos` + prorrateo por inductor · 05/07 |
| 19 | El flete cobrado al cliente se acreditaba sin contrapartida | El "pasivo transitorio neutro" crecía para siempre | `pasivo_domiciliario` + `fn_liquidar_domiciliario` · 05/06 |
| 20 | `updated_at` declarado, nunca actualizado | Todo registro con la fecha de creación | `fn_touch_updated_at` · 01 |
| 21 | Inmutabilidad del diario solo vía RLS | `service_role` — el de cualquier route handler con la service key — se salta RLS | Trigger `fn_diario_inmutable` · 05 |
| 22 | `get_user_role()` sin envolver en las políticas | Se evalúa una vez **por fila** en lugar de una por consulta | `(SELECT public.fn_es_*())` · 08 |
| 23 | Vistas creadas por `postgres` sobre tablas con RLS | Una vista es `SECURITY DEFINER` por defecto: **se salta el RLS que protege el diario** | `WITH (security_invoker = on)` · 07 |

### Sobre el punto 23

Es el error más silencioso de la lista. Se blindan las políticas de
`libro_diario`, se hace una vista de reportes encima y la vista queda abierta
a cualquier usuario autenticado, porque corre con los permisos de su dueño.
La única vista `definer` aquí es `vista_menu_publico`, y lo es a propósito:
expone columnas escogidas a mano y ningún costo.

---

## 3. Orden de las migraciones

```
01  base              extensiones, enums, fn_hoy_bogota, updated_at
02  maestros          usuarios/RBAC, insumos, platos (+presentación), recetas
03  lotes_inventario  lotes, carta semanal, inventario perpetuo, compras, mermas
04  ordenes           órdenes, líneas, reserva de cupo, máquina de estados
05  contabilidad      libro diario en partida doble, gastos Nivel 2 y 3
06  operaciones       pedido público, despacho, merma, compras, cierre, anulación
07  vistas            menú público, rentabilidad 3 niveles, P&G, alertas
08  rls_grants        RLS en 14 tablas, políticas por rol, grants explícitos
```

Verificación rápida después de aplicar:

```sql
-- Toda tabla de public con RLS activo (esperado: 14 de 14)
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY rowsecurity, tablename;

-- Ningún asiento descuadrado (esperado: 0)
SELECT count(*) FROM (
  SELECT transaccion_id FROM libro_diario
  GROUP BY transaccion_id HAVING sum(debito) <> sum(credito)) x;
```

---

## 4. Contrato con el frontend

`vista_menu_publico` reemplaza `lib/dishes.ts`. Devuelve los mismos campos del
tipo `Dish` (`kicker`, `palabra`, `foto_url`, `nota`, `ficha`, los cuatro
colores, `garnish`) más `precio` y `disponibles`. Ese `disponibles` es el
"quedan N" real, no la constante de la fase 1.

El `CartContext` no cambia por dentro. Lo que cambia es el paso 3 del carrito:
hoy arma un enlace de WhatsApp y ya; ahora primero graba el pedido y después
manda el mensaje.

```ts
// lib/pedidos.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function crearPedido(
  d: Delivery,
  lines: CartLine[],
  platoIdPorIndice: Record<number, string>,
  fechaEntrega: string,      // 'YYYY-MM-DD'
) {
  const { data, error } = await supabase.rpc('fn_crear_orden_publica', {
    p_cliente_nombre:   d.nombre,
    p_cliente_telefono: d.tel,
    p_direccion:        d.dir,
    p_fecha_entrega:    fechaEntrega,
    p_nota:             d.nota || null,
    p_items: lines.map(l => ({
      plato_id: platoIdPorIndice[l.id],
      cantidad: l.qty,
    })),
  });
  if (error) throw new Error(error.message);
  return data[0];   // { orden_id, codigo_orden, total }
}
```

Tres cosas que el frontend tiene que respetar:

1. **El código de pedido lo devuelve la base.** El `PED-XXXX` con
   `Math.random()` del `PLAN.md` se va: ahora sale de una secuencia y es único
   de verdad. El mensaje de WhatsApp usa el `codigo_orden` que retorna la RPC.
2. **El total que se muestra debe ser el que devuelve la RPC**, no el calculado
   en el cliente. Si difieren, el precio cambió entre que se cargó el menú y se
   confirmó: hay que mostrar el nuevo y pedir confirmación.
3. **Los errores vienen tipados por mensaje.** `'No hay pedidos abiertos'`,
   `'Uno de los platos ya no está disponible'` y el fallo del `CHECK` de
   sobreventa son mensajes para el usuario, no errores 500. El caso de
   sobreventa llega como violación de `chk_no_sobreventa`; conviene mapearlo a
   *"se acabaron las porciones de ese almuerzo"*.

Generar los tipos después de aplicar las migraciones:

```bash
npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
```

---

## 5. Trabajar con Antigravity y el MCP de Supabase

<cite index="10-1">Supabase recomienda explícitamente no conectar el servidor MCP a producción, sino a un proyecto de desarrollo con datos no productivos, y usar modo de solo lectura si hay que tocar datos reales. <cite index="5-1">También recomienda acotar el servidor al proyecto, activar el modo de solo lectura y restringir los grupos de features antes de conectarlo.

Traducido a este proyecto:

- Dos proyectos de Supabase: `la-casa-dev` y `la-casa-prod`. El MCP apunta a
  dev. <cite index="9-1">El servidor se acota con el parámetro `project_ref` en la URL; sin él tiene acceso a todos los proyectos de la organización.
- Las migraciones se aplican **desde archivos versionados**, no desde el chat.
  Si el agente ejecuta DDL directamente contra la base, el repo y la base
  divergen y en dos semanas nadie sabe cuál es el esquema real. El flujo es:
  el agente edita el `.sql` → `supabase db push` → commit.
- Dejar el MCP en `read_only` para el día a día (inspeccionar el esquema,
  depurar una consulta) y quitarlo solo para el momento puntual de aplicar.

Vale la pena agregar al `AGENTS.md` una regla del estilo:

> Todo cambio de esquema entra por un archivo nuevo en `supabase/migrations/`
> con timestamp. No se edita una migración ya aplicada. No se ejecuta DDL por
> el MCP fuera de `db push`.

Es la misma lógica de la regla 3 del `PLAN.md` (leer por rangos, no releer):
sin ella, el agente reescribe migraciones ya aplicadas y el historial deja de
reconstruir la base.

---

## 6. Lo que falta

- **Antiabuso en la tienda.** `fn_crear_orden_publica` tiene topes duros
  (máximo 10 platos distintos, 30 unidades), pero nada impide 200 pedidos
  válidos en un minuto que dejen el lote reservado en cero. Cuando aparezca el
  problema: revocar el `EXECUTE` a `anon` y llamar la RPC desde un route
  handler con rate limit por IP y Turnstile.
- **Confirmación del pedido.** Hoy `recibida` es un estado optimista: el pedido
  reserva cupo apenas se crea. Si mucha gente pide y no confirma por WhatsApp,
  conviene un job que libere reservas de más de N horas sin confirmar.
- **Conteo físico al cierre.** `stock_final_real` y `varianza_conteo` existen,
  pero no hay pantalla para capturarlos.
- **Historial de precios de plato.** `lote_cecos.precio_venta_lote` guarda el
  precio de cada semana, lo cual alcanza; si algún día se cambia precio a mitad
  de semana hará falta versionarlo.
- **Índice de clientes.** Hoy los datos del cliente se repiten en cada orden.
  Con `idx_ordenes_telefono` se puede agrupar por celular sin crear todavía una
  tabla `clientes`. Cuando haya recurrencia real, vale la pena normalizarla.
