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
import { Calendar } from "lucide-react";

interface DatoDia {
  dia: string;
  cantidad: number;
}

interface GraficoHeatmapProps {
  datos: DatoDia[];
  topMotivoPorDia?: Record<string, string>;
  totalSolicitudes?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: DatoDia }[];
  label?: string;
  topMotivoPorDia?: Record<string, string>;
  totalSolicitudes?: number;
}

const CustomTooltip = ({ active, payload, label, topMotivoPorDia, totalSolicitudes }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const cantidad = payload[0].value;
  const motivo = label && topMotivoPorDia ? topMotivoPorDia[label] : undefined;
  const pct = totalSolicitudes && totalSolicitudes > 0
    ? Math.round((cantidad / totalSolicitudes) * 100)
    : undefined;
  return (
    <div className="chart-tooltip">
      <p style={{ color: "var(--tooltip-text)", fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--tooltip-muted)" }}>
        Registros:{" "}
        <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
          {cantidad.toLocaleString("es-AR")}
        </span>
        {pct !== undefined && (
          <span style={{ color: "var(--tooltip-muted)", fontWeight: 400 }}>
            {" "}· <strong style={{ color: "var(--tooltip-text)" }}>{pct}%</strong> del total
          </span>
        )}
      </p>
      {motivo && (
        <p style={{ color: "var(--tooltip-muted)", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--tooltip-border)", fontSize: 11 }}>
          Motivo más frecuente:{" "}
          <strong style={{ color: "var(--tooltip-text)" }}>{motivo}</strong>
        </p>
      )}
    </div>
  );
};

function colorPorIntensidad(valor: number, max: number): string {
  const ratio = max > 0 ? valor / max : 0;
  if (ratio >= 0.8) return "#1e3a8a";
  if (ratio >= 0.6) return "#1d4ed8";
  if (ratio >= 0.4) return "#3b82f6";
  if (ratio >= 0.2) return "#60a5fa";
  return "#bfdbfe";
}

export function GraficoHeatmap({ datos, topMotivoPorDia, totalSolicitudes }: GraficoHeatmapProps) {
  if (datos.length < 7) return null;

  const max = Math.max(...datos.map((d) => d.cantidad));

  return (
    <div className="bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] shadow-sm p-5 animate-fade-in-up delay-75">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-blue-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Registros por día de la semana</h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 ml-6">
        Distribución de registros según el día en que se recibieron
      </p>

      <div className="chart-fade-in">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
          barSize={22}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="dia"
            tick={{ fontSize: 12, fill: "var(--recharts-label)", fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip topMotivoPorDia={topMotivoPorDia} totalSolicitudes={totalSolicitudes} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
            {datos.map((entry, i) => (
              <Cell key={i} fill={colorPorIntensidad(entry.cantidad, max)} />
            ))}
            <LabelList
              dataKey="cantidad"
              position="right"
              style={{ fontSize: 11, fontWeight: 700, fill: "var(--recharts-label)" }}
              formatter={(v: number) => v.toLocaleString("es-AR")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-3 mt-3">
        <span className="text-xs text-slate-400 dark:text-slate-500">Menos</span>
        {["#bfdbfe", "#60a5fa", "#3b82f6", "#1d4ed8", "#1e3a8a"].map((color) => (
          <div
            key={color}
            className="w-5 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500">Más</span>
      </div>
    </div>
  );
}
