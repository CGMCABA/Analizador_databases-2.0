import type { DatosDashboard } from "../excelParser";
import type {
  AnalisisDisponible,
  CapacidadesDataset,
  CaracteristicasDataset,
  PerfilColumna,
  PerfilDataset,
} from "./tipos";
import {
  calcularConfianzaAnalitica,
  calcularEntropiaNormalizada,
  calcularTendenciaGeneral,
  calcularTop1Pct,
  calcularVolatilidad,
  detectarCambiosSignificativos,
  detectarConcentracion,
  detectarTodasAnomalias,
  adaptarCrucesCronicosAPatrones,
} from "./detectores";

// ── Capa 1: capacidades (qué tipos de columna están presentes) ──────────────

function calcularCapacidades(datos: DatosDashboard): CapacidadesDataset {
  const categoricas = datos.columnas.filter((c) => c.tipo === "categorica");
  const numericas = datos.columnas.filter((c) => c.tipo === "numerica");
  const texto = datos.columnas.filter((c) => c.tipo === "texto_libre");

  return {
    tieneFechas: datos.meses.length > 0,
    tieneCategorias: categoricas.length > 0,
    tieneEstados: datos.tieneColumnaStatus,
    tieneUbicaciones: datos.tieneColumnasCalles,
    tieneNumericos: numericas.length > 0,
    tieneTextoLibre: texto.length > 0,
    tieneMultiplesCategorias: categoricas.length >= 2,
    tieneSeriesTemporales:
      datos.meses.length >= 2 || datos.porHora.length >= 3 || datos.porDiaSemana.length >= 3,
    tieneComparacionPeriodos: datos.meses.length >= 2,
  };
}

// ── Perfil por columna (entropía/concentración), insumo de varias capas ─────

function calcularPerfilColumnas(datos: DatosDashboard): PerfilColumna[] {
  return datos.columnas
    .filter((c) => c.tipo !== "ignorar" && c.tipo !== "id")
    .map((c): PerfilColumna => {
      if (c.tipo === "categorica") {
        const dist = datos.distribucionesCategoricas.find((d) => d.columna === c.nombre);
        const datosDist = dist?.datos ?? [];
        const totalRegistros = datosDist.reduce((acc, d) => acc + d.cantidad, 0);
        return {
          nombre: c.nombre,
          tipo: "categorica",
          totalRegistros,
          valoresUnicos: c.cantidadUnicos,
          top1Pct: calcularTop1Pct(datosDist),
          top1Nombre: datosDist[0]?.nombre ?? null,
          entropiaNormalizada: calcularEntropiaNormalizada(datosDist),
        };
      }
      const tipo =
        c.tipo === "numerica" ? "numerica" : c.tipo === "fecha" ? "fecha" : "texto_libre";
      return {
        nombre: c.nombre,
        tipo,
        totalRegistros: datos.totalSolicitudes,
        valoresUnicos: c.cantidadUnicos,
        top1Pct: 0,
        top1Nombre: null,
        entropiaNormalizada: 0,
      };
    });
}

// ── Capa 2: características (comportamiento agregado del dataset) ──────────

function calcularCaracteristicas(
  datos: DatosDashboard,
  perfilColumnas: PerfilColumna[],
  cantidadAnomalias: number
): CaracteristicasDataset {
  // Importante: solo se considera "medible" si la columna principal es realmente
  // categórica. El fallback de excelParser.ts puede asignar colCategorica1 a una
  // columna de texto libre (cuando no hay categórica con buen fill-rate) — en ese
  // caso NO hay nada que medir, y eso debe distinguirse de "concentración 0".
  const colPrincipal = perfilColumnas.find(
    (c) => c.nombre === datos.colCategorica1 && c.tipo === "categorica"
  );
  const concentracionGlobal = colPrincipal
    ? Math.round(Math.max(0, 1 - colPrincipal.entropiaNormalizada) * 100) / 100
    : null;

  const colInfo = datos.columnas.find(
    (c) => c.nombre === datos.colCategorica1 && c.tipo === "categorica"
  );
  const riquezaCategorica = colInfo
    ? Math.round(Math.min(1, Math.log(colInfo.cantidadUnicos + 1) / Math.log(50)) * 100) / 100
    : null;

  return {
    concentracionGlobal,
    volatilidadTemporal: calcularVolatilidad(datos.porMes),
    recurrenciaDetectada: datos.crucesCronicos.length > 0,
    cantidadAnomalias,
    riquezaCategorica,
    tendenciaGeneral: calcularTendenciaGeneral(datos.porMes),
    confianzaAnalitica: calcularConfianzaAnalitica(
      datos.totalSolicitudes,
      datos.meses.length,
      riquezaCategorica ?? 0,
      datos.calidadDataset.registrosSinFechaValida ?? 0
    ),
  };
}

// ── Capa 3: catálogo declarativo de análisis disponibles, por capacidad ─────
// Ninguna regla menciona un "tipo de dataset" — solo capacidades + características.

interface ReglaAnalisis {
  id: string;
  nombre: string;
  descripcion: string;
  requiere: (cap: CapacidadesDataset) => boolean;
  score: (datos: DatosDashboard, cap: CapacidadesDataset, carac: CaracteristicasDataset) => number;
  motivo: (datos: DatosDashboard, carac: CaracteristicasDataset) => string;
}

