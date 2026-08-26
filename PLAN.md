# PLAN.md — La casa · Fase 1

> **Objetivo de la fase 1:** replicar **exactamente** `reference/almuerzos-hero.html` en Next.js (App Router + TypeScript), sin backend. Los pedidos salen por WhatsApp al **+57 302 521 9775**. La fase 2 (base de datos) está fuera de alcance.

> **Fuente de verdad:** el archivo HTML. Si hay duda entre lo que dice este plan y lo que hace el HTML, **gana el HTML**.

---

## 0. Estado actual del repositorio

```
la-casa/
├── .git/                    ← ya inicializado
├── .next/
├── app/                     ← App Router (ya existe)
├── node_modules/
├── public/
├── AGENTS.md
├── CLAUDE.md
├── almuerzos-hero.html      ← 1104 líneas · MOVER a reference/ en la Fase 0
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

Repositorio remoto: `https://github.com/St4keholders/la-casa.git`

---

## 1. Reglas de oro (leer antes de tocar nada)

1. **El HTML es la especificación, no una inspiración.** No rediseñar, no "mejorar", no cambiar copys, colores, tamaños, tiempos de animación ni textos de error. Si algo se ve raro, se replica igual de raro y se anota al final.
2. **NO convertir el CSS a Tailwind.** El CSS se copia **literal** a `app/globals.css`. Razones: fidelidad 1:1 garantizada y ahorro enorme de tokens. Tailwind queda instalado pero sin usar en fase 1.
3. **Leer el HTML por rangos.** Usa la tabla de la sección 3. **Nunca** abras el archivo completo. **Nunca** releas un rango ya portado.
4. **Una fase por tarea/sesión.** Al terminar cada fase: verificar el criterio de aceptación, hacer commit, limpiar contexto y arrancar la siguiente.
5. **Cero dependencias nuevas.** Todo se resuelve con lo que ya está instalado.
6. **Nada se inventa.** Si un dato no está en el HTML ni en este plan, se pregunta.
7. **Todo el texto visible va en español de Colombia**, copiado tal cual del HTML (tildes y ñ incluidas).
8. **Sin `any`.** Los tipos están definidos en la sección 5.

---

## 2. Estructura final que hay que producir

```
app/
├── layout.tsx              # fuentes, metadata, <html lang="es-CO">, CartProvider
├── page.tsx                # ensambla Header + Hero + MenuSection + Footer + CartDrawer
└── globals.css             # TODO el CSS del HTML, copiado literal

components/
├── Header.tsx              # marca, nav, estado, botón de pedido con badge
├── Hero.tsx                # <main class="stage">: kicker + carrusel + comanda + pie
├── Plate.tsx               # un plato del carrusel (botón + <img>)
├── Ticket.tsx              # la comanda de papel
├── Garnishes.tsx           # los 6 ingredientes flotando
├── MenuSection.tsx         # sección #menu con las 4 tarjetas
├── DishCard.tsx            # una tarjeta del menú
├── Footer.tsx              # <footer class="pie">
└── cart/
    ├── CartDrawer.tsx      # panel + scrim + control de pasos
    ├── StepCart.tsx        # paso 1: líneas y total
    ├── StepDelivery.tsx    # paso 2: formulario y validación
    └── StepDone.tsx        # paso 3: resumen + botón de WhatsApp

lib/
├── types.ts                # Dish, CartLine, Delivery, Step, GarnishKey
├── dishes.ts               # los 4 platos (datos exactos del HTML)
├── garnishes.ts            # el objeto G con los 12 SVG
├── format.ts               # cop(), pad()
├── weekend.ts              # finDeSemana()
└── whatsapp.ts             # WHATSAPP + buildWaLink()

context/
└── CartContext.tsx         # estado del carrito, apertura del panel y paso actual

reference/
└── almuerzos-hero.html     # el HTML original, se queda versionado en el repo
```

---

## 3. Mapa del HTML → destino

