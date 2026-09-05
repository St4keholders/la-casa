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
          <h3>Pedido tomado</h3>
          <p>
            Tu pedido ya está registrado en nuestra cocina. Toca el botón para avisarnos por WhatsApp y confirmar los detalles de entrega.
          </p>

          {resumen?.precioCambio && (
            <div
              style={{
                backgroundColor: 'rgba(233, 163, 32, 0.15)',
                border: '1px solid var(--accent, #E9A320)',
                color: 'var(--paper-ink, #241A12)',
                padding: '0.6rem 0.8rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                margin: '0.75rem 0',
                textAlign: 'left',
              }}
            >
              <strong>Aviso:</strong> El total se actualizó según la tarifa vigente en la carta.
            </div>
          )}

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
          Avísanos por WhatsApp
        </a>
        <button className="btn btn-ghost" onClick={handleOtro}>
          Hacer otro pedido
        </button>
      </div>
    </>
  );
}
