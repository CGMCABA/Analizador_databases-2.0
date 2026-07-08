import { useState, useEffect } from "react";
import { CruceAutomatico } from "@/lib/excelParser";
import { LayoutGrid } from "lucide-react";

interface GraficoCruceHeatmapProps {
  cruce: CruceAutomatico;
  totalSolicitudes: number;
}

export function GraficoCruceHeatmap({ cruce, totalSolicitudes }: GraficoCruceHeatmapProps) {
  const [montado, setMontado] = useState(false);
  const [tooltip, setTooltip] = useState<{ fila: string; col: string; val: number; x: number; y: number } | null>(null);
  useEffect(() => { setMontado(true); }, []);

  const { filas, columnas, valores } = cruce;

  // Compute max value for color scaling
  const maxVal = Math.max(...valores.flatMap((row) => row), 1);

  // Compute row totals for the side bar
  const rowTotals = valores.map((row) => row.reduce((a, b) => a + b, 0));
  const maxRowTotal = Math.max(...rowTotals, 1);

  const getColor = (val: number): string => {
    if (val === 0) return "var(--heatmap-zero, rgba(148,163,184,0.08))";
    const ratio = val / maxVal;
    if (ratio >= 0.85) return "hsl(28, 90%, 48%)";
    if (ratio >= 0.65) return "hsl(220, 80%, 40%)";
    if (ratio >= 0.40) return "hsl(220, 70%, 55%)";
    if (ratio >= 0.20) return "hsl(220, 60%, 68%)";
    return "hsl(220, 45%, 80%)";
  };

  const getTextColor = (val: number): string => {
    if (val === 0) return "transparent";
    const ratio = val / maxVal;
    return ratio >= 0.35 ? "#fff" : "rgb(30,41,59)";
  };

  return (
    <div
      className={`bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
          <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{cruce.titulo}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Cruce automático · Intensidad de color = frecuencia relativa
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: columnas.length * 48 + 200 }}>
          <thead>
            <tr>
              <th className="text-left text-slate-500 dark:text-slate-400 font-medium pb-2 pr-3 whitespace-nowrap" style={{ minWidth: 160 }}>
              </th>
              {columnas.map((col) => (
                <th
                  key={col}
                  className="text-center text-slate-500 dark:text-slate-400 font-medium pb-2 px-0.5"
                  style={{ minWidth: 44 }}
                >
                  {col}
                </th>
              ))}
              <th className="text-right text-slate-500 dark:text-slate-400 font-medium pb-2 pl-3 whitespace-nowrap" style={{ minWidth: 60 }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, fi) => (
              <tr key={fila} className="group">
                <td
                  className="pr-3 py-0.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap overflow-hidden"
                  style={{ maxWidth: 180, textOverflow: "ellipsis" }}
                  title={fila}
                >
                  {fila.length > 28 ? fila.slice(0, 26) + "…" : fila}
                </td>
                {columnas.map((col, ci) => {
                  const val = valores[fi][ci];
                  return (
                    <td key={col} className="px-0.5 py-0.5 text-center relative">
                      <div
                        className="rounded cursor-default transition-transform hover:scale-110 hover:z-10 flex items-center justify-center"
                        style={{
                          background: getColor(val),
                          color: getTextColor(val),
                          width: 40,
                          height: 26,
                          margin: "0 auto",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                        onMouseEnter={(e) =>
                          setTooltip({
                            fila,
                            col,
                            val,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {val > 0 ? val : ""}
                      </div>
                    </td>
                  );
                })}
                <td className="pl-3 py-0.5 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div
                      className="rounded-sm"
                      style={{
                        background: "hsl(220, 65%, 55%)",
                        opacity: 0.3 + 0.7 * (rowTotals[fi] / maxRowTotal),
                        width: Math.max(4, Math.round(40 * (rowTotals[fi] / maxRowTotal))),
                        height: 8,
                      }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 font-semibold text-xs tabular-nums">
                      {rowTotals[fi].toLocaleString("es-AR")}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-100 dark:border-[#1f2535]">
              <td className="pt-2 pr-3 text-slate-400 dark:text-slate-500 text-xs font-medium">Total col.</td>
              {columnas.map((col, ci) => {
                const colTotal = filas.reduce((sum, _, fi) => sum + valores[fi][ci], 0);
                return (
                  <td key={col} className="pt-2 px-0.5 text-center">
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums font-medium">{colTotal > 0 ? colTotal.toLocaleString("es-AR") : ""}</span>
                  </td>
                );
              })}
              <td className="pt-2 pl-3 text-right">
                <span className="text-slate-700 dark:text-slate-200 font-bold tabular-nums">
                  {totalSolicitudes.toLocaleString("es-AR")}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(28, 90%, 48%)" }} />
          Muy frecuente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(220, 70%, 55%)" }} />
          Frecuente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(220, 45%, 80%)" }} />
          Poco frecuente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 dark:bg-[#252d3d] border border-slate-200 dark:border-[#2e3852]" />
          Sin datos
        </span>
      </div>

      {tooltip && tooltip.val > 0 && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          <div className="chart-tooltip">
            <p className="font-semibold" style={{ color: "var(--tooltip-text)" }}>{tooltip.fila}</p>
            <p style={{ color: "var(--tooltip-muted)" }}>
              {tooltip.col}:{" "}
              <strong style={{ color: "var(--tooltip-text)" }}>
                {tooltip.val.toLocaleString("es-AR")}
              </strong>
              {totalSolicitudes > 0 && (
                <> ({Math.round((tooltip.val / totalSolicitudes) * 100)}%)</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
