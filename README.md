# La Casa · Gastronomía Operacional & ERP de Fin de Semana

Sistema integral para operaciones de cocina de fin de semana y tienda gastronómica digital de alta conversión. Construido sobre Next.js 16 (React 19, Turbopack) conectado a Supabase PostgreSQL con seguridad a nivel de filas (RLS), contabilidad inmutable de partida doble y costeo por absorción ABC.

---

## 1. Arquitectura y Módulos

### 🛒 Tienda Pública (`/`)
- **Menú Dinámico:** Consume en vivo la vista segura `vista_menu_publico` con revalidación incremental ISR (`revalidate = 60`).
- **Reserva Atómica de Cupo:** Al presionar "Pedir por WhatsApp", se ejecuta la función atómica `fn_crear_orden_publica` que valida disponibilidad, congela la tarifa de domicilio del lote, aparta el stock en `lote_cecos.unidades_reservadas` y genera un código secuencial único (`PED-AAMMDD-XXXX`).
- **WhatsApp Notificación:** El enlace de WhatsApp se abre con un mensaje formateado con el código oficial de orden ya persistido en la base de datos.
- **Fidelidad Estética:** Diseño editorial sofisticado, paleta cálida de contrastes finos, animaciones táctiles y de teclado, y soporte para `prefers-reduced-motion`. `app/globals.css` permanece 100% puro e intacto.

### 🔐 Autenticación y RBAC (`/entrar`, `app/auth/callback/`)
- Acceso por Magic Link sin contraseñas mediante PKCE seguro con cookies `httpOnly` en Server Components (`@supabase/ssr`).
- Control de roles (`admin`, `cocina`, `repartidor`, `pendiente`) respaldado por la tabla `usuarios` y funciones de seguridad definer (`get_user_role()`, `fn_es_admin()`, `fn_es_cocina()`).
- Pantalla de espera para nuevos registros (`PendienteAprobacion.tsx`) y saneamiento de tokens CSS de carrusel en el layout del panel.

### 📋 Muro de Comandas (`/panel/comandas`)
- Kanban en tiempo real con suscripción Postgres Changes (`public.ordenes`) filtrada por lote.
- Avance táctil de estados (`recibida` → `en_preparacion` → `empacado` → `despachado`).
- **Despacho Irreversible:** El botón de despacho solicita confirmación explícita, dispara la explosión de recetas por unidad, descuenta insumos de `inventario_lote`, congela el costo unitario de materia prima en la orden y asienta partida doble en `libro_diario`.
- Filtros por día de entrega (sábado / domingo) y búsqueda instantánea indexada por teléfono (`idx_ordenes_telefono`).

### 👨‍🍳 Producción y Mermas (`/panel/cocina`)
- Dashboard de producción consolidado desde `vista_produccion_dia`.
- Reporte operativo de mermas: formulario con insumo, gramaje, clasificación de baja y motivo auditable.
- Muestra en tiempo real el valor monetario perdido en pesos colombianos (`costo_total_perdida`) y genera el asiento contable débito a `perdida_merma` y crédito a `inventario`.
- Consulta de recetas en gramaje neto y bruto para la línea de cocina.

### 📦 Inventario Perpetuo y Compras (`/panel/inventario`)
- Kárdex en vivo de `inventario_lote` en tipografía monoespaciada: stock inicial, compras (+), consumo (−), mermas (−) y saldo teórico.
- Alertas inmediatas desde `vista_alertas_inventario`, destacando sobreconsumo en color vino y agotamiento de existencias.
- Registro de compras mediante `fn_registrar_compra`: recalcula el costo unitario aplicado por promedio ponderado móvil y contabiliza débito a inventario y crédito a bancos.
- Captura de conteo físico de cierre (`stock_final_real`) con cálculo automático de `varianza_conteo`.

### 🗓️ Lotes y Carta Semanal (`/panel/lotes`)
- Ciclo de vida semanal completo: `borrador` → `activo` → `cerrado` → `conciliado`.
- **Distinción Estricta de Tarifas Logísticas:**
  - `tarifa_fija_domiciliario`: El costo operacional acordado que se liquida al repartidor por la jornada.
  - `tarifa_domicilio_cliente`: El flete individual cobrado a cada comensal en el checkout (pasivo de terceros).
- Programación de carta semanal: selección de platos, unidades proyectadas, precio por lote y horas estimadas de fuego.
- **Previsualización de Cierre:** Al cerrar lote activo llamando `fn_cerrar_y_transferir_lote`, calcula qué insumos no perecederos se trasladan al nuevo lote como saldo inicial y qué insumos perecederos se dan de baja con su costo total visible antes de confirmar.
- Registro de gastos de lote (`lote_gastos`) con inductores de costeo ABC (`directo`, `horas_coccion`, `unidades_vendidas`, `ingreso_bruto`).

