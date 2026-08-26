export type Finde = {
  sab: Date;
  dom: Date;
  sabTxt: string;
  domTxt: string;
};

export function finDeSemana(): Finde {
  const hoy = new Date();
  const sab = new Date(hoy);
  sab.setDate(hoy.getDate() + ((6 - hoy.getDay()) + 7) % 7);
  const dom = new Date(sab);
  dom.setDate(sab.getDate() + 1);
  const f = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  return { sab, dom, sabTxt: f(sab), domTxt: f(dom) };
}
