export type GarnishKey =
  | 'lime' | 'chili' | 'cilantro' | 'arepa' | 'aguacate' | 'corn'
  | 'patacon' | 'tomate' | 'lechuga' | 'cebolla' | 'platano' | 'yuca';

export type Dish = {
  id: number;
  kick: string;
  word: string;
  name: string;
  foto: string;
  price: number;
  left: number;
  note: string;
  rows: [string, string][];
  bg: string;
  ink: string;
  accent: string;
  aink: string;
  garnish: GarnishKey[];
};

export type CartLine = { id: number; qty: number };
export type Step = 1 | 2 | 3;
export type DeliveryDay = 'sabado' | 'domingo';
export type Delivery = {
  nombre: string;
  tel: string;
  dir: string;
  dia: DeliveryDay | null;
  nota: string;
};