### 📊 Finanzas y Auditoría (`/panel/finanzas`)
- Estado de Resultados P&G (`vista_pnl_lote`): Ingresos, Costo de Mercancía Vendida (CMV), Pérdida por Mermas, Gastos de Operación y Utilidad Operacional Neta.
- Rentabilidad por CeCo (`vista_rendimiento_cecos`): Desglose por platillo con barras de costos apiladas (N1 Materia Prima, N2 Directos, N3 CIF Estructural, Mermas), utilidades netas y márgenes.
- **Gestión de Pasivo de Domiciliario:** Detección de fletes de terceros pendientes y botón de liquidación completa mediante `fn_liquidar_domiciliario`.
- **Libro Diario Inmutable:** Visor de partida doble agrupado por transacción con débitos y créditos cuadrados enfrentados. Toda entrada es inmutable por trigger de base de datos.

---

## 2. Puesta en Marcha Local

### Prerrequisitos
- Node.js 20+ (probado en Node 20 / 22 y Next.js 16.3)
- Gestor de paquetes `npm`
- Proyecto en Supabase (o instancia local de Supabase CLI)

### Variables de Entorno (`.env.local`)
Crea el archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-privada
```

### Instalación y Ejecución
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo con Turbopack
npm run dev

# 3. Compilar bundle de producción
npm run build
```
- Tienda pública: `http://localhost:3000`
- Panel operacional: `http://localhost:3000/panel`
- Acceso autenticado: `http://localhost:3000/entrar`

---

## 3. Esquema de Base de Datos y Migraciones

El proyecto sigue una estricta disciplina de DDL versionado por archivos inmutables en `supabase/migrations/`:

| Archivo | Contenido |
|---------|-----------|
| `20260905001000_enums_y_maestros.sql` | Enums del sistema, tablas `insumos`, `platos`, `receta_detalles` |
| `20260905002000_lotes_y_ordenes.sql` | `lotes`, `lote_cecos`, `ordenes`, `orden_detalles` |
| `20260905003000_inventario_y_diario.sql` | `inventario_lote`, `compras`, `mermas_operativas`, `lote_gastos`, `libro_diario` |
| `20260905004000_vistas_metricas.sql` | Vistas `vista_menu_publico`, `vista_produccion_dia`, `vista_alertas_inventario`, `vista_pnl_lote`, `vista_rendimiento_cecos`, `vista_cartera_domiciliarios` |
| `20260905005000_funciones_negocio.sql` | `fn_crear_orden_publica`, `fn_registrar_compra`, `fn_liquidar_domiciliario`, etc. |
| `20260905006000_triggers_integridad.sql` | Triggers de partida doble, inmutabilidad de diario y reserva de cupos |
| `20260905007000_rls_politicas.sql` | Políticas RLS para anon, staff, cocina y admin |
| `20260905008000_cierre_lote.sql` | Función atómica `fn_cerrar_y_transferir_lote` |

### Aplicación de Migraciones
```bash
# Con Supabase CLI
supabase db push

# O mediante cliente MCP ejecutando el contenido íntegro del archivo SQL
```

---

## 4. Referencias Visuales y Sistema de Diseño

- **Capturas de Referencia:** Ubicadas en el directorio `reference/` (`mobile-380.png`, `tablet-768.png`, `desktop-1440.png`).
- **Diseño sin dependencias ad-hoc:** Se utilizan tokens puros definidos en CSS:
  - Fuentes: `--display` (Fraunces), `--sans` (Inter/Instrument), `--mono` (JetBrains Mono).
  - Estilos del Panel: Aislados bajo la clase `.panel-root` en `app/(panel)/panel.css`.
  - Tienda: Estilos preservados en `app/globals.css`.

---

## 5. Trabajo Futuro y Extensiones (Roadmap)

De acuerdo con la sección 6 de `BACKEND.md`:
1. **Antiabuso y Rate Limiting en la Tienda:** `fn_crear_orden_publica` cuenta con topes de validación de cantidades. Al escalar la concurrencia pública, se puede desacoplar mediante un Route Handler con Cloudflare Turnstile y control por IP.
2. **Expiración de Reservas Huérfanas:** Implementar una función cron / Edge Function que libere pedidos en estado `recibida` si no reciben confirmación por WhatsApp en un plazo de N horas.
3. **Normalización de Cartera de Clientes:** Actualmente los datos del comensal viajan en la orden indexados por teléfono (`idx_ordenes_telefono`). Crear la tabla relacional `clientes` cuando la recurrencia requiera programas de fidelización o perfiles de cliente frecuentes.
