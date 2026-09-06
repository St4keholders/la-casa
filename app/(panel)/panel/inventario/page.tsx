'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Rotulo from '@/components/panel/Rotulo';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import Cifra from '@/components/panel/Cifra';
import { cop } from '@/lib/format';
import {
  getAlertasInventario,
  getInventarioPerpetuo,
  guardarConteoFisico,
  registrarCompra,
  type AlertaInventario,
  type FilaInventario,
} from '@/lib/panel/inventario';
import { getLoteActivo } from '@/lib/panel/cocina';

export default function InventarioPage() {
  const [lote, setLote] = useState<{ id: string; codigo_lote: string } | null>(null);
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [inventario, setInventario] = useState<FilaInventario[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario de compra
  const [proveedor, setProveedor] = useState('');
  const [documento, setDocumento] = useState('');
  const [compraInsumoId, setCompraInsumoId] = useState('');
  const [compraCantidad, setCompraCantidad] = useState('');
  const [compraCostoUnitario, setCompraCostoUnitario] = useState('');
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [compraExito, setCompraExito] = useState<string | null>(null);
  const [compraError, setCompraError] = useState<string | null>(null);

  // Edición de conteo físico
  const [conteos, setConteos] = useState<Record<string, string>>({});
  const [guardandoConteo, setGuardandoConteo] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const loteActivo = await getLoteActivo();
      if (loteActivo) {
        setLote(loteActivo);
        const [alts, inv] = await Promise.all([
          getAlertasInventario(loteActivo.codigo_lote),
          getInventarioPerpetuo(loteActivo.id),
        ]);
        setAlertas(alts);
        setInventario(inv);

        // Inicializar inputs de conteo físico con el valor actual si existe
        const initialConteos: Record<string, string> = {};
        inv.forEach((item) => {
          if (item.stock_final_real !== null) {
            initialConteos[item.insumo_id] = String(item.stock_final_real);
          }
        });
        setConteos(initialConteos);

        if (inv.length > 0 && !compraInsumoId) {
          setCompraInsumoId(inv[0].insumo_id);
        }
      }
    } catch (err) {
      console.error('Error cargando inventario:', err);
    } finally {
      setCargando(false);
    }
  }, [compraInsumoId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleGuardarConteo = async (insumoId: string) => {
    if (!lote) return;
    const val = parseFloat(conteos[insumoId]);
    if (isNaN(val)) return;

    setGuardandoConteo(insumoId);
    try {
      await guardarConteoFisico(lote.id, insumoId, val);
      await cargarDatos();
    } catch (err: any) {
      alert(`Error al guardar conteo: ${err.message || err}`);
    } finally {
      setGuardandoConteo(null);
    }
  };

  const handleRegistrarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote || !compraInsumoId) return;

    const cant = parseFloat(compraCantidad);
    const costo = parseFloat(compraCostoUnitario);

    if (isNaN(cant) || cant <= 0) {
      setCompraError('Ingresa una cantidad válida mayor a cero.');
      return;
    }
    if (isNaN(costo) || costo < 0) {
      setCompraError('Ingresa un costo unitario válido.');
      return;
    }

    setGuardandoCompra(true);
    setCompraError(null);
    setCompraExito(null);

    try {
      await registrarCompra({
        lote_id: lote.id,
        proveedor: proveedor.trim() || 'Proveedor Local',
        documento: documento.trim() || 'FAC-COMPRA',
        insumo_id: compraInsumoId,
        cantidad: cant,
        costo_unitario: costo,
      });

      const totalCompra = cant * costo;
      setCompraExito(`Compra registrada exitosamente por ${cop(totalCompra)}. Costo promedio actualizado.`);
      setCompraCantidad('');
      setCompraCostoUnitario('');
      setDocumento('');
      await cargarDatos();
    } catch (err: any) {
      setCompraError(err.message || 'Error al registrar la compra');
    } finally {
      setGuardandoCompra(false);
    }
  };

  if (cargando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--p-muted)' }}>
        Cargando inventario perpetuo…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid var(--p-line)', paddingBottom: '0.8rem' }}>
        <Rotulo>CONTROL DE STOCK</Rotulo>
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
          Inventario Perpetuo y Compras
        </h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--p-muted)', margin: 0 }}>
          Seguimiento de saldo teórico, alertas operativas, compras ponderadas y conteo de cierre.
        </p>
      </div>

      {/* 1. ALERTAS DE INVENTARIO */}
      {alertas.length > 0 && (
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>ATENCIÓN OPERATIVA</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Alertas de Stock en Vivo
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {alertas.map((al, idx) => {
              const esSobreconsumo = al.alerta === 'sobreconsumo';
              const bgColor = esSobreconsumo ? 'rgba(107, 31, 51, 0.08)' : 'rgba(233, 163, 32, 0.12)';
              const borderColor = esSobreconsumo ? 'var(--p-recibida)' : 'var(--p-accent)';
              const textColor = esSobreconsumo ? 'var(--p-recibida)' : '#925B00';

              return (
                <div
                  key={`${al.insumo}-${idx}`}
                  style={{
                    backgroundColor: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: '6px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: textColor,
                      }}
                    >
                      {al.alerta.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, color: textColor }}>
                      Saldo: {al.saldo_teorico} {al.unidad_medida}
                    </span>
                  </div>

                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', color: 'var(--p-ink)', margin: '0.2rem 0 0.4rem 0' }}>
                    {al.insumo}
                  </h3>

                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--p-ink)', margin: 0, lineHeight: 1.4 }}>
                    {esSobreconsumo
                      ? '⚠️ Sobreconsumo grave: se despachó más de lo cargado en inventario.'
                      : al.alerta === 'agotado'
                      ? 'Stock teórico en cero. Requiere compra inmediata para futuros despachos.'
                      : 'Varianza alta detectada entre el conteo físico y el saldo teórico.'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. REGISTRO DE COMPRAS DE INSUMOS */}
      <section style={{ maxWidth: '640px' }}>
        <Comanda>
          <ComandaHeader>
            <Rotulo>ENTRADAS DE MERCANCÍA</Rotulo>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--p-despachado)', fontWeight: 600 }}>
              PROMEDIO PONDERADO MÓVIL
            </span>
          </ComandaHeader>

          <ComandaTitle>Registrar Compra de Insumos</ComandaTitle>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--p-muted)', margin: '0 0 1.25rem 0' }}>
            Ingresa insumos al lote activo. Recalcula el costo promedio aplicado y genera el asiento débito a inventario y crédito a bancos.
          </p>

          {compraExito && (
            <div style={{ backgroundColor: 'rgba(46, 107, 78, 0.1)', border: '1px solid var(--p-despachado)', color: 'var(--p-despachado)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
              ✓ {compraExito}
            </div>
          )}

          {compraError && (
            <div style={{ backgroundColor: 'rgba(107, 31, 51, 0.1)', border: '1px solid var(--p-recibida)', color: 'var(--p-recibida)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
              {compraError}
            </div>
          )}

          <form onSubmit={handleRegistrarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Proveedor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Central"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
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

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Nº Documento / Factura
                </label>
                <input
                  type="text"
                  placeholder="Ej: FAC-8941"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
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
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                Insumo a comprar
              </label>
              <select
                value={compraInsumoId}
                onChange={(e) => setCompraInsumoId(e.target.value)}
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
                {inventario.map((i) => (
                  <option key={i.insumo_id} value={i.insumo_id}>
                    {i.nombre} ({i.unidad_medida}) · Costo actual: {cop(i.costo_unitario_aplicado)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Cantidad comprada
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={compraCantidad}
                  onChange={(e) => setCompraCantidad(e.target.value)}
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
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--p-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Costo Unitario (COP)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej: 20000"
                  value={compraCostoUnitario}
                  onChange={(e) => setCompraCostoUnitario(e.target.value)}
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
            </div>

            <button
              type="submit"
              disabled={guardandoCompra}
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
                cursor: guardandoCompra ? 'not-allowed' : 'pointer',
                opacity: guardandoCompra ? 0.7 : 1,
              }}
            >
              {guardandoCompra ? 'Procesando entrada…' : 'Registrar Compra y Asiento Contable →'}
            </button>
          </form>
        </Comanda>
      </section>

      {/* 3. TABLA DE INVENTARIO PERPETUO */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Rotulo>INVENTARIO PERPETUO</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Kárdex y Conteo de Cierre
            </h2>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--p-muted)' }}>
            Lote {lote?.codigo_lote}
          </span>
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-line)', borderRadius: '6px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: 'var(--mono)',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--p-bg)', borderBottom: '1px solid var(--p-line)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Insumo</th>
                <th style={{ padding: '0.75rem' }}>Costo Unit.</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Inicial</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Compras (+)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Consumo (−)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Mermas (−)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>Saldo Teórico</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Conteo Físico</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Varianza</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map((item) => {
                const varianza = item.varianza_conteo !== null ? item.varianza_conteo : null;
                const varianzaPct = varianza !== null && item.saldo_teorico !== 0
                  ? Math.round((varianza / Math.abs(item.saldo_teorico)) * 100)
                  : null;

                const tieneAlerta = item.saldo_teorico < 0;

                return (
                  <tr
                    key={item.insumo_id}
                    style={{
                      borderBottom: '1px solid var(--p-line)',
                      backgroundColor: tieneAlerta ? 'rgba(107, 31, 51, 0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--p-ink)' }}>
                      {item.nombre} <span style={{ color: 'var(--p-muted)', fontWeight: 400 }}>({item.unidad_medida})</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--p-muted)' }}>
                      {cop(item.costo_unitario_aplicado)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-muted)' }}>
                      {item.stock_inicial}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-despachado)', fontWeight: 600 }}>
                      +{item.entradas_compras}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-prep)' }}>
                      −{item.consumo_teorico}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--p-recibida)' }}>
                      −{item.bajas_merma}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: tieneAlerta ? 'var(--p-recibida)' : 'var(--p-ink)',
                      }}
                    >
                      {item.saldo_teorico}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Real"
                          value={conteos[item.insumo_id] ?? ''}
                          onChange={(e) =>
                            setConteos({ ...conteos, [item.insumo_id]: e.target.value })
                          }
                          style={{
                            width: '80px',
                            padding: '0.3rem 0.4rem',
                            fontFamily: 'var(--mono)',
                            fontSize: '0.75rem',
                            border: '1px solid var(--p-line)',
                            borderRadius: '3px',
                            backgroundColor: 'var(--p-bg)',
                            textAlign: 'right',
                          }}
                        />
                        <button
                          onClick={() => handleGuardarConteo(item.insumo_id)}
                          disabled={guardandoConteo === item.insumo_id}
                          style={{
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.7rem',
                            fontFamily: 'var(--mono)',
                            backgroundColor: 'var(--p-ink)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          {guardandoConteo === item.insumo_id ? '…' : '✓'}
                        </button>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: varianza !== null && varianza < 0 ? 'var(--p-recibida)' : 'var(--p-muted)',
                      }}
                    >
                      {varianza !== null ? (
                        <>
                          {varianza > 0 ? `+${varianza}` : varianza}
                          {varianzaPct !== null && (
                            <span style={{ fontSize: '0.65rem', marginLeft: '0.25rem' }}>
                              ({varianzaPct}%)
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
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
