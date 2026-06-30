import type { DatosDashboard, CruceCronico } from "../excelParser";
import type { Anomalia, Insight, Patron, PerfilColumna } from "./tipos";

/**
 * Algoritmos estadísticos livianos, todos operando sobre series/agregados que
 * DatosDashboard ya calculó (porMes, distribucionesCategoricas, crucesCronicos, etc.).
 * Ninguno vuelve a recorrer `solicitudes`/`registros` fila por fila.
 */

// ── Entropía / concentración por columna ────────────────────────────────────

export function calcularEntropiaNormalizada(distribucion: { cantidad: number }[]): number {
  const total = distribucion.reduce((acc, d) => acc + d.cantidad, 0);
  if (total === 0 || distribucion.length <= 1) return 0;
  const entropia = -distribucion.reduce((acc, d) => {
    if (d.cantidad === 0) return acc;
    const p = d.cantidad / total;
    return acc + p * Math.log2(p);
  }, 0);
  const maxEntropia = Math.log2(distribucion.length);
  return maxEntropia > 0 ? Math.round((entropia / maxEntropia) * 100) / 100 : 0;
}

/** % acumulado de las `n` categorías más frecuentes de una distribución. */
export function calcularTopNPct(distribucion: { cantidad: number }[], n: number): number {
  const total = distribucion.reduce((acc, d) => acc + d.cantidad, 0);
  if (total === 0) return 0;
  const topN = [...distribucion.map((d) => d.cantidad)]
    .sort((a, b) => b - a)
    .slice(0, n)
    .reduce((acc, v) => acc + v, 0);
  return Math.round((topN / total) * 100);
}

export function calcularTop1Pct(distribucion: { cantidad: number }[]): number {
  return calcularTopNPct(distribucion, 1);
}

// ── Insight 1: concentración excesiva en una columna categórica ─────────────

export function detectarConcentracion(perfilColumnas: PerfilColumna[]): Insight[] {
  return perfilColumnas
    .filter((c) => c.tipo === "categorica" && c.totalRegistros >= 10 && c.top1Pct >= 40)
    .map((c) => ({
      tipo: "concentracion" as const,
      severidad: c.top1Pct >= 60 ? ("critico" as const) : ("atencion" as const),
      texto: `La columna "${c.nombre}" está dominada por un solo valor (${c.top1Pct}% del total)`,
      detalle:
        c.top1Pct >= 60
          ? "Riesgo de dependencia operativa o problema de clasificación."
          : "Evaluar si conviene desagregar esta categoría.",
      columna: c.nombre,
      valor: c.top1Pct,
    }));
}

// ── Insight 2: cambios significativos respecto al promedio reciente ─────────

export function detectarCambiosSignificativos(
  porMes: { mes: string; cantidad: number }[]
): Insight[] {
  if (porMes.length < 4) return [];
  const ultimo = porMes[porMes.length - 1];
  const referencia = porMes.slice(-4, -1);
  const promedio = referencia.reduce((s, m) => s + m.cantidad, 0) / referencia.length;
  if (promedio === 0) return [];
  const deltaPct = Math.round(((ultimo.cantidad - promedio) / promedio) * 100);
  if (Math.abs(deltaPct) < 20) return [];
  return [
    {
      tipo: "tendencia",
      severidad: Math.abs(deltaPct) >= 50 ? "critico" : "atencion",
      texto: `${deltaPct > 0 ? "Incremento" : "Caída"} del ${Math.abs(deltaPct)}% en ${ultimo.mes} respecto al promedio de los últimos ${referencia.length} meses`,
      valor: deltaPct,
    },
  ];
}

// ── Anomalías: outliers por IQR sobre cualquier serie {etiqueta, valor} ─────

export function detectarOutliers(
  serie: { etiqueta: string; valor: number }[],
  nombreColumna: string
): Anomalia[] {
  if (serie.length < 5) return [];
  const valores = [...serie.map((s) => s.valor)].sort((a, b) => a - b);
  const q1 = valores[Math.floor(valores.length * 0.25)];
  const q3 = valores[Math.floor(valores.length * 0.75)];
  const iqr = q3 - q1;
  if (iqr === 0) return [];
  const limiteSuperior = q3 + 1.5 * iqr;
  return serie
    .filter((s) => s.valor > limiteSuperior)
    .map((s) => ({
      columna: nombreColumna,
      etiqueta: s.etiqueta,
      valorObservado: s.valor,
      valorEsperado: Math.round((q1 + q3) / 2),
      desviacion: Math.round(((s.valor - limiteSuperior) / iqr) * 100) / 100,
      texto: `"${s.etiqueta}" tiene un valor atípicamente alto (${s.valor}) en "${nombreColumna}"`,
    }));
}

