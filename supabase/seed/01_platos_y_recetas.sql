-- =============================================================================
-- LA CASA · Semilla: 4 Platos, Insumos, Recetas y Primer Lote Activo
-- Fuentes: lib/dishes.ts y PLAN.md §4
-- =============================================================================

-- 1. PLATOS (Centros de Costo)
INSERT INTO public.platos (
    id, codigo_ceco, nombre, precio_venta_sugerido, kicker, palabra,
    foto_url, nota, ficha, color_bg, color_ink, color_accent, color_accent_ink,
    garnish, orden_vitrina
) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'CC-01',
    'Pechuga a la plancha',
    22000,
    'Pechuga',
    'Pollo',
    'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/pollo.png',
    'Liviano y rápido. El que piden los que vuelven a la oficina.',
    '[["Sopa", "Crema del día"], ["Seco", "Arroz y ensalada fresca"], ["Proteína", "Pechuga a la plancha"], ["Jugo", "Maracuyá en agua"]]'::jsonb,
    '#2F6B4B',
    '#F2F7EC',
    '#F4C95D',
    '#241A12',
    ARRAY['cilantro', 'lime', 'tomate', 'lechuga', 'aguacate', 'cebolla'],
    0
),
(
    'b0000000-0000-0000-0000-000000000002',
    'CC-02',
    'Cazuela de frijoles',
    21000,
    'Cazuela de',
    'Frijoles',
    'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/frijoles.png',
    'Frijol cargamanto en cazuela de barro. Sale hirviendo, con cuidado.',
    '[["Adentro", "Frijol cargamanto y garra"], ["Encima", "Chicharrón y hogao"], ["Va con", "Arepa y aguacate"], ["Jugo", "Mango en agua"]]'::jsonb,
    '#6B2438',
    '#FFEFE0',
    '#F3A712',
    '#241A12',
    ARRAY['arepa', 'aguacate', 'chili', 'platano', 'tomate', 'cilantro'],
    1
),
(
    'b0000000-0000-0000-0000-000000000003',
    'CC-03',
    'Sancocho de gallina',
    24000,
    'Sancocho',
    'de gallina',
    'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/sancocho.png',
    'A fuego lento desde las seis de la mañana. Repetimos el caldo sin cobrar.',
    '[["Va con", "Arroz blanco y aguacate"], ["Adentro", "Gallina, yuca, plátano, mazorca"], ["Al lado", "Ají casero"], ["Jugo", "Lulo en agua"]]'::jsonb,
    '#DFA01B',
    '#2B1A06',
    '#1D5B3C',
    '#F2F7EC',
    ARRAY['corn', 'cilantro', 'lime', 'yuca', 'platano', 'chili'],
    2
),
(
    'b0000000-0000-0000-0000-000000000004',
    'CC-04',
    'Mojarra frita',
    28000,
    'Mojarra',
    'Frita',
    'https://cmaxh1jc30oqtw7k.public.blob.vercel-storage.com/pescado.png',
    'Llega los jueves y viernes desde el Magdalena. Se acaba temprano.',
    '[["Va con", "Arroz con coco y patacón"], ["Al lado", "Ensalada y limón"], ["Salsa", "Ají de la casa"], ["Jugo", "Limonada de coco"]]'::jsonb,
    '#0E7C86',
    '#F1FBFB',
    '#FFCF4D',
    '#241A12',
    ARRAY['lime', 'patacon', 'chili', 'tomate', 'cebolla', 'lechuga'],
    3
)
ON CONFLICT (id) DO NOTHING;

