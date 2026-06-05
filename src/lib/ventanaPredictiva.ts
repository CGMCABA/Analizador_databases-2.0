const MESES_MAP: Record<string, number> = {
  Enero: 0, Febrero: 1, Marzo: 2, Abril: 3, Mayo: 4, Junio: 5,
  Julio: 6, Agosto: 7, Septiembre: 8, Octubre: 9, Noviembre: 10, Diciembre: 11,
};

const DIAS_SEMANA_JS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export type TurnoNombre = "mañana" | "tarde" | "noche";

export interface DiaProyectado {
  fecha: string;
  diaSemana: string;
  volumenEsperado: number;
  turnoMayor: TurnoNombre;
  pctMañana: number;
  pctTarde: number;
  pctNoche: number;
  esPico: boolean;
  motivoPredominante: string;
}

export interface VentanaPredictivaResultado {
  dias: DiaProyectado[];
  diasMayorRiesgo: DiaProyectado[];
  promedioHistoricoDiario: number;
  tendencia: "creciente" | "estable" | "decreciente";
  pendienteMensual: number;
  hayAlertaPico: boolean;
  datosInsuficientes: boolean;
}

function regresionLineal(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0] };
  const sumX = (n * (n - 1)) / 2;
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = ys.reduce((acc, y, i) => acc + i * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function parsearPrimerDiaMes(etiquetaMes: string): Date | null {
  const partes = etiquetaMes.trim().split(/\s+/);
  if (partes.length < 2) return null;
  const mes = MESES_MAP[partes[0]];
  const anio = parseInt(partes[1], 10);
  if (mes === undefined || isNaN(anio)) return null;
  return new Date(anio, mes, 1);
}

function formatearFecha(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function calcularPesosDia(
  porDiaSemana: { dia: string; cantidad: number }[]
): Map<string, number> {
  const total = porDiaSemana.reduce((a, b) => a + b.cantidad, 0);
  const n = porDiaSemana.length;
  if (total === 0 || n === 0) {
    const m = new Map<string, number>();
    DIAS_SEMANA_JS.forEach((d) => m.set(d, 1));
    return m;
  }
  const promedio = total / n;
  const m = new Map<string, number>();
  for (const { dia, cantidad } of porDiaSemana) {
    m.set(dia, cantidad / promedio);
  }
  DIAS_SEMANA_JS.forEach((d) => { if (!m.has(d)) m.set(d, 1); });
  return m;
}

function calcularDistribucionTurnos(
  porHora: { hora: number; cantidad: number }[]
): { pctMañana: number; pctTarde: number; pctNoche: number; turnoMayor: TurnoNombre } {
  let manana = 0, tarde = 0, noche = 0;
  for (const { hora, cantidad } of porHora) {
    if (hora >= 6 && hora < 14) manana += cantidad;
    else if (hora >= 14 && hora < 22) tarde += cantidad;
    else noche += cantidad;
  }
  const total = manana + tarde + noche;
  if (total === 0) return { pctMañana: 33, pctTarde: 33, pctNoche: 34, turnoMayor: "tarde" };
  const pctMañana = Math.round((manana / total) * 100);
  const pctTarde = Math.round((tarde / total) * 100);
  const pctNoche = 100 - pctMañana - pctTarde;
  let turnoMayor: TurnoNombre = "tarde";
  if (manana >= tarde && manana >= noche) turnoMayor = "mañana";
  else if (noche > tarde) turnoMayor = "noche";
  return { pctMañana, pctTarde, pctNoche, turnoMayor };
}

/**
 * Proyecta la demanda operativa para los próximos 14 días.
 *
 * @param porMes - Histórico de volumen mensual
 * @param porDiaSemana - Distribución histórica por día de semana
 * @param porHora - Distribución histórica por hora
 * @param porMotivo - Categorías ordenadas por frecuencia
 * @param fechaBase - Fecha de anclaje (default: hoy). La proyección cubre fechaBase + 14 días.
 */
export function calcularVentanaPredictiva(
  porMes: { mes: string; cantidad: number }[],
  porDiaSemana: { dia: string; cantidad: number }[],
  porHora: { hora: number; cantidad: number }[],
  porMotivo: { nombre: string; cantidad: number }[],
  fechaBase?: Date
): VentanaPredictivaResultado {
  // Se necesitan al menos 3 meses para proyección confiable
  const datosInsuficientes = porMes.length < 3;

  const DIAS_PROYECCION = 14;

  // Promedio histórico diario aproximado (30 días / mes)
  const totalHistorico = porMes.reduce((a, b) => a + b.cantidad, 0);
  const promedioHistoricoDiario = porMes.length > 0
    ? Math.round(totalHistorico / (porMes.length * 30))
    : 0;

  // Regresión lineal sobre los volúmenes mensuales
  const ys = porMes.map((m) => m.cantidad);
  const { slope, intercept } = regresionLineal(ys);
  const pendienteMensual = Math.round(slope);

  let tendencia: "creciente" | "estable" | "decreciente";
  const pctSlope = ys.length > 0 && intercept > 0 ? (slope / intercept) * 100 : 0;
  if (pctSlope > 5) tendencia = "creciente";
  else if (pctSlope < -5) tendencia = "decreciente";
  else tendencia = "estable";

  // Primer día del último mes registrado (usado para calcular el offset de proyección)
  const ultimoMesDate = porMes.length > 0
    ? parsearPrimerDiaMes(porMes[porMes.length - 1].mes)
    : null;

  // Ancla de la proyección: fechaBase (por defecto = hoy)
  const ancla = fechaBase ? new Date(fechaBase) : new Date();
  ancla.setHours(0, 0, 0, 0);

  // Pesos por día de semana
  const pesosDia = calcularPesosDia(porDiaSemana);

  // Distribución de turnos (constante para todos los días proyectados)
  const distTurnos = calcularDistribucionTurnos(porHora);

  // Motivo predominante (el más frecuente históricamente)
  const motivoPredominante = porMotivo.length > 0 ? porMotivo[0].nombre : "";

  const nMeses = ys.length;
  const dias: DiaProyectado[] = [];

  for (let i = 0; i < DIAS_PROYECCION; i++) {
    const fecha = new Date(ancla);
    fecha.setDate(ancla.getDate() + i);

    // Calcular cuántos meses (approx. 30 días) han pasado desde el inicio del último mes registrado
    let indiceProyectado: number;
    if (ultimoMesDate) {
      const diasDesdeUltimoMes =
        (fecha.getTime() - ultimoMesDate.getTime()) / (1000 * 60 * 60 * 24);
      // indice relativo al último mes registrado (que tiene índice nMeses - 1)
      indiceProyectado = (nMeses - 1) + diasDesdeUltimoMes / 30;
    } else {
      indiceProyectado = nMeses + i / 30;
    }

    const volumenMensualProyectado = Math.max(0, intercept + slope * indiceProyectado);
    const volumenDiarioBase = volumenMensualProyectado / 30;

    const diaSemana = DIAS_SEMANA_JS[fecha.getDay()];
    const factor = pesosDia.get(diaSemana) ?? 1;
    const volumenEsperado = Math.max(0, Math.round(volumenDiarioBase * factor));

    const esPico = promedioHistoricoDiario > 0
      ? volumenEsperado > promedioHistoricoDiario * 1.2
      : false;

    dias.push({
      fecha: formatearFecha(fecha),
      diaSemana,
      volumenEsperado,
      turnoMayor: distTurnos.turnoMayor,
      pctMañana: distTurnos.pctMañana,
      pctTarde: distTurnos.pctTarde,
      pctNoche: distTurnos.pctNoche,
      esPico,
      motivoPredominante,
    });
  }

  const diasMayorRiesgo = [...dias]
    .sort((a, b) => b.volumenEsperado - a.volumenEsperado)
    .slice(0, 3);

  const hayAlertaPico = dias.some((d) => d.esPico);

  return {
    dias,
    diasMayorRiesgo,
    promedioHistoricoDiario,
    tendencia,
    pendienteMensual,
    hayAlertaPico,
    datosInsuficientes,
  };
}