Líneas exactas de `reference/almuerzos-hero.html` (1104 líneas). Cada bloque CSS empieza con un comentario `/* ---------------- nombre ---------------- */`, úsalo como ancla por si las líneas se corren.

### CSS (dentro de `<style>`, líneas 10–516)

| Líneas | Bloque | Destino |
|---|---|---|
| 11–59 | Tokens `:root`, reset, `body`, `.grain` | `globals.css` (arriba del todo) |
| 60–106 | `.top .brand .nav .status .cart-btn .badge` | `globals.css` |
| 107–192 | `.stage .kicker .carousel .wordmark .word .plate .garnish .arrow` | `globals.css` |
| 193–220 | `.ticket` y sus hijos | `globals.css` |
| 221–251 | `.foot .cta .aviso .link .dots .counter` | `globals.css` |
| 252–389 | Carrito completo: `.scrim .cart .banda .line .qty .btn .campo .dias .ok .resumen` | `globals.css` |
| 390–449 | `.menu .cards .card .add .pie` | `globals.css` |
| 450–515 | Media queries (1180px, 900px, 400px) + `prefers-reduced-motion` | `globals.css` (al final, respetando el orden) |

> El orden de las reglas importa: las media queries **tienen que quedar de últimas**. Copiar el bloque completo 11–515 de una sola pasada es lo más seguro y lo más barato en tokens.

### HTML (líneas 518–677)

| Líneas | Bloque | Componente |
|---|---|---|
| 518–520 | `<body>` + `.grain` | `layout.tsx` (el `.grain` va como primer div del body) |
| 521–532 | `<header class="top">` | `components/Header.tsx` |
| 533–572 | `<main class="stage">` | `components/Hero.tsx` (+ `Ticket`, `Garnishes`, `Plate`) |
| 575–583 | `<section class="menu">` | `components/MenuSection.tsx` |
| 584–588 | `<footer class="pie">` | `components/Footer.tsx` |
| 589 | `<div class="scrim">` | dentro de `CartDrawer.tsx` |
| 591–677 | `<aside class="cart">` con los 3 pasos | `components/cart/*` |

### JavaScript (líneas 679–1088)

| Líneas | Bloque | Destino |
|---|---|---|
| 683 | `const WHATSAPP` | `lib/whatsapp.ts` → **cambiar a `573025219775`** |
| 685–723 | `const dishes` | `lib/dishes.ts` |
| 725–740 | `const G` (los SVG de ingredientes) | `lib/garnishes.ts` |
| 741 | `const cop` | `lib/format.ts` |
| 742–758 | `finDeSemana()` | `lib/weekend.ts` |
| 759–868 | Carrusel: `go()`, `fitWord()`, flechas, teclado, arrastre | `components/Hero.tsx` |
| 869–989 | Carrito: `carrito`, `pintarCarrito()`, `añadir()`, `abrir()`, `cerrar()`, `irA()` | `context/CartContext.tsx` + `cart/*` |
| 991–1054 | Validación y armado del mensaje de WhatsApp | `cart/StepDelivery.tsx` + `lib/whatsapp.ts` |
| 1056–1087 | Render de las tarjetas del menú | `components/MenuSection.tsx` |

---

## 4. Fases de ejecución

Cada fase termina con **commit propio**. El mensaje de commit va indicado.

---

### Fase 0 — Preparación

**Leer del HTML:** nada.

**Tareas:**
1. `mkdir reference` y mover `almuerzos-hero.html` → `reference/almuerzos-hero.html`.
2. Abrir `package.json` y confirmar la versión de Next y si Tailwind v4 está instalado.
3. Abrir `app/globals.css`. Si tiene `@import "tailwindcss";` o directivas `@tailwind`, **borrarlas**. El preflight de Tailwind rompe el reset propio del HTML.
4. Confirmar que `.gitignore` incluye `node_modules`, `.next`, `.env*`.
5. Crear las carpetas vacías: `components/cart`, `lib`, `context`.

**Criterio de aceptación:** `npm run dev` levanta sin errores y muestra la página por defecto de Next.

**Commit:** `chore: preparar estructura para la réplica en next`

