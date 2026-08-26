import { cop } from './format';
import { dishes } from './dishes';
import type { CartLine, Delivery } from './types';

export const WHATSAPP = '573025219775';

export function buildWaLink(
  lines: CartLine[],
  total: number,
  d: Delivery,
  diaTxt: string,
  codigo: string
): string {
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