const CATALOGO_ANALISIS: ReglaAnalisis[] = [
  {
    id: "series_temporales",
    nombre: "Evolución temporal",
    descripcion: "Tendencia y estacionalidad a lo largo del tiempo",
    requiere: (c) => c.tieneSeriesTemporales,
    score: (datos, _c, carac) => Math.min(1, datos.meses.length / 6) * (0.6 + 0.4 * carac.volatilidadTemporal),
    motivo: (datos, carac) =>
      `${datos.meses.length} meses de historia disponibles, volatilidad ${Math.round(carac.volatilidadTemporal * 100)}%`,
  },
  {
    id: "comparacion_periodos",
    nombre: "Comparación entre períodos",
    descripcion: "Variación de volumen y métricas entre dos momentos",
    requiere: (c) => c.tieneComparacionPeriodos,
    score: (datos) => Math.min(1, datos.meses.length / 3),
    motivo: (datos) => `Hay ${datos.meses.length} meses cargados para comparar entre sí`,
  },
  {
    id: "concentracion",
    nombre: "Concentración / Pareto",
    descripcion: "Qué categorías concentran la mayor parte del volumen",
    requiere: (c) => c.tieneCategorias,
    score: (_d, _c, carac) =>
      carac.concentracionGlobal === null ? 0.3 : Math.max(0.3, carac.concentracionGlobal),
    motivo: (_d, carac) =>
      carac.concentracionGlobal === null
        ? "No se identificó una columna categórica principal medible"
        : `Concentración global de ${Math.round(carac.concentracionGlobal * 100)}% en la categoría principal`,
  },
  {
    id: "ranking",
    nombre: "Ranking comparativo",
    descripcion: "Comparación entre múltiples categorías por volumen",
    requiere: (c) => c.tieneMultiplesCategorias,
    score: (_d, _c, carac) =>
      carac.riquezaCategorica === null ? 0.4 : 0.4 + 0.6 * carac.riquezaCategorica,
    motivo: (_d, carac) =>
      carac.riquezaCategorica === null
        ? "No se identificó una columna categórica principal medible"
        : `Riqueza categórica de ${Math.round(carac.riquezaCategorica * 100)}%`,
  },
  {
    id: "resolucion",
    nombre: "Eficiencia de resolución",
    descripcion: "Tasa de cierre y tiempos de respuesta",
    requiere: (c) => c.tieneEstados,
    score: (datos) => Math.min(1, datos.totalSolicitudes / 30),
    motivo: (datos) => `Tasa de resolución actual: ${datos.tasaResolucion}%`,
  },
  {
    id: "geografia",
    nombre: "Análisis geográfico",
    descripcion: "Ranking y mapa de zonas con mayor concentración",
    requiere: (c) => c.tieneUbicaciones,
    score: (datos) => Math.min(1, datos.porInterseccion.length / 10),
    motivo: (datos) => `${datos.porInterseccion.length} intersecciones identificadas`,
  },
  {
    id: "recurrencia",
    nombre: "Recurrencia / problemas crónicos",
    descripcion: "Patrones que se repiten en el tiempo sobre una misma entidad",
    requiere: (c) => c.tieneFechas && c.tieneCategorias && c.tieneComparacionPeriodos,
    score: (datos, _c, carac) =>
      carac.recurrenciaDetectada ? Math.min(1, datos.crucesCronicos.length / 5) : 0.1,
    motivo: (datos) =>
      datos.crucesCronicos.length > 0
        ? `Se detectaron ${datos.crucesCronicos.length} casos recurrentes (ej: "${datos.crucesCronicos[0].motivo}" en ${datos.crucesCronicos[0].interseccion})`
        : "No se detectó recurrencia entre meses",
  },
  {
    id: "anomalias",
    nombre: "Detección de anomalías",
    descripcion: "Valores atípicos en series numéricas o temporales",
    requiere: (c) => c.tieneNumericos || c.tieneSeriesTemporales,
    score: (_d, _c, carac) =>
      Math.min(1, 0.3 + carac.volatilidadTemporal * 0.4 + Math.min(carac.cantidadAnomalias, 5) * 0.06),
    motivo: (_d, carac) => `${carac.cantidadAnomalias} valores atípicos detectados en las series agregadas`,
  },
];

function calcularAnalisisDisponibles(
  datos: DatosDashboard,
  cap: CapacidadesDataset,
  carac: CaracteristicasDataset
): AnalisisDisponible[] {
  return CATALOGO_ANALISIS.filter((r) => r.requiere(cap))
    .map((r) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      score: Math.round(r.score(datos, cap, carac) * 100) / 100,
      motivo: r.motivo(datos, carac),
    }))
    .sort((a, b) => b.score - a.score);
}

// ── Orquestador ───────────────────────────────────────────────────────────

export function perfilarDataset(datos: DatosDashboard): PerfilDataset {
  const capacidades = calcularCapacidades(datos);
  const perfilColumnas = calcularPerfilColumnas(datos);
  const anomalias = detectarTodasAnomalias(datos);
  const patrones = adaptarCrucesCronicosAPatrones(datos.crucesCronicos);
  const caracteristicas = calcularCaracteristicas(datos, perfilColumnas, anomalias.length);
  const analisisDisponibles = calcularAnalisisDisponibles(datos, capacidades, caracteristicas);
  const insights = [
    ...detectarConcentracion(perfilColumnas),
    ...detectarCambiosSignificativos(datos.porMes),
  ];

  return {
    capacidades,
    columnasFecha: datos.columnas.filter((c) => c.tipo === "fecha").map((c) => c.nombre),
    columnasNumericas: datos.columnas.filter((c) => c.tipo === "numerica").map((c) => c.nombre),
    columnasCategoricas: datos.columnas.filter((c) => c.tipo === "categorica").map((c) => c.nombre),
    columnasTexto: datos.columnas.filter((c) => c.tipo === "texto_libre").map((c) => c.nombre),
    perfilColumnas,
    caracteristicas,
    analisisDisponibles,
    insights,
    anomalias,
    patrones,
  };
}