---

### Fase 1 — Tipos y datos

**Leer del HTML:** líneas **683–758** (WHATSAPP, dishes, G, cop, finDeSemana).

**Tareas:**

`lib/types.ts`:
```ts
export type GarnishKey =
  | 'lime' | 'chili' | 'cilantro' | 'arepa' | 'aguacate' | 'corn'
  | 'patacon' | 'tomate' | 'lechuga' | 'cebolla' | 'platano' | 'yuca';

export type Dish = {
  id: number;              // índice, 0..3
  kick: string;            // "Pechuga"
  word: string;            // "Pollo" — la palabra gigante
  name: string;            // "Pechuga a la plancha"
  foto: string;            // URL de Vercel Blob
  price: number;           // 22000 (número, no string)
  left: number;            // porciones restantes
  note: string;
  rows: [string, string][];
  bg: string; ink: string; accent: string; aink: string;
  garnish: GarnishKey[];   // exactamente 6
};

export type CartLine = { id: number; qty: number };
export type Step = 1 | 2 | 3;
export type DeliveryDay = 'sabado' | 'domingo';
export type Delivery = {
  nombre: string; tel: string; dir: string;
  dia: DeliveryDay | null; nota: string;
};
```

`lib/dishes.ts`: copiar los 4 objetos **tal cual** de las líneas 685–723, agregando `id: 0..3`. No tocar precios, colores, notas ni URLs de las fotos.

`lib/garnishes.ts`: copiar el objeto `G` completo (725–740) tipado como `Record<GarnishKey, string>`. Son plantillas de SVG en string; se pintan con `dangerouslySetInnerHTML`. Es seguro: son constantes del código, no entrada del usuario.

`lib/format.ts`:
```ts
export const cop = (n: number) => '$' + n.toLocaleString('es-CO');
export const pad = (n: number) => String(n).padStart(2, '0');
```

`lib/weekend.ts`: portar `finDeSemana()` igual. **Devolver también las fechas crudas**, no solo el texto.

`lib/whatsapp.ts`:
```ts
export const WHATSAPP = '573025219775';
```

**Criterio de aceptación:** `npx tsc --noEmit` pasa sin errores.

**Commit:** `feat: datos, tipos y utilidades del menú`

---

### Fase 2 — CSS global

**Leer del HTML:** líneas **11–515** (una sola lectura, de corrido).

**Tareas:**
1. Copiar **todo** ese bloque a `app/globals.css`, sin reordenar ni reformatear.
2. Reemplazar **solo** las tres declaraciones de fuente del `:root` por las variables de `next/font`:

```css
--display: var(--font-display), 'Arial Black', sans-serif;
--sans:    var(--font-sans), 'Helvetica Neue', sans-serif;
--mono:    var(--font-mono), ui-monospace, monospace;
```

3. No agregar `@layer`, no agregar prefijos, no correr ningún formateador sobre este archivo.

**Criterio de aceptación:** el archivo tiene el mismo número de reglas que el original y las media queries quedaron al final.

**Commit:** `style: portar el css completo del prototipo`

---

### Fase 3 — Layout y fuentes

**Leer del HTML:** líneas **1–9** (el `<head>`) y **518–520**.

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Archivo, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import './globals.css';

// Archivo es variable: NO se pasa weight, se pide el eje wdth
const display = Archivo({
  subsets: ['latin'], style: ['normal', 'italic'],
  axes: ['wdth'], variable: '--font-display', display: 'swap',
});
// Space Grotesk es variable: NO se pasa weight
const sans = Space_Grotesk({
  subsets: ['latin'], variable: '--font-sans', display: 'swap',
});
// IBM Plex Mono NO es variable: hay que declarar los pesos
const mono = IBM_Plex_Mono({
  subsets: ['latin'], weight: ['400', '500', '600'],
  variable: '--font-mono', display: 'swap',
});

