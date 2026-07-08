import { useMemo } from "react";
import { DatosDashboard } from "@/lib/excelParser";
import { Lightbulb, TrendingUp, TrendingDown, Minus, Clock, MapPin, Tag, Calendar, AlertTriangle } from "lucide-react";

interface InsightsPanelProps {
  datos: DatosDashboard;
  mesFiltro: string;
  soloAlertas?: boolean;
}

interface InsightVisual {
  icono: "tendencia_up" | "tendencia_down" | "plano" | "hora" | "lugar" | "categoria" | "dia" | "alerta";
  texto: string;
  detalle?: string;
  color: "blue" | "green" | "red" | "amber" | "violet" | "slate";
  esAlerta: boolean;
}

const ICONO_MAP = {
  tendencia_up: TrendingUp,
  tendencia_down: TrendingDown,
  plano: Minus,
  hora: Clock,
  lugar: MapPin,
  categoria: Tag,
  dia: Calendar,
  alerta: AlertTriangle,
};

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
  red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  violet: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
  slate: "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300",
};

const ICON_COLOR_MAP: Record<string, string> = {
  blue: "text-blue-500 dark:text-blue-400",
  green: "text-green-500 dark:text-green-400",
  red: "text-red-500 dark:text-red-400",
  amber: "text-amber-500 dark:text-amber-400",
  violet: "text-violet-500 dark:text-violet-400",
  slate: "text-slate-400 dark:text-slate-500",
};

