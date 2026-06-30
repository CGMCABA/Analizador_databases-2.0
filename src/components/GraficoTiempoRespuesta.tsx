import { useState, useEffect } from "react";
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
import { Clock } from "lucide-react";

interface DatoTiempo {
  area: string;
  promedio: number;
  cantidad: number;
}

interface GraficoTiempoRespuestaProps {
  datos: DatoTiempo[];
  titulo?: string;
  subtitulo?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: DatoTiempo }[];
  label?: string;
}

function formatearTiempo(minutos: number): string {
  if (minutos >= 120) {
    const horas = (minutos / 60).toFixed(1);
    return `${horas} h`;
  }
  return `${minutos} min`;
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
        {formatearTiempo(item.promedio)} promedio{" "}
        <span style={{ color: "var(--tooltip-muted)", fontWeight: 400 }}>
          · {item.cantidad.toLocaleString("es-AR")} registros
        </span>
      </p>
    </div>
  );
};

function colorPorTiempo(promedio: number, max: number): string {
  const ratio = max > 0 ? promedio / max : 0;
  if (ratio <= 0.25) return "#10b981";
  if (ratio <= 0.5) return "#84cc16";
  if (ratio <= 0.75) return "#f59e0b";
  return "#ef4444";
}

export function GraficoTiempoRespuesta({ datos, titulo, subtitulo }: GraficoTiempoRespuestaProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  if (datos.length < 2) return null;

  const top15 = datos.slice(0, 15);
  const max = top15[top15.length - 1]?.promedio ?? 1;
  const usarHoras = max >= 120;

  const alturaGrafico = Math.max(220, top15.length * 28 + 40);

  const datosFormateados = top15.map((d) => ({
    ...d,
    valor: usarHoras ? Math.round((d.promedio / 60) * 10) / 10 : d.promedio,
  }));

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {titulo ?? "Tiempo de respuesta por área"}
        </h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 ml-6">
        {subtitulo ?? `Promedio de tiempo de respuesta en ${usarHoras ? "horas" : "minutos"} · áreas más rápidas primero · top 15`}
      </p>
      <p className="text-[11px] text-amber-600 dark:text-amber-500 mb-4 ml-6">
        Calculado desde el campo "Tiempo de Respuesta" del archivo — no es la derivación interna.
      </p>

      <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
        {[
          { color: "#10b981", label: "Rápido (≤ 25%)" },
          { color: "#84cc16", label: "Aceptable (≤ 50%)" },
          { color: "#f59e0b", label: "Lento (≤ 75%)" },
          { color: "#ef4444", label: "Muy lento (> 75%)" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={alturaGrafico}>
        <BarChart
          data={datosFormateados}
          layout="vertical"
          margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
          barSize={14}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => usarHoras ? `${v}h` : `${v}min`}
          />
          <YAxis
            type="category"
            dataKey="area"
            tick={{ fontSize: 10, fill: "var(--recharts-label)" }}
            tickLine={false}
            axisLine={false}
            width={140}
            tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 21) + "…" : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
            {datosFormateados.map((entry, i) => (
              <Cell key={i} fill={colorPorTiempo(entry.promedio, max)} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(v: number) => usarHoras ? `${v}h` : `${v}m`}
              style={{ fontSize: 10, fontWeight: 600, fill: "var(--recharts-label)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