export const metadata: Metadata = {
  title: 'La casa — Almuerzos de fin de semana',
  description:
    'Cuatro almuerzos completos con sopa, seco y jugo. Entregas sábado y domingo en Medellín.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <div className="grain" aria-hidden="true" />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
```

> Si `axes: ['wdth']` falla al construir, el eje `wght` ya viene incluido por defecto en fuentes variables; el error suele ser un nombre de eje mal escrito. No quitar el `font-variation-settings` del CSS.

**Criterio de aceptación:** en el navegador, `getComputedStyle(document.body).fontFamily` incluye Space Grotesk.

**Commit:** `feat: layout con fuentes y metadata`

---

### Fase 4 — Contexto del carrito

**Leer del HTML:** líneas **869–990**.

`context/CartContext.tsx` — empieza con `'use client'`.

Expone:
```ts
type CartApi = {
  lines: CartLine[];
  units: number;          // suma de qty
  total: number;          // suma de price * qty
  add: (id: number) => void;
  bump: (id: number, delta: 1 | -1) => void;  // borra la línea si llega a 0
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  step: Step;
  setStep: (s: Step) => void;
};
```

Equivalencias con el HTML:
- `carrito` → `useState<CartLine[]>([])`
- `añadir()` → `add`
- `cambiar()` → `bump`
- `abrir()` / `cerrar()` → `setOpen(true|false)`
- `irA(n)` → `setStep(n)`
- `total()` / `unidades()` → derivados con `useMemo`
- La clase `body.locked` → `useEffect` que la agrega/quita según `open` y **la limpia en el return**.
- `Escape` cierra el panel → `useEffect` con `window.addEventListener('keydown', ...)` y su cleanup.

**Persistencia (opcional, si sobra tiempo):** guardar `lines` en `localStorage`. Leerlo **dentro de un `useEffect`**, nunca en el estado inicial, o se rompe la hidratación.

**Criterio de aceptación:** un componente de prueba puede añadir y ver el total. `npx tsc --noEmit` pasa.

**Commit:** `feat: contexto del carrito`

---

### Fase 5 — Header

**Leer del HTML:** líneas **521–532**.

`components/Header.tsx` (`'use client'`, consume el contexto):
- Marca "La casa", nav con un solo enlace a `#menu`, estado "Entregas sábado y domingo".
- Botón de pedido: `onClick={() => setOpen(true)}`, badge con `units`.
- El pulso del badge: `useEffect` sobre `units` que agrega la clase `pulse`, la quita a los 450 ms y limpia el timeout.
- `class` → `className`. Los SVG inline se copian tal cual pero con `strokeWidth`, `strokeLinecap`, `strokeLinejoin` en camelCase.

**Criterio de aceptación:** el header se ve idéntico y el badge sube al añadir desde el contexto.

**Commit:** `feat: header con acceso al pedido`

---

### Fase 6 — Hero (la parte más delicada)

**Leer del HTML:** líneas **533–572** (markup) y **759–868** (lógica).

`components/Hero.tsx` (`'use client'`):

Estado: `const [active, setActive] = useState(0)` y `const [dir, setDir] = useState<1 | -1>(1)`.

**a) Colores.** El `go()` original escribe variables en `documentElement`. En React:
```tsx
useEffect(() => {
  const d = dishes[active], r = document.documentElement.style;
  r.setProperty('--bg', d.bg);
  r.setProperty('--ink', d.ink);
  r.setProperty('--accent', d.accent);
  r.setProperty('--accent-ink', d.aink);
}, [active]);
```

**b) Posición de cada plato.** El atributo `data-o` se calcula en el render, no se muta el DOM:
```ts
function offset(i: number, active: number, n: number) {
  let o = i - active;
  if (o >  n / 2) o -= n;
  if (o < -n / 2) o += n;
  return Math.abs(o) <= 2 ? String(o) : 'x';
}
```
Va como `data-o={offset(i, active, dishes.length)}` y `tabIndex={o === '0' ? -1 : 0}`.

**c) Animación del nombre.** En vez de quitar y poner la clase `swap`, usar `key={active}` en el `<span className="word">` para que React lo remonte y la animación CSS corra sola. La variable `--from` va en `style={{ '--from': dir > 0 ? '40px' : '-40px' } as React.CSSProperties}`.

