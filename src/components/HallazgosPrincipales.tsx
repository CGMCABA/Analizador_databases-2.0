import { useMemo } from "react";
import { Search, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, ArrowRight, Zap, GitCompareArrows } from "lucide-react";
import type { Anomalia, PerfilDataset } from "@/lib/insights/tipos";

interface HallazgosPrincipalesProps {
  perfil: PerfilDataset;
  /** Dispara la comparación de los últimos 2 meses (reusa ejecutarComparacionMeses de Dashboard.tsx). */
  onVerComparacion?: () => void;
}

type Categoria = "concentracion" | "tendencia" | "recurrencia" | "anomalia";
type Prioridad = "alta" | "media";

interface HallazgoVisual {
  categoria: Categoria;
  titulo: string;
  detalle: string;
  prioridad: Prioridad;
  /** Para desempatar dentro de una misma prioridad — número más alto = más relevante. */
  peso: number;
}

const MAX_HALLAZGOS = 5;
const TOPE_POR_CATEGORIA = 2;
const ORDEN_CATEGORIAS: Categoria[] = ["concentracion", "tendencia", "recurrencia", "anomalia"];

// Nombres de columna que usa detectarOutliers() en detectores.ts — fijos, ya existentes.
const PLURAL: Record<string, string> = {
  "Volumen mensual": "meses",
  "Distribución horaria": "franjas horarias",
  "Día de la semana": "días de la semana",
  "Ranking de calles": "calles",
};

/** "A" / "A y B" / "A, B y C" / "A, B y N más" (a partir de 4 elementos). */
function listarNombres(etiquetas: string[]): string {
  const n = etiquetas.length;
  if (n === 1) return etiquetas[0];
  if (n <= 3) return `${etiquetas.slice(0, -1).join(", ")} y ${etiquetas[n - 1]}`;
  return `${etiquetas[0]}, ${etiquetas[1]} y ${n - 2} más`;
}

/**
 * Agrupa anomalías por columna de origen — pura capa de presentación sobre
 * perfil.anomalias ya calculado (detectores.ts/PerfilDataset no se tocan). El motor
 * sigue generando anomalías individuales; acá decidimos cómo contarlas como una sola
 * historia cuando varias comparten el mismo origen (ej. 3 calles atípicas a la vez).
 */
function agruparAnomalias(anomalias: Anomalia[]): HallazgoVisual[] {
  const porColumna = new Map<string, Anomalia[]>();
  for (const a of anomalias) {
    porColumna.set(a.columna, [...(porColumna.get(a.columna) ?? []), a]);
  }

  return Array.from(porColumna.entries()).map(([columna, grupo]) => {
    const maxDesviacion = Math.max(...grupo.map((a) => a.desviacion));
    const prioridad: Prioridad = maxDesviacion >= 1 ? "alta" : "media";
    const etiquetas = grupo.map((a) => a.etiqueta);

    if (grupo.length === 1) {
      return {
        categoria: "anomalia" as const,
        titulo: `${etiquetas[0]} muestra actividad fuera de lo esperado en ${columna.toLowerCase()}.`,
        detalle: "Se aleja significativamente del comportamiento habitual de esta serie.",
        prioridad,
        peso: maxDesviacion,
      };
    }

    return {
      categoria: "anomalia" as const,
      titulo: `${grupo.length} ${PLURAL[columna] ?? columna.toLowerCase()} muestran actividad fuera de lo esperado: ${listarNombres(etiquetas)}.`,
      detalle: "Se alejan significativamente del comportamiento habitual de esta serie.",
      prioridad,
      peso: maxDesviacion,
    };
  });
}

/**
 * Construye los hallazgos de concentración/tendencia a partir de perfil.insights,
 * con redacción ejecutiva (qué pasó + por qué importa, sin diagnosticar causas).
 * top1Nombre sale de perfil.perfilColumnas (ya calculado, ver PerfilColumna.top1Nombre).
 */
