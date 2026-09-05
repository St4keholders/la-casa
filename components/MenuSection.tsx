import type { Dish } from '@/lib/types';
import DishCard from './DishCard';

interface MenuSectionProps {
  dishes: Dish[];
}

export default function MenuSection({ dishes }: MenuSectionProps) {
  if (dishes.length === 0) return null;

  return (
    <section className="menu" id="menu">
      <div className="menu-head">
        <p className="eyebrow">El menú</p>
        <h2>Cuatro almuerzos, todos <em>completos</em></h2>
        <p className="menu-lead">
          Sopa, seco y jugo en cada uno. Se despachan sábado y domingo; el día lo escoges al confirmar el pedido.
        </p>
      </div>
      <div className="cards" id="cards">
        {dishes.map(dish => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </section>
  );
}