**d) `fitWord()`.** `useLayoutEffect` con un `ref` al span y otro al carrusel:
```tsx
useLayoutEffect(() => {
  const w = wordRef.current, c = carRef.current;
  if (!w || !c) return;
  w.style.fontSize = '';
  const caja = c.clientWidth - 12;
  const ancho = w.scrollWidth;
  if (ancho > caja && caja > 0) {
    const fs = parseFloat(getComputedStyle(w).fontSize);
    w.style.fontSize = `${fs * caja / ancho}px`;
  }
}, [active]);
```
Más un `useEffect` con `resize` (debounce 120 ms) que llame a la misma función. **Sin esto, "de gallina" se sale de la pantalla en celular.**

**e) Teclado.** `useEffect` con `keydown` para `ArrowLeft`/`ArrowRight`, que **no hace nada si el carrito está abierto** (`if (open) return;`).

**f) Arrastre.** `onPointerDown` guarda `clientX` en un `useRef`; `onPointerUp` compara: si `Math.abs(dx) > 45`, avanza o retrocede.

**g) Anuncio accesible.** El `<p className="sr" aria-live="polite">` se mantiene y se actualiza con el nombre y el precio del plato activo.

**h) Botón "Añadir al pedido".** Llama a `add(active)` y cambia su texto a `Añadido ✓` por 1800 ms.

`components/Plate.tsx`: botón con `<img>` normal. **No usar `next/image`** en fase 1: el `object-fit: contain` combinado con `drop-shadow` y las `transform` del carrusel se comporta distinto. Si ESLint reclama `@next/next/no-img-element`, desactivar la regla en ese archivo con un comentario y anotarlo como pendiente de fase 2.

`components/Garnishes.tsx`: los 6 divs `g1..g6`. Al cambiar de plato: quitar la clase `on`, esperar 110 ms, cambiar el SVG y volver a poner `on` — mismo efecto que el original, con `setTimeout` limpiado en el return del `useEffect`.

`components/Ticket.tsx`: recibe `dish` e `index`; pinta comanda, nombre, nota, filas y precio con `cop()`.

**Criterio de aceptación:**
- Las 4 fotos cargan y rotan con flechas, teclado, arrastre, puntos y clic en los platos laterales.
- El fondo cambia de color con transición.
- "De gallina" **cabe completo** en un viewport de 380 px.
- No hay scroll horizontal en ningún tamaño.

**Commit:** `feat: hero con selector de almuerzos`

---

### Fase 7 — Menú y footer

**Leer del HTML:** líneas **575–588** (markup) y **1056–1087** (render de tarjetas).

`components/DishCard.tsx`: recibe `dish`. El color va como variable en línea:
```tsx
style={{ '--c': dish.bg } as React.CSSProperties}
```
Botón "Añadir": llama a `add(dish.id)`, cambia a `Añadido ✓` con la clase `done` por 1600 ms.

`components/MenuSection.tsx`: cabecera (`eyebrow`, `h2` con `<em>completos</em>`, `menu-lead`) + grilla de las 4 tarjetas.

`components/Footer.tsx`: las dos líneas del `<footer class="pie">`.

**Criterio de aceptación:** "Ver el menú" del header baja suave hasta `#menu` y las 4 tarjetas añaden al mismo carrito que el hero.

**Commit:** `feat: seccion de menu en tarjetas`

---

### Fase 8 — Carrito completo

**Leer del HTML:** líneas **591–677** (markup) y **991–1054** (validación y mensaje).

`components/cart/CartDrawer.tsx`:
- `scrim` con `className={open ? 'scrim on' : 'scrim'}` y `onClick` que cierra.
- `aside.cart` con `aria-hidden={!open}` y la clase `on` cuando está abierto.
- Cabecera: botón cerrar, título dinámico (`Tu pedido` / `Datos de entrega` / `Listo`) y `Paso N de 3`.
- Al abrir, enfocar el botón de cerrar; al cerrar, devolver el foco al botón del header.