/**
 * Mes de mayor volumen vs. promedio del resto de los meses. Es un detector aparte de
 * detectarOutliers/IQR a propósito: con series de pocos meses (típico en datasets
 * municipales, 3-4 meses) el método IQR no es confiable — el outlier queda "escondido"
 * dentro de su propio cuartil cuando hay tan pocos puntos. Esta es una comparación
 * directa (ratio simple), apta para series cortas, sin duplicar el cálculo de
 * detectarOutliers (sirven para casos distintos: aquí no exigimos mínimo de puntos
 * más allá de 2 meses, porque la comparación es contra "el resto", no contra cuartiles).
 */
export function detectarPicoHistorico(
  porMes: { mes: string; cantidad: number }[]
): Anomalia | null {
  if (porMes.length < 2) return null;
  const pico = [...porMes].sort((a, b) => b.cantidad - a.cantidad)[0];
  const resto = porMes.filter((m) => m.mes !== pico.mes);
  const promedioResto = resto.reduce((a, m) => a + m.cantidad, 0) / resto.length;
  if (promedioResto === 0 || pico.cantidad <= promedioResto * 1.5) return null;
  return {
    columna: "Volumen mensual",
    etiqueta: pico.mes,
    valorObservado: pico.cantidad,
    valorEsperado: Math.round(promedioResto),
    desviacion: Math.round(((pico.cantidad - promedioResto) / promedioResto) * 100) / 100,
    texto: `Pico de demanda en ${pico.mes}: ${pico.cantidad} registros (${Math.round(((pico.cantidad - promedioResto) / promedioResto) * 100)}% sobre el promedio del resto)`,
  };
}

/** Corre detectarOutliers sobre las series temporales/rankings ya agregados en DatosDashboard. */
export function detectarTodasAnomalias(datos: DatosDashboard): Anomalia[] {
  return [
    ...detectarOutliers(
      datos.porMes.map((m) => ({ etiqueta: m.mes, valor: m.cantidad })),
      "Volumen mensual"
    ),
    ...detectarOutliers(
      datos.porHora.map((h) => ({ etiqueta: `${String(h.hora).padStart(2, "0")}h`, valor: h.cantidad })),
      "Distribución horaria"
    ),
    ...detectarOutliers(
      datos.porDiaSemana.map((d) => ({ etiqueta: d.dia, valor: d.cantidad })),
      "Día de la semana"
    ),
    ...detectarOutliers(
      datos.porCalle1Ranking.map((c) => ({ etiqueta: c.nombre, valor: c.cantidad })),
      "Ranking de calles",
    ),
  ];
}

// ── Patrones: adapter sobre crucesCronicos ya calculado por excelParser ─────

export function adaptarCrucesCronicosAPatrones(crucesCronicos: CruceCronico[]): Patron[] {
  return crucesCronicos.slice(0, 5).map((c) => ({
    tipo: "recurrencia" as const,
    descripcion: `"${c.motivo}" se repite en ${c.interseccion} durante ${c.meses.length} meses`,
    entidades: [c.motivo, c.interseccion],
    fuerza: Math.min(1, c.meses.length / 6),
  }));
}

// ── Características agregadas (huella del dataset) ──────────────────────────

export function calcularVolatilidad(porMes: { cantidad: number }[]): number {
  if (porMes.length < 2) return 0;
  const valores = porMes.map((m) => m.cantidad);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  if (media === 0) return 0;
  const varianza = valores.reduce((a, v) => a + (v - media) ** 2, 0) / valores.length;
  const cv = Math.sqrt(varianza) / media;
  return Math.round(Math.min(1, cv) * 100) / 100;
}

export function calcularTendenciaGeneral(
  porMes: { cantidad: number }[]
): "creciente" | "estable" | "decreciente" | undefined {
  if (porMes.length < 2) return undefined;
  const mitad = Math.floor(porMes.length / 2) || 1;
  const primeraMitad = porMes.slice(0, mitad);
  const segundaMitad = porMes.slice(mitad);
  if (segundaMitad.length === 0) return undefined;
  const promA = primeraMitad.reduce((a, m) => a + m.cantidad, 0) / primeraMitad.length;
  const promB = segundaMitad.reduce((a, m) => a + m.cantidad, 0) / segundaMitad.length;
  if (promA === 0) return undefined;
  const deltaPct = (promB - promA) / promA;
  if (deltaPct > 0.15) return "creciente";
  if (deltaPct < -0.15) return "decreciente";
  return "estable";
}

export function calcularConfianzaAnalitica(
  totalSolicitudes: number,
  cantidadMeses: number,
  riquezaCategorica: number
): number {
  const volumenScore = Math.min(1, totalSolicitudes / 100);
  const coberturaScore = Math.min(1, cantidadMeses / 3);
  const diversidadScore = riquezaCategorica;
  return Math.round((volumenScore * 0.5 + coberturaScore * 0.3 + diversidadScore * 0.2) * 100) / 100;
}
