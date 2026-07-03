/**
 * Calidad analítica del dataset.
 *
 * FRONTERA CONCEPTUAL — Calidad vs. Capacidad estructural
 * ────────────────────────────────────────────────────────
 * capacidades.ts responde: "¿tiene el dataset las columnas semánticas?"
 * Este módulo responde: "¿tienen esas columnas suficientes datos para
 * que el análisis sea útil?"
 *
 * `activa(caps, X) = true`   → la columna existe estructuralmente
 * `utilizable(calidad, X) = true` → la columna tiene calidad suficiente
 *
 * Las dos condiciones son independientes. Un dataset puede tener la columna
 * de Estado (activa=true) pero con fill-rate del 5% (utilizable=false).
 *
 * Contrato de inmutabilidad: igual que CapacidadesDataset, CalidadAnaliticaDataset
 * se calcula una vez sobre el dataset completo en parsearExcel() y no cambia
 * con filtros de UI. Los guards de datosFiltrados.* en Dashboard.tsx son la
 * tercera línea de defensa dinámica y no son responsabilidad de este módulo.
 */

import type { NombreCapacidad } from "./capacidades";

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface CalidadCapacidad {
  /** Resumen: ¿la capacidad tiene datos suficientes para ser útil al usuario? */
  utilizable: boolean;
  /** Cantidad de entradas en el aggregate principal (porMotivo.length, etc.) */
  volumen: number;
  /** Valores distintos en la dimensión relevante */
  cardinalidad: number;
  /**
   * Fracción del espacio total cubierta (0–1).
   * Para Horaria: porHora.length / 24.
   * Para TemporalBasica (heatmap): porDiaSemana.length / 7.
   * Para las demás: 1 (cobertura no aplica o no es computable sin denominador fijo).
   */
  cobertura: number;
  /**
   * Fracción de registros con valor no nulo en la columna principal (0–1).
   * Tomado de calidadDataset.pctSin* invertido.
   * 1 cuando el dato no está disponible (Cobertura, Programacion).
   */
  fillRate: number;
  /** Explicación pre-computada; null cuando utilizable=true. */
  razonInutil: string | null;
}

/**
 * Mapa de calidad analítica por capacidad.
 * Partial porque no todas las capacidades tienen calidad computable
 * (fantasmas, capacidades sin aggregate definido).
 * Solo capacidades con consumidores reales en Dashboard.tsx tienen entrada.
 */
export type CalidadAnaliticaDataset = Partial<Record<NombreCapacidad, CalidadCapacidad>>;

// ── Input lightweight (evita importar DatosDashboard → circular) ──────────────

/**
 * Subconjunto de DatosDashboard necesario para calcular calidad.
 * DatosDashboard satisface esta interfaz por structural typing — no hace falta
 * importarlo. Cualquier cambio en DatosDashboard que rompa esta interfaz
 * producirá un error de TypeScript en la llamada de parsearExcel().
 */
export interface InputCalidad {
  porMotivo: { nombre: string; cantidad: number }[];
  porHora: unknown[];
  porDiaSemana: unknown[];
  porLinea: unknown[];
  porCalle1Ranking: { nombre: string; cantidad: number }[];
  porTiempoRespuestaArea: unknown[];
  tiempoRespuestaPorMotivo: unknown[];
  meses: string[];
  calidadDataset: {
    pctSinCategoria: number;
    pctSinUbicacion: number;
    pctSinHora: number;
    pctSinResolucion: number;
  };
  crucesCronicos: unknown[];
  indiceFragilidad: unknown[];
}

// ── Constantes de umbral ──────────────────────────────────────────────────────

/**
 * Fill-rate mínimo para que Estado sea utilizable.
 * Debe coincidir con el umbral del legacy flag tieneColumnaStatus en excelParser.ts:
 * ese flag se suprime cuando < 5% de los registros tienen valor en la columna status.
 * Valor 0.05 garantiza equivalencia exacta durante la migración.
 *
 * NOTA: elevar este umbral (ej. a 0.60) sería una mejora posterior independiente,
 * no parte de la migración. No hacerlo acá sin actualizar el flag legacy primero.
 */
const FILL_RATE_MIN_ESTADO = 0.05;

// ── Helpers internos ──────────────────────────────────────────────────────────

