'use client';

import { useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { cop } from '@/lib/format';
import { buildWaLink } from '@/lib/whatsapp';
import { crearPedido, mapearErrorPedido } from '@/lib/pedidos';
import { formatFechaIso } from '@/lib/weekend';
import type { Finde } from '@/lib/weekend';
import type { DeliveryDay } from '@/lib/types';

interface StepDeliveryProps {
  finde: Finde | null;
  onConfirm: (waLink: string, resumen: ResumenData) => void;
}

export type ResumenData = {
  codigo: string;
  lineas: string;
  diaTxt: string;
  nombre: string;
  tel: string;
  dir: string;
  nota: string;
  total: number;
  precioCambio?: boolean;
};

export default function StepDelivery({ finde, onConfirm }: StepDeliveryProps) {
  const { lines, total, setStep, dishes } = useCart();

  const [nombre, setNombre] = useState('');
  const [tel, setTel] = useState('');
  const [dir, setDir] = useState('');
  const [dia, setDia] = useState<DeliveryDay | null>(null);
  const [nota, setNota] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [errNombre, setErrNombre] = useState(false);
  const [errTel, setErrTel] = useState(false);
  const [errDir, setErrDir] = useState(false);
  const [errDia, setErrDia] = useState(false);

  const nombreRef = useRef<HTMLInputElement>(null);
  const telRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLTextAreaElement>(null);
  const sabRef = useRef<HTMLInputElement>(null);

  const handleTel = (v: string) => {
    setTel(v.replace(/[^\d\s]/g, '').slice(0, 13));
  };

  const handleConfirm = async () => {
    const telDigits = tel.replace(/\D/g, '');
    const badNombre = nombre.trim().length < 3;
    const badTel = telDigits.length !== 10;
    const badDir = dir.trim().length < 10;
    const badDia = !dia;

    setErrNombre(badNombre);
    setErrTel(badTel);
    setErrDir(badDir);
    setErrDia(badDia);

    if (badNombre || badTel || badDir || badDia) {
      if (badNombre) nombreRef.current?.focus();
      else if (badTel) telRef.current?.focus();
      else if (badDir) dirRef.current?.focus();
      else if (badDia) sabRef.current?.focus();
      return;
    }

    setGuardando(true);
    setErrorMsg(null);

    try {
      const targetDate = dia === 'sabado' ? finde?.sab : finde?.dom;
      const fechaEntrega = targetDate ? formatFechaIso(targetDate) : '';

      const platoIdPorIndice: Record<number, string> = {};
      dishes.forEach(d => {
        platoIdPorIndice[d.id] = d.platoId;
      });

      const delivery = {
        nombre: nombre.trim(),
        tel: telDigits,
        dir: dir.trim(),
        dia,
        nota: nota.trim(),
      };

      const resultado = await crearPedido(delivery, lines, platoIdPorIndice, fechaEntrega);

      const diaTxt = dia === 'sabado'
        ? `Sábado ${finde?.sabTxt ?? ''}`
        : `Domingo ${finde?.domTxt ?? ''}`;

      const codigo = resultado.codigo_orden;
      const totalFinal = resultado.total;
      const precioCambio = totalFinal !== total;

      const lineas = lines.map(l => `${l.qty} × ${dishes[l.id]?.name ?? 'Plato'}`).join(', ');
      const waLink = buildWaLink(lines, totalFinal, delivery, diaTxt, codigo, dishes);

      onConfirm(waLink, {
        codigo,
        lineas,
        diaTxt,
        nombre: delivery.nombre,
        tel: delivery.tel,
        dir: delivery.dir,
        nota: delivery.nota,
        total: totalFinal,
        precioCambio,
      });
    } catch (err) {
      const friendly = mapearErrorPedido(err);
      setErrorMsg(friendly);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="cart-body" id="paso2">
        <div className="banda">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v5M12 16.5v.01"/>
          </svg>
          <p>Confirma el día de entrega. Solo despachamos <strong>sábado y domingo</strong> de esta semana.</p>
        </div>

        <div className={`campo${errNombre ? ' bad' : ''}`} id="cNombre">
          <label htmlFor="fNombre">Nombre de quien recibe</label>
          <input
            id="fNombre"
            type="text"
            autoComplete="name"
            placeholder="Ej: Marcela Ríos"
            ref={nombreRef}
            value={nombre}
            onChange={e => { setNombre(e.target.value); setErrNombre(false); }}
          />
          <span className="err">Escribe el nombre completo.</span>
        </div>

        <div className={`campo${errTel ? ' bad' : ''}`} id="cTel">
          <label htmlFor="fTel">Teléfono de contacto</label>
          <input
            id="fTel"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="300 123 4567"
            ref={telRef}
            value={tel}
            onChange={e => { handleTel(e.target.value); setErrTel(false); }}
          />
          <span className="err">Necesitamos un celular de 10 dígitos.</span>
        </div>

        <div className={`campo${errDir ? ' bad' : ''}`} id="cDir">
          <label htmlFor="fDir">Dirección de entrega</label>
          <textarea
            id="fDir"
            autoComplete="street-address"
            placeholder="Calle 44 #70-32, apto 501. Barrio Laureles. Portería al lado de la panadería."
            ref={dirRef}
            value={dir}
            onChange={e => { setDir(e.target.value); setErrDir(false); }}
          />
          <span className="err">Incluye barrio y punto de referencia.</span>
        </div>

        <div className={`campo${errDia ? ' bad' : ''}`} id="cDia">
          <label>Día de entrega</label>
          <div className="dias">
            <label className="dia">
              <input
                type="radio"
                name="dia"
                value="sabado"
                id="fSab"
                ref={sabRef}
                checked={dia === 'sabado'}
                onChange={() => { setDia('sabado'); setErrDia(false); }}
              />
              <span>
                <b>Sábado</b>
                <em>{finde ? finde.sabTxt : '—'}</em>
              </span>
            </label>
            <label className="dia">
              <input
                type="radio"
                name="dia"
                value="domingo"
                id="fDom"
                checked={dia === 'domingo'}
                onChange={() => { setDia('domingo'); setErrDia(false); }}
              />
              <span>
                <b>Domingo</b>
                <em>{finde ? finde.domTxt : '—'}</em>
              </span>
            </label>
          </div>
          <span className="err">Escoge sábado o domingo.</span>
        </div>

        <div className="campo">
          <label htmlFor="fNota">Algo que debamos saber (opcional)</label>
          <textarea
            id="fNota"
            placeholder="Sin cebolla, timbrar dos veces, dejar en portería…"
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
        </div>
      </div>

      <div className="cart-foot" id="foot2">
        <div className="suma">
          <span>Total</span>
          <strong>{cop(total)}</strong>
        </div>

        {errorMsg && (
          <div style={{ color: '#D5321F', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <button
          className="btn btn-fill"
          disabled={guardando}
          onClick={handleConfirm}
        >
          {guardando ? 'Guardando…' : 'Confirmar pedido'}
        </button>
        <button
          className="btn btn-ghost"
          disabled={guardando}
          onClick={() => setStep(1)}
        >
          Volver al pedido
        </button>
      </div>
    </>
  );
}
