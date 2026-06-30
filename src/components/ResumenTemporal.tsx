import { Clock, ArrowUpRight, ArrowDownRight, ArrowRight, AlertTriangle, Zap } from "lucide-react";
import type { PerfilDataset } from "@/lib/insights/tipos";

interface ResumenTemporalProps {
  perfil: PerfilDataset;
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

/**
 * Resumen ejecutivo del bloque temporal — mismo patrón que HallazgosPrincipales/
 * ResumenGeografico/ZonasDeAtencion. Reutiliza exclusivamente caracteristicas
 * (tendenciaGeneral, volatilidadTemporal) e insights/anomalias ya calculados por
 * el motor (perfil.insights tipo "tendencia", perfil.anomalias columna "Volumen
 * mensual"). No calcula ninguna métrica nueva.
 */
export function ResumenTemporal({ perfil }: ResumenTemporalProps) {
  const { tendenciaGeneral, volatilidadTemporal } = perfil.caracteristicas;
  const tendencia = tendenciaGeneral ? ETIQUETA_TENDENCIA[tendenciaGeneral] : null;
  const estabilidad = nivelEstabilidad(volatilidadTemporal);

  const insightsTendencia = perfil.insights.filter((i) => i.tipo === "tendencia");
  const anomaliasMensuales = perfil.anomalias.filter((a) => a.columna === "Volumen mensual");

  if (!tendencia && insightsTendencia.length === 0 && anomaliasMensuales.length === 0) return null;

  return (
    <div className="presentation-hide bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 print:hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Resumen Temporal</h2>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-sm mb-3">
        {tendencia && (
          <span className="text-slate-500 dark:text-slate-400">
            Tendencia:{" "}
            <span className={`font-semibold inline-flex items-center gap-0.5 ${tendencia.color}`}>
              <tendencia.icono className="h-3.5 w-3.5" /> {tendencia.texto}
            </span>
          </span>
        )}
        <span className="text-slate-500 dark:text-slate-400">
          Estabilidad: <span className="font-semibold text-slate-700 dark:text-slate-200">{estabilidad}</span>
        </span>
      </div>

      {(anomaliasMensuales.length > 0 || insightsTendencia.length > 0) && (
        <div className="flex flex-col gap-1.5">
          {anomaliasMensuales.map((a, idx) => (
            <span
              key={`anom-${idx}`}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Pico detectado en {a.etiqueta}
            </span>
          ))}
          {insightsTendencia.map((i, idx) => (
            <span
              key={`tend-${idx}`}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400"
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              {i.texto}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