function construirInsights(perfil: PerfilDataset): HallazgoVisual[] {
  return perfil.insights.map((i) => {
    const prioridad: Prioridad = i.severidad === "critico" ? "alta" : "media";
    const peso = Math.abs(i.valor ?? 0);

    if (i.tipo === "concentracion") {
      const columna = perfil.perfilColumnas.find((c) => c.nombre === i.columna);
      const titulo = columna?.top1Nombre
        ? `${i.valor}% de los casos corresponden a "${columna.top1Nombre}" en ${i.columna}.`
        : `La columna "${i.columna}" está dominada por un solo valor (${i.valor}% del total).`;
      const detalle =
        i.severidad === "critico"
          ? "Existe una fuerte concentración operativa en esta categoría."
          : "Vale la pena monitorear esta concentración.";
      return { categoria: "concentracion" as const, titulo, detalle, prioridad, peso };
    }

    // tendencia
    const detalle =
      (i.valor ?? 0) > 0
        ? "Podría requerir refuerzo de capacidad operativa en ese período."
        : "Conviene revisar si responde a una baja real de casos o a un cambio en el registro de datos.";
    return { categoria: "tendencia" as const, titulo: i.texto, detalle, prioridad, peso };
  });
}

function construirPatrones(perfil: PerfilDataset): HallazgoVisual[] {
  return perfil.patrones.map((p) => ({
    categoria: "recurrencia" as const,
    titulo: p.descripcion,
    detalle: "Es un problema estructural, no un evento aislado.",
    prioridad: p.fuerza >= 0.5 ? "alta" : "media",
    peso: p.fuerza,
  }));
}

/**
 * Selección por rondas: ronda 1 toma el mejor hallazgo de cada categoría presente
 * (garantiza diversidad — "historias distintas", no la misma repetida). Ronda 2
 * completa los cupos restantes respetando un tope de 2 por categoría, hasta el
 * máximo total. Es lógica de selección/orden, no recalcula ninguna métrica.
 */
function seleccionarHallazgos(perfil: PerfilDataset): HallazgoVisual[] {
  const todos = [...construirInsights(perfil), ...construirPatrones(perfil), ...agruparAnomalias(perfil.anomalias)];

  const porCategoria = new Map<Categoria, HallazgoVisual[]>();
  for (const cat of ORDEN_CATEGORIAS) {
    porCategoria.set(
      cat,
      todos
        .filter((h) => h.categoria === cat)
        .sort((a, b) => (a.prioridad === b.prioridad ? b.peso - a.peso : a.prioridad === "alta" ? -1 : 1))
    );
  }

  const seleccionados: HallazgoVisual[] = [];
  const tomados = new Map<Categoria, number>();

  // Ronda 1: el mejor de cada categoría presente.
  for (const cat of ORDEN_CATEGORIAS) {
    const lista = porCategoria.get(cat) ?? [];
    if (lista.length > 0) {
      seleccionados.push(lista[0]);
      tomados.set(cat, 1);
    }
  }

  // Ronda 2: completar cupos restantes, tope de 2 por categoría, hasta el máximo total.
  const restantes = ORDEN_CATEGORIAS.flatMap((cat) =>
    (porCategoria.get(cat) ?? []).slice(tomados.get(cat) ?? 0, TOPE_POR_CATEGORIA)
  ).sort((a, b) => (a.prioridad === b.prioridad ? b.peso - a.peso : a.prioridad === "alta" ? -1 : 1));

  for (const h of restantes) {
    if (seleccionados.length >= MAX_HALLAZGOS) break;
    seleccionados.push(h);
  }

  return seleccionados.slice(0, MAX_HALLAZGOS);
}

function nivelCalidad(confianzaAnalitica: number): { etiqueta: string; color: string } {
  if (confianzaAnalitica >= 0.7) return { etiqueta: "Alta", color: "text-green-600 dark:text-green-400" };
  if (confianzaAnalitica >= 0.4) return { etiqueta: "Media", color: "text-amber-600 dark:text-amber-400" };
  return { etiqueta: "Baja", color: "text-red-600 dark:text-red-400" };
}

const ETIQUETA_TENDENCIA: Record<string, { texto: string; icono: typeof ArrowUpRight; color: string }> = {
  creciente: { texto: "Creciente", icono: ArrowUpRight, color: "text-amber-600 dark:text-amber-400" },
  estable: { texto: "Estable", icono: ArrowRight, color: "text-slate-500 dark:text-slate-400" },
  decreciente: { texto: "Decreciente", icono: ArrowDownRight, color: "text-blue-600 dark:text-blue-400" },
};

function nivelEstabilidad(volatilidadTemporal: number): string {
  if (volatilidadTemporal < 0.3) return "Estable";
  if (volatilidadTemporal < 0.6) return "Moderada";
  return "Volátil";
}

