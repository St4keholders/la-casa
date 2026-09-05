'use client';

import { useCart } from '@/context/CartContext';
import { cop } from '@/lib/format';
import type { Finde } from '@/lib/weekend';

interface StepCartProps {
  finde: Finde | null;
}

export default function StepCart({ finde }: StepCartProps) {
  const { lines, units, total, bump, setStep, dishes } = useCart();

  return (
    <>
      <div className="cart-body" id="paso1">
        <div className="banda">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v5M12 16.5v.01"/>
          </svg>
          <p>
            Entregamos <strong>únicamente sábado y domingo</strong>.
            Este pedido sale el fin de semana del{' '}
            <strong>{finde ? `${finde.sabTxt} y ${finde.domTxt}` : '—'}</strong>.
            Entre semana no hay despachos.
          </p>
        </div>

        <div id="lineas">
          {units === 0 ? (
            <div className="vacio">
              <h3>Todavía no hay nada</h3>
              <p>Vuelve al carrusel, escoge un almuerzo y toca &quot;Añadir al pedido&quot;.</p>
            </div>
          ) : (
            lines.map(l => {
              const d = dishes[l.id];
              if (!d) return null;
              return (
                <div className="line" key={l.id}>
                  <div className="line-thumb">
                    {d.foto ? <img src={d.foto} alt="" /> : null}
                  </div>
                  <div className="line-info">
                    <h3>{d.name}</h3>
                    <p>{cop(d.price)} c/u · {cop(d.price * l.qty)}</p>
                  </div>
                  <div className="qty">
                    <button
                      type="button"
                      aria-label={`Quitar uno de ${d.name}`}
                      onClick={() => bump(l.id, -1)}
                    >−</button>
                    <span>{l.qty}</span>
                    <button
                      type="button"
                      aria-label={`Añadir uno de ${d.name}`}
                      onClick={() => bump(l.id, 1)}
                    >+</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="cart-foot" id="foot1">
        <div className="suma">
          <span>Total</span>
          <strong>{cop(total)}</strong>
        </div>
        <button
          className="btn btn-fill"
          disabled={units === 0}
          onClick={() => setStep(2)}
        >
          Continuar con los datos
        </button>
      </div>
    </>
  );
}
