'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Rotulo from '@/components/panel/Rotulo';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import Cifra from '@/components/panel/Cifra';
import EstadoPill from '@/components/panel/EstadoPill';
import { cop } from '@/lib/format';
import {
  getLotes,
  getPlatosCatalogo,
  crearLote,
  getPrevisualizacionCierre,
  cerrarYTransferirLote,
  getGastosLote,
  registrarGastoLote,
  type LoteResumen,
  type PlatoCatalogo,
  type PrevisualizacionCierre,
  type GastoLote,
  type TipoGastoLote,
  type InductorProrrateo,
} from '@/lib/panel/lotes';

export default function LotesPage() {
  const [lotes, setLotes] = useState<LoteResumen[]>([]);
  const [platosCatalogo, setPlatosCatalogo] = useState<PlatoCatalogo[]>([]);
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<string>('');
  const [gastos, setGastos] = useState<GastoLote[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario nuevo lote
  const [mostrarCrearLote, setMostrarCrearLote] = useState(false);
  const [codigoLote, setCodigoLote] = useState('');
  const [fechaApertura, setFechaApertura] = useState('');
  const [fechaEntregaDesde, setFechaEntregaDesde] = useState('');
  const [fechaEntregaHasta, setFechaEntregaHasta] = useState('');
  const [nombreDomiciliario, setNombreDomiciliario] = useState('');
  const [tarifaFijaDomiciliario, setTarifaFijaDomiciliario] = useState('90000');
  const [tarifaDomicilioCliente, setTarifaDomicilioCliente] = useState('6000');
  const [cartaSeleccion, setCartaSeleccion] = useState<
    Record<string, { activo: boolean; unidades: number; precio: number; horas: number }>
  >({});
  const [creandoLote, setCreandoLote] = useState(false);
  const [errorCrearLote, setErrorCrearLote] = useState<string | null>(null);

  // Modal / Sección de Cierre y Transferencia
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [loteACerrarId, setLoteACerrarId] = useState<string | null>(null);
  const [loteDestinoId, setLoteDestinoId] = useState<string>('');
  const [previsualizacion, setPrevisualizacion] = useState<PrevisualizacionCierre | null>(null);
  const [cargandoPrev, setCargandoPrev] = useState(false);
  const [ejecutandoCierre, setEjecutandoCierre] = useState(false);
  const [cierreExito, setCierreExito] = useState<string | null>(null);
  const [cierreError, setCierreError] = useState<string | null>(null);

  // Formulario de Gastos
  const [gastoConcepto, setGastoConcepto] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoFecha, setGastoFecha] = useState('');
  const [gastoTipo, setGastoTipo] = useState<TipoGastoLote>('cif');
  const [gastoInductor, setGastoInductor] = useState<InductorProrrateo>('horas_coccion');
  const [gastoCecoId, setGastoCecoId] = useState<string>('');
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [gastoError, setGastoError] = useState<string | null>(null);
  const [gastoExito, setGastoExito] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [lts, pts] = await Promise.all([getLotes(), getPlatosCatalogo()]);
      setLotes(lts);
      setPlatosCatalogo(pts);

      // Selección inicial de lote para gastos y visualización
      const activo = lts.find((l) => l.estado === 'activo');
      const loteIdDefecto = activo?.id || lts[0]?.id || '';
      setLoteSeleccionadoId((prev) => prev || loteIdDefecto);

      if (loteIdDefecto) {
        const gsts = await getGastosLote(loteIdDefecto);
        setGastos(gsts);
      }

      // Inicializar selección de carta para creación
      const cartaInit: Record<string, { activo: boolean; unidades: number; precio: number; horas: number }> = {};
      pts.forEach((p) => {
        cartaInit[p.id] = {
          activo: true,
          unidades: 20,
          precio: p.precio_venta_sugerido,
          horas: 0.25,
        };
      });
      setCartaSeleccion(cartaInit);

      // Fechas por defecto para nuevo lote (próximo fin de semana)
      const hoy = new Date();
      setFechaApertura(hoy.toISOString().split('T')[0]);
      setGastoFecha(hoy.toISOString().split('T')[0]);
    } catch (err) {
      console.error('Error cargando datos de lotes:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargarDatos();
    }, 0);
    return () => clearTimeout(timer);
  }, [cargarDatos]);

  const handleCambioLoteGastos = async (id: string) => {
    setLoteSeleccionadoId(id);
    try {
      const gsts = await getGastosLote(id);
      setGastos(gsts);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    }
  };

  const handleCrearLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoLote.trim()) {
      setErrorCrearLote('El código de lote es obligatorio.');
      return;
    }

    const tFija = parseFloat(tarifaFijaDomiciliario);
    const tCliente = parseFloat(tarifaDomicilioCliente);
    if (isNaN(tFija) || isNaN(tCliente)) {
      setErrorCrearLote('Las tarifas deben ser valores numéricos válidos.');
      return;
    }

    const itemsCarta = Object.entries(cartaSeleccion)
      .filter(([, val]) => val.activo)
      .map(([platoId, val]) => ({
        plato_id: platoId,
        unidades_proyectadas: val.unidades,
        precio_venta_lote: val.precio,
        horas_coccion: val.horas,
      }));

    if (itemsCarta.length === 0) {
      setErrorCrearLote('Debes incluir al menos un plato en la carta semanal.');
      return;
    }

    setCreandoLote(true);
    setErrorCrearLote(null);

    try {
      await crearLote({
        codigo_lote: codigoLote.trim().toUpperCase(),
        fecha_apertura: fechaApertura,
        fecha_entrega_desde: fechaEntregaDesde,
        fecha_entrega_hasta: fechaEntregaHasta,
        nombre_domiciliario: nombreDomiciliario,
        tarifa_fija_domiciliario: tFija,
        tarifa_domicilio_cliente: tCliente,
        estado: 'borrador',
        items_carta: itemsCarta,
      });

      setMostrarCrearLote(false);
      setCodigoLote('');
      await cargarDatos();
    } catch (err: unknown) {
      setErrorCrearLote(err instanceof Error ? err.message : 'Error al crear el lote');
    } finally {
      setCreandoLote(false);
    }
  };

  const handleAbrirModalCierre = async (lote: LoteResumen) => {
    setLoteACerrarId(lote.id);
    setCierreError(null);
    setCierreExito(null);
    setCargandoPrev(true);
    setModalCierreAbierto(true);

    // Buscar lotes en borrador como candidatos a destino
    const borradores = lotes.filter((l) => l.estado === 'borrador' && l.id !== lote.id);
    setLoteDestinoId(borradores[0]?.id || '');

    try {
      const prev = await getPrevisualizacionCierre(lote.id);
      setPrevisualizacion(prev);
    } catch (err: unknown) {
      setCierreError(err instanceof Error ? err.message : 'Error calculando previsualización');
    } finally {
      setCargandoPrev(false);
    }
  };

  const handleConfirmarCierre = async () => {
    if (!loteACerrarId || !loteDestinoId) {
      setCierreError('Debes seleccionar un lote destino en borrador para transferir el inventario.');
      return;
    }

    if (previsualizacion && previsualizacion.ordenes_pendientes > 0) {
      setCierreError(
        `Imposible cerrar: quedan ${previsualizacion.ordenes_pendientes} órdenes sin despachar ni cancelar en el lote.`
      );
      return;
    }

    setEjecutandoCierre(true);
    setCierreError(null);

    try {
      const res = await cerrarYTransferirLote(loteACerrarId, loteDestinoId);
      setCierreExito(
        `Lote cerrado con éxito. Insumos transferidos: ${res.insumos_transferidos}. Insumos perecederos dados de baja: ${res.insumos_dados_de_baja}. Asientos contables generados.`
      );
      await cargarDatos();
    } catch (err: unknown) {
      setCierreError(err instanceof Error ? err.message : 'Error al cerrar y transferir lote');
    } finally {
      setEjecutandoCierre(false);
    }
  };

  const handleRegistrarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteSeleccionadoId) return;

    const montoNum = parseFloat(gastoMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setGastoError('Ingresa un monto válido mayor a cero.');
      return;
    }
    if (!gastoConcepto.trim()) {
      setGastoError('Ingresa una descripción del concepto de gasto.');
      return;
    }

    setGuardandoGasto(true);
    setGastoError(null);
    setGastoExito(null);

    try {
      await registrarGastoLote({
        lote_id: loteSeleccionadoId,
        concepto: gastoConcepto.trim(),
        monto: montoNum,
        tipo: gastoTipo,
        inductor: gastoInductor,
        fecha: gastoFecha,
        ceco_id: gastoInductor === 'directo' ? gastoCecoId || null : null,
      });

      setGastoExito(`Gasto por ${cop(montoNum)} registrado y contabilizado automáticamente.`);
      setGastoConcepto('');
      setGastoMonto('');
      const gsts = await getGastosLote(loteSeleccionadoId);
      setGastos(gsts);
    } catch (err: unknown) {
      setGastoError(err instanceof Error ? err.message : 'Error al registrar el gasto');
    } finally {
      setGuardandoGasto(false);
    }
  };

  if (cargando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
        Cargando ciclo de vida de lotes…
      </div>
    );
  }

  const lotesBorrador = lotes.filter((l) => l.estado === 'borrador');

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
          <Rotulo>ADMINISTRACIÓN OPERACIONAL</Rotulo>
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
            Lotes y Carta Semanal
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--p-muted)', margin: 0 }}>
            Ciclo de vida del lote (borrador → activo → cerrado), tarifas logísticas, carta y gastos.
          </p>
        </div>

        <button
          onClick={() => setMostrarCrearLote(!mostrarCrearLote)}
          style={{
            padding: '0.65rem 1.25rem',
            backgroundColor: mostrarCrearLote ? 'var(--p-line)' : 'var(--p-ink)',
            color: mostrarCrearLote ? 'var(--p-ink)' : '#fff',
            border: 'none',
            borderRadius: '4px',
            fontFamily: 'var(--sans)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {mostrarCrearLote ? '✕ Cancelar Apertura' : '+ Nueva Apertura de Lote'}
        </button>
      </div>

      {/* 1. FORMULARIO DE APERTURA DE LOTE Y CARTA */}
      {mostrarCrearLote && (
        <section style={{ backgroundColor: 'var(--p-surface)', border: '1.5px solid var(--p-line)', borderRadius: '6px', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Rotulo>NUEVO CICLO SEMANAL</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.35rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Apertura de Lote y Programación de Carta
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--p-muted)', margin: 0 }}>
              Crea un nuevo lote en estado borrador. Al guardar se asociarán los platos seleccionados y se preparará la lista de insumos de las recetas.
            </p>
          </div>

          {errorCrearLote && (
            <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.1)', border: '1px solid var(--p-recibida)', color: 'var(--p-recibida)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
              {errorCrearLote}
            </div>
          )}

          <form onSubmit={handleCrearLote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Código de Lote *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: LOTE-2026-W38"
                  value={codigoLote}
                  onChange={(e) => setCodigoLote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Fecha Entrega Desde *
                </label>
                <input
                  type="date"
                  required
                  value={fechaEntregaDesde}
                  onChange={(e) => setFechaEntregaDesde(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Fecha Entrega Hasta *
                </label>
                <input
                  type="date"
                  required
                  value={fechaEntregaHasta}
                  onChange={(e) => setFechaEntregaHasta(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Domiciliario Asignado
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Repartidor"
                  value={nombreDomiciliario}
                  onChange={(e) => setNombreDomiciliario(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* AVISO IMPORTANTE: DISTINCIÓN DE DOS TARIFAS */}
            <div
              style={{
                backgroundColor: 'rgba(233, 163, 32, 0.1)',
                border: '1.5px solid var(--p-accent)',
                borderRadius: '6px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', fontWeight: 700, color: '#925B00', textTransform: 'uppercase' }}>
                  ⚠️ Regla de Oro Logística · Distinción de Tarifas
                </span>
              </div>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--p-ink)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                <strong>Tarifa fija domiciliario</strong> es el valor total que se le liquida al repartidor por su labor (Gasto de logística).
                <br />
                <strong>Tarifa domicilio cliente</strong> es el flete individual que se le cobra a cada cliente en el checkout de la tienda (Pasivo de terceros).
                <br />
                <em>Confundir ambas tarifas descuadra la logística de toda la semana.</em>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-ink)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    1. Tarifa Fija Domiciliario (COP) [Pago al repartidor]
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={tarifaFijaDomiciliario}
                    onChange={(e) => setTarifaFijaDomiciliario(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-ink)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    2. Tarifa Domicilio Cliente (COP) [Cobro flete por orden]
                  </label>
                  <input
                    type="number"
                    step="500"
                    required
                    value={tarifaDomicilioCliente}
                    onChange={(e) => setTarifaDomicilioCliente(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SELECCIÓN DE CARTA SEMANAL */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Carta Semanal (Platos Disponibles)
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {platosCatalogo.map((plato) => {
                  const sel = cartaSeleccion[plato.id] || { activo: false, unidades: 20, precio: plato.precio_venta_sugerido, horas: 0.25 };

                  return (
                    <div
                      key={plato.id}
                      style={{
                        border: `1px solid ${sel.activo ? 'var(--p-ink)' : 'var(--p-line)'}`,
                        backgroundColor: sel.activo ? 'var(--p-bg)' : 'transparent',
                        borderRadius: '6px',
                        padding: '0.85rem',
                        opacity: sel.activo ? 1 : 0.6,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={sel.activo}
                          onChange={(e) =>
                            setCartaSeleccion({
                              ...cartaSeleccion,
                              [plato.id]: { ...sel, activo: e.target.checked },
                            })
                          }
                        />
                        <strong style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', color: 'var(--p-ink)' }}>
                          {plato.nombre}
                        </strong>
                      </label>

                      {sel.activo && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                              Unidades
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={sel.unidades}
                              onChange={(e) =>
                                setCartaSeleccion({
                                  ...cartaSeleccion,
                                  [plato.id]: { ...sel, unidades: parseInt(e.target.value) || 0 },
                                })
                              }
                              style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem', fontFamily: 'var(--mono)', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                              Precio (COP)
                            </span>
                            <input
                              type="number"
                              step="500"
                              value={sel.precio}
                              onChange={(e) =>
                                setCartaSeleccion({
                                  ...cartaSeleccion,
                                  [plato.id]: { ...sel, precio: parseFloat(e.target.value) || 0 },
                                })
                              }
                              style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem', fontFamily: 'var(--mono)', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
                              Horas Cocción
                            </span>
                            <input
                              type="number"
                              step="0.05"
                              value={sel.horas}
                              onChange={(e) =>
                                setCartaSeleccion({
                                  ...cartaSeleccion,
                                  [plato.id]: { ...sel, horas: parseFloat(e.target.value) || 0 },
                                })
                              }
                              style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem', fontFamily: 'var(--mono)', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMostrarCrearLote(false)}
                style={{ padding: '0.6rem 1.25rem', border: '1px solid var(--p-line)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creandoLote}
                style={{
                  padding: '0.6rem 1.5rem',
                  backgroundColor: 'var(--p-ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: creandoLote ? 'not-allowed' : 'pointer',
                  opacity: creandoLote ? 0.7 : 1,
                }}
              >
                {creandoLote ? 'Guardando Lote…' : 'Crear Lote en Borrador →'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 2. LISTA DE LOTES Y ESTADOS */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Rotulo>HISTORIAL DE LOTES</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Ciclos y Rentabilidad Operacional
            </h2>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
            {lotes.length} lotes registrados
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {lotes.map((lote) => {
            const esActivo = lote.estado === 'activo';

            return (
              <div
                key={lote.id}
                style={{
                  borderTop: `4px solid ${esActivo ? 'var(--p-despachado)' : 'var(--p-line)'}`,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <Comanda>
                  <ComandaHeader>
                    <div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                        {lote.codigo_lote}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--p-muted)', fontFamily: 'var(--mono)', marginTop: '0.2rem' }}>
                        Entrega: {lote.fecha_entrega_desde} al {lote.fecha_entrega_hasta}
                      </div>
                    </div>
                    <EstadoPill estado={lote.estado} />
                  </ComandaHeader>

                  <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)', textTransform: 'uppercase' }}>
                        Utilidad Operacional
                      </span>
                      <Cifra size="md" style={{ color: lote.utilidad_operacional !== null && lote.utilidad_operacional < 0 ? 'var(--p-recibida)' : 'var(--p-ink)' }}>
                        {lote.utilidad_operacional !== null ? cop(lote.utilidad_operacional) : '—'}
                      </Cifra>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--p-muted)', marginTop: '0.2rem' }}>
                        {lote.ingresos !== null ? `Ingresos: ${cop(lote.ingresos)}` : 'Sin ventas'}
                      </div>
                    </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--p-muted)', textTransform: 'uppercase' }}>
                      Domiciliario
                    </span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--p-ink)' }}>
                      {lote.nombre_domiciliario || 'Sin asignar'}
                    </span>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--p-muted)' }}>
                      Fija: {cop(lote.tarifa_fija_domiciliario)} · Flete: {cop(lote.tarifa_domicilio_cliente)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--p-line)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  {esActivo && (
                    <button
                      onClick={() => handleAbrirModalCierre(lote)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: 'var(--p-recibida)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontFamily: 'var(--sans)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Previsualizar Cierre y Transferir →
                    </button>
                  )}

                  <button
                    onClick={() => handleCambioLoteGastos(lote.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: loteSeleccionadoId === lote.id ? 'var(--p-ink)' : 'var(--p-bg)',
                      color: loteSeleccionadoId === lote.id ? '#fff' : 'var(--p-ink)',
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      fontFamily: 'var(--sans)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ver Gastos
                  </button>
                  </div>
                </Comanda>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. MODAL DE CIERRE DE LOTE Y PREVISUALIZACIÓN */}
      {modalCierreAbierto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--p-surface)',
              border: '2px solid var(--p-line)',
              borderRadius: '8px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <Rotulo>CIERRE DE CICLO OPERACIONAL</Rotulo>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
                  Previsualización de Cierre y Transferencia
                </h2>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
                  Lote a cerrar: {previsualizacion?.codigo_lote}
                </span>
              </div>
              <button
                onClick={() => setModalCierreAbierto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--p-muted)' }}
              >
                ✕
              </button>
            </div>

            {cargandoPrev ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--mono)' }}>
                Calculando transferencia e insumos perecederos…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {cierreError && (
                  <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.1)', border: '1px solid var(--p-recibida)', color: 'var(--p-recibida)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {cierreError}
                  </div>
                )}

                {cierreExito && (
                  <div style={{ backgroundColor: 'rgba(46, 107, 78, 0.1)', border: '1px solid var(--p-despachado)', color: 'var(--p-despachado)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                    ✓ {cierreExito}
                  </div>
                )}

                {/* ADVERTENCIA DE ÓRDENES PENDIENTES */}
                {previsualizacion && previsualizacion.ordenes_pendientes > 0 && (
                  <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.12)', border: '1.5px solid var(--p-recibida)', borderRadius: '6px', padding: '0.85rem' }}>
                    <strong style={{ color: 'var(--p-recibida)', fontFamily: 'var(--mono)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>
                      ⚠️ BLOQUEO DE CIERRE: {previsualizacion.ordenes_pendientes} ÓRDENES SIN DESPACHAR
                    </strong>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', margin: 0, color: 'var(--p-ink)' }}>
                      No se puede cerrar el lote mientras existan pedidos en estado <em>recibida</em>, <em>en preparación</em> o <em>empacado</em>. Debes despacharlos o cancelarlos previamente.
                    </p>
                  </div>
                )}

                {/* 1. PREVISUALIZACIÓN DE PERECEDEROS (DINERO QUE SE PIERDE) */}
                <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.05)', border: '1px solid var(--p-recibida)', borderRadius: '6px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--p-recibida)', textTransform: 'uppercase' }}>
                      Bajas por Perecederos (No Transferibles)
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--p-recibida)' }}>
                      Pérdida: {cop(previsualizacion?.costo_total_perdida ?? 0)}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--p-muted)', margin: '0 0 0.5rem 0' }}>
                    Dinero que se da de baja automáticamente al cerrar. Se generará un asiento a pérdidas por merma.
                  </p>

                  {previsualizacion && previsualizacion.perecederos_a_baja.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-ink)' }}>
                      {previsualizacion.perecederos_a_baja.map((p) => (
                        <li key={p.insumo_id} style={{ marginBottom: '0.25rem' }}>
                          <strong>{p.nombre}</strong>: {p.saldo} {p.unidad_medida} × {cop(p.costo_unitario)} = <span style={{ color: 'var(--p-recibida)', fontWeight: 700 }}>{cop(p.costo_perdida)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
                      No hay saldo remanente de insumos perecederos.
                    </span>
                  )}
                </div>

                {/* 2. PREVISUALIZACIÓN DE TRANSFERIBLES */}
                <div style={{ backgroundColor: 'var(--p-bg)', border: '1px solid var(--p-line)', borderRadius: '6px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--p-despachado)', textTransform: 'uppercase' }}>
                      Insumos No Perecederos a Transferir
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
                      {previsualizacion?.transferibles.length ?? 0} insumos
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--p-muted)', margin: '0 0 0.5rem 0' }}>
                    Se trasladarán como stock inicial al lote destino con su costo unitario promedio.
                  </p>

                  {previsualizacion && previsualizacion.transferibles.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-ink)' }}>
                      {previsualizacion.transferibles.map((t) => (
                        <li key={t.insumo_id} style={{ marginBottom: '0.25rem' }}>
                          <strong>{t.nombre}</strong>: {t.saldo} {t.unidad_medida} ({cop(t.costo_unitario)}/ud)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
                      No hay insumos no perecederos con saldo disponible para transferir.
                    </span>
                  )}
                </div>

                {/* 3. SELECCIÓN DE LOTE DESTINO */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Lote Destino (Debe estar en borrador) *
                  </label>
                  {lotesBorrador.length > 0 ? (
                    <select
                      value={loteDestinoId}
                      onChange={(e) => setLoteDestinoId(e.target.value)}
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
                      {lotesBorrador.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.codigo_lote} (Entrega: {b.fecha_entrega_desde})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ backgroundColor: 'rgba(233, 163, 32, 0.1)', border: '1px solid var(--p-accent)', padding: '0.65rem', borderRadius: '4px', fontSize: '0.8rem', color: '#925B00' }}>
                      ⚠️ No hay ningún lote en borrador creado. Crea primero el siguiente lote para poder recibir el inventario transferido.
                    </div>
                  )}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setModalCierreAbierto(false)}
                    style={{ padding: '0.6rem 1.25rem', border: '1px solid var(--p-line)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarCierre}
                    disabled={
                      ejecutandoCierre ||
                      !loteDestinoId ||
                      (previsualizacion ? previsualizacion.ordenes_pendientes > 0 : false)
                    }
                    style={{
                      padding: '0.6rem 1.5rem',
                      backgroundColor: 'var(--p-recibida)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontFamily: 'var(--sans)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: ejecutandoCierre || !loteDestinoId ? 'not-allowed' : 'pointer',
                      opacity: ejecutandoCierre || !loteDestinoId ? 0.6 : 1,
                    }}
                  >
                    {ejecutandoCierre ? 'Procesando Cierre y Transferencia…' : 'Cerrar Lote y Transferir Stock →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. REGISTRO Y DETALLE DE GASTOS DEL LOTE */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <Rotulo>COSTEO ABC Y FINANZAS</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Gastos del Lote y Prorrateo
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
              Lote activo:
            </span>
            <select
              value={loteSeleccionadoId}
              onChange={(e) => handleCambioLoteGastos(e.target.value)}
              style={{
                padding: '0.35rem 0.6rem',
                fontFamily: 'var(--mono)',
                fontSize: '0.75rem',
                border: '1px solid var(--p-line)',
                borderRadius: '4px',
                backgroundColor: 'var(--p-surface)',
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Formulario de registro de gasto */}
          <Comanda>
            <ComandaHeader>
              <Rotulo>NUEVO EGRESO</Rotulo>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--p-muted)' }}>
                ASIENTO AUTOMÁTICO
              </span>
            </ComandaHeader>
            <ComandaTitle>Cargar Gasto al Lote</ComandaTitle>

            {gastoExito && (
              <div style={{ backgroundColor: 'rgba(46, 107, 78, 0.1)', border: '1px solid var(--p-despachado)', color: 'var(--p-despachado)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
                ✓ {gastoExito}
              </div>
            )}

            {gastoError && (
              <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.1)', border: '1px solid var(--p-recibida)', color: 'var(--p-recibida)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
                {gastoError}
              </div>
            )}

            <form onSubmit={handleRegistrarGasto} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Concepto del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Turno ayudante cocina, Gas, Empaques"
                  value={gastoConcepto}
                  onChange={(e) => setGastoConcepto(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    Monto (COP) *
                  </label>
                  <input
                    type="number"
                    step="500"
                    required
                    placeholder="Ej: 50000"
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={gastoFecha}
                    onChange={(e) => setGastoFecha(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    Tipo de Gasto
                  </label>
                  <select
                    value={gastoTipo}
                    onChange={(e) => setGastoTipo(e.target.value as TipoGastoLote)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                    }}
                  >
                    <option value="cif">CIF (Costos Indirectos)</option>
                    <option value="mano_obra">Mano de Obra</option>
                    <option value="logistica">Logística</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    Inductor de Costeo
                  </label>
                  <select
                    value={gastoInductor}
                    onChange={(e) => setGastoInductor(e.target.value as InductorProrrateo)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                    }}
                  >
                    <option value="horas_coccion">Horas de Cocción</option>
                    <option value="directo">Directo a un Plato</option>
                    <option value="unidades_vendidas">Unidades Vendidas</option>
                    <option value="ingreso_bruto">Ingreso Bruto</option>
                  </select>
                </div>
              </div>

              {/* Explicación de la línea del inductor según PLAN.md §14 */}
              <div style={{ backgroundColor: 'var(--p-bg)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--p-line)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--p-ink)' }}>
                  {gastoInductor === 'directo' && '👉 Directo: Carga el 100% del gasto a un solo plato específico.'}
                  {gastoInductor === 'horas_coccion' && '🔥 Horas de cocción: Reparte el gasto proporcional al tiempo de fuego de cada plato.'}
                  {gastoInductor === 'unidades_vendidas' && '📦 Unidades vendidas: Reparte el gasto proporcional al volumen vendido de cada plato.'}
                  {gastoInductor === 'ingreso_bruto' && '💰 Ingreso bruto: Reparte el gasto proporcional a la facturación de cada plato.'}
                </span>
              </div>

              {gastoInductor === 'directo' && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    Plato al que se asigna directamente
                  </label>
                  <select
                    value={gastoCecoId}
                    onChange={(e) => setGastoCecoId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--p-line)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--p-bg)',
                    }}
                  >
                    <option value="">Seleccionar plato…</option>
                    {platosCatalogo.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={guardandoGasto}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--p-ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: guardandoGasto ? 'not-allowed' : 'pointer',
                  opacity: guardandoGasto ? 0.7 : 1,
                }}
              >
                {guardandoGasto ? 'Guardando Gasto…' : 'Registrar Gasto y Asiento Diario →'}
              </button>
            </form>
          </Comanda>

          {/* Tabla de gastos del lote */}
          <div style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--p-line)', backgroundColor: 'var(--p-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                Gastos del Lote ({gastos.length})
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--p-ink)' }}>
                Total: {cop(gastos.reduce((acc, g) => acc + g.monto, 0))}
              </span>
            </div>

            {gastos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--p-muted)' }}>
                No hay gastos registrados en este lote.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--p-line)', textAlign: 'left', color: 'var(--p-muted)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Concepto</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Tipo</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Inductor</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid var(--p-line)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--p-ink)' }}>
                          {g.concepto}
                          {g.plato_nombre && (
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--p-muted)', fontWeight: 400 }}>
                              → {g.plato_nombre}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textTransform: 'uppercase', fontSize: '0.68rem', color: 'var(--p-muted)' }}>
                          {g.tipo.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.68rem', color: 'var(--p-muted)' }}>
                          {g.inductor.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--p-ink)' }}>
                          {cop(g.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