-- 2. INSUMOS (Valores redondos de referencia / estimaciones de costeo)
-- ESTIMADO: reemplazar con costos reales
INSERT INTO public.insumos (id, codigo, nombre, categoria, unidad_medida, costo_unitario_promedio, es_perecedero) VALUES
('a0000000-0000-0000-0000-000000000001', 'POLLO', 'Pechuga de pollo', 'proteina', 'g', 24.00, TRUE),
('a0000000-0000-0000-0000-000000000002', 'ARROZ', 'Arroz blanco', 'grano', 'g', 4.50, FALSE),
('a0000000-0000-0000-0000-000000000003', 'ENSALADA', 'Ensalada fresca de la casa', 'vegetal', 'g', 8.00, TRUE),
('a0000000-0000-0000-0000-000000000004', 'SOPA_BASE', 'Crema del día base', 'otro', 'ml', 6.00, TRUE),
('a0000000-0000-0000-0000-000000000005', 'JUGO_MARACUYA', 'Jugo de Maracuyá', 'bebida', 'ml', 5.00, TRUE),
('a0000000-0000-0000-0000-000000000006', 'FRIJOL', 'Frijol cargamanto', 'grano', 'g', 12.00, FALSE),
('a0000000-0000-0000-0000-000000000007', 'GARRA', 'Garra de cerdo', 'proteina', 'g', 14.00, TRUE),
('a0000000-0000-0000-0000-000000000008', 'CHICHARRON', 'Chicharrón de cerdo', 'proteina', 'g', 30.00, TRUE),
('a0000000-0000-0000-0000-000000000009', 'HOGAO', 'Hogao criollo tradicional', 'salsa', 'g', 10.00, TRUE),
('a0000000-0000-0000-0000-000000000010', 'AREPA', 'Arepa antioqueña', 'grano', 'unidad', 800.00, TRUE),
('a0000000-0000-0000-0000-000000000011', 'AGUACATE', 'Aguacate hass', 'vegetal', 'g', 12.00, TRUE),
('a0000000-0000-0000-0000-000000000012', 'JUGO_MANGO', 'Jugo de Mango', 'bebida', 'ml', 5.00, TRUE),
('a0000000-0000-0000-0000-000000000013', 'GALLINA', 'Gallina campesina en presas', 'proteina', 'g', 26.00, TRUE),
('a0000000-0000-0000-0000-000000000014', 'YUCA', 'Yuca campesina', 'vegetal', 'g', 6.00, TRUE),
('a0000000-0000-0000-0000-000000000015', 'PLATANO', 'Plátano verde/maduro', 'vegetal', 'g', 5.00, TRUE),
('a0000000-0000-0000-0000-000000000016', 'MAZORCA', 'Trozo de mazorca', 'vegetal', 'unidad', 1200.00, TRUE),
('a0000000-0000-0000-0000-000000000017', 'AJI', 'Ají casero', 'condimento', 'ml', 8.00, TRUE),
('a0000000-0000-0000-0000-000000000018', 'JUGO_LULO', 'Jugo de Lulo', 'bebida', 'ml', 6.00, TRUE),
('a0000000-0000-0000-0000-000000000019', 'MOJARRA', 'Mojarra fresca 450g', 'proteina', 'unidad', 12000.00, TRUE),
('a0000000-0000-0000-0000-000000000020', 'ARROZ_COCO', 'Arroz con coco titoté', 'grano', 'g', 9.00, FALSE),
('a0000000-0000-0000-0000-000000000021', 'PATACON', 'Patacón frito', 'vegetal', 'unidad', 1500.00, TRUE),
('a0000000-0000-0000-0000-000000000022', 'LIMONADA_COCO', 'Limonada de coco', 'bebida', 'ml', 8.00, TRUE),
('a0000000-0000-0000-0000-000000000023', 'EMPAQUE', 'Tarrina ecológica biodegradable', 'empaque', 'unidad', 1000.00, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 3. RECETAS POR PLATO (Escandallo)
-- Pechuga a la plancha (CC-01)
INSERT INTO public.receta_detalles (plato_id, insumo_id, cantidad_neta, porcentaje_merma_esperado) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 180, 10), -- Pollo
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 150, 0),  -- Arroz
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 100, 5),  -- Ensalada
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 250, 0),  -- Crema
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 300, 0),  -- Jugo maracuyá
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000023', 1, 0)     -- Empaque
ON CONFLICT (plato_id, insumo_id) DO NOTHING;

