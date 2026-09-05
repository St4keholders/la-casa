import { cop } from './format';
import type { CartLine, Delivery, Dish } from './types';

export const WHATSAPP = '573025219775';

export function buildWaLink(
  lines: CartLine[],
  total: number,
  d: Delivery,
  diaTxt: string,
  codigo: string,
  dishes: Dish[]
): string {
  const items = lines
    .map(l => {
      const dish = dishes[l.id];
      const name = dish?.name ?? 'Plato';
      const price = dish?.price ?? 0;
      return `• ${l.qty} × ${name} — ${cop(price * l.qty)}`;
    })
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
