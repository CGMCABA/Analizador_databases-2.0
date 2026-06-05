import {
  DatosDashboard,
  Solicitud,
  ItemResolucion,
} from "./excelParser";

function esResuelta(resuelto: string, resolucion: string): boolean {
  return resuelto.toUpperCase() === "SI" || resolucion.toUpperCase() === "SI";
}

function normalizarCalle(c: string): string {
  return c.trim().toUpperCase().replace(/\s+/g, " ");
}

function canonicalizarInterseccion(c1: string, c2: string): string {
  const a = c1.trim().toUpperCase().replace(/\s+/g, " ");
  const b = c2.trim().toUpperCase().replace(/\s+/g, " ");
  if (!a || !b) return "";
  const [x, y] = [a, b].sort();
  return `${x} y ${y}`;
}

const ORDEN_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function parsearDiaSemana(fecha: string): string | null {
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

function mapToSortedArray(m: Map<string, number>): { nombre: string; cantidad: number }[] {
  return Array.from(m.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

function calcularResolucion(lista: Solicitud[], key: "motivo" | "areaAsignada"): ItemResolucion[] {
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

const BUCKETS_TRI = [
  { rango: "0–5 min", min: 0, max: 5 },
  { rango: "6–15 min", min: 6, max: 15 },
  { rango: "16–30 min", min: 16, max: 30 },
  { rango: "31–60 min", min: 31, max: 60 },
  { rango: "1–2 horas", min: 61, max: 120 },
  { rango: "> 2 horas", min: 121, max: Infinity },
];

// Mismos patrones que en excelParser para re-derivar tiposFalsosPositivos
const FALSO_POSITIVO_PATRONES: { patron: RegExp; etiqueta: string }[] = [
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

function derivarTiposFalsosPositivos(
  solicitudes: Solicitud[]
): { nombre: string; cantidad: number }[] {
  const map = new Map<string, number>();
  for (const s of solicitudes) {
    if (!s.esFalsoPositivo) continue;
    const texto = `${s.descripcion} ${s.resolucion}`;
    for (const { patron, etiqueta } of FALSO_POSITIVO_PATRONES) {
      if (patron.test(texto)) {
        map.set(etiqueta, (map.get(etiqueta) ?? 0) + 1);
        break;
      }
    }
  }
  return Array.from(map.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * Devuelve un DatosDashboard con todas las agregaciones re-derivadas
 * desde los solicitudes/registros del mes indicado.
 * Campos de config/schema (flags de tipo, nombres de columna, meses completos,
 * porMes, calidadDataset) se preservan del original para que el header y
 * el panel de calidad sigan mostrando contexto global.
 * crucesCronicos e indiceFragilidad se vacían porque son análisis multi-mes.
 */
export function filtrarDatos(datos: DatosDashboard, mesFiltro: string): DatosDashboard {
  if (!mesFiltro) return datos;

  const solicitudes = datos.solicitudes.filter((s) => s.mes === mesFiltro);
  const registros = datos.registros.filter((r) => r._mes === mesFiltro);

  const totalSolicitudes = solicitudes.length;
  const totalResueltas = solicitudes.filter((s) => esResuelta(s.resuelto, s.resolucion)).length;
  const totalNoResueltas = totalSolicitudes - totalResueltas;
  const tasaResolucion =
    totalSolicitudes > 0 ? Math.round((totalResueltas / totalSolicitudes) * 100) : 0;

  const motivoMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    if (!s.motivo) return;
    motivoMap.set(s.motivo, (motivoMap.get(s.motivo) ?? 0) + 1);
  });
  const porMotivo = Array.from(motivoMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const areaMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    areaMap.set(s.areaAsignada, (areaMap.get(s.areaAsignada) ?? 0) + 1);
  });
  const porArea = Array.from(areaMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const resolucionPorMotivo = calcularResolucion(solicitudes, "motivo");
  const resolucionPorArea = calcularResolucion(solicitudes, "areaAsignada");

  const lineaMap = new Map<string, {
    cantidad: number;
    resueltas: number;
    motivos: Map<string, number>;
    areas: Map<string, number>;
  }>();
  solicitudes.forEach((s) => {
    const lin = s.linea.trim();
    if (!lin) return;
    const actual = lineaMap.get(lin) ?? { cantidad: 0, resueltas: 0, motivos: new Map(), areas: new Map() };
    actual.motivos.set(s.motivo, (actual.motivos.get(s.motivo) ?? 0) + 1);
    actual.areas.set(s.areaAsignada, (actual.areas.get(s.areaAsignada) ?? 0) + 1);
    lineaMap.set(lin, {
      cantidad: actual.cantidad + 1,
      resueltas: actual.resueltas + (esResuelta(s.resuelto, s.resolucion) ? 1 : 0),
      motivos: actual.motivos,
      areas: actual.areas,
    });
  });
  const porLinea = Array.from(lineaMap.entries())
    .map(([linea, { cantidad, resueltas, motivos, areas }]) => ({
      linea, cantidad, resueltas,
      tasa: cantidad > 0 ? Math.round((resueltas / cantidad) * 100) : 0,
      porMotivo: mapToSortedArray(motivos),
      porArea: mapToSortedArray(areas),
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const calleMap = new Map<string, { cantidad: number; motivos: Map<string, number>; areas: Map<string, number> }>();
  solicitudes.forEach((s) => {
    [s.calle1, s.calle2, s.calle3].forEach((calle) => {
      const norm = normalizarCalle(calle);
      if (!norm) return;
      const actual = calleMap.get(norm) ?? { cantidad: 0, motivos: new Map(), areas: new Map() };
      actual.motivos.set(s.motivo, (actual.motivos.get(s.motivo) ?? 0) + 1);
      actual.areas.set(s.areaAsignada, (actual.areas.get(s.areaAsignada) ?? 0) + 1);
      calleMap.set(norm, { cantidad: actual.cantidad + 1, motivos: actual.motivos, areas: actual.areas });
    });
  });
  const porCalle = Array.from(calleMap.entries())
    .map(([nombre, { cantidad, motivos, areas }]) => ({
      nombre, cantidad, porMotivo: mapToSortedArray(motivos), porArea: mapToSortedArray(areas),
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 30);

  const segmentoMap = new Map<string, {
    calle1: string; calle2: string; calle3: string; cantidad: number; motivos: Map<string, number>;
  }>();
  solicitudes.forEach((s) => {
    const c1 = normalizarCalle(s.calle1);
    if (!c1) return;
    const c2 = normalizarCalle(s.calle2);
    const c3 = normalizarCalle(s.calle3);
    const key = `${c1}|${c2}|${c3}`;
    const actual = segmentoMap.get(key) ?? { calle1: c1, calle2: c2, calle3: c3, cantidad: 0, motivos: new Map() };
    actual.motivos.set(s.motivo, (actual.motivos.get(s.motivo) ?? 0) + 1);
    segmentoMap.set(key, { ...actual, cantidad: actual.cantidad + 1 });
  });
  const calleTotalMap = new Map<string, number>();
  segmentoMap.forEach((v) => {
    calleTotalMap.set(v.calle1, (calleTotalMap.get(v.calle1) ?? 0) + v.cantidad);
  });
  const porSegmento = Array.from(segmentoMap.values())
    .map(({ calle1, calle2, calle3, cantidad, motivos }) => ({
      calle1, calle2, calle3, cantidad,
      calleTotal: calleTotalMap.get(calle1) ?? cantidad,
      motivos: mapToSortedArray(motivos),
    }))
    .sort((a, b) => b.calleTotal !== a.calleTotal ? b.calleTotal - a.calleTotal : b.cantidad - a.cantidad)
    .slice(0, 100);

  const calle1RankMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    const norm = normalizarCalle(s.calle1);
    if (!norm) return;
    calle1RankMap.set(norm, (calle1RankMap.get(norm) ?? 0) + 1);
  });
  const porCalle1Ranking = Array.from(calle1RankMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 50);

  const diaSemanaMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    const dia = parsearDiaSemana(s.fecha);
    if (!dia) return;
    diaSemanaMap.set(dia, (diaSemanaMap.get(dia) ?? 0) + 1);
  });
  const porDiaSemana = ORDEN_DIAS.filter((d) => diaSemanaMap.has(d)).map(
    (d) => ({ dia: d, cantidad: diaSemanaMap.get(d)! })
  );

  // Igual que en excelParser: porHora excluye los registros programados
  const horaMap = new Map<number, number>();
  solicitudes.forEach((s) => {
    if (s.hora === null || s.esProgramado === true) return;
    horaMap.set(s.hora, (horaMap.get(s.hora) ?? 0) + 1);
  });
  const porHora = Array.from(horaMap.entries())
    .map(([hora, cantidad]) => ({ hora, cantidad }))
    .sort((a, b) => a.hora - b.hora);

  const interseccionMap = new Map<string, number>();
  solicitudes.forEach((s) => {
    const nombre = canonicalizarInterseccion(s.calle1, s.calle2);
    if (!nombre) return;
    interseccionMap.set(nombre, (interseccionMap.get(nombre) ?? 0) + 1);
  });
  const porInterseccion = Array.from(interseccionMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 20);

  const tiempoAreaMap = new Map<string, { total: number; count: number }>();
  solicitudes.filter((s) => s.tiempoRespuestaMin > 0).forEach((s) => {
    const actual = tiempoAreaMap.get(s.areaAsignada) ?? { total: 0, count: 0 };
    tiempoAreaMap.set(s.areaAsignada, { total: actual.total + s.tiempoRespuestaMin, count: actual.count + 1 });
  });
  const porTiempoRespuestaArea = Array.from(tiempoAreaMap.entries())
    .map(([area, { total, count }]) => ({ area, promedio: Math.round(total / count), cantidad: count }))
    .sort((a, b) => a.promedio - b.promedio);

  const tiempoMotivoMap = new Map<string, { total: number; count: number }>();
  solicitudes.filter((s) => s.tiempoRespuestaMin > 0 && s.motivo && s.motivo !== "Sin datos").forEach((s) => {
    const actual = tiempoMotivoMap.get(s.motivo) ?? { total: 0, count: 0 };
    tiempoMotivoMap.set(s.motivo, { total: actual.total + s.tiempoRespuestaMin, count: actual.count + 1 });
  });
  const tiempoRespuestaPorMotivo = Array.from(tiempoMotivoMap.entries())
    .map(([area, { total, count }]) => ({ area, promedio: Math.round(total / count), cantidad: count }))
    .sort((a, b) => a.promedio - b.promedio);

  const totalFalsosPositivos = solicitudes.filter((s) => s.esFalsoPositivo).length;
  const tasaFalsosPositivos =
    totalSolicitudes > 0 ? Math.round((totalFalsosPositivos / totalSolicitudes) * 100) : 0;
  const tiposFalsosPositivos = derivarTiposFalsosPositivos(solicitudes);

  const totalProgramados = datos.tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === true).length
    : 0;
  const totalNoProgramados = datos.tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === false).length
    : 0;

  const conTRI = solicitudes.filter((s) => s.tiempoRespuestaInternoMin !== null);
  const tiempoRespuestaInternoPromedio =
    conTRI.length > 0
      ? Math.round(conTRI.reduce((acc, s) => acc + (s.tiempoRespuestaInternoMin ?? 0), 0) / conTRI.length)
      : 0;

  const triPorMotivoMap = new Map<string, { suma: number; n: number }>();
  for (const s of conTRI) {
    const key = s.motivo || "Sin datos";
    const prev = triPorMotivoMap.get(key) ?? { suma: 0, n: 0 };
    triPorMotivoMap.set(key, { suma: prev.suma + (s.tiempoRespuestaInternoMin ?? 0), n: prev.n + 1 });
  }
  const tiempoRespuestaInternoPorMotivo = Array.from(triPorMotivoMap.entries())
    .filter(([, v]) => v.n >= 2)
    .map(([area, v]) => ({ area, promedio: Math.round(v.suma / v.n), cantidad: v.n }))
    .sort((a, b) => a.promedio - b.promedio);

  const triPorAreaMap = new Map<string, { suma: number; n: number }>();
  for (const s of conTRI) {
    const key = s.areaAsignada || "Sin área";
    const prev = triPorAreaMap.get(key) ?? { suma: 0, n: 0 };
    triPorAreaMap.set(key, { suma: prev.suma + (s.tiempoRespuestaInternoMin ?? 0), n: prev.n + 1 });
  }
  const tiempoRespuestaInternoPorArea = Array.from(triPorAreaMap.entries())
    .filter(([, v]) => v.n >= 2)
    .map(([area, v]) => ({ area, promedio: Math.round(v.suma / v.n), cantidad: v.n }))
    .sort((a, b) => a.promedio - b.promedio);

  const distribucionTiempoRespuestaInterno = BUCKETS_TRI.map((b) => ({
    rango: b.rango,
    cantidad: conTRI.filter((s) => {
      const t = s.tiempoRespuestaInternoMin ?? 0;
      return t >= b.min && t <= b.max;
    }).length,
  })).filter((b) => b.cantidad > 0);

  // Cruces automáticos: solo hora y día de semana (mes no aplica a vista mensual)
  const topCatsCruce = porMotivo
    .filter((m) => m.nombre && m.nombre !== "Sin datos")
    .slice(0, 8)
    .map((m) => m.nombre);

  const crucesAutomaticos = datos.crucesAutomaticos
    .filter((c) => !c.titulo.toLowerCase().includes("mes"))
    .map((orig) => {
      if (orig.tipo === "categoria_hora") {
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
          titulo: orig.titulo,
          tipo: "categoria_hora" as const,
          filas: topCatsCruce,
          columnas: horasConDatos.map((h) => `${String(h).padStart(2, "0")}h`),
          valores: topCatsCruce.map((cat) => {
            const hm = catHoraMap.get(cat) ?? new Map<number, number>();
            return horasConDatos.map((h) => hm.get(h) ?? 0);
          }),
        };
      } else {
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
          titulo: orig.titulo,
          tipo: "categoria_dia" as const,
          filas: topCatsCruce,
          columnas: diasConDatos,
          valores: topCatsCruce.map((cat) => {
            const dm = catDiaMap.get(cat) ?? new Map<string, number>();
            return diasConDatos.map((d) => dm.get(d) ?? 0);
          }),
        };
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const distribucionesCategoricas = datos.distribucionesCategoricas
    .map((orig) => {
      const distMap = new Map<string, number>();
      for (const reg of registros) {
        const val = (reg.valores[orig.columna] ?? "").trim();
        if (!val) continue;
        distMap.set(val, (distMap.get(val) ?? 0) + 1);
      }
      return {
        columna: orig.columna,
        datos: Array.from(distMap.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad),
      };
    })
    .filter((d) => d.datos.length >= 2);

  return {
    ...datos,
    solicitudes,
    registros,
    totalSolicitudes,
    totalResueltas,
    totalNoResueltas,
    tasaResolucion,
    porMotivo,
    porArea,
    resolucionPorMotivo,
    resolucionPorArea,
    porLinea,
    porCalle,
    porSegmento,
    porCalle1Ranking,
    porDiaSemana,
    porHora,
    porInterseccion,
    porTiempoRespuestaArea,
    tiempoRespuestaPorMotivo,
    crucesAutomaticos,
    crucesCronicos: [],
    indiceFragilidad: [],
    totalFalsosPositivos,
    tasaFalsosPositivos,
    tiposFalsosPositivos,
    tiempoRespuestaInternoPromedio,
    tiempoRespuestaInternoPorMotivo,
    tiempoRespuestaInternoPorArea,
    distribucionTiempoRespuestaInterno,
    distribucionesCategoricas,
    totalProgramados,
    totalNoProgramados,
  };
}