function hacer(
  volumen: number,
  cardinalidad: number,
  cobertura: number,
  fillRate: number,
  utilizable: boolean,
  razonInutil: string,
): CalidadCapacidad {
  return {
    utilizable,
    volumen,
    cardinalidad,
    cobertura,
    fillRate,
    razonInutil: utilizable ? null : razonInutil,
  };
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Calcula la calidad analítica del dataset a partir de sus aggregates.
 *
 * CONTRATO:
 *   - Recibe solo aggregates del dataset COMPLETO (no filtrado por UI).
 *   - No lee filas originales ni ejecuta nuevos loops sobre solicitudes[].
 *   - Es una función pura: mismo input → mismo output.
 *   - Llamar una sola vez en parsearExcel(), inmediatamente después de
 *     derivarCapacidades(). El resultado es estático para ese dataset.
 */
export function calcularCalidad(datos: InputCalidad): CalidadAnaliticaDataset {
  const resultado: CalidadAnaliticaDataset = {};

  // ── TemporalBasica ──────────────────────────────────────────────────────────
  const nMeses = datos.meses.length;
  const nDias = datos.porDiaSemana.length;
  resultado.TemporalBasica = hacer(
    nMeses,
    nMeses,
    nDias / 7,
    1, // pctSinFecha no está en InputCalidad; si activa=true, fill-rate es aceptable
    nMeses >= 1,
    "Dataset sin meses detectados",
  );

  // ── Horaria ─────────────────────────────────────────────────────────────────
  const nHoras = datos.porHora.length;
  const fillHora = 1 - datos.calidadDataset.pctSinHora;
  resultado.Horaria = hacer(
    nHoras,
    nHoras,
    nHoras / 24,
    fillHora,
    nHoras >= 1,
    "Sin registros con hora válida",
  );

  // ── Categoria ───────────────────────────────────────────────────────────────
  const nMotivos = datos.porMotivo.length;
  const fillCategoria = 1 - datos.calidadDataset.pctSinCategoria;
  resultado.Categoria = hacer(
    nMotivos,
    nMotivos,
    1,
    fillCategoria,
    nMotivos >= 1,
    "Sin categorías detectadas",
  );

  // ── Cobertura ───────────────────────────────────────────────────────────────
  const nLineas = datos.porLinea.length;
  resultado.Cobertura = hacer(
    nLineas,
    nLineas,
    1,
    1, // pctSinLinea no disponible en calidadDataset
    nLineas >= 1,
    "Sin líneas de cobertura detectadas",
  );

  // ── GeograficaCalles ────────────────────────────────────────────────────────
  const nCalles = datos.porCalle1Ranking.length;
  const fillUbicacion = 1 - datos.calidadDataset.pctSinUbicacion;
  resultado.GeograficaCalles = hacer(
    nCalles,
    nCalles,
    1,
    fillUbicacion,
    nCalles >= 1,
    "Sin calles detectadas",
  );

  // ── Estado ──────────────────────────────────────────────────────────────────
  // Fill-rate como único criterio: la columna puede existir (activa=true)
  // pero ser inutilizable por baja completitud.
  const fillEstado = 1 - datos.calidadDataset.pctSinResolucion;
  const estadoUtilizable = fillEstado >= FILL_RATE_MIN_ESTADO;
  resultado.Estado = hacer(
    0, // no hay aggregate de volumen directo para Estado
    0,
    1,
    fillEstado,
    estadoUtilizable,
    `Fill-rate insuficiente: ${Math.round(fillEstado * 100)}% < ${Math.round(FILL_RATE_MIN_ESTADO * 100)}% mínimo`,
  );

  // ── TiempoRespuesta ─────────────────────────────────────────────────────────
  const nTRArea = datos.porTiempoRespuestaArea.length;
  const nTRMotivo = datos.tiempoRespuestaPorMotivo.length;
  resultado.TiempoRespuesta = hacer(
    nTRArea + nTRMotivo,
    Math.max(nTRArea, nTRMotivo),
    1,
    1,
    nTRArea >= 1 || nTRMotivo >= 1,
    "Sin datos de tiempo de respuesta suficientes",
  );

  // ── Recurrencia ─────────────────────────────────────────────────────────────
  const nCruces = datos.crucesCronicos.length;
  resultado.Recurrencia = hacer(
    nCruces, nCruces, 1, 1,
    nCruces >= 1,
    "Sin cruces crónicos detectados (requiere ≥2 meses con recurrencia)",
  );

  // ── Fragilidad ──────────────────────────────────────────────────────────────
  const nFragilidad = datos.indiceFragilidad.length;
  resultado.Fragilidad = hacer(
    nFragilidad, nFragilidad, 1, 1,
    nFragilidad >= 1,
    "Sin zonas de fragilidad detectadas",
  );

  return resultado;
}

// ── Helper de consulta ────────────────────────────────────────────────────────

/**
 * Equivalente a activa() pero para calidad analítica.
 * Devuelve false cuando la capacidad no tiene entrada de calidad (conservador).
 */
export function utilizable(
  calidad: CalidadAnaliticaDataset,
  nombre: NombreCapacidad,
): boolean {
  return calidad[nombre]?.utilizable ?? false;
}
