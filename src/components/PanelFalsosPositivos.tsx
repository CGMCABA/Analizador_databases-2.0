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
import { Ban } from "lucide-react";

interface PanelFalsosPositivosProps {
  totalFalsosPositivos: number;
  tasaFalsosPositivos: number;
  totalSolicitudes: number;
  tiposFalsosPositivos: { nombre: string; cantidad: number }[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: { nombre: string; cantidad: number } }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip" style={{ minWidth: 200 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, fontSize: 11, marginBottom: 6, lineHeight: 1.4 }}>
        {label}
      </p>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
        {item.cantidad.toLocaleString("es-AR")} registros
      </p>
    </div>
  );
};

function colorPorIndice(idx: number): string {
  const colores = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"];
  return colores[idx % colores.length];
}

function colorPorTasa(tasa: number): { bg: string; text: string; border: string } {
  if (tasa >= 30) return { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" };
  if (tasa >= 15) return { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" };
  return { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" };
}

export function PanelFalsosPositivos({
  totalFalsosPositivos,
  tasaFalsosPositivos,
  totalSolicitudes,
  tiposFalsosPositivos,
}: PanelFalsosPositivosProps) {
  if (totalFalsosPositivos === 0) return null;

  const col = colorPorTasa(tasaFalsosPositivos);
  const alturaGrafico = Math.max(160, tiposFalsosPositivos.length * 30 + 40);

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 animate-fade-in-up delay-150">
      <div className="flex items-center gap-2 mb-1">
        <Ban className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Falsos positivos operativos</h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 ml-6">
        Registros cerrados sin evento real confirmado — "no se visualiza", "sin novedad", etc.
      </p>

      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className={`shrink-0 rounded-xl border p-4 text-center min-w-[120px] ${col.bg} ${col.border}`}>
          <p className={`text-3xl font-bold ${col.text}`}>{tasaFalsosPositivos}%</p>
          <p className={`text-xs font-medium mt-1 ${col.text} opacity-80`}>del total</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {totalFalsosPositivos.toLocaleString("es-AR")} de {totalSolicitudes.toLocaleString("es-AR")} registros
          </p>
        </div>

        {tiposFalsosPositivos.length > 0 && (
          <div className="flex-1 w-full">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Distribución por tipo de cierre</p>
            <div className="chart-fade-in">
            <ResponsiveContainer width="100%" height={alturaGrafico}>
              <BarChart
                data={tiposFalsosPositivos}
                layout="vertical"
                margin={{ top: 2, right: 60, left: 8, bottom: 2 }}
                barSize={14}
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
                  width={140}
                  tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 21) + "…" : v}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                  {tiposFalsosPositivos.map((_, i) => (
                    <Cell key={i} fill={colorPorIndice(i)} />
                  ))}
                  <LabelList
                    dataKey="cantidad"
                    position="right"
                    style={{ fontSize: 10, fontWeight: 600, fill: "var(--recharts-label)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 border-t border-slate-100 dark:border-[#1f2535] pt-3">
        Estos registros representan eventos donde el operador no encontró el suceso real. Separarlos del análisis principal mejora la calidad de los indicadores de eficiencia.
      </p>
    </div>
  );
}
