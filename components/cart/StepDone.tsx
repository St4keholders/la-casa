'use client';

import { useCart } from '@/context/CartContext';
import { cop } from '@/lib/format';
import type { ResumenData } from './StepDelivery';

interface StepDoneProps {
  waLink: string;
  resumen: ResumenData | null;
}

export default function StepDone({ waLink, resumen }: StepDoneProps) {
  const { clear, setOpen } = useCart();

  const handleOtro = () => {
    clear();
    setOpen(false);
  };

  return (
    <>
      <div className="cart-body" id="paso3">
        <div className="ok">
          <div className="ok-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <h3>Ya casi</h3>
          <p>Toca el botón para enviarnos el pedido por WhatsApp. Hasta que no lo mandes, no nos llega.</p>

          {resumen && (
            <dl className="resumen">
              <dt>Pedido</dt><dd>{resumen.codigo}</dd>
              <dt>Almuerzos</dt><dd>{resumen.lineas}</dd>
              <dt>Entrega</dt><dd>{resumen.diaTxt}</dd>
              <dt>Recibe</dt><dd>{resumen.nombre} · {resumen.tel}</dd>
              <dt>Dirección</dt><dd>{resumen.dir}</dd>
              {resumen.nota && <><dt>Nota</dt><dd>{resumen.nota}</dd></>}
              <dt>Total</dt><dd>{cop(resumen.total)}</dd>
            </dl>
          )}
        </div>
      </div>

      <div className="cart-foot" id="foot3">
        <a
          className="btn btn-wa"
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Enviar por WhatsApp
        </a>
        <button className="btn btn-ghost" onClick={handleOtro}>
          Hacer otro pedido
        </button>
      </div>
    </>
  );
}