const ESTILO_CATEGORIA: Record<
  Categoria,
  { borde: string; icono: typeof AlertCircle; iconoColor: string }
> = {
  concentracion: { borde: "border-l-red-500", icono: AlertCircle, iconoColor: "text-red-500 dark:text-red-400" },
  tendencia: { borde: "border-l-amber-500", icono: TrendingUp, iconoColor: "text-amber-500 dark:text-amber-400" },
  recurrencia: { borde: "border-l-violet-500", icono: RefreshCw, iconoColor: "text-violet-500 dark:text-violet-400" },
  anomalia: { borde: "border-l-blue-400", icono: AlertTriangle, iconoColor: "text-blue-500 dark:text-blue-400" },
};

// Traducción id interno → frase de acción para el usuario final. El score que ordena
// analisisDisponibles sigue existiendo (ya viene ordenado desde perfilDataset.ts);
// acá solo se oculta de la UI, no se recalcula.
const ETIQUETA_ANALISIS: Record<string, string> = {
  series_temporales: "Ver cómo evolucionó en el tiempo",
  comparacion_periodos: "Ver qué cambió entre meses",
  concentracion: "Ver qué categoría concentra más casos",
  ranking: "Comparar categorías entre sí",
  resolucion: "Revisar tiempos de cierre",
  geografia: "Ver mapa de zonas con más casos",
  recurrencia: "Ver problemas que se repiten",
  anomalias: "Ver valores fuera de lo común",
};

export function HallazgosPrincipales({ perfil, onVerComparacion }: HallazgosPrincipalesProps) {
  const hallazgos = useMemo(() => seleccionarHallazgos(perfil), [perfil]);
  const calidad = nivelCalidad(perfil.caracteristicas.confianzaAnalitica);
  const tendencia = perfil.caracteristicas.tendenciaGeneral
    ? ETIQUETA_TENDENCIA[perfil.caracteristicas.tendenciaGeneral]
    : null;
  const estabilidad = nivelEstabilidad(perfil.caracteristicas.volatilidadTemporal);
  const sugerencias = [...perfil.analisisDisponibles].sort((a, b) => b.score - a.score);

  const mostrarCTAComparacion =
    !!onVerComparacion &&
    perfil.capacidades.tieneComparacionPeriodos &&
    !!perfil.caracteristicas.tendenciaGeneral &&
    perfil.caracteristicas.tendenciaGeneral !== "estable";

  return (
    <div className="presentation-hide bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 print:hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Hallazgos Principales</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
          <span>
            Calidad de datos:{" "}
            <span className={`font-semibold ${calidad.color}`}>
              {calidad.etiqueta} ({Math.round(perfil.caracteristicas.confianzaAnalitica * 100)}%)
            </span>
          </span>
          {tendencia && (
            <span className="flex items-center gap-1">
              Tendencia:{" "}
              <span className={`font-semibold inline-flex items-center gap-0.5 ${tendencia.color}`}>
                <tendencia.icono className="h-3.5 w-3.5" /> {tendencia.texto}
              </span>
            </span>
          )}
          <span>
            Estabilidad: <span className="font-semibold text-slate-600 dark:text-slate-300">{estabilidad}</span>
          </span>
        </div>
      </div>

      {hallazgos.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          No se detectaron alertas relevantes — el dataset muestra un comportamiento estable.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {hallazgos.map((h, idx) => {
            const estilo = ESTILO_CATEGORIA[h.categoria];
            const Icono = estilo.icono;
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 border-l-4 ${estilo.borde} bg-slate-50 dark:bg-slate-700/40 rounded-r-lg px-3 py-2`}
              >
                <Icono className={`h-4 w-4 mt-0.5 shrink-0 ${estilo.iconoColor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{h.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{h.detalle}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mostrarCTAComparacion && (
        <button
          onClick={onVerComparacion}
          className="mt-4 w-full flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <span className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            Se detectó un cambio relevante entre períodos.
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
            <GitCompareArrows className="h-3.5 w-3.5" /> Ver comparación de períodos
          </span>
        </button>
      )}

      {sugerencias.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          Para profundizar:{" "}
          {sugerencias.map((s) => ETIQUETA_ANALISIS[s.id] ?? s.nombre).join(" · ")}
        </p>
      )}
    </div>
  );
}
