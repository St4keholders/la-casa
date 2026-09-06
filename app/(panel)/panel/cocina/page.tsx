'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Rotulo from '@/components/panel/Rotulo';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import FilaFicha from '@/components/panel/FilaFicha';
import Cifra from '@/components/panel/Cifra';
import Barra from '@/components/panel/Barra';
import { cop } from '@/lib/format';
import {
  getProduccionDia,
  getInsumosLote,
  getMermas,
  registrarMerma,
  getRecetasPlatos,
  getLoteActivo,
  type ProduccionPlato,
  type InsumoOption,
  type MermaItem,
  type RecetaItem,
  type TipoBajaMerma,
} from '@/lib/panel/cocina';

const TIPOS_BAJA: { value: TipoBajaMerma; label: string }[] = [
  { value: 'dano_cocina', label: 'Daño en cocina' },
  { value: 'descomposicion', label: 'Descomposición' },
  { value: 'caducidad', label: 'Caducidad' },
  { value: 'ajuste_inventario', label: 'Ajuste de inventario' },
  { value: 'perecedero_no_transferible', label: 'Perecedero no transferible' },
];

export default function CocinaPage() {
  const [loteId, setLoteId] = useState<string | null>(null);
  const [produccion, setProduccion] = useState<ProduccionPlato[]>([]);
  const [insumos, setInsumos] = useState<InsumoOption[]>([]);
  const [mermas, setMermas] = useState<MermaItem[]>([]);
  const [recetas, setRecetas] = useState<RecetaItem[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario de merma
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [tipoBaja, setTipoBaja] = useState<TipoBajaMerma>('dano_cocina');
  const [motivo, setMotivo] = useState('');
  const [guardandoMerma, setGuardandoMerma] = useState(false);
  const [mermaError, setMermaError] = useState<string | null>(null);
  const [ultimoCostoPerdido, setUltimoCostoPerdido] = useState<number | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const lote = await getLoteActivo();
      if (lote) {
        setLoteId(lote.id);
        const [prod, ins, merms, recs] = await Promise.all([
          getProduccionDia(lote.id),
          getInsumosLote(lote.id),
          getMermas(lote.id),
          getRecetasPlatos(),
        ]);
        setProduccion(prod);
        setInsumos(ins);
        setMermas(merms);
        setRecetas(recs);
        if (ins.length > 0 && !selectedInsumo) {
          setSelectedInsumo(ins[0].insumo_id);
        }
      }
    } catch (err) {
      console.error('Error cargando datos de cocina:', err);
    } finally {
      setCargando(false);
    }
  }, [selectedInsumo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleReportarMerma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteId || !selectedInsumo) return;
    const numCantidad = parseFloat(cantidad);
    if (isNaN(numCantidad) || numCantidad <= 0) {
      setMermaError('Ingresa una cantidad mayor a cero.');
      return;
    }
    if (motivo.trim().length < 5) {
      setMermaError('El motivo debe tener al menos 5 caracteres.');
      return;
    }

    setGuardandoMerma(true);
    setMermaError(null);

    try {
      const costoPerdido = await registrarMerma({
        lote_id: loteId,
        insumo_id: selectedInsumo,
        cantidad: numCantidad,
        tipo_baja: tipoBaja,
        motivo: motivo.trim(),
      });

      setUltimoCostoPerdido(costoPerdido);
      setCantidad('');
      setMotivo('');
      await cargarDatos();
    } catch (err: any) {
      setMermaError(err.message || 'Error al registrar la merma');
    } finally {
      setGuardandoMerma(false);
    }
  };

  if (cargando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
        Cargando operaciones de cocina…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid var(--p-line)', paddingBottom: '0.8rem' }}>
        <Rotulo>OPERACIONES DE COCINA</Rotulo>
        <h1
          style={{
            fontFamily: 'var(--display)',
            fontVariationSettings: "'wdth' 108, 'wght' 800",
            fontStyle: 'italic',
            textTransform: 'uppercase',
            fontSize: '1.8rem',
            margin: '0.2rem 0',
            color: 'var(--p-ink)',
          }}
        >
          Producción y Mermas
        </h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--p-muted)', margin: 0 }}>
          Control de volumen por preparar, registro de bajas operativas y recetas de línea.
        </p>
      </div>

      {/* 1. PRODUCCIÓN DEL DÍA */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Rotulo>PRODUCCIÓN ACTIVA</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Almuerzos Comprometidos
            </h2>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
            Desde vista_produccion_dia
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {produccion.map((p) => {
            const avance = p.total_comprometido > 0
              ? Math.round((p.despachados / p.total_comprometido) * 100)
              : 0;

            return (
              <Comanda key={p.codigo_ceco}>
                <ComandaHeader>
                  <Rotulo>{p.codigo_ceco}</Rotulo>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', fontWeight: 600 }}>
                    TOTAL: {p.total_comprometido}
                  </span>
                </ComandaHeader>

                <ComandaTitle>{p.platillo}</ComandaTitle>

                <div style={{ margin: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <FilaFicha label="Por preparar" value={<span style={{ color: 'var(--p-prep)', fontWeight: 700 }}>{p.por_preparar}</span>} />
                  <FilaFicha label="Empacados" value={<span style={{ color: 'var(--p-empacado)', fontWeight: 700 }}>{p.empacados}</span>} />
                  <FilaFicha label="Despachados" value={<span style={{ color: 'var(--p-despachado)', fontWeight: 700 }}>{p.despachados}</span>} />
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <Rotulo>Despacho completado</Rotulo>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--p-ink)' }}>
                      {avance}%
                    </span>
                  </div>
                  <Barra valor={avance} color="var(--p-despachado)" />
                </div>
              </Comanda>
            );
          })}
        </div>
      </section>

      {/* 2. REPORTE DE MERMA */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Formulario de registro */}
        <Comanda>
          <ComandaHeader>
            <Rotulo>REGISTRO DE MERMA</Rotulo>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--p-recibida)', fontWeight: 600 }}>
              BAJA OPERATIVA
            </span>
          </ComandaHeader>

          <ComandaTitle>Reportar Pérdida</ComandaTitle>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--p-muted)', margin: '0 0 1rem 0' }}>
            Deduce inventario y carga el costo contable contra la cuenta de pérdida.
          </p>

          {ultimoCostoPerdido !== null && (
            <div
              style={{
                backgroundColor: 'rgba(107, 31, 51, 0.08)',
                border: '1.5px solid var(--p-recibida)',
                borderRadius: '4px',
                padding: '0.85rem',
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              <Rotulo>COSTO TOTAL PERDIDO</Rotulo>
              <Cifra size="md" className="costo-merma-destacado" style={{ color: 'var(--p-recibida)' }}>
                {cop(ultimoCostoPerdido)}
              </Cifra>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--p-recibida)', margin: '0.3rem 0 0 0' }}>
                Asiento contable registrado en libro diario y reflejado en el inventario.
              </p>
            </div>
          )}

          <form onSubmit={handleReportarMerma} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label
                htmlFor="insumo"
                style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}
              >
                Insumo a dar de baja
              </label>
              <select
                id="insumo"
                value={selectedInsumo}
                onChange={(e) => setSelectedInsumo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.85rem',
                  border: '1px solid var(--p-line)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--p-bg)',
                  outline: 'none',
                }}
              >
                {insumos.map((i) => (
                  <option key={i.insumo_id} value={i.insumo_id}>
                    {i.nombre} ({i.unidad_medida}) · Disp: {i.saldo_teorico}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label
                  htmlFor="cant"
                  style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}
                >
                  Cantidad
                </label>
                <input
                  id="cant"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="tipo"
                  style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}
                >
                  Tipo de baja
                </label>
                <select
                  id="tipo"
                  value={tipoBaja}
                  onChange={(e) => setTipoBaja(e.target.value as TipoBajaMerma)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.82rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    outline: 'none',
                  }}
                >
                  {TIPOS_BAJA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="motivo"
                style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}
              >
                Motivo (mínimo 5 letras)
              </label>
              <textarea
                id="motivo"
                rows={2}
                required
                placeholder="Ej: Se cayó al servir en la mesa de emplatado..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.82rem',
                  border: '1px solid var(--p-line)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--p-bg)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {mermaError && (
              <div style={{ color: 'var(--p-recibida)', fontSize: '0.8rem', fontFamily: 'var(--sans)', fontWeight: 500 }}>
                {mermaError}
              </div>
            )}

            <button
              type="submit"
              disabled={guardandoMerma}
              style={{
                padding: '0.65rem',
                backgroundColor: 'var(--p-recibida)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--sans)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: guardandoMerma ? 'not-allowed' : 'pointer',
                opacity: guardandoMerma ? 0.7 : 1,
              }}
            >
              {guardandoMerma ? 'Registrando baja…' : 'Registrar merma operativa'}
            </button>
          </form>
        </Comanda>

        {/* Historial de mermas del lote */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Rotulo>HISTORIAL DE BAJAS DEL LOTE</Rotulo>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--p-muted)' }}>
              {mermas.length} registradas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
            {mermas.length === 0 ? (
              <div style={{ background: 'var(--p-surface)', padding: '1.5rem', border: '1px solid var(--p-line)', borderRadius: '4px', textAlign: 'center', color: 'var(--p-muted)', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>
                No hay mermas registradas en este lote. ¡Excelente rendimiento!
              </div>
            ) : (
              mermas.map((m) => (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: 'var(--p-surface)',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    padding: '0.8rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                    <strong style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', color: 'var(--p-ink)' }}>
                      {m.insumo_nombre}
                    </strong>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--p-recibida)', fontWeight: 700 }}>
                      −{cop(m.costo_total_perdida)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--p-muted)' }}>
                    <span>Cantidad: {m.cantidad} {m.unidad_medida}</span>
                    <span style={{ textTransform: 'uppercase' }}>{m.tipo_baja.replace(/_/g, ' ')}</span>
                  </div>

                  <div style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--p-ink)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    &ldquo;{m.motivo}&rdquo;
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. RECETAS DE LÍNEA */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <Rotulo>CONSULTA TÉCNICA</Rotulo>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
            Fichas Técnicas y Gramajes de Línea
          </h2>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--p-muted)', margin: 0 }}>
            Cantidades netas y brutas calculadas para el mise en place de la brigada.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {recetas.map((r) => (
            <div
              key={r.plato_id}
              style={{
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-line)',
                borderRadius: '4px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--p-line)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
                <Rotulo>{r.codigo_ceco}</Rotulo>
                <strong style={{ fontFamily: 'var(--sans)', fontSize: '0.95rem', color: 'var(--p-ink)' }}>
                  {r.plato_nombre}
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {r.ingredientes.map((ing) => (
                  <div
                    key={ing.insumo_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: 'var(--p-muted)' }}>{ing.insumo_nombre}</span>
                    <span style={{ color: 'var(--p-ink)', fontWeight: 600 }}>
                      {ing.cantidad_neta} {ing.unidad_medida}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
