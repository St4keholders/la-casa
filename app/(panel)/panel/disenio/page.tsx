'use client';

import React from 'react';
import PanelShell from '@/components/panel/PanelShell';
import { Comanda, ComandaHeader, ComandaTitle } from '@/components/panel/Comanda';
import Rotulo from '@/components/panel/Rotulo';
import FilaFicha from '@/components/panel/FilaFicha';
import Cifra from '@/components/panel/Cifra';
import Barra from '@/components/panel/Barra';
import EstadoPill, { EstadoOrden } from '@/components/panel/EstadoPill';
import Garnishes from '@/components/Garnishes';

const ESTADOS_ORDEN: EstadoOrden[] = [
  'recibida',
  'confirmada',
  'en_preparacion',
  'empacado',
  'despachado',
  'cancelada',
];

export default function DisenioPage() {
  return (
    <PanelShell loteCodigo="LOTE-2026-W37" rol="Administrador">
      <Garnishes variant="ambiente" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', position: 'relative', zIndex: 1 }}>
        {/* Encabezado de la página */}
        <section style={{ borderBottom: '1px solid var(--p-line)', paddingBottom: '1rem' }}>
          <Rotulo>SISTEMA DE DISEÑO · FASE 7</Rotulo>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontVariationSettings: "'wdth' 108, 'wght' 800",
              fontStyle: 'italic',
              textTransform: 'uppercase',
              fontSize: '2rem',
              color: 'var(--p-ink)',
              margin: '0.25rem 0',
            }}
          >
            Estética de la Comanda
          </h1>
          <p style={{ fontFamily: 'var(--sans)', color: 'var(--p-muted)', fontSize: '0.95rem', margin: 0 }}>
            Catálogo visual de los 7 componentes primitivos del panel de operaciones.
          </p>
        </section>

        {/* 1. Rótulos */}
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>01. COMPONENTE · ROTULO</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Etiquetas en IBM Plex Mono con letter-spacing amplio
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <Rotulo>COMANDA 01</Rotulo>
            <Rotulo>QUEDAN 14</Rotulo>
            <Rotulo>INVENTARIO CRÍTICO</Rotulo>
            <Rotulo>COSTO MARGINAL</Rotulo>
            <Rotulo>ESTADO DE DESPACHO</Rotulo>
          </div>
        </section>

        {/* 2. EstadoPill */}
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>02. COMPONENTE · ESTADOPILL</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Píldoras de estado con los colores de los 4 platos
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {ESTADOS_ORDEN.map((est) => (
              <EstadoPill key={est} estado={est} />
            ))}
          </div>
        </section>

        {/* 3. Cifras */}
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>03. COMPONENTE · CIFRA</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Números grandes en Archivo Italic
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'baseline' }}>
            <div>
              <Rotulo>Pequeña (sm)</Rotulo>
              <Cifra size="sm">$ 22.000</Cifra>
            </div>
            <div>
              <Rotulo>Mediana (md · defecto)</Rotulo>
              <Cifra size="md">$ 88.000</Cifra>
            </div>
            <div>
              <Rotulo>Grande (lg)</Rotulo>
              <Cifra size="lg">$ 1.250.000</Cifra>
            </div>
            <div>
              <Rotulo>Unidades</Rotulo>
              <Cifra size="lg">44 / 50</Cifra>
            </div>
          </div>
        </section>

        {/* 4. Barras de progreso */}
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>04. COMPONENTE · BARRA</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Progreso en CSS puro sin librerías de terceros
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <FilaFicha label="Capacidad Lote" value="0%" />
              <Barra valor={0} />
            </div>
            <div>
              <FilaFicha label="En preparación" value="35%" />
              <Barra valor={35} color="var(--p-prep)" />
            </div>
            <div>
              <FilaFicha label="Empacado" value="70%" />
              <Barra valor={70} color="var(--p-empacado)" />
            </div>
            <div>
              <FilaFicha label="Despachado" value="100%" />
              <Barra valor={100} color="var(--p-despachado)" />
            </div>
          </div>
        </section>

        {/* 5. Filas Ficha */}
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>05. COMPONENTE · FILAFICHA</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Líneas con puntos suspensivos estilo comanda
            </h2>
          </div>
          <div style={{ maxWidth: '420px', background: 'var(--p-surface)', padding: '1rem', border: '1px solid var(--p-line)', borderRadius: '3px' }}>
            <FilaFicha label="CLIENTE" value="Valentina Osorio" />
            <FilaFicha label="TELÉFONO" value="312 456 7890" />
            <FilaFicha label="DIRECCIÓN" value="Cra 7 # 65-20 Apto 401" />
            <FilaFicha label="PROTEÍNA" value="Punta de Anca 220g" />
            <FilaFicha label="BEBIDA" value="Guarapo frío 300ml" />
            <FilaFicha label="MÉTODO" value="Transferencia Bancolombia" />
          </div>
        </section>

        {/* 6. Comanda (Tarjeta de papel reutilizable) */}
        <section>
          <div style={{ marginBottom: '0.75rem' }}>
            <Rotulo>06. COMPONENTE · COMANDA</Rotulo>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '0.2rem 0', color: 'var(--p-ink)' }}>
              Tarjeta de papel con borde dentado inferior en CSS
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Comanda estándar: Pedido */}
            <Comanda>
              <ComandaHeader>
                <Rotulo>ORD-2026-0042</Rotulo>
                <EstadoPill estado="en_preparacion" />
              </ComandaHeader>
              <ComandaTitle>Cazuela de Frijoles</ComandaTitle>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--p-muted)', margin: '0 0 0.8rem 0' }}>
                Con chicharrón crujiente y plátano maduro
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1rem' }}>
                <FilaFicha label="CLIENTE" value="Carlos Méndez" />
                <FilaFicha label="BARRIO" value="La Floresta" />
                <FilaFicha label="CANTIDAD" value="2 unidades" />
              </div>
              <div style={{ borderTop: '1.5px solid var(--p-ink)', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Rotulo>TOTAL COBRADO</Rotulo>
                <Cifra size="sm">$ 44.000</Cifra>
              </div>
            </Comanda>

            {/* Comanda compacta */}
            <Comanda compact>
              <ComandaHeader>
                <Rotulo>ORD-2026-0043</Rotulo>
                <EstadoPill estado="recibida" />
              </ComandaHeader>
              <ComandaTitle>Sancocho Trifásico</ComandaTitle>
              <FilaFicha label="CANTIDAD" value="1 unidad" />
              <FilaFicha label="DOMICILIO" value="$ 5.000" />
              <div style={{ borderTop: '1px solid var(--p-line)', marginTop: '0.5rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Rotulo>TOTAL</Rotulo>
                <Cifra size="sm">$ 29.000</Cifra>
              </div>
            </Comanda>

            {/* Comanda resumen financiero / CeCo */}
            <Comanda>
              <ComandaHeader>
                <Rotulo>CECO · CC-01</Rotulo>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--p-despachado)', fontWeight: 600 }}>
                  MARGEN 48%
                </span>
              </ComandaHeader>
              <ComandaTitle>Bandeja Paisa</ComandaTitle>
              <div style={{ margin: '0.5rem 0' }}>
                <FilaFicha label="VENTAS" value="$ 352.000" />
                <FilaFicha label="COSTO INSUMOS" value="$ 183.040" />
                <FilaFicha label="PORCIONES" value="16 vendidas" />
              </div>
              <Barra valor={48} color="var(--p-despachado)" />
              <div style={{ borderTop: '1.5px solid var(--p-ink)', marginTop: '0.8rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Rotulo>MARGEN NETO</Rotulo>
                <Cifra size="sm">$ 168.960</Cifra>
              </div>
            </Comanda>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
