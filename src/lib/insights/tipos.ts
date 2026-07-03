/**
 * Tipos de la capa de perfilado/insights. Esta capa NO reprocesa filas crudas:
 * toma como única entrada un DatosDashboard ya calculado por excelParser.ts/filtrarDatos.ts
 * y razona estadísticamente sobre sus agregados (porMes, distribucionesCategoricas, etc.).
 *
 * Modelo: Excel → DatosDashboard → CapacidadesPerfil → PerfilColumna[] →
 *         CaracteristicasDataset → AnalisisDisponibles → Insights/Anomalias/Patrones
 */

/** Capa 1: qué tipos de dato están presentes (estructura, no comportamiento). */
export interface CapacidadesPerfil {
  tieneFechas: boolean;
  tieneCategorias: boolean;
  tieneEstados: boolean;
  tieneUbicaciones: boolean;
  tieneNumericos: boolean;
  tieneTextoLibre: boolean;
  tieneMultiplesCategorias: boolean;
  tieneSeriesTemporales: boolean;
  tieneComparacionPeriodos: boolean;
}

/** Perfil estadístico de una columna individual (entropía, concentración). */
export interface PerfilColumna {
  nombre: string;
  tipo: "categorica" | "numerica" | "fecha" | "texto_libre";
  totalRegistros: number;
  valoresUnicos: number;
  top1Pct: number;
  /** Nombre del valor más frecuente (null si no aplica). Ya estaba calculado en
   *  distribucionesCategoricas — esto solo evita descartarlo antes de tiempo. */
  top1Nombre: string | null;
  entropiaNormalizada: number;
}

/** Capa 2: cómo se comportan los datos (huella del dataset), no solo qué columnas hay. */
export interface CaracteristicasDataset {
  /** null = no hay columna categórica principal medible (no es lo mismo que concentración 0). */
  concentracionGlobal: number | null;
  volatilidadTemporal: number;
  recurrenciaDetectada: boolean;
  cantidadAnomalias: number;
  /** null = no hay columna categórica principal medible. */
  riquezaCategorica: number | null;
  tendenciaGeneral?: "creciente" | "estable" | "decreciente";
  /** 0–1: qué tan confiable/representativo es el dataset para sacar conclusiones. */
  confianzaAnalitica: number;
}

/** Capa 3: qué análisis tienen sentido para ESTE dataset, puntuados por relevancia. */
export interface AnalisisDisponible {
  id: string;
  nombre: string;
  descripcion: string;
  score: number;
  /** Explicación opcional de por qué se recomienda — previsto para UI futura. */
  motivo?: string;
}

/** Capa 4: hallazgos concretos generados a partir de las capas anteriores. */
export type TipoInsight = "concentracion" | "tendencia";
export type Severidad = "info" | "atencion" | "critico";

export interface Insight {
  tipo: TipoInsight;
  severidad: Severidad;
  texto: string;
  detalle?: string;
  columna?: string;
  valor?: number;
}

export interface Anomalia {
  columna: string;
  etiqueta: string;
  valorObservado: number;
  valorEsperado: number;
  desviacion: number;
  texto: string;
}

export interface Patron {
  tipo: "recurrencia";
  descripcion: string;
  entidades: string[];
  fuerza: number;
}

export interface PerfilDataset {
  capacidades: CapacidadesPerfil;

  columnasFecha: string[];
  columnasNumericas: string[];
  columnasCategoricas: string[];
  columnasTexto: string[];

  perfilColumnas: PerfilColumna[];
  caracteristicas: CaracteristicasDataset;
  analisisDisponibles: AnalisisDisponible[];

  insights: Insight[];
  anomalias: Anomalia[];
  patrones: Patron[];
}
