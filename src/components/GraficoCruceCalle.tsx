import { useState, useEffect, useMemo, useCallback } from "react";
import { RegistroGenerico } from "@/lib/excelParser";
import { useDarkMode } from "@/hooks/useDarkMode";
import { MapPin } from "lucide-react";

interface GraficoCruceCalleProps {
  registros: RegistroGenerico[];
  porMotivo: { nombre: string; cantidad: number }[];
  porCalle1Ranking: { nombre: string; cantidad: number }[];
  colNombreFila: string | null;
  colNombreMotivo: string | null;
  limiteInicial?: number;
}

interface TooltipState {
  fila: string;
  columna: string;
  count: number;
  totalFila: number;
  x: number;
  y: number;
}

const LIMITES_FILA = [10, 15, 20] as const;
const MAX_MOTIVOS_COL = 10;

function colorCelda(ratio: number, isDark: boolean): string {
  if (ratio <= 0) return "transparent";
  const alpha = 0.06 + ratio * 0.86;
  return isDark
    ? `rgba(167, 139, 250, ${alpha.toFixed(3)})`
    : `rgba(109, 40, 217, ${alpha.toFixed(3)})`;
}

function textoColor(ratio: number): string {
  return ratio >= 0.52 ? "#fff" : "";
}

export function GraficoCruceCalle({
  registros,
  porMotivo,
  porCalle1Ranking,
  colNombreFila,
  colNombreMotivo,
  limiteInicial = 10,
}: GraficoCruceCalleProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const [limiteFila, setLimiteFila] = useState<number>(limiteInicial);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { isDark } = useDarkMode();

  const columnas = useMemo(
    () => porMotivo.slice(0, MAX_MOTIVOS_COL).map((m) => m.nombre),
    [porMotivo]
  );

  const { filas, matrix, maxPorFila, totalesPorFila } = useMemo(() => {
    if (!colNombreFila || !colNombreMotivo) {
      return { filas: [], matrix: new Map<string, Map<string, number>>(), maxPorFila: new Map(), totalesPorFila: new Map() };
    }
    const filas = porCalle1Ranking.slice(0, limiteFila).map((c) => c.nombre);
    const colSet = new Set(columnas);
    const filasSet = new Set(filas);
    const matrix = new Map<string, Map<string, number>>();
    filas.forEach((c) => matrix.set(c, new Map()));

    const normalizar = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");

    registros.forEach((reg) => {
      const filaVal = normalizar(reg.valores[colNombreFila] ?? "");
      if (!filaVal || !filasSet.has(filaVal)) return;
      const colVal = (reg.valores[colNombreMotivo] ?? "").trim();
      if (!colSet.has(colVal)) return;
      const row = matrix.get(filaVal)!;
      row.set(colVal, (row.get(colVal) ?? 0) + 1);
    });

    const maxPorFila = new Map<string, number>();
    const totalesPorFila = new Map<string, number>();
    filas.forEach((c) => {
      const vals = Array.from(matrix.get(c)?.values() ?? []);
      maxPorFila.set(c, vals.length ? Math.max(...vals, 1) : 1);
      totalesPorFila.set(c, vals.reduce((a, b) => a + b, 0));
    });

    return { filas, matrix, maxPorFila, totalesPorFila };
  }, [registros, porCalle1Ranking, columnas, limiteFila, colNombreFila, colNombreMotivo]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, fila: string, columna: string, count: number) => {
      setTooltip({
        fila,
        columna,
        count,
        totalFila: totalesPorFila.get(fila) ?? 0,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [totalesPorFila]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (porCalle1Ranking.length < 2 || porMotivo.length < 2 || !colNombreFila || !colNombreMotivo) return null;

  const validLimites = LIMITES_FILA.filter((l) => l <= porCalle1Ranking.length);

  const pctTooltip =
    tooltip && tooltip.totalFila > 0
      ? Math.round((tooltip.count / tooltip.totalFila) * 100)
      : 0;

  const labelFila = colNombreFila.length > 16 ? colNombreFila.slice(0, 15) + "…" : colNombreFila;
  const labelMotivo = colNombreMotivo.length > 20 ? colNombreMotivo.slice(0, 19) + "…" : colNombreMotivo;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 transition-opacity duration-500 ${
        montado ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-violet-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {labelMotivo} por {labelFila}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Top {MAX_MOTIVOS_COL} valores de {labelMotivo} · intensidad normalizada por fila
            </p>
          </div>
        </div>
        {validLimites.length > 1 && (
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5 shrink-0">
            {validLimites.map((l) => (
              <button
                key={l}
                onClick={() => setLimiteFila(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  limiteFila === l
                    ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Top {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-700">
        <table className="min-w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 180 }} />
            {columnas.map((m) => (
              <col key={m} style={{ width: 64 }} />
            ))}
            <col style={{ width: 54 }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th
                className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-50 dark:bg-slate-900/80 z-10"
                style={{ minWidth: 180 }}
              >
                {labelFila}
              </th>
              {columnas.map((col) => (
                <th
                  key={col}
                  className="text-center px-1 py-2 font-medium text-slate-500 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700"
                  title={col}
                >
                  <span
                    className="block truncate"
                    style={{ maxWidth: 60, fontSize: 10 }}
                  >
                    {col.length > 9 ? col.slice(0, 8) + "…" : col}
                  </span>
                </th>
              ))}
              <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, rowIdx) => {
              const rowMap = matrix.get(fila) ?? new Map<string, number>();
              const maxRow = maxPorFila.get(fila) ?? 1;
              const totalRow = totalesPorFila.get(fila) ?? 0;
              return (
                <tr
                  key={fila}
                  className={`${
                    rowIdx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/20"
                  } hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors`}
                >
                  <td
                    className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 z-10 truncate"
                    title={fila}
                    style={{ maxWidth: 180 }}
                  >
                    {fila.length > 24 ? fila.slice(0, 23) + "…" : fila}
                  </td>
                  {columnas.map((col) => {
                    const count = rowMap.get(col) ?? 0;
                    const ratio = count > 0 ? count / maxRow : 0;
                    const bg = colorCelda(ratio, isDark);
                    const fg = textoColor(ratio);
                    return (
                      <td
                        key={col}
                        className="text-center py-1.5 border-r border-slate-100 dark:border-slate-700/50 cursor-default select-none"
                        style={{ backgroundColor: bg }}
                        onMouseEnter={(e) =>
                          count > 0 && handleMouseEnter(e, fila, col, count)
                        }
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
                          <span
                            className="text-slate-300 dark:text-slate-600"
                            style={{ fontSize: 10 }}
                          >
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
        {[0.06, 0.28, 0.5, 0.72, 0.92].map((r) => (
          <div
            key={r}
            className="w-5 h-3 rounded-sm"
            style={{
              backgroundColor: colorCelda(r, isDark),
              border: "1px solid rgba(148,163,184,0.2)",
            }}
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
          <div className="chart-tooltip" style={{ minWidth: 210 }}>
            <p
              style={{
                color: "var(--tooltip-text)",
                fontWeight: 600,
                fontSize: 11,
                lineHeight: 1.4,
                marginBottom: 8,
                maxWidth: 230,
              }}
            >
              {tooltip.fila}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--tooltip-muted)" }}>{labelMotivo}:</span>
                <span
                  style={{
                    color: "var(--tooltip-text)",
                    fontWeight: 600,
                    maxWidth: 140,
                    textAlign: "right",
                    lineHeight: 1.3,
                  }}
                >
                  {tooltip.columna}
                </span>
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
                <span style={{ color: "var(--tooltip-muted)" }}>% de {labelFila}:</span>
                <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
                  {pctTooltip}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
