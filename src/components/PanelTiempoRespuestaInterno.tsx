import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { Timer, TrendingUp, TrendingDown } from "lucide-react";

interface DatoTiempo {
  area: string;
  promedio: number;
  cantidad: number;
}

interface DatoBucket {
  rango: string;
  cantidad: number;
}

interface PanelTiempoRespuestaInternoProps {
  promedioGeneral: number;
  porMotivo: DatoTiempo[];
  porArea: DatoTiempo[];
  distribucion: DatoBucket[];
  etiquetaMotivo?: string;
}

function formatearTiempo(minutos: number): string {
  if (minutos >= 120) return `${(minutos / 60).toFixed(1)} h`;
  return `${minutos} min`;
}

function colorPorTiempo(promedio: number, max: number): string {
  const ratio = max > 0 ? promedio / max : 0;
  if (ratio <= 0.25) return "#10b981";
  if (ratio <= 0.5) return "#84cc16";
  if (ratio <= 0.75) return "#f59e0b";
  return "#ef4444";
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: DatoTiempo }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip" style={{ minWidth: 200 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, fontSize: 11, marginBottom: 6, lineHeight: 1.4 }}>
        {label}
      </p>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
        {formatearTiempo(item.promedio)}{" "}
        <span style={{ color: "var(--tooltip-muted)", fontWeight: 400 }}>
          · {item.cantidad.toLocaleString("es-AR")} registros
        </span>
      </p>
    </div>
  );
};

function GraficoHorizontal({ datos, titulo }: { datos: DatoTiempo[]; titulo: string }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  if (datos.length === 0) return null;
  const top = datos.slice(0, 15);
  const max = top[top.length - 1]?.promedio ?? 1;
  const usarHoras = max >= 120;
  const datosFormateados = top.map((d) => ({
    ...d,
    valor: usarHoras ? Math.round((d.promedio / 60) * 10) / 10 : d.promedio,
  }));
  const altura = Math.max(200, top.length * 28 + 40);

  return (
    <div className={`transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-3">{titulo}</p>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart
          data={datosFormateados}
          layout="vertical"
          margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
          barSize={13}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => usarHoras ? `${v}h` : `${v}m`}
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

interface BucketTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: DatoBucket }[];
  label?: string;
}

const BucketTooltip = ({ active, payload, label }: BucketTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>
        {payload[0].value.toLocaleString("es-AR")} registros
      </p>
    </div>
  );
};

export function PanelTiempoRespuestaInterno({
  promedioGeneral,
  porMotivo,
  porArea,
  distribucion,
  etiquetaMotivo = "Categoría",
}: PanelTiempoRespuestaInternoProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  const [vista, setVista] = useState<"motivo" | "area">("motivo");

  const datosBucketsConColor = distribucion.map((b) => ({
    ...b,
    fill:
      b.rango.startsWith("0") ? "#10b981" :
      b.rango.startsWith("6") ? "#84cc16" :
      b.rango.startsWith("16") ? "#f59e0b" :
      b.rango.startsWith("31") ? "#f97316" :
      "#ef4444",
  }));

  const mejorMotivo = porMotivo[0];
  const peorMotivo = porMotivo[porMotivo.length - 1];

  return (
    <div className={`bg-white dark:bg-[#131720] rounded-xl border border-violet-200 dark:border-violet-800 shadow-sm p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Timer className="h-4 w-4 text-violet-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tiempo de respuesta interno</h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 ml-6">
        Diferencia entre hora de ingreso y hora de derivación · calculado automáticamente
      </p>
      <p className="text-[11px] text-violet-600 dark:text-violet-400 mb-5 ml-6">
        Mide solo la derivación interna — no es el tiempo de respuesta total registrado en el archivo.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{formatearTiempo(promedioGeneral)}</p>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">Promedio general</p>
        </div>
        {mejorMotivo && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Más rápido</p>
            </div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 leading-tight truncate" title={mejorMotivo.area}>{mejorMotivo.area}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{formatearTiempo(mejorMotivo.promedio)}</p>
          </div>
        )}
        {peorMotivo && peorMotivo !== mejorMotivo && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <p className="text-xs font-medium text-red-700 dark:text-red-400">Más lento</p>
            </div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 leading-tight truncate" title={peorMotivo.area}>{peorMotivo.area}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{formatearTiempo(peorMotivo.promedio)}</p>
          </div>
        )}
      </div>

      {distribucion.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-3">Distribución por rango de tiempo</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={datosBucketsConColor} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" vertical={false} />
              <XAxis
                dataKey="rango"
                tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip content={<BucketTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                {datosBucketsConColor.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="cantidad"
                  position="top"
                  formatter={(v: number) => v.toLocaleString("es-AR")}
                  style={{ fontSize: 10, fontWeight: 600, fill: "var(--recharts-label)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setVista("motivo")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${vista === "motivo" ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-[#252d3d] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2e3852]"}`}
        >
          Por {etiquetaMotivo}
        </button>
        {porArea.length > 0 && (
          <button
            onClick={() => setVista("area")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${vista === "area" ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-[#252d3d] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2e3852]"}`}
          >
            Por Área
          </button>
        )}
      </div>

      {vista === "motivo" ? (
        <GraficoHorizontal
          datos={porMotivo}
          titulo={`Promedio por ${etiquetaMotivo} (más rápidos primero)`}
        />
      ) : (
        <GraficoHorizontal
          datos={porArea}
          titulo="Promedio por área asignada (más rápidas primero)"
        />
      )}

      <div className="flex items-center gap-4 mt-4 text-xs flex-wrap">
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
    </div>
  );
}