-- Cazuela de frijoles (CC-02)
INSERT INTO public.receta_detalles (plato_id, insumo_id, cantidad_neta, porcentaje_merma_esperado) VALUES
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 220, 5),  -- Frijoles
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 50, 10),  -- Garra
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 80, 15),  -- Chicharrón
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009', 40, 0),   -- Hogao
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 1, 0),    -- Arepa
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000011', 60, 5),   -- Aguacate
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000012', 300, 0),  -- Jugo mango
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000023', 1, 0)     -- Empaque
ON CONFLICT (plato_id, insumo_id) DO NOTHING;

-- Sancocho de gallina (CC-03)
INSERT INTO public.receta_detalles (plato_id, insumo_id, cantidad_neta, porcentaje_merma_esperado) VALUES
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000013', 250, 15), -- Gallina
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000014', 120, 8),  -- Yuca
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000015', 100, 8),  -- Plátano
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000016', 1, 0),    -- Mazorca
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 150, 0),  -- Arroz
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011', 60, 5),   -- Aguacate
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000017', 30, 0),   -- Ají
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000018', 300, 0),  -- Jugo lulo
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000023', 1, 0)     -- Empaque
ON CONFLICT (plato_id, insumo_id) DO NOTHING;

-- Mojarra frita (CC-04)
INSERT INTO public.receta_detalles (plato_id, insumo_id, cantidad_neta, porcentaje_merma_esperado) VALUES
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000019', 1, 10),   -- Mojarra
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000020', 160, 0),  -- Arroz coco
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000021', 2, 5),    -- Patacón
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 100, 5),  -- Ensalada
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000017', 30, 0),   -- Ají
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000022', 300, 0),  -- Limonada coco
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000023', 1, 0)     -- Empaque
ON CONFLICT (plato_id, insumo_id) DO NOTHING;

-- 4. PRIMER LOTE ACTIVO (Fin de semana)
INSERT INTO public.lotes (
    id, codigo_lote, fecha_apertura, fecha_entrega_desde, fecha_entrega_hasta,
    estado, nombre_domiciliario, tarifa_fija_domiciliario, tarifa_domicilio_cliente
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'LOTE-2026-W37',
    public.fn_hoy_bogota(),
    '2026-09-12',
    '2026-09-13',
    'activo',
    'Carlos Repartidor',
    90000,
    6000
)
ON CONFLICT (id) DO NOTHING;

-- 5. CARTA DEL LOTE CON CUPOS INICIALES (left de lib/dishes.ts)
-- CC-01 Pechuga: left 16, price 22000
-- CC-02 Frijoles: left 14, price 21000
-- CC-03 Sancocho: left 9,  price 24000
-- CC-04 Mojarra:  left 5,  price 28000
INSERT INTO public.lote_cecos (
    lote_id, plato_id, unidades_proyectadas, unidades_reservadas, precio_venta_lote, horas_coccion
) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 16, 0, 22000, 0.5),
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 14, 0, 21000, 2.5),
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 9,  0, 24000, 4.0),
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 5,  0, 28000, 0.3)
ON CONFLICT (lote_id, plato_id) DO NOTHING;

-- 6. PREPARAR INVENTARIO DEL LOTE
-- Inserta las filas necesarias en inventario_lote a partir de las recetas
INSERT INTO public.inventario_lote (lote_id, insumo_id, costo_unitario_aplicado)
SELECT DISTINCT 'c0000000-0000-0000-0000-000000000001'::uuid, rd.insumo_id, i.costo_unitario_promedio
FROM public.lote_cecos lc
JOIN public.receta_detalles rd ON rd.plato_id = lc.plato_id
JOIN public.insumos i ON i.id = rd.insumo_id
WHERE lc.lote_id = 'c0000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (lote_id, insumo_id) DO NOTHING;
