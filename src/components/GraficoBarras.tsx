import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface DatoMes {
  mes: string;
  cantidad: number;
  resueltas: number;
  programados?: number;
  noProgramados?: number;
}

interface GraficoBarrasProps {
  datos: DatoMes[];
  mesFiltro?: string;
  alturaGrafico?: number;
  mostrarResolucion?: boolean;
  mostrarProgramacion?: boolean;
  etiquetaStatus?: string;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  mostrarResolucion?: boolean;
  mostrarProgramacion?: boolean;
  etiquetaStatus?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  mostrarResolucion,
  mostrarProgramacion,
  etiquetaStatus = "Resuelto",
}: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const tasa = payload.find((p) => p.dataKey === "tasa")?.value;
  const entries = payload.filter((e) => e.dataKey !== "tasa" && e.value > 0);
  return (
    <div className="chart-tooltip">
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {entries.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span style={{ color: "var(--tooltip-muted)" }}>{entry.name}:</span>
          <span style={{ color: "var(--tooltip-text)", fontWeight: 600 }}>
            {entry.value.toLocaleString("es-AR")}
          </span>
        </div>
      ))}
      {mostrarResolucion && !mostrarProgramacion && tasa !== undefined && (
        <p style={{
          color: "var(--tooltip-muted)", fontSize: 11, marginTop: 6,
          paddingTop: 6, borderTop: "1px solid var(--tooltip-border)"
        }}>
          {etiquetaStatus === "Resuelto" ? "Tasa de resolución:" : "Tasa de finalización:"}{" "}
          <strong style={{ color: "#f59e0b" }}>{tasa}%</strong>
        </p>
      )}
    </div>
  );
};

export function GraficoBarras({
  datos,
  mesFiltro,
  alturaGrafico = 290,
  mostrarResolucion = true,
  mostrarProgramacion = false,
  etiquetaStatus = "Resuelto",
}: GraficoBarrasProps) {
  const datosConTasa = datos.map((d) => ({
    ...d,
    tasa: d.cantidad > 0 ? Math.round((d.resueltas / d.cantidad) * 100) : 0,
    noProgramados: d.noProgramados ?? 0,
    programados: d.programados ?? 0,
  }));

  const etqAdj = etiquetaStatus === "Resuelto" ? "resueltas" : "finalizadas";
  const subtitulo = mostrarProgramacion
    ? "Sucesos No Programados (reactivos) y Programados por mes"
    : mostrarResolucion
      ? `Total recibidas, ${etqAdj} y tasa de ${etiquetaStatus === "Resuelto" ? "resolución" : "finalización"} mensual`
      : "Total de registros por mes";

  const showRightAxis = mostrarResolucion && !mostrarProgramacion;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 animate-fade-in-up delay-100">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Registros por Mes</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {subtitulo}
          {mesFiltro && (
            <span className="ml-2 font-medium text-blue-500">· Filtrando: {mesFiltro}</span>
          )}
        </p>
      </div>
      <div className="chart-fade-in">
      <ResponsiveContainer width="100%" height={alturaGrafico}>
        <ComposedChart data={datosConTasa} margin={{ top: 5, right: showRightAxis ? 40 : 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--recharts-grid)" }}
            tickFormatter={(v: string) => v.slice(0, 3)}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            width={showRightAxis ? 35 : 0}
            tickFormatter={(v) => (showRightAxis ? `${v}%` : "")}
            hide={!showRightAxis}
          />
          <Tooltip
            content={
              <CustomTooltip
                mostrarResolucion={mostrarResolucion}
                mostrarProgramacion={mostrarProgramacion}
                etiquetaStatus={etiquetaStatus}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "12px", color: "var(--recharts-label)" }}
            formatter={(value, entry) => {
              if ((entry as TooltipPayloadEntry).dataKey === "tasa") return null;
              return value;
            }}
          />

          {/* Modo apilado: No Programados + Programados */}
          <Bar
            yAxisId="left"
            dataKey="noProgramados"
            name="No Programados"
            stackId="split"
            fill="#3b82f6"
            radius={[0, 0, 0, 0]}
            maxBarSize={40}
            hide={!mostrarProgramacion}
          />
          <Bar
            yAxisId="left"
            dataKey="programados"
            name="Programados"
            stackId="split"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            hide={!mostrarProgramacion}
          />

          {/* Modo simple: Total + Resueltas */}
          <Bar
            yAxisId="left"
            dataKey="cantidad"
            name="Total registros"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            hide={mostrarProgramacion}
          >
            {datosConTasa.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  mesFiltro && entry.mes === mesFiltro
                    ? "#1d4ed8"
                    : mesFiltro
                    ? "#93c5fd"
                    : "#3b82f6"
                }
              />
            ))}
          </Bar>
          <Bar
            yAxisId="left"
            dataKey="resueltas"
            name={etiquetaStatus === "Resuelto" ? "Resueltas" : "Finalizadas"}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            hide={mostrarProgramacion || !mostrarResolucion}
          >
            {datosConTasa.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  mesFiltro && entry.mes === mesFiltro
                    ? "#059669"
                    : mesFiltro
                    ? "#6ee7b7"
                    : "#10b981"
                }
              />
            ))}
          </Bar>

          {/* Línea de tasa (solo modo resolución, sin apilado) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tasa"
            name={etiquetaStatus === "Resuelto" ? "Tasa resolución (%)" : "Tasa finalización (%)"}
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6 }}
            hide={mostrarProgramacion || !mostrarResolucion}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
