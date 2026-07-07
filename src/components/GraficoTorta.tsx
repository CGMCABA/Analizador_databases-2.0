import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DatoItem {
  nombre: string;
  cantidad: number;
}

interface GraficoTortaProps {
  datos: DatoItem[];
  titulo: string;
  subtitulo?: string;
  alturaGrafico?: number;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: DatoItem & { total: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const COLORES = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#7c3aed", "#d946ef",
  "#0891b2", "#059669", "#dc2626", "#9333ea",
];

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const total = entry.payload.total;
  const pct = ((entry.value / total) * 100).toFixed(1);
  return (
    <div className="chart-tooltip" style={{ maxWidth: 220 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, marginBottom: 4 }}>{entry.name}</p>
      <p style={{ color: "var(--tooltip-muted)" }}>
        <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>{entry.value}</span> registros{" "}
        <span style={{ color: "var(--tooltip-muted)" }}>({pct}%)</span>
      </p>
    </div>
  );
};

const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: LabelProps) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y} fill="white" textAnchor="middle"
      dominantBaseline="central" fontSize={10} fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function GraficoTorta({ datos, titulo, subtitulo, alturaGrafico = 200 }: GraficoTortaProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const total = datos.reduce((acc, d) => acc + d.cantidad, 0);
  const datosConTotal = datos.map((d) => ({ ...d, total }));
  const outerRadius = Math.round(alturaGrafico * 0.41);
  const innerRadius = Math.round(alturaGrafico * 0.17);

  return (
    <div className={`bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] shadow-sm p-5 h-full transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitulo}</p>}
      </div>
      <ResponsiveContainer width="100%" height={alturaGrafico}>
        <PieChart>
          <Pie
            data={datosConTotal}
            dataKey="cantidad"
            nameKey="nombre"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            labelLine={false}
            label={renderCustomLabel}
          >
            {datosConTotal.map((_, index) => (
              <Cell key={index} fill={COLORES[index % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-40 overflow-y-auto pr-1">
        {datosConTotal.map((d, i) => (
          <div key={d.nombre} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: COLORES[i % COLORES.length] }}
            />
            <span className="text-slate-600 dark:text-slate-300 truncate" title={d.nombre}>
              {d.nombre}
            </span>
            <span className="text-slate-400 dark:text-slate-500 ml-auto shrink-0">({d.cantidad})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
