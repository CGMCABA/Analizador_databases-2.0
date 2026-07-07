import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface DatoItem {
  nombre: string;
  cantidad: number;
}

interface GraficoRankingHProps {
  datos: DatoItem[];
  titulo: string;
  subtitulo?: string;
  totalGlobal: number;
  acento?: "blue" | "violet" | "green";
  limiteInicial?: number;
  alturaFila?: number;
}

interface TooltipPayloadEntry {
  payload: DatoItem & { pct: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const LIMITES = [10, 20, "Todos"] as const;

function colorPorRango(i: number, total: number, acento: "blue" | "violet" | "green"): string {
  const ratio = total > 1 ? i / (total - 1) : 0;
  if (acento === "blue") {
    const l = Math.round(28 + ratio * 34);
    return `hsl(220, 78%, ${l}%)`;
  }
  if (acento === "violet") {
    const l = Math.round(28 + ratio * 34);
    return `hsl(260, 62%, ${l}%)`;
  }
  const l = Math.round(28 + ratio * 34);
  return `hsl(152, 65%, ${l}%)`;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip" style={{ maxWidth: 260 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, fontSize: 11, lineHeight: 1.4, marginBottom: 6 }}>
        {label}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <span style={{ color: "var(--tooltip-muted)" }}>Registros:</span>
        <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
          {item.cantidad.toLocaleString("es-AR")}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 4 }}>
        <span style={{ color: "var(--tooltip-muted)" }}>Del total:</span>
        <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>{item.pct}%</span>
      </div>
    </div>
  );
};

export function GraficoRankingH({
  datos,
  titulo,
  subtitulo,
  totalGlobal,
  acento = "blue",
  limiteInicial = 10,
  alturaFila = 26,
}: GraficoRankingHProps) {
  const [limite, setLimite] = useState<number | "Todos">(limiteInicial);

  const sorted = [...datos].sort((a, b) => b.cantidad - a.cantidad);
  const datosSlice = limite === "Todos" ? sorted : sorted.slice(0, limite);
  const alturaGrafico = Math.max(180, datosSlice.length * alturaFila + 40);

  const datosConPct = datosSlice.map((d) => ({
    ...d,
    pct: totalGlobal > 0 ? Math.round((d.cantidad / totalGlobal) * 100) : 0,
  }));

  const primero = sorted[0];
  const pctPrimero = primero && totalGlobal > 0
    ? Math.round((primero.cantidad / totalGlobal) * 100) : 0;

  return (
    <div className="bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] shadow-sm p-5 animate-fade-in-up delay-75">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
          {subtitulo && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitulo}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 dark:bg-[#252d3d] rounded-lg p-0.5 gap-0.5">
            {LIMITES.filter((l) => l === "Todos" || (typeof l === "number" && l <= sorted.length)).map((l) => (
              <button
                key={l}
                onClick={() => setLimite(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  limite === l
                    ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {l === "Todos" ? "Todos" : `Top ${l}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {primero && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{sorted.length}</span> categorías distintas
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Mayor:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200 max-w-[180px] inline-block truncate align-bottom" title={primero.nombre}>
              {primero.nombre.length > 28 ? primero.nombre.slice(0, 27) + "…" : primero.nombre}
            </span>{" "}
            <span className="text-slate-400">({pctPrimero}%)</span>
          </span>
        </div>
      )}

      <div className="chart-fade-in">
      <ResponsiveContainer width="100%" height={alturaGrafico}>
        <BarChart
          data={datosConPct}
          layout="vertical"
          margin={{ top: 2, right: 90, left: 8, bottom: 2 }}
          barSize={Math.min(18, alturaFila - 8)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={{ fontSize: 10, fill: "var(--recharts-label)" }}
            tickLine={false}
            axisLine={false}
            width={160}
            tickFormatter={(v: string) => v.length > 28 ? v.slice(0, 27) + "…" : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
            {datosConPct.map((_, i) => (
              <Cell key={i} fill={colorPorRango(i, datosConPct.length, acento)} />
            ))}
            <LabelList
              dataKey="cantidad"
              content={({ x, y, width, height, index }: {
                x?: number; y?: number; width?: number; height?: number; index?: number;
              }) => {
                const item = datosConPct[index ?? 0];
                if (!item) return null;
                const label = `${item.cantidad.toLocaleString("es-AR")} · ${item.pct}%`;
                return (
                  <text
                    x={(x ?? 0) + (width ?? 0) + 6}
                    y={(y ?? 0) + (height ?? 0) / 2}
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight={700}
                    fill="var(--recharts-label)"
                  >
                    {label}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
