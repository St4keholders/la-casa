export type Finde = {
  sab: Date;
  dom: Date;
  sabTxt: string;
  domTxt: string;
};

export function formatFechaIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function finDeSemana(): Finde {
  const hoy = new Date();
  const sab = new Date(hoy);
  // Si hoy es sábado (6) o domingo (0), el pedido es para el siguiente fin de semana
  let diff = (6 - hoy.getDay() + 7) % 7;
  if (diff === 0) {
    diff = 7;
  }
  sab.setDate(hoy.getDate() + diff);
  const dom = new Date(sab);
  dom.setDate(sab.getDate() + 1);
  const f = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  return { sab, dom, sabTxt: f(sab), domTxt: f(dom) };
}