`StepCart.tsx`: banda del fin de semana, líneas con `−` / cantidad / `+`, estado vacío, total y botón `Continuar con los datos` deshabilitado si `units === 0`.

`StepDelivery.tsx`:
- Campos: `fNombre`, `fTel`, `fDir`, radios `sabado`/`domingo`, `fNota`.
- El teléfono filtra a dígitos y espacios, máximo 13 caracteres.
- Validación al confirmar, exactamente igual que el original:

| Campo | Regla | Mensaje |
|---|---|---|
| Nombre | `length < 3` | Escribe el nombre completo. |
| Teléfono | dígitos `!== 10` | Necesitamos un celular de 10 dígitos. |
| Dirección | `length < 10` | Incluye barrio y punto de referencia. |
| Día | ninguno marcado | Escoge sábado o domingo. |

- Los errores se muestran con la clase `bad` en el `.campo`. Enfocar el primer campo malo.

**Fechas y la trampa de hidratación:** `finDeSemana()` usa `new Date()` y `toLocaleDateString`. Si se ejecuta en el render, el servidor y el cliente pueden dar textos distintos y Next lanza error de hidratación. Solución obligatoria:
```tsx
const [finde, setFinde] = useState<Finde | null>(null);
useEffect(() => setFinde(finDeSemana()), []);
```
Mientras sea `null`, mostrar `—` (igual que el HTML en su estado inicial).

`StepDone.tsx`: el `<dl class="resumen">` con pedido, almuerzos, entrega, quien recibe, dirección, nota y total.

**Criterio de aceptación:** se puede completar el pedido de punta a punta en un celular de 380 px de ancho, **con el botón de confirmar siempre visible** (el `.cart-body` tiene `min-height: 0`, no se puede perder esa regla al copiar el CSS).

**Commit:** `feat: carrito con checkout de entrega`

---

### Fase 9 — WhatsApp

`lib/whatsapp.ts`:
```ts
import { cop } from './format';
import { dishes } from './dishes';
import type { CartLine, Delivery } from './types';

export const WHATSAPP = '573025219775';

export function buildWaLink(
  lines: CartLine[], total: number, d: Delivery, diaTxt: string, codigo: string
) {
  const items = lines
    .map(l => `• ${l.qty} × ${dishes[l.id].name} — ${cop(dishes[l.id].price * l.qty)}`)
    .join('\n');

  const msg =
`Hola, La casa. Quiero hacer este pedido:

${codigo}
${items}

Total: ${cop(total)}
Entrega: ${diaTxt}
Nombre: ${d.nombre}
Teléfono: ${d.tel}
Dirección: ${d.dir}${d.nota ? `\nNota: ${d.nota}` : ''}`;

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
```

**Tres detalles que no se pueden saltar:**

1. **Usar un `<a>`, no `window.open`.** En iOS Safari, abrir una ventana desde un handler asíncrono se bloquea. El paso 3 debe renderizar:
   ```tsx
   <a className="btn btn-wa" href={waLink} target="_blank" rel="noopener noreferrer">
     Enviar por WhatsApp
   </a>
   ```
2. **Cambiar el copy del paso 3.** Sin backend, el pedido **no existe** hasta que el cliente manda el mensaje. Reemplazar:
   - `Pedido tomado` → `Ya casi`
   - `Te escribimos al celular para confirmar la hora exacta de entrega.` → `Toca el botón para enviarnos el pedido por WhatsApp. Hasta que no lo mandes, no nos llega.`
3. El código `PED-XXXX` se genera con `Math.random()` **dentro del handler de confirmar**, nunca en el render.

**Criterio de aceptación:** al confirmar, el enlace abre WhatsApp con el mensaje completo, con saltos de línea reales y tildes correctas.

**Commit:** `feat: envio del pedido por whatsapp`

---

### Fase 10 — QA antes de publicar

Correr `npm run build` y `npm run lint`. Cero errores.

