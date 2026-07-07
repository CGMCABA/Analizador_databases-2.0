import type { DatosDashboard } from "./excelParser";
import {
  esResuelta,
  calcularResolucion,
  calcularTiposFalsosPositivos,
  calcularPorMotivo,
  calcularPorArea,
  calcularPorLinea,
  calcularPorCalle,
  calcularPorSegmento,
  calcularPorCalle1Ranking,
  calcularPorDiaSemana,
  calcularPorHora,
  calcularPorInterseccion,
  calcularPorTiempoRespuestaArea,
  calcularTiempoRespuestaPorMotivo,
  calcularTiempoRespuestaInterno,
  calcularCruceCategoriaHora,
  calcularCruceCategoriaDia,
} from "./agregaciones";

/**
 * Devuelve un nuevo DatosDashboard con los meses indicados excluidos de todos
 * los cálculos. Los registros originales no se modifican — solo se restringe
 * el conjunto de solicitudes sobre el que se derivan las agregaciones.
 *
 * Campos de config/schema se preservan del dataset original.
 * crucesCronicos se filtra para mantener solo patrones que aparecen en >= 2
 * meses activos. indiceFragilidad se preserva (es zona-nivel, no mes-nivel).
 */
export function excluirMeses(
  datos: DatosDashboard,
  mesesExcluidos: string[]
): DatosDashboard {
  if (mesesExcluidos.length === 0) return datos;

  const excluidos = new Set(mesesExcluidos);

  // Filtrar solicitudes y registros (arrays paralelos)
  const indices: number[] = [];
  datos.solicitudes.forEach((s, i) => {
    if (!excluidos.has(s.mes)) indices.push(i);
  });
  const solicitudes = indices.map((i) => datos.solicitudes[i]);
  const registros   = indices.map((i) => datos.registros[i]);

  // Meses y porMes activos
  const meses  = datos.meses.filter((m) => !excluidos.has(m));
  const porMes = datos.porMes.filter((pm) => !excluidos.has(pm.mes));

  // Re-agregaciones (idéntico a filtrarDatos, pero sin restricción de mes/calle)
  const totalSolicitudes  = solicitudes.length;
  const totalResueltas    = solicitudes.filter((s) => esResuelta(s.resuelto, s.resolucion)).length;
  const totalNoResueltas  = totalSolicitudes - totalResueltas;
  const tasaResolucion    = totalSolicitudes > 0
    ? Math.round((totalResueltas / totalSolicitudes) * 100)
    : 0;

  const porMotivo              = calcularPorMotivo(solicitudes);
  const porArea                = calcularPorArea(solicitudes);
  const resolucionPorMotivo    = calcularResolucion(solicitudes, "motivo");
  const resolucionPorArea      = calcularResolucion(solicitudes, "areaAsignada");
  const porLinea               = calcularPorLinea(solicitudes);
  const porCalle               = calcularPorCalle(solicitudes);
  const porSegmento            = calcularPorSegmento(solicitudes);
  const porCalle1Ranking       = calcularPorCalle1Ranking(solicitudes);
  const { porDiaSemana }       = calcularPorDiaSemana(solicitudes);
  const porHora                = calcularPorHora(solicitudes);
  const porInterseccion        = calcularPorInterseccion(solicitudes);
  const porTiempoRespuestaArea = calcularPorTiempoRespuestaArea(solicitudes);
  const tiempoRespuestaPorMotivo = calcularTiempoRespuestaPorMotivo(solicitudes);

  const totalFalsosPositivos = solicitudes.filter((s) => s.esFalsoPositivo).length;
  const tasaFalsosPositivos  = totalSolicitudes > 0
    ? Math.round((totalFalsosPositivos / totalSolicitudes) * 100)
    : 0;
  const tiposFalsosPositivos = calcularTiposFalsosPositivos(solicitudes);

  const totalProgramados   = datos.tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === true).length  : 0;
  const totalNoProgramados = datos.tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === false).length : 0;

  const {
    promedio:    tiempoRespuestaInternoPromedio,
    porMotivo:   tiempoRespuestaInternoPorMotivo,
    porArea:     tiempoRespuestaInternoPorArea,
    distribucion: distribucionTiempoRespuestaInterno,
  } = calcularTiempoRespuestaInterno(solicitudes);

  const topCatsCruce = porMotivo
    .filter((m) => m.nombre && m.nombre !== "Sin datos")
    .slice(0, 8)
    .map((m) => m.nombre);

  const crucesAutomaticos = datos.crucesAutomaticos
    .filter((c) => !c.titulo.toLowerCase().includes("mes"))
    .map((orig) =>
      orig.tipo === "categoria_hora"
        ? calcularCruceCategoriaHora(solicitudes, topCatsCruce, orig.titulo)
        : calcularCruceCategoriaDia(solicitudes, topCatsCruce, orig.titulo)
    )
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

  // Mantener solo cruces crónicos que aparecen en >= 2 meses activos
  const crucesCronicos = datos.crucesCronicos
    .map((c) => ({ ...c, meses: c.meses.filter((m) => !excluidos.has(m)) }))
    .filter((c) => c.meses.length >= 2);

  return {
    ...datos,
    solicitudes,
    registros,
    meses,
    porMes,
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
    crucesCronicos,
    indiceFragilidad: datos.indiceFragilidad, // zona-nivel, preservar
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
