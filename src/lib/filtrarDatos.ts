import { DatosDashboard, Solicitud } from "./excelParser";
import {
  esResuelta,
  normalizarCalle,
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

export interface FiltrosDataset {
  mes?: string;
  /** Nombre de calle (cualquiera de calle1/calle2/calle3 de la solicitud). */
  calle?: string;
}

/**
 * Devuelve un DatosDashboard con todas las agregaciones re-derivadas desde el
 * subconjunto de solicitudes/registros que cumple los filtros indicados (mes y/o calle).
 * Campos de config/schema (flags de tipo, nombres de columna, meses completos,
 * porMes, calidadDataset) se preservan del original para que el header y
 * el panel de calidad sigan mostrando contexto global.
 * crucesCronicos e indiceFragilidad se vacían porque son análisis multi-mes.
 */
export function filtrarDatos(datos: DatosDashboard, filtros: FiltrosDataset): DatosDashboard {
  const { mes, calle } = filtros;
  if (!mes && !calle) return datos;

  const calleNorm = calle ? normalizarCalle(calle) : null;
  const coincide = (s: Solicitud) => {
    if (mes && s.mes !== mes) return false;
    if (calleNorm) {
      const enAlgunaCalle = [s.calle1, s.calle2, s.calle3].some(
        (c) => normalizarCalle(c) === calleNorm
      );
      if (!enAlgunaCalle) return false;
    }
    return true;
  };

  // solicitudes y registros son arrays paralelos (excelParser.ts los construye fila
  // a fila, uno junto al otro) — se filtran por índice para no depender de que
  // RegistroGenerico tenga un campo de calle propio (solo tiene _mes/_fecha).
  const indices: number[] = [];
  datos.solicitudes.forEach((s, i) => {
    if (coincide(s)) indices.push(i);
  });
  const solicitudes = indices.map((i) => datos.solicitudes[i]);
  const registros = indices.map((i) => datos.registros[i]);

  const totalSolicitudes = solicitudes.length;
  const totalResueltas = solicitudes.filter((s) => esResuelta(s.resuelto, s.resolucion)).length;
  const totalNoResueltas = totalSolicitudes - totalResueltas;
  const tasaResolucion =
    totalSolicitudes > 0 ? Math.round((totalResueltas / totalSolicitudes) * 100) : 0;

  const porMotivo = calcularPorMotivo(solicitudes);
  const porArea = calcularPorArea(solicitudes);
  const resolucionPorMotivo = calcularResolucion(solicitudes, "motivo");
  const resolucionPorArea = calcularResolucion(solicitudes, "areaAsignada");
  const porLinea = calcularPorLinea(solicitudes);
  const porCalle = calcularPorCalle(solicitudes);
  const porSegmento = calcularPorSegmento(solicitudes);
  const porCalle1Ranking = calcularPorCalle1Ranking(solicitudes);
  const { porDiaSemana } = calcularPorDiaSemana(solicitudes);
  const porHora = calcularPorHora(solicitudes);
  const porInterseccion = calcularPorInterseccion(solicitudes);
  const porTiempoRespuestaArea = calcularPorTiempoRespuestaArea(solicitudes);
  const tiempoRespuestaPorMotivo = calcularTiempoRespuestaPorMotivo(solicitudes);

  const totalFalsosPositivos = solicitudes.filter((s) => s.esFalsoPositivo).length;
  const tasaFalsosPositivos =
    totalSolicitudes > 0 ? Math.round((totalFalsosPositivos / totalSolicitudes) * 100) : 0;
  const tiposFalsosPositivos = calcularTiposFalsosPositivos(solicitudes);

  const totalProgramados = datos.tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === true).length
    : 0;
  const totalNoProgramados = datos.tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === false).length
    : 0;

  const {
    promedio: tiempoRespuestaInternoPromedio,
    porMotivo: tiempoRespuestaInternoPorMotivo,
    porArea: tiempoRespuestaInternoPorArea,
    distribucion: distribucionTiempoRespuestaInterno,
  } = calcularTiempoRespuestaInterno(solicitudes);

  // Cruces automáticos: solo hora y día de semana (mes no aplica a vista mensual)
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