function pct(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

export function InsightsPanel({ datos, mesFiltro, soloAlertas = false }: InsightsPanelProps) {
  const insights = useMemo<InsightVisual[]>(() => {
    const lista: InsightVisual[] = [];
    const total = datos.totalSolicitudes;
    if (total === 0) return lista;

    // ── Reglas descriptivas de dominio (distribución del dataset) ───────────

    // Categoría dominante (descriptivo, no es alerta — la alerta de concentración la da el motor)
    if (datos.porMotivo.length > 0 && datos.colCategorica1) {
      const top = datos.porMotivo[0];
      const p = pct(top.cantidad, total);
      lista.push({
        icono: "categoria",
        texto: `El tipo más frecuente es "${top.nombre}"`,
        detalle: `${top.cantidad.toLocaleString("es-AR")} registros — ${p}% del total`,
        color: "blue",
        esAlerta: false,
      });
    }

    // Hora pico
    if (datos.porHora.length >= 3) {
      const pico = [...datos.porHora].sort((a, b) => b.cantidad - a.cantidad)[0];
      const p = pct(pico.cantidad, total);
      lista.push({
        icono: "hora",
        texto: `La hora pico es las ${String(pico.hora).padStart(2, "0")}:00 hs`,
        detalle: `${pico.cantidad.toLocaleString("es-AR")} registros en esa franja (${p}% del total)`,
        color: "amber",
        esAlerta: false,
      });
    }

    // Día más activo
    if (datos.porDiaSemana.length >= 3) {
      const pico = [...datos.porDiaSemana].sort((a, b) => b.cantidad - a.cantidad)[0];
      const p = pct(pico.cantidad, total);
      lista.push({
        icono: "dia",
        texto: `El día con mayor actividad es ${pico.dia}`,
        detalle: `${pico.cantidad.toLocaleString("es-AR")} registros (${p}% del total)`,
        color: "violet",
        esAlerta: false,
      });
    }

    // Intersección más cargada
    if (datos.porInterseccion.length > 0) {
      const top = datos.porInterseccion[0];
      const p = pct(top.cantidad, total);
      lista.push({
        icono: "lugar",
        texto: `La intersección más congestionada: ${top.nombre}`,
        detalle: `${top.cantidad.toLocaleString("es-AR")} registros (${p}% del total)`,
        color: "violet",
        esAlerta: false,
      });
    }

    // Área / categoría secundaria más frecuente
    if (datos.porArea.length > 0 && datos.colCategorica2 && datos.porArea[0].nombre !== "Sin área") {
      const top = datos.porArea[0];
      const p = pct(top.cantidad, total);
      lista.push({
        icono: "categoria",
        texto: `Categoría secundaria dominante: "${top.nombre}"`,
        detalle: `${top.cantidad.toLocaleString("es-AR")} registros — ${p}% (${datos.colCategorica2})`,
        color: "blue",
        esAlerta: false,
      });
    }

    // Tasa de resolución / finalización baja
    if (datos.tieneColumnaStatus && datos.tasaResolucion < 50 && datos.totalSolicitudes >= 10) {
      const esResuelto = datos.etiquetaStatus === "Resuelto";
      lista.push({
        icono: "alerta",
        texto: `Tasa de ${esResuelto ? "resolución" : "finalización"} baja: ${datos.tasaResolucion}%`,
        detalle: `${datos.totalNoResueltas.toLocaleString("es-AR")} casos sin ${esResuelto ? "resolver" : "finalizar"} de ${datos.totalSolicitudes.toLocaleString("es-AR")} totales.`,
        color: "red",
        esAlerta: true,
      });
    }

    // Alerta de falsos positivos (cuando tasa > 15%)
    if (datos.totalFalsosPositivos > 0 && datos.tasaFalsosPositivos > 15) {
      lista.push({
        icono: "alerta",
        texto: `Alta tasa de falsos positivos: ${datos.tasaFalsosPositivos}% del total`,
        detalle: `${datos.totalFalsosPositivos.toLocaleString("es-AR")} registros cerrados sin evento real. Revisar procesos de cierre operativo.`,
        color: "amber",
        esAlerta: true,
      });
    }

    // Zona frágil (top 1 del índice de fragilidad)
    if (datos.indiceFragilidad.length >= 3) {
      const top = datos.indiceFragilidad[0];
      lista.push({
        icono: "alerta",
        texto: `Zona de mayor fragilidad operativa: ${top.zona}`,
        detalle: `Score ${top.puntuacion.toFixed(2)} — ${top.volumen.toLocaleString("es-AR")} registros, ${top.tasaRecurrencia}% recurrente.`,
        color: "red",
        esAlerta: true,
      });
    }

    // Split Programado / No Programado (shown whenever the column is detected)
    if (datos.tieneColumnaProgramacion) {
      const pctNoP = pct(datos.totalNoProgramados, total);
      lista.push({
        icono: "categoria",
        texto: `${pctNoP}% de sucesos son No Programados`,
        detalle: `${datos.totalNoProgramados.toLocaleString("es-AR")} reactivos · ${datos.totalProgramados.toLocaleString("es-AR")} planificados de ${total.toLocaleString("es-AR")} totales.`,
        color: "blue",
        esAlerta: false,
      });

      if (datos.calidadDataset.pctSinHora > 10) {
        lista.push({
          icono: "alerta",
          texto: `${datos.calidadDataset.pctSinHora}% de No Programados sin hora`,
          detalle: "La hora de los sucesos reactivos es crítica para el análisis de pico operativo. Revisá el proceso de carga.",
          color: "red",
          esAlerta: true,
        });
      }
    }

    // Brecha de tiempo de respuesta (categoría más lenta vs. promedio global)
    if (datos.tiempoRespuestaPorMotivo.length >= 2) {
      const sorted = [...datos.tiempoRespuestaPorMotivo].sort((a, b) => b.promedio - a.promedio);
      const masLento = sorted[0];
      const promedioGlobal = Math.round(
        sorted.reduce((acc, t) => acc + t.promedio, 0) / sorted.length
      );
      if (masLento.promedio > promedioGlobal * 1.5) {
        const formatear = (m: number) => (m >= 120 ? `${(m / 60).toFixed(1)}h` : `${m} min`);
        lista.push({
          icono: "hora",
          texto: `Demora crítica en "${masLento.area}"`,
          detalle: `Promedio ${formatear(masLento.promedio)} vs. ${formatear(promedioGlobal)} global — ${Math.round(masLento.promedio / promedioGlobal)}x más lento.`,
          color: "amber",
          esAlerta: true,
        });
      }
    }

    return lista.slice(0, 9);
  }, [datos, mesFiltro]);

  const visibles = soloAlertas ? insights.filter((i) => i.esAlerta) : insights;

  if (visibles.length === 0) return null;

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 animate-fade-in-up delay-75">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-[#c8a84b] shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Alertas operativas</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Observaciones generadas del análisis de los datos
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibles.map((insight, idx) => {
          const Icono = ICONO_MAP[insight.icono];
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border animate-fade-in-up ${COLOR_MAP[insight.color]}`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <Icono className={`h-4 w-4 mt-0.5 shrink-0 ${ICON_COLOR_MAP[insight.color]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{insight.texto}</p>
                {insight.detalle && (
                  <p className="text-xs opacity-70 mt-1 leading-snug">{insight.detalle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