Revisar en el navegador a **380 px**, **768 px** y **1440 px**:

- [ ] No hay scroll horizontal en ningún ancho (`document.documentElement.scrollWidth === clientWidth`).
- [ ] "De gallina" no toca los bordes en celular.
- [ ] El plato central se ve grande en celular (68vw) y los laterales asoman por los bordes.
- [ ] La comanda no choca con los bordes y tiene el mismo margen a lado y lado.
- [ ] En el carrito, con los 4 platos añadidos y el formulario lleno, el botón de confirmar sigue visible sin que se corte.
- [ ] `Escape` cierra el panel y el fondo no hace scroll mientras está abierto.
- [ ] Las flechas del teclado mueven el carrusel solo cuando el carrito está cerrado.
- [ ] Las 4 fotos tienen fondo transparente. Si aparece un cuadrado beige detrás de algún plato, esa imagen hay que recortarla y volverla a subir a Vercel Blob.
- [ ] `prefers-reduced-motion` apaga las animaciones.
- [ ] La consola no muestra advertencias de hidratación.

**Commit:** `fix: ajustes de qa` (solo si hubo cambios)

---

### Fase 11 — Publicar en GitHub

```bash
git remote -v
# si no existe el remoto:
git remote add origin https://github.com/St4keholders/la-casa.git

git add .
git commit -m "feat: replica en next.js del prototipo de la casa"
git branch -M main
git push -u origin main
```

`reference/almuerzos-hero.html` **se sube al repositorio**: es la especificación visual y el punto de comparación para cualquier cambio futuro.

Actualizar `README.md` con: qué es el proyecto, cómo correrlo, dónde está la referencia visual y qué entra en la fase 2.

---

## 5. Errores típicos de Next que hay que evitar

| Riesgo | Qué pasa | Cómo se evita |
|---|---|---|
| `new Date()` en el render | Error de hidratación: el servidor y el cliente calculan distinto | Calcular en `useEffect`, arrancar en `null` |
| `Math.random()` en el render | Mismo problema | Solo dentro de handlers |
| Falta `'use client'` | "useState is not a function" | Todo componente con estado, efecto o handler lo lleva |
| `class=` en vez de `className=` | React no aplica los estilos | Revisar cada SVG copiado |
| Atributos SVG en kebab-case | `stroke-width` no aplica | `strokeWidth`, `strokeLinecap`, `strokeLinejoin` |
| `next/image` en el carrusel | El `drop-shadow` y el `object-fit` se comportan distinto | `<img>` en fase 1 |
| Tailwind preflight activo | Pisa el reset del prototipo | Quitar el import de Tailwind de `globals.css` |
| Perder `min-height: 0` en `.cart-body` | El botón de confirmar se sale de la pantalla | Copiar el CSS literal, sin "limpiar" |
| Perder `overflow-x: clip` en `html, body` | Vuelve el scroll horizontal en celular | Igual: copiar literal |
| Formatear `globals.css` con Prettier agresivo | Se reordenan reglas y cambia la cascada | No correr formateadores sobre ese archivo |

---

## 6. Fuera de alcance en la fase 1

No hacer nada de esto todavía:

- Base de datos, API routes, server actions.
- Autenticación o cuentas de usuario.
- Pasarela de pagos.
- Panel de administración.
- Inventario real (el "quedan N" es un número fijo en `dishes.ts`).
- Migrar a `next/image` o a Tailwind.
- Páginas nuevas: en fase 1 solo existe `/`.

## 7. Qué viene en la fase 2

Para que las decisiones de la fase 1 no estorben después:

- Base de datos para pedidos e inventario.
- El "quedan N" pasa a ser real y se descuenta.
- Panel para ver los pedidos del fin de semana.
- WhatsApp deja de ser el canal único: el pedido se guarda primero y el mensaje pasa a ser una notificación.

Por eso el carrito vive detrás de un contexto con una API pequeña (`add`, `bump`, `clear`): cuando llegue el backend, se cambia la implementación por dentro y ningún componente se entera.
