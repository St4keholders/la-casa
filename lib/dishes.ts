import type { Dish } from './types';

export const dishes: Dish[] = [
  {
    id: 0,
    kick: 'Pechuga', word: 'Pollo', name: 'Pechuga a la plancha',
    foto: 'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/pollo.png',
    price: 22000, left: 16,
    note: 'Liviano y rápido. El que piden los que vuelven a la oficina.',
    rows: [['Sopa', 'Crema del día'], ['Seco', 'Arroz y ensalada fresca'], ['Proteína', 'Pechuga a la plancha'], ['Jugo', 'Maracuyá en agua']],
    bg: '#2F6B4B', ink: '#F2F7EC', accent: '#F4C95D', aink: '#241A12',
    garnish: ['cilantro', 'lime', 'tomate', 'lechuga', 'aguacate', 'cebolla'],
  },
  {
    id: 1,
    kick: 'Cazuela de', word: 'Frijoles', name: 'Cazuela de frijoles',
    foto: 'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/frijoles.png',
    price: 21000, left: 14,
    note: 'Frijol cargamanto en cazuela de barro. Sale hirviendo, con cuidado.',
    rows: [['Adentro', 'Frijol cargamanto y garra'], ['Encima', 'Chicharrón y hogao'], ['Va con', 'Arepa y aguacate'], ['Jugo', 'Mango en agua']],
    bg: '#6B2438', ink: '#FFEFE0', accent: '#F3A712', aink: '#241A12',
    garnish: ['arepa', 'aguacate', 'chili', 'platano', 'tomate', 'cilantro'],
  },
  {
    id: 2,
    kick: 'Sancocho', word: 'de gallina', name: 'Sancocho de gallina',
    foto: 'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/sancocho.png',
    price: 24000, left: 9,
    note: 'A fuego lento desde las seis de la mañana. Repetimos el caldo sin cobrar.',
    rows: [['Va con', 'Arroz blanco y aguacate'], ['Adentro', 'Gallina, yuca, plátano, mazorca'], ['Al lado', 'Ají casero'], ['Jugo', 'Lulo en agua']],
    bg: '#DFA01B', ink: '#2B1A06', accent: '#1D5B3C', aink: '#F2F7EC',
    garnish: ['corn', 'cilantro', 'lime', 'yuca', 'platano', 'chili'],
  },
  {
    id: 3,
    kick: 'Mojarra', word: 'Frita', name: 'Mojarra frita',
    foto: 'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/pescado.png',
    price: 28000, left: 5,
    note: 'Llega los jueves y viernes desde el Magdalena. Se acaba temprano.',
    rows: [['Va con', 'Arroz con coco y patacón'], ['Al lado', 'Ensalada y limón'], ['Salsa', 'Ají de la casa'], ['Jugo', 'Limonada de coco']],
    bg: '#0E7C86', ink: '#F1FBFB', accent: '#FFCF4D', aink: '#241A12',
    garnish: ['lime', 'patacon', 'chili', 'tomate', 'cebolla', 'lechuga'],
  },
];
