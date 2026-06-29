import type { Solicitud, ItemResolucion, CruceAutomatico } from "./excelParser";

/**
 * Funciones de agregación puras, compartidas entre excelParser.ts (parseo inicial)
 * y filtrarDatos.ts (recálculo al filtrar por mes). Toman Solicitud[] como entrada
 * y devuelven exactamente la misma forma de salida en ambos casos — moverlas aquí
 * elimina la duplicación de ~300 líneas que existía entre los dos archivos.
 */

export const ORDEN_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function esResuelta(resuelto: string, resolucion: string): boolean {
  return resuelto.toUpperCase() === "SI" || resolucion.toUpperCase() === "SI";
}

export function normalizarCalle(c: string): string {
  return c.trim().toUpperCase().replace(/\s+/g, " ");
}

export function canonicalizarInterseccion(c1: string, c2: string): string {
  const a = normalizarCalle(c1);
  const b = normalizarCalle(c2);
  if (!a || !b) return "";
  const [x, y] = [a, b].sort();
  return `${x} y ${y}`;
}

export function parsearDiaSemana(fecha: string): string | null {
  if (!fecha) return null;
  const partes = fecha.split("/");
  if (partes.length !== 3) return null;
  const d = Number(partes[0]);
  const m = Number(partes[1]);
  const y = Number(partes[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return DIAS_SEMANA[date.getDay()];
}

export function mapToSortedArray(m: Map<string, number>): { nombre: string; cantidad: number }[] {
  return Array.from(m.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function calcularResolucion(
  lista: Solicitud[],
  key: "motivo" | "areaAsignada"
): ItemResolucion[] {
  const map = new Map<string, { resueltas: number; total: number }>();
  lista.forEach((s) => {
    const nombre = s[key];
    const actual = map.get(nombre) ?? { resueltas: 0, total: 0 };
    map.set(nombre, {
      total: actual.total + 1,
      resueltas: actual.resueltas + (esResuelta(s.resuelto, s.resolucion) ? 1 : 0),
    });
  });
  return Array.from(map.entries())
    .map(([nombre, { total, resueltas }]) => ({
      nombre,
      total,
      resueltas,
      noResueltas: total - resueltas,
      tasa: total > 0 ? Math.round((resueltas / total) * 100) : 0,
    }))
    .filter((item) => item.total >= 2)
    .sort((a, b) => b.tasa - a.tasa);
}

export const BUCKETS_TRI = [
  { rango: "0–5 min", min: 0, max: 5 },
  { rango: "6–15 min", min: 6, max: 15 },
  { rango: "16–30 min", min: 16, max: 30 },
  { rango: "31–60 min", min: 31, max: 60 },
  { rango: "1–2 horas", min: 61, max: 120 },
  { rango: "> 2 horas", min: 121, max: Infinity },
];

export const FALSO_POSITIVO_PATRONES: { patron: RegExp; etiqueta: string }[] = [
  { patron: /no\s+se\s+visuali[zs]/i, etiqueta: "No se visualiza" },
  { patron: /no\s+(se\s+)?exist[eé]/i, etiqueta: "No existe / no existe el evento" },
  { patron: /no\s+se\s+consta[t]/i, etiqueta: "No se constata" },
  { patron: /suceso\s+repeti/i, etiqueta: "Suceso repetido" },
  { patron: /falsa\s+alarma/i, etiqueta: "Falsa alarma" },
  { patron: /sin\s+novedad\b/i, etiqueta: "Sin novedad" },
  { patron: /sin\s+presencia\b/i, etiqueta: "Sin presencia" },
  { patron: /ya\s+(estaba?\s+)?resuelto/i, etiqueta: "Ya resuelto" },
  { patron: /no\s+corresponde/i, etiqueta: "No corresponde" },
  { patron: /no\s+se\s+observa/i, etiqueta: "No se observa" },
];

export function detectarFalsoPositivo(descripcion: string, resolucion: string): string | null {
  const texto = `${descripcion} ${resolucion}`;
  for (const { patron, etiqueta } of FALSO_POSITIVO_PATRONES) {
    if (patron.test(texto)) return etiqueta;
  }
  return null;
}

export function calcularTiposFalsosPositivos(
  solicitudes: Solicitud[]
): { nombre: string; cantidad: number }[] {
  const map = new Map<string, number>();
  for (const s of solicitudes) {
    if (!s.esFalsoPositivo) continue;
    const etiqueta = detectarFalsoPositivo(s.descripcion, s.resolucion);
    if (etiqueta) map.set(etiqueta, (map.get(etiqueta) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function calcularPorMotivo(solicitudes: Solicitud[]): { nombre: string; cantidad: number }[] {
  const motivoMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    if (!s.motivo) return;
    motivoMap.set(s.motivo, (motivoMap.get(s.motivo) ?? 0) + 1);
  });
  return mapToSortedArray(motivoMap);
}

export function calcularPorArea(solicitudes: Solicitud[]): { nombre: string; cantidad: number }[] {
  const areaMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    areaMap.set(s.areaAsignada, (areaMap.get(s.areaAsignada) ?? 0) + 1);
  });
  return mapToSortedArray(areaMap);
}

export function calcularPorLinea(solicitudes: Solicitud[]) {
  const lineaMap = new Map<
    string,
    { cantidad: number; resueltas: number; motivos: Map<string, number>; areas: Map<string, number> }
  >();
  solicitudes.forEach((s) => {
    const lin = s.linea.trim();
    if (!lin) return;
    const actual = lineaMap.get(lin) ?? {
      cantidad: 0,
      resueltas: 0,
      motivos: new Map<string, number>(),
      areas: new Map<string, number>(),
    };
    actual.motivos.set(s.motivo, (actual.motivos.get(s.motivo) ?? 0) + 1);
    actual.areas.set(s.areaAsignada, (actual.areas.get(s.areaAsignada) ?? 0) + 1);
    lineaMap.set(lin, {
      cantidad: actual.cantidad + 1,
      resueltas: actual.resueltas + (esResuelta(s.resuelto, s.resolucion) ? 1 : 0),
      motivos: actual.motivos,
      areas: actual.areas,
    });
  });
  return Array.from(lineaMap.entries())
    .map(([linea, { cantidad, resueltas, motivos, areas }]) => ({
      linea,
      cantidad,
      resueltas,
      tasa: cantidad > 0 ? Math.round((resueltas / cantidad) * 100) : 0,
      porMotivo: mapToSortedArray(motivos),
      porArea: mapToSortedArray(areas),
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function calcularPorCalle(solicitudes: Solicitud[]) {
  const calleMap = new Map<
    string,
    { cantidad: number; motivos: Map<string, number>; areas: Map<string, number> }
  >();
  solicitudes.forEach((s) => {
    [s.calle1, s.calle2, s.calle3].forEach((calle) => {
      const norm = normalizarCalle(calle);
      if (!norm) return;
      const actual = calleMap.get(norm) ?? {
        cantidad: 0,
        motivos: new Map<string, number>(),
        areas: new Map<string, number>(),
      };
      actual.motivos.set(s.motivo, (actual.motivos.get(s.motivo) ?? 0) + 1);
      actual.areas.set(s.areaAsignada, (actual.areas.get(s.areaAsignada) ?? 0) + 1);
      calleMap.set(norm, { cantidad: actual.cantidad + 1, motivos: actual.motivos, areas: actual.areas });
    });
  });
  return Array.from(calleMap.entries())
    .map(([nombre, { cantidad, motivos, areas }]) => ({
      nombre,
      cantidad,
      porMotivo: mapToSortedArray(motivos),
      porArea: mapToSortedArray(areas),
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 30);
}

export function calcularPorSegmento(solicitudes: Solicitud[]) {
  const segmentoMap = new Map<
    string,
    { calle1: string; calle2: string; calle3: string; cantidad: number; motivos: Map<string, number> }
  >();
  solicitudes.forEach((s) => {
    const c1 = normalizarCalle(s.calle1);
    if (!c1) return;
    const c2 = normalizarCalle(s.calle2);
    const c3 = normalizarCalle(s.calle3);
    const key = `${c1}|${c2}|${c3}`;
    const actual = segmentoMap.get(key) ?? {
      calle1: c1,
      calle2: c2,
      calle3: c3,
      cantidad: 0,
      motivos: new Map<string, number>(),
    };
    actual.motivos.set(s.motivo, (actual.motivos.get(s.motivo) ?? 0) + 1);
    segmentoMap.set(key, { ...actual, cantidad: actual.cantidad + 1 });
  });

  const calleTotalMap = new Map<string, number>();
  segmentoMap.forEach((v) => {
    calleTotalMap.set(v.calle1, (calleTotalMap.get(v.calle1) ?? 0) + v.cantidad);
  });

  return Array.from(segmentoMap.values())
    .map(({ calle1, calle2, calle3, cantidad, motivos }) => ({
      calle1,
      calle2,
      calle3,
      cantidad,
      calleTotal: calleTotalMap.get(calle1) ?? cantidad,
      motivos: mapToSortedArray(motivos),
    }))
    .sort((a, b) => (b.calleTotal !== a.calleTotal ? b.calleTotal - a.calleTotal : b.cantidad - a.cantidad))
    .slice(0, 100);
}

export function calcularPorCalle1Ranking(solicitudes: Solicitud[]): { nombre: string; cantidad: number }[] {
  const calle1RankMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    const norm = normalizarCalle(s.calle1);
    if (!norm) return;
    calle1RankMap.set(norm, (calle1RankMap.get(norm) ?? 0) + 1);
  });
  return Array.from(calle1RankMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 50);
}

export function calcularPorDiaSemana(solicitudes: Solicitud[]) {
  const diaSemanaMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    const dia = parsearDiaSemana(s.fecha);
    if (!dia) return;
    diaSemanaMap.set(dia, (diaSemanaMap.get(dia) ?? 0) + 1);
  });
  const porDiaSemana = ORDEN_DIAS.filter((d) => diaSemanaMap.has(d)).map((d) => ({
    dia: d,
    cantidad: diaSemanaMap.get(d)!,
  }));
  return { porDiaSemana, diaSemanaMap };
}

export function calcularPorHora(solicitudes: Solicitud[]): { hora: number; cantidad: number }[] {
  const horaMap = new Map<number, number>();
  solicitudes.forEach((s) => {
    if (s.hora === null || s.esProgramado === true) return;
    horaMap.set(s.hora, (horaMap.get(s.hora) ?? 0) + 1);
  });
  return Array.from(horaMap.entries())
    .map(([hora, cantidad]) => ({ hora, cantidad }))
    .sort((a, b) => a.hora - b.hora);
}

export function calcularPorInterseccion(solicitudes: Solicitud[]): { nombre: string; cantidad: number }[] {
  const interseccionMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    const nombre = canonicalizarInterseccion(s.calle1, s.calle2);
    if (!nombre) return;
    interseccionMap.set(nombre, (interseccionMap.get(nombre) ?? 0) + 1);
  });
  return Array.from(interseccionMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 20);
}

export function calcularPorTiempoRespuestaArea(
  solicitudes: Solicitud[]
): { area: string; promedio: number; cantidad: number }[] {
  const tiempoAreaMap = new Map<string, { total: number; count: number }>();
  solicitudes
    .filter((s) => s.tiempoRespuestaMin > 0)
    .forEach((s) => {
      const actual = tiempoAreaMap.get(s.areaAsignada) ?? { total: 0, count: 0 };
      tiempoAreaMap.set(s.areaAsignada, { total: actual.total + s.tiempoRespuestaMin, count: actual.count + 1 });
    });
  return Array.from(tiempoAreaMap.entries())
    .map(([area, { total, count }]) => ({ area, promedio: Math.round(total / count), cantidad: count }))
    .sort((a, b) => a.promedio - b.promedio);
}

export function calcularTiempoRespuestaPorMotivo(
  solicitudes: Solicitud[]
): { area: string; promedio: number; cantidad: number }[] {
  const tiempoMotivoMap = new Map<string, { total: number; count: number }>();
  solicitudes
    .filter((s) => s.tiempoRespuestaMin > 0 && s.motivo && s.motivo !== "Sin datos")
    .forEach((s) => {
      const actual = tiempoMotivoMap.get(s.motivo) ?? { total: 0, count: 0 };
      tiempoMotivoMap.set(s.motivo, { total: actual.total + s.tiempoRespuestaMin, count: actual.count + 1 });
    });
  return Array.from(tiempoMotivoMap.entries())
    .map(([area, { total, count }]) => ({ area, promedio: Math.round(total / count), cantidad: count }))
    .sort((a, b) => a.promedio - b.promedio);
}

export interface TiempoRespuestaInterno {
  promedio: number;
  porMotivo: { area: string; promedio: number; cantidad: number }[];
  porArea: { area: string; promedio: number; cantidad: number }[];
  distribucion: { rango: string; cantidad: number }[];
}

export function calcularTiempoRespuestaInterno(solicitudes: Solicitud[]): TiempoRespuestaInterno {
  const conTRI = solicitudes.filter((s) => s.tiempoRespuestaInternoMin !== null);

  const promedio =
    conTRI.length > 0
      ? Math.round(conTRI.reduce((acc, s) => acc + (s.tiempoRespuestaInternoMin ?? 0), 0) / conTRI.length)
      : 0;

  const triPorMotivoMap = new Map<string, { suma: number; n: number }>();
  for (const s of conTRI) {
    const key = s.motivo || "Sin datos";
    const prev = triPorMotivoMap.get(key) ?? { suma: 0, n: 0 };
    triPorMotivoMap.set(key, { suma: prev.suma + (s.tiempoRespuestaInternoMin ?? 0), n: prev.n + 1 });
  }
  const porMotivo = Array.from(triPorMotivoMap.entries())
    .filter(([, v]) => v.n >= 2)
    .map(([area, v]) => ({ area, promedio: Math.round(v.suma / v.n), cantidad: v.n }))
    .sort((a, b) => a.promedio - b.promedio);

  const triPorAreaMap = new Map<string, { suma: number; n: number }>();
  for (const s of conTRI) {
    const key = s.areaAsignada || "Sin área";
    const prev = triPorAreaMap.get(key) ?? { suma: 0, n: 0 };
    triPorAreaMap.set(key, { suma: prev.suma + (s.tiempoRespuestaInternoMin ?? 0), n: prev.n + 1 });
  }
  const porArea = Array.from(triPorAreaMap.entries())
    .filter(([, v]) => v.n >= 2)
    .map(([area, v]) => ({ area, promedio: Math.round(v.suma / v.n), cantidad: v.n }))
    .sort((a, b) => a.promedio - b.promedio);

  const distribucion = BUCKETS_TRI.map((b) => ({
    rango: b.rango,
    cantidad: conTRI.filter((s) => {
      const t = s.tiempoRespuestaInternoMin ?? 0;
      return t >= b.min && t <= b.max;
    }).length,
  })).filter((b) => b.cantidad > 0);

  return { promedio, porMotivo, porArea, distribucion };
}

export function calcularCruceCategoriaHora(
  solicitudes: Solicitud[],
  topCatsCruce: string[],
  titulo: string
): CruceAutomatico | null {
  const porHora = calcularPorHora(solicitudes);
  if (topCatsCruce.length < 2 || porHora.length < 3) return null;

  const horasConDatos = Array.from(
    new Set(solicitudes.filter((s) => s.hora !== null).map((s) => s.hora as number))
  ).sort((a, b) => a - b);
  if (horasConDatos.length < 3) return null;

  const catHoraMap = new Map<string, Map<number, number>>();
  solicitudes.forEach((s) => {
    if (!s.motivo || s.motivo === "Sin datos" || s.hora === null) return;
    if (!topCatsCruce.includes(s.motivo)) return;
    const hm = catHoraMap.get(s.motivo) ?? new Map<number, number>();
    hm.set(s.hora, (hm.get(s.hora) ?? 0) + 1);
    catHoraMap.set(s.motivo, hm);
  });

  return {
    titulo,
    tipo: "categoria_hora",
    filas: topCatsCruce,
    columnas: horasConDatos.map((h) => `${String(h).padStart(2, "0")}h`),
    valores: topCatsCruce.map((cat) => {
      const hm = catHoraMap.get(cat) ?? new Map<number, number>();
      return horasConDatos.map((h) => hm.get(h) ?? 0);
    }),
  };
}

export function calcularCruceCategoriaDia(
  solicitudes: Solicitud[],
  topCatsCruce: string[],
  titulo: string
): CruceAutomatico | null {
  const { porDiaSemana, diaSemanaMap } = calcularPorDiaSemana(solicitudes);
  if (topCatsCruce.length < 2 || porDiaSemana.length < 3) return null;

  const diasConDatos = ORDEN_DIAS.filter((d) => diaSemanaMap.has(d));
  if (diasConDatos.length < 3) return null;

  const catDiaMap = new Map<string, Map<string, number>>();
  solicitudes.forEach((s) => {
    if (!s.motivo || s.motivo === "Sin datos") return;
    if (!topCatsCruce.includes(s.motivo)) return;
    const dia = parsearDiaSemana(s.fecha);
    if (!dia) return;
    const dm = catDiaMap.get(s.motivo) ?? new Map<string, number>();
    dm.set(dia, (dm.get(dia) ?? 0) + 1);
    catDiaMap.set(s.motivo, dm);
  });

  return {
    titulo,
    tipo: "categoria_dia",
    filas: topCatsCruce,
    columnas: diasConDatos,
    valores: topCatsCruce.map((cat) => {
      const dm = catDiaMap.get(cat) ?? new Map<string, number>();
      return diasConDatos.map((d) => dm.get(d) ?? 0);
    }),
  };
}
