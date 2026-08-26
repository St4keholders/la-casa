'use client';

import { useRef } from 'react';
import type { Dish } from '@/lib/types';
import { cop } from '@/lib/format';
import { useCart } from '@/context/CartContext';

interface DishCardProps {
  dish: Dish;
}

export default function DishCard({ dish }: DishCardProps) {
  const { add } = useCart();
  const btnRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdd = () => {
    add(dish.id);
    const btn = btnRef.current;
    if (!btn) return;
    btn.textContent = 'Añadido ✓';
    btn.classList.add('done');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (btn) { btn.textContent = 'Añadir'; btn.classList.remove('done'); }
    }, 1600);
  };

  return (
    <article
      className="card"
      style={{ '--c': dish.bg } as React.CSSProperties}
    >
      <div className="card-img">
        {dish.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.foto} alt={dish.name} loading="lazy" />
        ) : null}
      </div>
      <div className="card-body">
        <h3>{dish.name}</h3>
        <p className="card-note">{dish.note}</p>
        <ul className="card-rows">
          {dish.rows.map(([k, v]) => (
            <li key={k}>
              <b>{k}</b>
              <span>{v}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card-foot">
        <strong>{cop(dish.price)}</strong>
        <button
          className="add"
          type="button"
          ref={btnRef}
          onClick={handleAdd}
        >
          Añadir
        </button>
      </div>
    </article>
  );
}
