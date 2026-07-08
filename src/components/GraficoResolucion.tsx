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
import { ItemResolucion } from "@/lib/excelParser";

interface GraficoResolucionProps {
  porMotivo: ItemResolucion[];
  porArea: ItemResolucion[];
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  dataKey: string;
  color: string;
  payload: ItemResolucion;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as ItemResolucion;
  return (
    <div className="chart-tooltip" style={{ minWidth: 180 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, fontSize: 11, lineHeight: 1.4, marginBottom: 8 }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "var(--tooltip-muted)" }}>Total:</span>
          <span style={{ color: "var(--tooltip-text)", fontWeight: 600 }}>{item.total}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#10b981" }}>Resueltas:</span>
          <span style={{ color: "#10b981", fontWeight: 600 }}>{item.resueltas}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#ef4444" }}>Sin resolver:</span>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>{item.noResueltas}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid var(--tooltip-border)", paddingTop: 4, marginTop: 2 }}>
          <span style={{ color: "var(--tooltip-muted)" }}>Tasa:</span>
          <span style={{
            fontWeight: 700,
            color: item.tasa >= 70 ? "#10b981" : item.tasa >= 40 ? "#f59e0b" : "#ef4444"
          }}>
            {item.tasa}%
          </span>
        </div>
      </div>
    </div>
  );
};

function colorPorTasa(tasa: number): string {
  if (tasa >= 75) return "#10b981";
  if (tasa >= 50) return "#3b82f6";
  if (tasa >= 25) return "#f59e0b";
  return "#ef4444";
}

function GraficoHorizontal({ datos, altura }: { datos: ItemResolucion[]; altura: number }) {
  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
        Sin datos suficientes
      </div>
    );
  }

  const datosConColor = datos.map((d) => ({
    ...d,
    color: colorPorTasa(d.tasa),
  }));

  return (
    <div className="chart-fade-in">
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={datosConColor}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        barSize={14}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={{ fontSize: 10, fill: "var(--recharts-label)" }}
          tickLine={false}
          axisLine={false}
          width={130}
          tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 19) + "…" : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
        <Bar dataKey="tasa" radius={[0, 4, 4, 0]}>
          {datosConColor.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          <LabelList
            dataKey="tasa"
            position="right"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 10, fontWeight: 600, fill: "var(--recharts-label)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}

export function GraficoResolucion({ porMotivo, porArea }: GraficoResolucionProps) {
  const [vista, setVista] = useState<"motivo" | "area">("motivo");

  const datos = vista === "motivo" ? porMotivo : porArea;
  const alturaGrafico = Math.max(180, datos.length * 28 + 40);

  const mejores = datos.slice(0, 3);
  const peores = [...datos].reverse().slice(0, 3);

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 animate-fade-in-up delay-100">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tasa de Resolución por Categoría</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            % de registros resueltos según {vista === "motivo" ? "tipo de motivo" : "área asignada"} · ordenado de mayor a menor
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-[#252d3d] rounded-lg p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => setVista("motivo")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              vista === "motivo"
                ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            Por motivo
          </button>
          <button
            onClick={() => setVista("area")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              vista === "area"
                ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            Por área
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            Mejor resolución
          </p>
          <div className="space-y-1.5">
            {mejores.map((item) => (
              <div key={item.nombre} className="flex items-center justify-between gap-2">
                <span className="text-xs text-green-800 dark:text-green-300 truncate" title={item.nombre}>
                  {item.nombre.length > 22 ? item.nombre.slice(0, 21) + "…" : item.nombre}
                </span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 shrink-0">{item.tasa}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Menor resolución
          </p>
          <div className="space-y-1.5">
            {peores.map((item) => (
              <div key={item.nombre} className="flex items-center justify-between gap-2">
                <span className="text-xs text-red-800 dark:text-red-300 truncate" title={item.nombre}>
                  {item.nombre.length > 22 ? item.nombre.slice(0, 21) + "…" : item.nombre}
                </span>
                <span className="text-xs font-bold text-red-700 dark:text-red-400 shrink-0">{item.tasa}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-[#1f2535] pt-4">
        <div className="flex items-center gap-4 mb-3 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-green-500" /> ≥ 75%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-blue-500" /> 50–74%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-amber-500" /> 25–49%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-red-500" /> &lt; 25%
          </span>
        </div>
        <GraficoHorizontal datos={datos} altura={alturaGrafico} />
      </div>
    </div>
  );
}
