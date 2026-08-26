import type { Dish } from '@/lib/types';
import { cop, pad } from '@/lib/format';

interface TicketProps {
  dish: Dish;
  index: number;
}

export default function Ticket({ dish, index }: TicketProps) {
  return (
    <aside className="ticket" id="ticket">
      <div className="ticket-head">
        <span>Comanda {pad(index + 1)}</span>
        <span>quedan {dish.left}</span>
      </div>
      <h2>{dish.name}</h2>
      <p className="note">{dish.note}</p>
      <div className="rows">
        {dish.rows.map(([k, v]) => (
          <div className="row" key={k}>
            <span className="k">{k}</span>
            <span className="lead" />
            <span className="v">{v}</span>
          </div>
        ))}
      </div>
      <div className="total">
        <span>Almuerzo completo</span>
        <strong>{cop(dish.price)}</strong>
      </div>
    </aside>
  );
}
