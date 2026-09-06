'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { finDeSemana, type Finde } from '@/lib/weekend';
import StepCart from './StepCart';
import StepDelivery, { type ResumenData } from './StepDelivery';
import StepDone from './StepDone';

const TITLES: Record<number, string> = {
  1: 'Tu pedido',
  2: 'Datos de entrega',
  3: 'Listo',
};

export default function CartDrawer() {
  const { open, setOpen, step, setStep } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openBtnRef = useRef<HTMLElement | null>(null);
  const [finde] = useState<Finde | null>(() => (typeof window !== 'undefined' ? finDeSemana() : null));
  const [waLink, setWaLink] = useState('');
  const [resumen, setResumen] = useState<ResumenData | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      // Store the button that opened the cart so we can return focus to it
      openBtnRef.current = document.getElementById('openCart');
      closeRef.current?.focus();
    } else {
      (openBtnRef.current as HTMLElement | null)?.focus();
    }
  }, [open]);

  // Scroll cart to top on step change
  useEffect(() => {
    const el = document.querySelector(`.cart-body#paso${step}`);
    if (el) el.scrollTop = 0;
  }, [step]);

  const handleConfirm = (link: string, res: ResumenData) => {
    setWaLink(link);
    setResumen(res);
    setStep(3);
  };

  return (
    <>
      <div
        className={`scrim${open ? ' on' : ''}`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`cart${open ? ' on' : ''}`}
        role="dialog"
        aria-modal={true}
        aria-labelledby="cartTitle"
        aria-hidden={!open}
      >
        <div className="cart-top">
          <button
            className="x"
            ref={closeRef}
            aria-label="Cerrar pedido"
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <h2 id="cartTitle">{TITLES[step]}</h2>
          <span className="step-tag">Paso {step} de 3</span>
        </div>

        {step === 1 && <StepCart finde={finde} />}
        {step === 2 && <StepDelivery finde={finde} onConfirm={handleConfirm} />}
        {step === 3 && <StepDone waLink={waLink} resumen={resumen} />}
      </aside>
    </>
  );
}
