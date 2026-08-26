import type { Dish } from '@/lib/types';

interface PlateProps {
  dish: Dish;
  offset: string;
  onActivate: () => void;
}

export default function Plate({ dish, offset, onActivate }: PlateProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <button
      className="plate"
      type="button"
      data-o={offset}
      tabIndex={offset === '0' ? -1 : 0}
      aria-label={`Ver ${dish.name}`}
      onClick={() => { if (offset !== '0') onActivate(); }}
    >
      {dish.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dish.foto} alt={dish.name} loading={dish.id < 2 ? 'eager' : 'lazy'} />
      ) : (
        <span className="fallback">{dish.name}<br />sin foto</span>
      )}
    </button>
  );
}
