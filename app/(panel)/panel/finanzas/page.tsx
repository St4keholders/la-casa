'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Rotulo from '@/components/panel/Rotulo';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import Cifra from '@/components/panel/Cifra';
import Barra from '@/components/panel/Barra';
import EstadoPill from '@/components/panel/EstadoPill';
import { cop } from '@/lib/format';
import { getLotes, type LoteResumen } from '@/lib/panel/lotes';
import {
  getRendimientoCecos,
  getPnlLote,
  getPnlHistorico,
  liquidarDomiciliario,
  getLibroDiario,
  type RendimientoCeCo,
  type PnlLote,
  type TransaccionDiario,
} from '@/lib/panel/finanzas';

export default function FinanzasPage() {
  const [lotes, setLotes] = useState<LoteResumen[]>([]);
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<string>('');
  const [codigoLoteActual, setCodigoLoteActual] = useState<string>('');

  const [cecos, setCecos] = useState<RendimientoCeCo[]>([]);
  const [pnl, setPnl] = useState<PnlLote | null>(null);
  const [historicoPnl, setHistoricoPnl] = useState<PnlLote[]>([]);
  const [libroDiario, setLibroDiario] = useState<TransaccionDiario[]>([]);

  const [cargando, setCargando] = useState(true);
  const [liquidando, setLiquidando] = useState(false);
  const [mensajeLiquidacion, setMensajeLiquidacion] = useState<string | null>(null);
  const [errorLiquidacion, setErrorLiquidacion] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [lts, hist] = await Promise.all([getLotes(), getPnlHistorico()]);
      setLotes(lts);
      setHistoricoPnl(hist);

      const activo = lts.find((l) => l.estado === 'activo');
      const defecto = activo || lts[0];

      if (defecto) {
        setLoteSeleccionadoId(defecto.id);
        setCodigoLoteActual(defecto.codigo_lote);

        const [cecosData, pnlData, diarioData] = await Promise.all([
          getRendimientoCecos(defecto.codigo_lote),
          getPnlLote(defecto.codigo_lote),
          getLibroDiario(defecto.id),
        ]);

        setCecos(cecosData);
        setPnl(pnlData);
        setLibroDiario(diarioData);
      }
    } catch (err) {
      console.error('Error cargando finanzas:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCambioLote = async (nuevoLoteId: string) => {
    const lote = lotes.find((l) => l.id === nuevoLoteId);
    if (!lote) return;

    setLoteSeleccionadoId(lote.id);
    setCodigoLoteActual(lote.codigo_lote);
    setCargando(true);
    setMensajeLiquidacion(null);
    setErrorLiquidacion(null);

    try {
      const [cecosData, pnlData, diarioData] = await Promise.all([
        getRendimientoCecos(lote.codigo_lote),
        getPnlLote(lote.codigo_lote),
        getLibroDiario(lote.id),
      ]);
      setCecos(cecosData);
      setPnl(pnlData);
      setLibroDiario(diarioData);
    } catch (err) {
      console.error('Error al cambiar lote:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleLiquidarDomiciliario = async () => {
    if (!loteSeleccionadoId || !pnl) return;
    setLiquidando(true);
    setErrorLiquidacion(null);
    setMensajeLiquidacion(null);

    try {
      const montoLiquidado = await liquidarDomiciliario(loteSeleccionadoId);
      setMensajeLiquidacion(`Se liquidó con éxito el saldo de ${cop(montoLiquidado)} al domiciliario. Asiento registrado en el diario.`);

      const [pnlActualizado, diarioActualizado] = await Promise.all([
        getPnlLote(codigoLoteActual),
        getLibroDiario(loteSeleccionadoId),
      ]);
      setPnl(pnlActualizado);
      setLibroDiario(diarioActualizado);
    } catch (err: any) {
      setErrorLiquidacion(err.message || 'Error al liquidar domiciliario');
    } finally {
      setLiquidando(false);
    }
  };

  if (cargando && lotes.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
        Cargando estado financiero y CeCos…
      </div>
    );
  }

  const utilidadOperacional = pnl?.utilidad_operacional ?? 0;
  const esUtilidadNegativa = utilidadOperacional < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Encabezado */}
      <div
        style={{
          borderBottom: '1px solid var(--p-line)',
          paddingBottom: '0.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <Rotulo>CONTROL FINANCIERO & AUDITORÍA</Rotulo>
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
            Finanzas y Rentabilidad por CeCo
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--p-muted)', margin: 0 }}>
            P&G operacional, costeo ABC por platillo, liquidación de fletes y libro diario de partida doble.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
            Lote visualizado:
          </span>
          <select
            value={loteSeleccionadoId}
            onChange={(e) => handleCambioLote(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              fontFamily: 'var(--mono)',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1px solid var(--p-line)',
              borderRadius: '4px',
              backgroundColor: 'var(--p-surface)',
              color: 'var(--p-ink)',
            }}
          >
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo_lote} ({l.estado})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. AVISO CRÍTICO: PASIVO DEL DOMICILIARIO PENDIENTE */}
      {pnl && pnl.pasivo_domiciliario_pendiente > 0 && (
        <section
          style={{
            backgroundColor: 'rgba(107, 31, 51, 0.08)',
            border: '2px solid var(--p-recibida)',
            borderRadius: '6px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--p-recibida)', textTransform: 'uppercase' }}>
                ⚠️ PASIVO DE TERCEROS PENDIENTE DE LIQUIDACIÓN
              </span>
            </div>
            <span style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--p-recibida)' }}>
              {cop(pnl.pasivo_domiciliario_pendiente)}
            </span>
          </div>

          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--p-ink)', margin: 0, lineHeight: 1.4 }}>
            <strong>Ese saldo es plata de terceros:</strong> si no queda en cero, o falta pagarle al repartidor o se cobró un flete que nadie llevó.
            Al presionar el botón de liquidación, se debita la cuenta <code>pasivo_domiciliario</code> y se acredita <code>caja_bancos</code> en el libro diario.
          </p>

          {mensajeLiquidacion && (
            <div style={{ backgroundColor: 'rgba(46, 107, 78, 0.1)', border: '1px solid var(--p-despachado)', color: 'var(--p-despachado)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              ✓ {mensajeLiquidacion}
            </div>
          )}

          {errorLiquidacion && (
            <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.1)', border: '1px solid var(--p-recibida)', color: 'var(--p-recibida)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              {errorLiquidacion}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              onClick={handleLiquidarDomiciliario}
              disabled={liquidando}
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: 'var(--p-recibida)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--sans)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: liquidando ? 'not-allowed' : 'pointer',
                opacity: liquidando ? 0.7 : 1,
              }}
            >
              {liquidando ? 'Liquidando pasivo…' : 'Liquidar Domiciliario por Completo →'}
            </button>
          </div>
        </section>
      )}

      {/* 2. P&G DEL LOTE (ESTADO DE RESULTADOS OPERACIONAL) */}
      {pnl && (
        <section>
          <div style={{ marginBottom: '1rem' }}>
            <Rotulo>ESTADO DE RESULTADOS</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              P&G Operacional · {pnl.codigo_lote}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px', padding: '1rem' }}>
              <span style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)', textTransform: 'uppercase' }}>
                Ingresos Brutos
              </span>
              <Cifra size="lg" style={{ color: 'var(--p-despachado)', margin: '0.3rem 0' }}>
                {cop(pnl.ingresos)}
              </Cifra>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                Ventas totales despachadas
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px', padding: '1rem' }}>
              <span style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)', textTransform: 'uppercase' }}>
                Costo Mercancía Vendida (CMV)
              </span>
              <Cifra size="lg" style={{ color: 'var(--p-prep)', margin: '0.3rem 0' }}>
                −{cop(pnl.costo_mercancia_vendida)}
              </Cifra>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                Materia prima consumida en despacho
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px', padding: '1rem' }}>
              <span style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)', textTransform: 'uppercase' }}>
                Pérdida por Mermas
              </span>
              <Cifra size="lg" style={{ color: 'var(--p-recibida)', margin: '0.3rem 0' }}>
                −{cop(pnl.perdida_merma)}
              </Cifra>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                Bajas operativas y cierres
              </span>
            </div>

            <div
              style={{
                backgroundColor: esUtilidadNegativa ? 'rgba(107, 31, 51, 0.05)' : 'rgba(46, 107, 78, 0.05)',
                border: `1.5px solid ${esUtilidadNegativa ? 'var(--p-recibida)' : 'var(--p-despachado)'}`,
                borderRadius: '6px',
                padding: '1rem',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--mono)', color: esUtilidadNegativa ? 'var(--p-recibida)' : 'var(--p-despachado)', textTransform: 'uppercase', fontWeight: 700 }}>
                Utilidad Operacional
              </span>
              <Cifra size="lg" style={{ color: esUtilidadNegativa ? 'var(--p-recibida)' : 'var(--p-despachado)', margin: '0.3rem 0' }}>
                {cop(utilidadOperacional)}
              </Cifra>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                Margen neto de la operación
              </span>
            </div>
          </div>

          {/* Desglose P&G tabular */}
          <div style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--p-line)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>(+) Ingresos por Venta de Almuerzos</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--p-despachado)' }}>{cop(pnl.ingresos)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--p-line)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>(−) Costo de Mercancía Vendida (Nivel 1 Insumos)</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--p-prep)' }}>−{cop(pnl.costo_mercancia_vendida)}</td>
                </tr>
                <tr style={{ borderBottom: '1.5px solid var(--p-line)', backgroundColor: 'var(--p-bg)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>(=) Utilidad Bruta</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>{cop(pnl.ingresos - pnl.costo_mercancia_vendida)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--p-line)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>(−) Pérdida por Mermas Operativas</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--p-recibida)' }}>−{cop(pnl.perdida_merma)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--p-line)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>(−) Gasto Logística</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--p-muted)' }}>−{cop(pnl.gasto_logistica)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--p-line)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>(−) Gasto Mano de Obra</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--p-muted)' }}>−{cop(pnl.gasto_mano_obra)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--p-line)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>(−) Costos Indirectos de Fabricación (CIF)</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--p-muted)' }}>−{cop(pnl.cif)}</td>
                </tr>
                <tr style={{ backgroundColor: esUtilidadNegativa ? 'rgba(107, 31, 51, 0.08)' : 'rgba(46, 107, 78, 0.08)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.9rem', color: esUtilidadNegativa ? 'var(--p-recibida)' : 'var(--p-despachado)' }}>
                    (=) Utilidad Operacional Neta
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: esUtilidadNegativa ? 'var(--p-recibida)' : 'var(--p-despachado)' }}>
                    {cop(pnl.utilidad_operacional)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. RENTABILIDAD POR CECO (ABC COSTING) */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Rotulo>COSTEO ABC POR CENTRO DE COSTO</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Rentabilidad por Platillo
            </h2>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
            {cecos.length} Centros de Costo en la Carta
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {cecos.map((ceco) => {
            const esNegativo = ceco.utilidad_neta < 0;
            const totalCostos = ceco.costo_nivel1_materia_prima + ceco.costo_nivel2_directo + ceco.costo_nivel3_estructural + ceco.costo_merma;

            return (
              <Comanda key={ceco.codigo_ceco}>
                <ComandaHeader>
                  <div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {ceco.codigo_ceco}
                    </span>
                    <ComandaTitle>{ceco.platillo}</ComandaTitle>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                    {cop(ceco.precio_venta_lote)}
                  </span>
                </ComandaHeader>

                {/* Métricas clave */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', margin: '1rem 0' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                      Venta / Proy.
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                      {ceco.unidades_vendidas} / {ceco.unidades_proyectadas}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                      ({ceco.cumplimiento_proyeccion_porcentaje}%)
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                      Margen Bruto
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                      {ceco.margen_bruto_porcentaje}%
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                      Margen Neto
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: esNegativo ? 'var(--p-recibida)' : 'var(--p-despachado)',
                      }}
                    >
                      {ceco.margen_neto_porcentaje}%
                    </span>
                  </div>
                </div>

                {/* Barra de Costos ABC */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)', marginBottom: '0.3rem' }}>
                    <span>Estructura de Costos</span>
                    <span>Total: {cop(totalCostos)}</span>
                  </div>

                  <div style={{ height: '8px', width: '100%', display: 'flex', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--p-line)' }}>
                    {totalCostos > 0 ? (
                      <>
                        <div
                          style={{
                            width: `${(ceco.costo_nivel1_materia_prima / totalCostos) * 100}%`,
                            backgroundColor: 'var(--p-prep)',
                          }}
                          title={`Materia prima: ${cop(ceco.costo_nivel1_materia_prima)}`}
                        />
                        <div
                          style={{
                            width: `${(ceco.costo_nivel2_directo / totalCostos) * 100}%`,
                            backgroundColor: '#2F4858',
                          }}
                          title={`Gasto directo: ${cop(ceco.costo_nivel2_directo)}`}
                        />
                        <div
                          style={{
                            width: `${(ceco.costo_nivel3_estructural / totalCostos) * 100}%`,
                            backgroundColor: 'var(--p-accent)',
                          }}
                          title={`CIF estructural: ${cop(ceco.costo_nivel3_estructural)}`}
                        />
                        <div
                          style={{
                            width: `${(ceco.costo_merma / totalCostos) * 100}%`,
                            backgroundColor: 'var(--p-recibida)',
                          }}
                          title={`Merma: ${cop(ceco.costo_merma)}`}
                        />
                      </>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.62rem', fontFamily: 'var(--mono)', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--p-prep)' }}>■ N1 MP: {cop(ceco.costo_nivel1_materia_prima)}</span>
                    <span style={{ color: '#2F4858' }}>■ N2 Directo: {cop(ceco.costo_nivel2_directo)}</span>
                    <span style={{ color: '#925B00' }}>■ N3 CIF: {cop(ceco.costo_nivel3_estructural)}</span>
                  </div>
                </div>

                {/* Utilidad Neta */}
                <div style={{ borderTop: '1px solid var(--p-line)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)', textTransform: 'uppercase' }}>
                    Utilidad Neta CeCo
                  </span>
                  <Cifra size="sm" style={{ color: esNegativo ? 'var(--p-recibida)' : 'var(--p-ink)' }}>
                    {cop(ceco.utilidad_neta)}
                  </Cifra>
                </div>
              </Comanda>
            );
          })}
        </div>
      </section>

      {/* 4. LIBRO DIARIO INMUTABLE (PARTIDA DOBLE) */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <Rotulo>CONTABILIDAD GENERAL</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Libro Diario Inmutable · Partida Doble
            </h2>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
            {libroDiario.length} transacciones contables
          </span>
        </div>

        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--p-muted)', margin: '0 0 1rem 0' }}>
          Todas las transacciones son inmutables por trigger de base de datos. No existen botones de modificación o borrado: cada corrección se realiza mediante contrapartida contable.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {libroDiario.map((txn) => (
            <div
              key={txn.transaccion_id}
              style={{
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-line)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              {/* Encabezado de la transacción */}
              <div
                style={{
                  padding: '0.65rem 1rem',
                  backgroundColor: 'var(--p-bg)',
                  borderBottom: '1px solid var(--p-line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '3px',
                      color: 'var(--p-ink)',
                    }}
                  >
                    {txn.tipo_asiento.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--p-ink)' }}>
                    {txn.descripcion_general}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)' }}>
                    {new Date(txn.fecha_registro).toLocaleString('es-CO')}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: txn.cuadrada ? 'var(--p-despachado)' : 'var(--p-recibida)',
                    }}
                  >
                    {txn.cuadrada ? '✓ Cuadrado' : '✕ Descuadrado'}
                  </span>
                </div>
              </div>

              {/* Asientos enfrentados Débito / Crédito */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--p-line)', color: 'var(--p-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 1rem', width: '22%' }}>Cuenta</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Detalle</th>
                    <th style={{ padding: '0.5rem 1rem', textAlign: 'right', width: '18%' }}>Débito</th>
                    <th style={{ padding: '0.5rem 1rem', textAlign: 'right', width: '18%' }}>Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {txn.asientos.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--p-line)' }}>
                      <td style={{ padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--p-ink)' }}>
                        {a.cuenta.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '0.5rem 1rem', color: 'var(--p-muted)' }}>
                        {a.descripcion}
                      </td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: a.debito > 0 ? 700 : 400, color: a.debito > 0 ? 'var(--p-ink)' : 'var(--p-line)' }}>
                        {a.debito > 0 ? cop(a.debito) : '—'}
                      </td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: a.credito > 0 ? 700 : 400, color: a.credito > 0 ? 'var(--p-ink)' : 'var(--p-line)' }}>
                        {a.credito > 0 ? cop(a.credito) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: 'var(--p-bg)', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--p-muted)' }}>
                      Total Asiento:
                    </td>
                    <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--p-ink)' }}>
                      {cop(txn.total_debito)}
                    </td>
                    <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--p-ink)' }}>
                      {cop(txn.total_credito)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* 5. COMPARATIVO HISTÓRICO ENTRE LOTES */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <Rotulo>EVOLUCIÓN TEMPORAL</Rotulo>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
            Comparativo Histórico de Lotes
          </h2>
        </div>

        <div style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--p-bg)', borderBottom: '1px solid var(--p-line)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Lote</th>
                <th style={{ padding: '0.75rem' }}>Estado</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ingresos</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CMV</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Mermas</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>Utilidad Operacional</th>
              </tr>
            </thead>
            <tbody>
              {historicoPnl.map((h) => {
                const esNeg = h.utilidad_operacional < 0;
                return (
                  <tr key={h.codigo_lote} style={{ borderBottom: '1px solid var(--p-line)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                      {h.codigo_lote}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <EstadoPill estado={h.estado} />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-despachado)', fontWeight: 600 }}>
                      {cop(h.ingresos)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-prep)' }}>
                      −{cop(h.costo_mercancia_vendida)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-recibida)' }}>
                      −{cop(h.perdida_merma)}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: esNeg ? 'var(--p-recibida)' : 'var(--p-despachado)',
                      }}
                    >
                      {cop(h.utilidad_operacional)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
