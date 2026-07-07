import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Clock } from "lucide-react";

interface DatoHora {
  hora: number;
  cantidad: number;
}

interface GraficoHorarioProps {
  datos: DatoHora[];
  totalSolicitudes: number;
}

interface TooltipPayload {
  payload: DatoHora & { label: string; pct: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, marginBottom: 6 }}>
        {item.label}
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

export function GraficoHorario({ datos, totalSolicitudes }: GraficoHorarioProps) {
  if (datos.length === 0) return null;

  const maxHora = Math.max(...datos.map((d) => d.hora), 23);
  const minHora = Math.min(...datos.map((d) => d.hora), 0);
  const byHora = new Map(datos.map((d) => [d.hora, d.cantidad]));

  const datosCompletos = Array.from({ length: maxHora - minHora + 1 }, (_, i) => {
    const hora = minHora + i;
    const cantidad = byHora.get(hora) ?? 0;
    return {
      hora,
      cantidad,
      label: `${String(hora).padStart(2, "0")}:00 hs`,
      pct: totalSolicitudes > 0 ? Math.round((cantidad / totalSolicitudes) * 100) : 0,
    };
  });

  const maxCantidad = Math.max(...datosCompletos.map((d) => d.cantidad));
  // Promedio calculado sobre la misma población que está graficada (suma de las barras),
  // no sobre totalSolicitudes — ese total incluye registros sin hora válida o Programados,
  // que ya están excluidos de "datos" (ver agregaciones.ts), y mezclaría dos universos
  // distintos si se usara como base del promedio.
  const sumaBarras = datosCompletos.reduce((acc, d) => acc + d.cantidad, 0);
  const promedio = datosCompletos.length > 0 ? Math.round(sumaBarras / datosCompletos.length) : 0;

  const getColor = (cantidad: number): string => {
    if (maxCantidad === 0) return "hsl(220, 60%, 55%)";
    const ratio = cantidad / maxCantidad;
    if (ratio >= 0.85) return "hsl(28, 90%, 52%)";
    if (ratio >= 0.65) return "hsl(220, 75%, 48%)";
    if (ratio >= 0.35) return "hsl(220, 65%, 58%)";
    return "hsl(220, 45%, 72%)";
  };

  const pico = datosCompletos.reduce((acc, d) => d.cantidad > acc.cantidad ? d : acc, datosCompletos[0]);

  return (
    <div className="bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] shadow-sm p-5 animate-fade-in-up delay-100">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Distribución por hora del día
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Cantidad de registros según la hora de ingreso
            </p>
          </div>
        </div>
        {pico && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
              Pico:{" "}
              <strong className="text-amber-700 dark:text-amber-400">
                {String(pico.hora).padStart(2, "0")}:00 hs
              </strong>{" "}
              · {pico.cantidad.toLocaleString("es-AR")} registros
            </span>
          </div>
        )}
      </div>

      <div className="chart-fade-in">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={datosCompletos}
          margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
          barSize={Math.max(8, Math.floor(600 / datosCompletos.length) - 4)}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--recharts-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="hora"
            tickFormatter={(v: number) => `${String(v).padStart(2, "0")}h`}
            tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          {promedio > 0 && (
            <ReferenceLine
              y={promedio}
              stroke="var(--recharts-grid)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: `Prom. ${promedio}`,
                position: "insideTopRight",
                fontSize: 9,
                fill: "var(--recharts-axis)",
              }}
            />
          )}
          <Bar dataKey="cantidad" radius={[3, 3, 0, 0]}>
            {datosCompletos.map((d, i) => (
              <Cell key={i} fill={getColor(d.cantidad)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(28, 90%, 52%)" }} />
          Hora pico
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(220, 75%, 48%)" }} />
          Alta demanda
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(220, 45%, 72%)" }} />
          Baja demanda
        </span>
        {promedio > 0 && (
          <span className="ml-auto">
            Promedio por hora: <strong className="text-slate-600 dark:text-slate-300">{promedio.toLocaleString("es-AR")}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
