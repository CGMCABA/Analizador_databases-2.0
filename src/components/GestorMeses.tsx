import { Calendar, AlertTriangle, RotateCcw, Check, X } from "lucide-react";
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

  const totalMeses   = datos.meses.length;
  const activosMeses = totalMeses - mesesExcluidos.length;
  const hayExcluidos = mesesExcluidos.length > 0;
  const outliers     = detectarOutliers(datos.porMes, mesesExcluidos);

  return (
    <div className="bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] p-4 animate-fade-in-up print:hidden">

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-[rgba(200,168,75,0.10)] rounded-lg shrink-0 mt-0.5">
            <Calendar className="h-3.5 w-3.5 text-[#c8a84b]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Meses incluidos en el análisis
              </span>
              {hayExcluidos ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                  Filtro temporal activo
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {hayExcluidos
                ? `${activosMeses} de ${totalMeses} meses incluidos · ${mesesExcluidos.length} período${mesesExcluidos.length > 1 ? "s" : ""} excluido${mesesExcluidos.length > 1 ? "s" : ""} — click en un chip para incluirlo o excluirlo`
                : `${activosMeses} de ${totalMeses} meses incluidos — click en un chip para excluirlo del análisis`}
            </p>
          </div>
        </div>

        {hayExcluidos && (
          <button
            onClick={onResetExclusiones}
            className="shrink-0 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-[#252d3d] hover:bg-slate-200 dark:hover:bg-[#2e3852] border border-slate-200 dark:border-[#2e3852] px-2.5 py-1.5 rounded-md transition-colors font-medium cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar todos
          </button>
        )}
      </div>

      {/* ── Chips de meses ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {datos.meses.map((mes) => {
          const excluido    = mesesExcluidos.includes(mes);
          const esOutlier   = !excluido && outliers.includes(mes);
          const esUltimoActivo = !excluido && activosMeses === 1;
          const entry       = datos.porMes.find((pm) => pm.mes === mes);
          const cantidad    = entry?.cantidad ?? 0;

          return (
            <button
              key={mes}
              onClick={() => onToggleMes(mes)}
              disabled={esUltimoActivo}
              title={
                esUltimoActivo
                  ? `${mes} es el único mes activo — no se puede excluir`
                  : excluido
                  ? `Restaurar ${mes} al análisis (${cantidad.toLocaleString("es-AR")} registros)`
                  : `Excluir ${mes} del análisis (${cantidad.toLocaleString("es-AR")} registros)`
              }
              className={[
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border",
                "transition-all duration-150 cursor-pointer select-none",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
                excluido
                  ? "bg-slate-100 dark:bg-[#1a1f2e] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#2e3852] line-through hover:bg-slate-200 dark:hover:bg-[#252d3d] hover:text-slate-500 dark:hover:text-slate-400"
                  : esOutlier
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/35 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm"
                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/35 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm",
              ].join(" ")}
            >
              {excluido ? (
                <X className="h-3 w-3 shrink-0 opacity-70" />
              ) : esOutlier ? (
                <AlertTriangle className="h-3 w-3 shrink-0" />
              ) : (
                <Check className="h-3 w-3 shrink-0" />
              )}
              {mes}
              {cantidad > 0 && (
                <span className={[
                  "text-[10px] font-normal tabular-nums",
                  excluido ? "opacity-60" : "opacity-75",
                ].join(" ")}>
                  {cantidad.toLocaleString("es-AR")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sugerencia de outliers ───────────────────────────────────────── */}
      {outliers.length > 0 && (
        <div className="mt-3 flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-900/40 rounded-lg px-3 py-2.5">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
              {outliers.length === 1 ? (
                <>
                  <strong>{outliers[0]}</strong> tiene solo{" "}
                  {(datos.porMes.find((m) => m.mes === outliers[0])?.cantidad ?? 0).toLocaleString("es-AR")}{" "}
                  registros (
                  {Math.round(
                    ((datos.porMes.find((m) => m.mes === outliers[0])?.cantidad ?? 0) /
                      Math.max(datos.totalSolicitudes, 1)) *
                      100
                  )}
                  % del total). Volumen anómalo — puede distorsionar el análisis temporal.
                </>
              ) : (
                <>
                  <strong>{outliers.join(", ")}</strong> tienen volúmenes significativamente menores al resto del dataset.
                  Pueden distorsionar el análisis temporal.
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => outliers.forEach((m) => onToggleMes(m))}
            className="shrink-0 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            Excluir {outliers.length === 1 ? "este mes" : `estos ${outliers.length} meses`}
          </button>
        </div>
      )}
    </div>
  );
}
