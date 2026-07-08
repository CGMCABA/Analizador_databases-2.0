import { useState, useEffect, useMemo, useCallback } from "react";
import { Solicitud } from "@/lib/excelParser";
import { useDarkMode } from "@/hooks/useDarkMode";
import { LayoutGrid } from "lucide-react";

interface GraficoCruceProps {
  solicitudes: Solicitud[];
  meses: string[];
  porMotivo: { nombre: string; cantidad: number }[];
  limiteInicial?: number;
  colNombreFila?: string;
}

interface TooltipState {
  motivo: string;
  mes: string;
  count: number;
  total: number;
  x: number;
  y: number;
}

const LIMITES = [10, 15, 20] as const;

function colorCelda(ratio: number, isDark: boolean): string {
  if (ratio <= 0) return "transparent";
  const alpha = 0.06 + ratio * 0.86;
  return isDark
    ? `rgba(96, 165, 250, ${alpha.toFixed(3)})`
    : `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
}

function textoColor(ratio: number): string {
  return ratio >= 0.52 ? "#fff" : "";
}

function mesCorto(mes: string): string {
  const partes = mes.split(" ");
  if (partes.length >= 2) {
    return partes[0].slice(0, 3) + " " + partes[1].slice(2);
  }
  return partes[0].slice(0, 3);
}

export function GraficoCruce({ solicitudes, meses, porMotivo, limiteInicial = 10, colNombreFila = "Motivo" }: GraficoCruceProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const [limite, setLimite] = useState<number>(limiteInicial);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { isDark } = useDarkMode();

  const { filas, matrix, maxPorFila, totalesPorFila } = useMemo(() => {
    const filas = porMotivo.slice(0, limite).map((m) => m.nombre);
    const matrix = new Map<string, Map<string, number>>();
    filas.forEach((m) => matrix.set(m, new Map()));

    solicitudes.forEach((s) => {
      if (!matrix.has(s.motivo)) return;
      const row = matrix.get(s.motivo)!;
      row.set(s.mes, (row.get(s.mes) ?? 0) + 1);
    });

    const maxPorFila = new Map<string, number>();
    const totalesPorFila = new Map<string, number>();
    filas.forEach((m) => {
      const vals = Array.from(matrix.get(m)?.values() ?? []);
      maxPorFila.set(m, vals.length ? Math.max(...vals, 1) : 1);
      totalesPorFila.set(m, vals.reduce((a, b) => a + b, 0));
    });

    return { filas, matrix, maxPorFila, totalesPorFila };
  }, [solicitudes, porMotivo, limite]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, motivo: string, mes: string, count: number) => {
      const total = totalesPorFila.get(motivo) ?? 0;
      setTooltip({ motivo, mes, count, total, x: e.clientX, y: e.clientY });
    },
    [totalesPorFila]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (meses.length < 2 || porMotivo.length < 2) return null;

  const validLimites = LIMITES.filter((l) => l <= porMotivo.length);

  const pctTooltip =
    tooltip && tooltip.total > 0
      ? Math.round((tooltip.count / tooltip.total) * 100)
      : 0;

  return (
    <div
      className={`bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Evolución de problemáticas por mes
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Registros por {colNombreFila.toLowerCase()} en cada mes · intensidad normalizada por fila
            </p>
          </div>
        </div>
        {validLimites.length > 1 && (
          <div className="flex bg-slate-100 dark:bg-[#252d3d] rounded-lg p-0.5 gap-0.5 shrink-0">
            {validLimites.map((l) => (
              <button
                key={l}
                onClick={() => setLimite(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  limite === l
                    ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Top {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-[#1f2535]">
        <table className="min-w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 196 }} />
            {meses.map((m) => (
              <col key={m} style={{ width: 60 }} />
            ))}
            <col style={{ width: 56 }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0d0f14]/50">
              <th
                className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-[#1f2535] sticky left-0 bg-slate-50 dark:bg-[#0d0f14]/80 z-10"
                style={{ minWidth: 196 }}
              >
                {colNombreFila}
              </th>
              {meses.map((m) => (
                <th
                  key={m}
                  className="text-center px-1 py-2 font-medium text-slate-500 dark:text-slate-400 border-b border-r border-slate-200 dark:border-[#1f2535] whitespace-nowrap"
                >
                  {mesCorto(m)}
                </th>
              ))}
              <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-[#1f2535]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((motivo, rowIdx) => {
              const rowMap = matrix.get(motivo) ?? new Map<string, number>();
              const maxRow = maxPorFila.get(motivo) ?? 1;
              const totalRow = totalesPorFila.get(motivo) ?? 0;
              return (
                <tr
                  key={motivo}
                  className={`${rowIdx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-[#0d0f14]/20"} hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors`}
                >
                  <td
                    className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-[#1f2535] sticky left-0 bg-slate-50 dark:bg-[#0d0f14] z-10 truncate"
                    title={motivo}
                    style={{ maxWidth: 196 }}
                  >
                    {motivo.length > 28 ? motivo.slice(0, 27) + "…" : motivo}
                  </td>
                  {meses.map((mes) => {
                    const count = rowMap.get(mes) ?? 0;
                    const ratio = count > 0 ? count / maxRow : 0;
                    const bg = colorCelda(ratio, isDark);
                    const fg = textoColor(ratio);
                    return (
                      <td
                        key={mes}
                        className="text-center py-1.5 border-r border-slate-100 dark:border-[#1f2535]/50 cursor-default select-none transition-opacity"
                        style={{ backgroundColor: bg }}
                        onMouseEnter={(e) => count > 0 && handleMouseEnter(e, motivo, mes, count)}
                        onMouseMove={(e) => count > 0 && handleMouseMove(e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {count > 0 ? (
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: fg || undefined, fontSize: 11 }}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600" style={{ fontSize: 10 }}>
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center py-1.5 font-bold text-slate-700 dark:text-slate-200 text-xs tabular-nums">
                    {totalRow.toLocaleString("es-AR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs text-slate-400 dark:text-slate-500">Menor</span>
        {[0.06, 0.28, 0.50, 0.72, 0.92].map((r) => (
          <div
            key={r}
            className="w-5 h-3 rounded-sm"
            style={{ backgroundColor: colorCelda(r, isDark), border: "1px solid rgba(148,163,184,0.2)" }}
          />
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500">Mayor</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
          (intensidad relativa al máximo de cada fila)
        </span>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
        >
          <div className="chart-tooltip" style={{ minWidth: 200 }}>
            <p
              style={{
                color: "var(--tooltip-text)",
                fontWeight: 600,
                fontSize: 11,
                lineHeight: 1.4,
                marginBottom: 8,
                maxWidth: 220,
              }}
            >
              {tooltip.motivo}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--tooltip-muted)" }}>Mes:</span>
                <span style={{ color: "var(--tooltip-text)", fontWeight: 600 }}>{tooltip.mes}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--tooltip-muted)" }}>Registros:</span>
                <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
                  {tooltip.count.toLocaleString("es-AR")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  borderTop: "1px solid var(--tooltip-border)",
                  paddingTop: 4,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "var(--tooltip-muted)" }}>% del motivo:</span>
                <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>{pctTooltip}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
