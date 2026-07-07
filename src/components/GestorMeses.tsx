import { Calendar, AlertTriangle, RotateCcw } from "lucide-react";
import type { DatosDashboard } from "@/lib/excelParser";

interface GestorMesesProps {
  datos: DatosDashboard;
  mesesExcluidos: string[];
  onToggleMes: (mes: string) => void;
  onResetExclusiones: () => void;
}

function detectarOutliers(
  porMes: DatosDashboard["porMes"],
  mesesExcluidos: string[]
): string[] {
  if (porMes.length < 3) return [];
  const activos = porMes.filter((m) => !mesesExcluidos.includes(m.mes));
  if (activos.length < 2) return [];
  const total = activos.reduce((s, m) => s + m.cantidad, 0);
  const promedio = total / activos.length;
  return activos
    .filter((m) => m.cantidad < promedio * 0.25)
    .map((m) => m.mes);
}

export function GestorMeses({
  datos,
  mesesExcluidos,
  onToggleMes,
  onResetExclusiones,
}: GestorMesesProps) {
  if (datos.meses.length <= 1) return null;

  const totalMeses  = datos.meses.length;
  const activosMeses = totalMeses - mesesExcluidos.length;
  const hayExcluidos = mesesExcluidos.length > 0;
  const outliers = detectarOutliers(datos.porMes, mesesExcluidos);

  return (
    <div className="bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] p-4 animate-fade-in-up print:hidden">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[rgba(200,168,75,0.10)] rounded-lg shrink-0">
            <Calendar className="h-3.5 w-3.5 text-[#c8a84b]" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Períodos del dataset
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {activosMeses} de {totalMeses} activos
          </span>
          {hayExcluidos && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              Filtro temporal activo
            </span>
          )}
        </div>
        {hayExcluidos && (
          <button
            onClick={onResetExclusiones}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-[#252d3d] hover:bg-slate-200 dark:hover:bg-[#2e3852] border border-slate-200 dark:border-[#2e3852] px-2.5 py-1 rounded-md transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar todos
          </button>
        )}
      </div>

      {/* Pills de meses */}
      <div className="flex flex-wrap gap-1.5">
        {datos.meses.map((mes) => {
          const excluido  = mesesExcluidos.includes(mes);
          const esOutlier = !excluido && outliers.includes(mes);
          const entry     = datos.porMes.find((pm) => pm.mes === mes);
          const cantidad  = entry?.cantidad ?? 0;

          return (
            <button
              key={mes}
              onClick={() => onToggleMes(mes)}
              disabled={!excluido && activosMeses === 1}
              title={
                excluido
                  ? `Activar ${mes} (${cantidad.toLocaleString("es-AR")} registros)`
                  : `Excluir ${mes} del análisis (${cantidad.toLocaleString("es-AR")} registros)`
              }
              className={[
                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                excluido
                  ? "bg-slate-100 dark:bg-[#252d3d] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#2e3852] line-through"
                  : esOutlier
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
              ].join(" ")}
            >
              {esOutlier && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
              {mes}
            </button>
          );
        })}
      </div>

      {/* Sugerencia de outliers (solo si no están ya excluidos) */}
      {outliers.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-900/40 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {outliers.length === 1 ? (
              <>
                <strong>{outliers[0]}</strong> tiene{" "}
                {(datos.porMes.find((m) => m.mes === outliers[0])?.cantidad ?? 0).toLocaleString("es-AR")}{" "}
                registros (
                {Math.round(
                  ((datos.porMes.find((m) => m.mes === outliers[0])?.cantidad ?? 0) /
                    datos.totalSolicitudes) *
                    100
                )}
                % del total). Considerá excluirlo del análisis temporal.
              </>
            ) : (
              <>
                {outliers.join(", ")} tienen volúmenes significativamente menores al resto.
                Considerá excluirlos del análisis temporal.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
