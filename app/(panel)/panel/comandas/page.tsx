'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Rotulo from '@/components/panel/Rotulo';
import EstadoPill from '@/components/panel/EstadoPill';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import FilaFicha from '@/components/panel/FilaFicha';
import Cifra from '@/components/panel/Cifra';
import { cop } from '@/lib/format';
import {
  getComandas,
  actualizarEstadoOrden,
  anularOrdenDespachada,
  type ComandaItem,
  type EstadoOrden,
} from '@/lib/panel/comandas';
import { createClient } from '@/lib/supabase/client';

const COLUMNAS: { key: EstadoOrden; label: string }[] = [
  { key: 'recibida', label: 'Recibidas' },
  { key: 'en_preparacion', label: 'En preparación' },
  { key: 'empacado', label: 'Empacadas' },
  { key: 'despachado', label: 'Despachadas' },
];

export default function ComandasPage() {
  const [comandas, setComandas] = useState<ComandaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroDia, setFiltroDia] = useState<'todos' | 'sabado' | 'domingo'>('todos');
  const [filtroTel, setFiltroTel] = useState('');
  const [tabMovil, setTabMovil] = useState<EstadoOrden>('recibida');

  // Estado para el modal de confirmación de despacho
  const [ordenADespachar, setOrdenADespachar] = useState<ComandaItem | null>(null);
  const [despachando, setDespachando] = useState(false);
  const [despachoError, setDespachoError] = useState<string | null>(null);

  // Estado para modal de anulación (solo despachadas)
  const [ordenAAnular, setOrdenAAnular] = useState<ComandaItem | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [anulacionError, setAnulacionError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await getComandas(undefined, filtroDia, filtroTel);
      setComandas(data);
    } catch (err) {
      console.error('Error cargando comandas:', err);
    } finally {
      setCargando(false);
    }
  }, [filtroDia, filtroTel]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Suscripción en tiempo real a cambios en la tabla ordenes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('muro_ordenes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        () => {
          cargar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  const handleAvanzarEstado = async (orden: ComandaItem) => {
    let siguiente: EstadoOrden | null = null;
    if (orden.estado === 'recibida') siguiente = 'en_preparacion';
    else if (orden.estado === 'en_preparacion') siguiente = 'empacado';
    else if (orden.estado === 'empacado') {
      // Despachar pide confirmación explícita
      setOrdenADespachar(orden);
      setDespachoError(null);
      return;
    }

    if (!siguiente) return;

    try {
      await actualizarEstadoOrden(orden.id, siguiente);
      await cargar();
    } catch (err: any) {
      alert(`Error al cambiar estado: ${err.message || err}`);
    }
  };

  const handleConfirmarDespacho = async () => {
    if (!ordenADespachar) return;
    setDespachando(true);
    setDespachoError(null);

    try {
      await actualizarEstadoOrden(ordenADespachar.id, 'despachado');
      setOrdenADespachar(null);
      await cargar();
    } catch (err: any) {
      setDespachoError(err.message || 'Error al despachar la orden');
    } finally {
      setDespachando(false);
    }
  };

  const handleConfirmarAnulacion = async () => {
    if (!ordenAAnular) return;
    if (motivoAnulacion.trim().length < 5) {
      setAnulacionError('Escribe un motivo claro (mínimo 5 letras).');
      return;
    }

    setAnulando(true);
    setAnulacionError(null);

    try {
      await anularOrdenDespachada(ordenAAnular.id, motivoAnulacion.trim());
      setOrdenAAnular(null);
      setMotivoAnulacion('');
      await cargar();
    } catch (err: any) {
      setAnulacionError(err.message || 'Error al anular la orden despachada');
    } finally {
      setAnulando(false);
    }
  };

  const filtrarPorEstado = (estado: EstadoOrden) => {
    return comandas.filter((c) => {
      if (estado === 'recibida') {
        return c.estado === 'recibida' || c.estado === 'confirmada';
      }
      return c.estado === estado;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado y Filtros */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '1px solid var(--p-line)',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <Rotulo>OPERACIONES EN VIVO</Rotulo>
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
            Muro de Comandas
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--p-muted)', margin: 0 }}>
            Actualización en tiempo real · Despacho y entrega de fin de semana
          </p>
        </div>

        {/* Barra de Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--p-surface)', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--p-line)' }}>
            <button
              onClick={() => setFiltroDia('todos')}
              style={{
                background: filtroDia === 'todos' ? 'var(--p-ink)' : 'transparent',
                color: filtroDia === 'todos' ? '#fff' : 'var(--p-muted)',
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '3px',
                fontFamily: 'var(--mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroDia('sabado')}
              style={{
                background: filtroDia === 'sabado' ? 'var(--p-ink)' : 'transparent',
                color: filtroDia === 'sabado' ? '#fff' : 'var(--p-muted)',
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '3px',
                fontFamily: 'var(--mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Sábado
            </button>
            <button
              onClick={() => setFiltroDia('domingo')}
              style={{
                background: filtroDia === 'domingo' ? 'var(--p-ink)' : 'transparent',
                color: filtroDia === 'domingo' ? '#fff' : 'var(--p-muted)',
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '3px',
                fontFamily: 'var(--mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Domingo
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por teléfono…"
            value={filtroTel}
            onChange={(e) => setFiltroTel(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              fontFamily: 'var(--mono)',
              fontSize: '0.8rem',
              border: '1px solid var(--p-line)',
              borderRadius: '4px',
              backgroundColor: 'var(--p-surface)',
              color: 'var(--p-ink)',
              outline: 'none',
              minWidth: '180px',
            }}
          />
        </div>
      </div>

      {/* Selector de pestañas para vista móvil */}
      <div
        className="comandas-tabs-movil"
        style={{
          display: 'none',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}
      >
        {COLUMNAS.map((col) => {
          const count = filtrarPorEstado(col.key).length;
          const active = tabMovil === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setTabMovil(col.key)}
              style={{
                padding: '0.5rem 0.8rem',
                fontFamily: 'var(--mono)',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid var(--p-line)',
                backgroundColor: active ? 'var(--p-ink)' : 'var(--p-surface)',
                color: active ? '#fff' : 'var(--p-muted)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {col.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid de columnas Kanban */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {COLUMNAS.map((col) => {
          const items = filtrarPorEstado(col.key);
          return (
            <div
              key={col.key}
              style={{
                backgroundColor: 'rgba(255, 253, 247, 0.6)',
                border: '1px solid var(--p-line)',
                borderRadius: '6px',
                padding: '1rem',
                minHeight: '450px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  borderBottom: '1px solid var(--p-line)',
                  paddingBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <EstadoPill estado={col.key} />
                  <strong style={{ fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--p-ink)' }}>
                    {col.label}
                  </strong>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--p-muted)',
                  }}
                >
                  {items.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.length === 0 ? (
                  <p
                    style={{
                      fontFamily: 'var(--sans)',
                      fontSize: '0.8rem',
                      color: 'var(--p-muted)',
                      textAlign: 'center',
                      padding: '2rem 0',
                    }}
                  >
                    No hay comandas en este estado
                  </p>
                ) : (
                  items.map((orden) => (
                    <Comanda key={orden.id} compact>
                      <ComandaHeader>
                        <Rotulo>{orden.codigo_orden}</Rotulo>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--p-muted)' }}>
                          {orden.fecha_entrega}
                        </span>
                      </ComandaHeader>

                      <ComandaTitle>{orden.cliente_nombre}</ComandaTitle>

                      <div style={{ margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {orden.detalles.map((d) => (
                          <FilaFicha
                            key={d.id}
                            label={`${d.cantidad}× ${d.plato_nombre}`}
                            value={cop(d.subtotal)}
                          />
                        ))}
                      </div>

                      <div style={{ margin: '0.4rem 0', borderTop: '1px dotted var(--p-line)', paddingTop: '0.4rem' }}>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--p-muted)', marginBottom: '0.2rem' }}>
                          📍 {orden.direccion_entrega}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--p-muted)' }}>
                          📞 {orden.cliente_telefono}
                        </div>
                        {orden.nota && (
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--p-recibida)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            Nota: {orden.nota}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          borderTop: '1.5px solid var(--p-ink)',
                          marginTop: '0.6rem',
                          paddingTop: '0.4rem',
                        }}
                      >
                        <Rotulo>TOTAL COBRADO</Rotulo>
                        <Cifra size="sm">{cop(orden.total_orden)}</Cifra>
                      </div>

                      {/* Botones de acción táctil en la tarjeta */}
                      <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {col.key === 'recibida' && (
                          <button
                            onClick={() => handleAvanzarEstado(orden)}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              backgroundColor: 'var(--p-prep)',
                              color: 'var(--p-ink)',
                              border: 'none',
                              borderRadius: '3px',
                              fontFamily: 'var(--sans)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Iniciar preparación →
                          </button>
                        )}

                        {col.key === 'en_preparacion' && (
                          <button
                            onClick={() => handleAvanzarEstado(orden)}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              backgroundColor: 'var(--p-empacado)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              fontFamily: 'var(--sans)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Marcar empacado →
                          </button>
                        )}

                        {col.key === 'empacado' && (
                          <button
                            onClick={() => handleAvanzarEstado(orden)}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              backgroundColor: 'var(--p-despachado)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              fontFamily: 'var(--sans)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Despachar pedido 🚀
                          </button>
                        )}

                        {col.key === 'despachado' && (
                          <button
                            onClick={() => {
                              setOrdenAAnular(orden);
                              setMotivoAnulacion('');
                              setAnulacionError(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.4rem',
                              backgroundColor: 'transparent',
                              color: 'var(--p-cancelada)',
                              border: '1px solid var(--p-line)',
                              borderRadius: '3px',
                              fontFamily: 'var(--mono)',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                            }}
                          >
                            Anular orden despachada…
                          </button>
                        )}
                      </div>
                    </Comanda>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Confirmación de Despacho */}
      {ordenADespachar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(27, 59, 47, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div style={{ maxWidth: '440px', width: '100%' }}>
            <Comanda>
              <ComandaHeader>
                <Rotulo>CONFIRMACIÓN DE DESPACHO</Rotulo>
                <EstadoPill estado="despachado" />
              </ComandaHeader>

              <ComandaTitle>¿Despachar {ordenADespachar.codigo_orden}?</ComandaTitle>

              <div
                style={{
                  backgroundColor: 'rgba(107, 31, 51, 0.08)',
                  border: '1px solid var(--p-recibida)',
                  borderRadius: '4px',
                  padding: '0.85rem',
                  margin: '0.75rem 0',
                }}
              >
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--p-recibida)', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
                  ⚠️ Esta acción dispara la explosión de recetas, el descuento de inventario y los asientos contables, y no se puede deshacer sin <code>fn_anular_orden_despachada</code>.
                </p>
              </div>

              <div style={{ margin: '0.75rem 0' }}>
                <FilaFicha label="CLIENTE" value={ordenADespachar.cliente_nombre} />
                <FilaFicha label="DIRECCIÓN" value={ordenADespachar.direccion_entrega} />
                <FilaFicha label="TOTAL" value={cop(ordenADespachar.total_orden)} />
              </div>

              {despachoError && (
                <div style={{ color: 'var(--p-recibida)', fontSize: '0.8rem', fontFamily: 'var(--sans)', marginBottom: '0.75rem', fontWeight: 600 }}>
                  {despachoError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  disabled={despachando}
                  onClick={handleConfirmarDespacho}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    backgroundColor: 'var(--p-despachado)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: despachando ? 'not-allowed' : 'pointer',
                  }}
                >
                  {despachando ? 'Despachando…' : 'Confirmar y Despachar'}
                </button>
                <button
                  disabled={despachando}
                  onClick={() => setOrdenADespachar(null)}
                  style={{
                    padding: '0.7rem 1rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.9rem',
                    color: 'var(--p-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </Comanda>
          </div>
        </div>
      )}

      {/* Modal de Anulación de Orden Despachada */}
      {ordenAAnular && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(27, 59, 47, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div style={{ maxWidth: '440px', width: '100%' }}>
            <Comanda>
              <ComandaHeader>
                <Rotulo>ANULACIÓN DE DESPACHO</Rotulo>
                <EstadoPill estado="cancelada" />
              </ComandaHeader>

              <ComandaTitle>Anular {ordenAAnular.codigo_orden}</ComandaTitle>

              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--p-muted)', margin: '0.5rem 0' }}>
                Esta acción genera un asiento contable de reversión espejo en el libro diario y repone el inventario consumido. Se requiere rol de Administrador.
              </p>

              <div style={{ margin: '1rem 0' }}>
                <label
                  htmlFor="motivo"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.72rem',
                    color: 'var(--p-muted)',
                    marginBottom: '0.35rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Motivo obligatorio de anulación
                </label>
                <textarea
                  id="motivo"
                  rows={3}
                  placeholder="Ej: Cliente canceló por lluvia extrema, pedido no entregado..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.85rem',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--p-bg)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {anulacionError && (
                <div style={{ color: 'var(--p-recibida)', fontSize: '0.8rem', fontFamily: 'var(--sans)', marginBottom: '0.75rem', fontWeight: 600 }}>
                  {anulacionError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  disabled={anulando}
                  onClick={handleConfirmarAnulacion}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    backgroundColor: 'var(--p-recibida)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: anulando ? 'not-allowed' : 'pointer',
                  }}
                >
                  {anulando ? 'Anulando…' : 'Ejecutar anulación'}
                </button>
                <button
                  disabled={anulando}
                  onClick={() => setOrdenAAnular(null)}
                  style={{
                    padding: '0.7rem 1rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--p-line)',
                    borderRadius: '4px',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.9rem',
                    color: 'var(--p-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </Comanda>
          </div>
        </div>
      )}
    </div>
  );
}
