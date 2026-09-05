export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      compra_detalles: {
        Row: {
          cantidad: number
          compra_id: string
          costo_unitario: number
          id: string
          insumo_id: string
          subtotal: number | null
        }
        Insert: {
          cantidad: number
          compra_id: string
          costo_unitario: number
          id?: string
          insumo_id: string
          subtotal?: number | null
        }
        Update: {
          cantidad?: number
          compra_id?: string
          costo_unitario?: number
          id?: string
          insumo_id?: string
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compra_detalles_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_detalles_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          created_at: string
          documento: string | null
          fecha: string
          id: string
          lote_id: string
          proveedor: string | null
          registrado_por: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          fecha?: string
          id?: string
          lote_id: string
          proveedor?: string | null
          registrado_por?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          fecha?: string
          id?: string
          lote_id?: string
          proveedor?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          activo: boolean
          categoria: string
          codigo: string | null
          costo_unitario_promedio: number
          created_at: string
          es_perecedero: boolean
          id: string
          nombre: string
          unidad_medida: string
          updated_at: string
          vida_util_dias: number | null
        }
        Insert: {
          activo?: boolean
          categoria: string
          codigo?: string | null
          costo_unitario_promedio?: number
          created_at?: string
          es_perecedero?: boolean
          id?: string
          nombre: string
          unidad_medida: string
          updated_at?: string
          vida_util_dias?: number | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          codigo?: string | null
          costo_unitario_promedio?: number
          created_at?: string
          es_perecedero?: boolean
          id?: string
          nombre?: string
          unidad_medida?: string
          updated_at?: string
          vida_util_dias?: number | null
        }
        Relationships: []
      }
      inventario_lote: {
        Row: {
          bajas_merma: number
          consumo_teorico: number
          costo_unitario_aplicado: number
          entradas_compras: number
          id: string
          insumo_id: string
          lote_id: string
          saldo_teorico: number | null
          stock_final_real: number | null
          stock_inicial: number
          varianza_conteo: number | null
        }
        Insert: {
          bajas_merma?: number
          consumo_teorico?: number
          costo_unitario_aplicado?: number
          entradas_compras?: number
          id?: string
          insumo_id: string
          lote_id: string
          saldo_teorico?: number | null
          stock_final_real?: number | null
          stock_inicial?: number
          varianza_conteo?: number | null
        }
        Update: {
          bajas_merma?: number
          consumo_teorico?: number
          costo_unitario_aplicado?: number
          entradas_compras?: number
          id?: string
          insumo_id?: string
          lote_id?: string
          saldo_teorico?: number | null
          stock_final_real?: number | null
          stock_inicial?: number
          varianza_conteo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_lote_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_lote_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_diario: {
        Row: {
          ceco_id: string | null
          credito: number
          cuenta: Database["public"]["Enums"]["cuenta_contable"]
          debito: number
          descripcion: string
          es_pasivo_tercero: boolean
          fecha_contable: string
          fecha_registro: string
          id: string
          lote_id: string
          orden_id: string | null
          tipo_asiento: Database["public"]["Enums"]["tipo_asiento_diario"]
          transaccion_id: string
        }
        Insert: {
          ceco_id?: string | null
          credito?: number
          cuenta: Database["public"]["Enums"]["cuenta_contable"]
          debito?: number
          descripcion: string
          es_pasivo_tercero?: boolean
          fecha_contable?: string
          fecha_registro?: string
          id?: string
          lote_id: string
          orden_id?: string | null
          tipo_asiento: Database["public"]["Enums"]["tipo_asiento_diario"]
          transaccion_id: string
        }
        Update: {
          ceco_id?: string | null
          credito?: number
          cuenta?: Database["public"]["Enums"]["cuenta_contable"]
          debito?: number
          descripcion?: string
          es_pasivo_tercero?: boolean
          fecha_contable?: string
          fecha_registro?: string
          id?: string
          lote_id?: string
          orden_id?: string | null
          tipo_asiento?: Database["public"]["Enums"]["tipo_asiento_diario"]
          transaccion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "libro_diario_ceco_id_fkey"
            columns: ["ceco_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_diario_ceco_id_fkey"
            columns: ["ceco_id"]
            isOneToOne: false
            referencedRelation: "vista_menu_publico"
            referencedColumns: ["plato_id"]
          },
          {
            foreignKeyName: "libro_diario_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_diario_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_cecos: {
        Row: {
          horas_coccion: number
          id: string
          lote_id: string
          plato_id: string
          precio_venta_lote: number
          unidades_proyectadas: number
          unidades_reservadas: number
        }
        Insert: {
          horas_coccion?: number
          id?: string
          lote_id: string
          plato_id: string
          precio_venta_lote: number
          unidades_proyectadas?: number
          unidades_reservadas?: number
        }
        Update: {
          horas_coccion?: number
          id?: string
          lote_id?: string
          plato_id?: string
          precio_venta_lote?: number
          unidades_proyectadas?: number
          unidades_reservadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "lote_cecos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_cecos_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_cecos_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "vista_menu_publico"
            referencedColumns: ["plato_id"]
          },
        ]
      }
      lote_gastos: {
        Row: {
          ceco_id: string | null
          concepto: string
          created_at: string
          fecha: string
          id: string
          inductor: Database["public"]["Enums"]["inductor_prorrateo"]
          lote_id: string
          monto: number
          registrado_por: string | null
          tipo: Database["public"]["Enums"]["tipo_gasto_lote"]
        }
        Insert: {
          ceco_id?: string | null
          concepto: string
          created_at?: string
          fecha?: string
          id?: string
          inductor?: Database["public"]["Enums"]["inductor_prorrateo"]
          lote_id: string
          monto: number
          registrado_por?: string | null
          tipo: Database["public"]["Enums"]["tipo_gasto_lote"]
        }
        Update: {
          ceco_id?: string | null
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          inductor?: Database["public"]["Enums"]["inductor_prorrateo"]
          lote_id?: string
          monto?: number
          registrado_por?: string | null
          tipo?: Database["public"]["Enums"]["tipo_gasto_lote"]
        }
        Relationships: [
          {
            foreignKeyName: "lote_gastos_ceco_id_fkey"
            columns: ["ceco_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_gastos_ceco_id_fkey"
            columns: ["ceco_id"]
            isOneToOne: false
            referencedRelation: "vista_menu_publico"
            referencedColumns: ["plato_id"]
          },
          {
            foreignKeyName: "lote_gastos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_gastos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          codigo_lote: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_lote"]
          fecha_apertura: string
          fecha_cierre: string | null
          fecha_entrega_desde: string
          fecha_entrega_hasta: string
          id: string
          lote_anterior_id: string | null
          nombre_domiciliario: string | null
          notas: string | null
          tarifa_domicilio_cliente: number
          tarifa_fija_domiciliario: number
          updated_at: string
        }
        Insert: {
          codigo_lote: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_lote"]
          fecha_apertura?: string
          fecha_cierre?: string | null
          fecha_entrega_desde: string
          fecha_entrega_hasta: string
          id?: string
          lote_anterior_id?: string | null
          nombre_domiciliario?: string | null
          notas?: string | null
          tarifa_domicilio_cliente?: number
          tarifa_fija_domiciliario?: number
          updated_at?: string
        }
        Update: {
          codigo_lote?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_lote"]
          fecha_apertura?: string
          fecha_cierre?: string | null
          fecha_entrega_desde?: string
          fecha_entrega_hasta?: string
          id?: string
          lote_anterior_id?: string | null
          nombre_domiciliario?: string | null
          notas?: string | null
          tarifa_domicilio_cliente?: number
          tarifa_fija_domiciliario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_lote_anterior_id_fkey"
            columns: ["lote_anterior_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      mermas_operativas: {
        Row: {
          cantidad: number
          ceco_id: string | null
          costo_total_perdida: number
          created_at: string
          id: string
          insumo_id: string
          lote_id: string
          motivo: string
          reportado_por: string | null
          tipo_baja: Database["public"]["Enums"]["tipo_baja_merma"]
        }
        Insert: {
          cantidad: number
          ceco_id?: string | null
          costo_total_perdida?: number
          created_at?: string
          id?: string
          insumo_id: string
          lote_id: string
          motivo: string
          reportado_por?: string | null
          tipo_baja: Database["public"]["Enums"]["tipo_baja_merma"]
        }
        Update: {
          cantidad?: number
          ceco_id?: string | null
          costo_total_perdida?: number
          created_at?: string
          id?: string
          insumo_id?: string
          lote_id?: string
          motivo?: string
          reportado_por?: string | null
          tipo_baja?: Database["public"]["Enums"]["tipo_baja_merma"]
        }
        Relationships: [
          {
            foreignKeyName: "mermas_operativas_ceco_id_fkey"
            columns: ["ceco_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_operativas_ceco_id_fkey"
            columns: ["ceco_id"]
            isOneToOne: false
            referencedRelation: "vista_menu_publico"
            referencedColumns: ["plato_id"]
          },
          {
            foreignKeyName: "mermas_operativas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_operativas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_operativas_reportado_por_fkey"
            columns: ["reportado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_detalles: {
        Row: {
          cantidad: number
          costo_mp_unitario: number | null
          id: string
          lote_id: string
          orden_id: string
          plato_id: string
          precio_unitario: number
          subtotal: number | null
        }
        Insert: {
          cantidad: number
          costo_mp_unitario?: number | null
          id?: string
          lote_id: string
          orden_id: string
          plato_id: string
          precio_unitario: number
          subtotal?: number | null
        }
        Update: {
          cantidad?: number
          costo_mp_unitario?: number | null
          id?: string
          lote_id?: string
          orden_id?: string
          plato_id?: string
          precio_unitario?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_detalles_lote_id_plato_id_fkey"
            columns: ["lote_id", "plato_id"]
            isOneToOne: false
            referencedRelation: "lote_cecos"
            referencedColumns: ["lote_id", "plato_id"]
          },
          {
            foreignKeyName: "orden_detalles_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_detalles_orden_id_lote_id_fkey"
            columns: ["orden_id", "lote_id"]
            isOneToOne: false
            referencedRelation: "ordenes"
            referencedColumns: ["id", "lote_id"]
          },
        ]
      }
      ordenes: {
        Row: {
          canal: Database["public"]["Enums"]["canal_orden"]
          cancelado_at: string | null
          cliente_nombre: string
          cliente_telefono: string
          codigo_orden: string
          costo_domicilio_real: number
          costo_mp_total: number
          created_at: string
          despachado_at: string | null
          direccion_entrega: string | null
          estado: Database["public"]["Enums"]["estado_orden"]
          fecha_entrega: string
          id: string
          lote_id: string
          motivo_cancelacion: string | null
          nota_cliente: string | null
          subtotal_platos: number
          tipo_domicilio: Database["public"]["Enums"]["tipo_domicilio"]
          total_orden: number
          updated_at: string
          valor_domicilio_cobrado: number
        }
        Insert: {
          canal?: Database["public"]["Enums"]["canal_orden"]
          cancelado_at?: string | null
          cliente_nombre: string
          cliente_telefono: string
          codigo_orden: string
          costo_domicilio_real?: number
          costo_mp_total?: number
          created_at?: string
          despachado_at?: string | null
          direccion_entrega?: string | null
          estado?: Database["public"]["Enums"]["estado_orden"]
          fecha_entrega: string
          id?: string
          lote_id: string
          motivo_cancelacion?: string | null
          nota_cliente?: string | null
          subtotal_platos?: number
          tipo_domicilio?: Database["public"]["Enums"]["tipo_domicilio"]
          total_orden?: number
          updated_at?: string
          valor_domicilio_cobrado?: number
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_orden"]
          cancelado_at?: string | null
          cliente_nombre?: string
          cliente_telefono?: string
          codigo_orden?: string
          costo_domicilio_real?: number
          costo_mp_total?: number
          created_at?: string
          despachado_at?: string | null
          direccion_entrega?: string | null
          estado?: Database["public"]["Enums"]["estado_orden"]
          fecha_entrega?: string
          id?: string
          lote_id?: string
          motivo_cancelacion?: string | null
          nota_cliente?: string | null
          subtotal_platos?: number
          tipo_domicilio?: Database["public"]["Enums"]["tipo_domicilio"]
          total_orden?: number
          updated_at?: string
          valor_domicilio_cobrado?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      platos: {
        Row: {
          activo: boolean
          codigo_ceco: string
          color_accent: string | null
          color_accent_ink: string | null
          color_bg: string | null
          color_ink: string | null
          created_at: string
          descripcion: string | null
          ficha: Json
          foto_url: string | null
          garnish: string[]
          id: string
          kicker: string | null
          nombre: string
          nota: string | null
          orden_vitrina: number
          palabra: string | null
          precio_venta_sugerido: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo_ceco: string
          color_accent?: string | null
          color_accent_ink?: string | null
          color_bg?: string | null
          color_ink?: string | null
          created_at?: string
          descripcion?: string | null
          ficha?: Json
          foto_url?: string | null
          garnish?: string[]
          id?: string
          kicker?: string | null
          nombre: string
          nota?: string | null
          orden_vitrina?: number
          palabra?: string | null
          precio_venta_sugerido: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo_ceco?: string
          color_accent?: string | null
          color_accent_ink?: string | null
          color_bg?: string | null
          color_ink?: string | null
          created_at?: string
          descripcion?: string | null
          ficha?: Json
          foto_url?: string | null
          garnish?: string[]
          id?: string
          kicker?: string | null
          nombre?: string
          nota?: string | null
          orden_vitrina?: number
          palabra?: string | null
          precio_venta_sugerido?: number
          updated_at?: string
        }
        Relationships: []
      }
      receta_detalles: {
        Row: {
          cantidad_bruta_calculada: number | null
          cantidad_neta: number
          created_at: string
          id: string
          insumo_id: string
          plato_id: string
          porcentaje_merma_esperado: number
        }
        Insert: {
          cantidad_bruta_calculada?: number | null
          cantidad_neta: number
          created_at?: string
          id?: string
          insumo_id: string
          plato_id: string
          porcentaje_merma_esperado?: number
        }
        Update: {
          cantidad_bruta_calculada?: number | null
          cantidad_neta?: number
          created_at?: string
          id?: string
          insumo_id?: string
          plato_id?: string
          porcentaje_merma_esperado?: number
        }
        Relationships: [
          {
            foreignKeyName: "receta_detalles_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_detalles_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_detalles_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "vista_menu_publico"
            referencedColumns: ["plato_id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string | null
          rol: Database["public"]["Enums"]["app_rol"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre?: string | null
          rol?: Database["public"]["Enums"]["app_rol"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string | null
          rol?: Database["public"]["Enums"]["app_rol"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      vista_alertas_inventario: {
        Row: {
          alerta: string | null
          codigo_lote: string | null
          insumo: string | null
          saldo_teorico: number | null
          stock_final_real: number | null
          unidad_medida: string | null
          valor_saldo: number | null
          varianza_conteo: number | null
        }
        Relationships: []
      }
      vista_menu_publico: {
        Row: {
          codigo_ceco: string | null
          codigo_lote: string | null
          color_accent: string | null
          color_accent_ink: string | null
          color_bg: string | null
          color_ink: string | null
          descripcion: string | null
          disponibles: number | null
          fecha_entrega_desde: string | null
          fecha_entrega_hasta: string | null
          ficha: Json | null
          foto_url: string | null
          garnish: string[] | null
          kicker: string | null
          nombre: string | null
          nota: string | null
          orden_vitrina: number | null
          palabra: string | null
          plato_id: string | null
          precio: number | null
          tarifa_domicilio_cliente: number | null
        }
        Relationships: []
      }
      vista_pnl_lote: {
        Row: {
          cif: number | null
          codigo_lote: string | null
          costo_mercancia_vendida: number | null
          estado: Database["public"]["Enums"]["estado_lote"] | null
          gasto_logistica: number | null
          gasto_mano_obra: number | null
          ingresos: number | null
          pasivo_domiciliario_pendiente: number | null
          perdida_merma: number | null
          utilidad_operacional: number | null
        }
        Relationships: []
      }
      vista_produccion_dia: {
        Row: {
          codigo_ceco: string | null
          despachados: number | null
          empacados: number | null
          fecha_entrega: string | null
          lote_id: string | null
          platillo: string | null
          por_preparar: number | null
          total_comprometido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_rendimiento_cecos: {
        Row: {
          codigo_ceco: string | null
          codigo_lote: string | null
          costo_merma: number | null
          costo_nivel1_materia_prima: number | null
          costo_nivel2_directo: number | null
          costo_nivel3_estructural: number | null
          cumplimiento_proyeccion_porcentaje: number | null
          estado_lote: Database["public"]["Enums"]["estado_lote"] | null
          ingreso_bruto: number | null
          margen_bruto_porcentaje: number | null
          margen_neto_porcentaje: number | null
          platillo: string | null
          precio_venta_lote: number | null
          unidades_proyectadas: number | null
          unidades_vendidas: number | null
          utilidad_bruta: number | null
          utilidad_neta: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_anular_orden_despachada: {
        Args: { p_motivo: string; p_orden_id: string }
        Returns: undefined
      }
      fn_cerrar_y_transferir_lote: {
        Args: { p_lote_actual_id: string; p_lote_nuevo_id: string }
        Returns: {
          insumos_dados_de_baja: number
          insumos_transferidos: number
        }[]
      }
      fn_crear_orden_publica: {
        Args: {
          p_cliente_nombre: string
          p_cliente_telefono: string
          p_direccion: string
          p_fecha_entrega: string
          p_items: Json
          p_nota: string
          p_tipo_domicilio?: Database["public"]["Enums"]["tipo_domicilio"]
        }
        Returns: {
          codigo_orden: string
          orden_id: string
          total: number
        }[]
      }
      fn_es_admin: { Args: never; Returns: boolean }
      fn_es_cocina: { Args: never; Returns: boolean }
      fn_es_staff: { Args: never; Returns: boolean }
      fn_exigir_rol: {
        Args: { p_minimo: Database["public"]["Enums"]["app_rol"] }
        Returns: undefined
      }
      fn_hoy_bogota: { Args: never; Returns: string }
      fn_liquidar_domiciliario: {
        Args: { p_lote_id: string; p_monto?: number }
        Returns: number
      }
      fn_preparar_inventario_lote: {
        Args: { p_lote_id: string }
        Returns: number
      }
      fn_registrar_compra: {
        Args: {
          p_documento: string
          p_items: Json
          p_lote_id: string
          p_proveedor: string
        }
        Returns: string
      }
      fn_solo_digitos: { Args: { p_texto: string }; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_rol"]
      }
    }
    Enums: {
      app_rol: "pendiente" | "repartidor" | "cocina" | "admin"
      canal_orden: "web" | "whatsapp" | "mostrador"
      cuenta_contable:
        | "caja_bancos"
        | "cuentas_por_cobrar"
        | "inventario"
        | "pasivo_domiciliario"
        | "ingresos_ventas"
        | "costo_mercancia_vendida"
        | "gasto_logistica"
        | "gasto_mano_obra"
        | "cif"
        | "perdida_merma"
      estado_lote: "borrador" | "activo" | "cerrado" | "conciliado"
      estado_orden:
        | "recibida"
        | "confirmada"
        | "en_preparacion"
        | "empacado"
        | "despachado"
        | "cancelada"
      inductor_prorrateo:
        | "directo"
        | "unidades_vendidas"
        | "horas_coccion"
        | "ingreso_bruto"
      tipo_asiento_diario:
        | "compra_insumo"
        | "venta_almuerzo"
        | "costo_mercancia_vendida"
        | "cobro_domicilio_tercero"
        | "liquidacion_domiciliario"
        | "gasto_domicilio"
        | "gasto_mano_obra"
        | "cif_general"
        | "baja_merma"
        | "anulacion"
      tipo_baja_merma:
        | "descomposicion"
        | "dano_cocina"
        | "caducidad"
        | "ajuste_inventario"
        | "perecedero_no_transferible"
      tipo_domicilio: "pagado_cliente" | "cubierto_por_lote" | "retiro_en_sede"
      tipo_gasto_lote: "mano_obra" | "logistica" | "cif"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_rol: ["pendiente", "repartidor", "cocina", "admin"],
      canal_orden: ["web", "whatsapp", "mostrador"],
      cuenta_contable: [
        "caja_bancos",
        "cuentas_por_cobrar",
        "inventario",
        "pasivo_domiciliario",
        "ingresos_ventas",
        "costo_mercancia_vendida",
        "gasto_logistica",
        "gasto_mano_obra",
        "cif",
        "perdida_merma",
      ],
      estado_lote: ["borrador", "activo", "cerrado", "conciliado"],
      estado_orden: [
        "recibida",
        "confirmada",
        "en_preparacion",
        "empacado",
        "despachado",
        "cancelada",
      ],
      inductor_prorrateo: [
        "directo",
        "unidades_vendidas",
        "horas_coccion",
        "ingreso_bruto",
      ],
      tipo_asiento_diario: [
        "compra_insumo",
        "venta_almuerzo",
        "costo_mercancia_vendida",
        "cobro_domicilio_tercero",
        "liquidacion_domiciliario",
        "gasto_domicilio",
        "gasto_mano_obra",
        "cif_general",
        "baja_merma",
        "anulacion",
      ],
      tipo_baja_merma: [
        "descomposicion",
        "dano_cocina",
        "caducidad",
        "ajuste_inventario",
        "perecedero_no_transferible",
      ],
      tipo_domicilio: ["pagado_cliente", "cubierto_por_lote", "retiro_en_sede"],
      tipo_gasto_lote: ["mano_obra", "logistica", "cif"],
    },
  },
} as const
