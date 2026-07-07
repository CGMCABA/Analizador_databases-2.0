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
import { X } from "lucide-react";

interface DesgloseCat {
  nombre: string;
  cantidad: number;
}

interface DatoLinea {
  linea: string;
  cantidad: number;
  resueltas: number;
  tasa: number;
  porMotivo: DesgloseCat[];
  porArea: DesgloseCat[];
}

interface GraficoLineasProps {
  datos: DatoLinea[];
}

interface TooltipPayloadEntry {
  payload: DatoLinea;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip" style={{ minWidth: 180 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 700, marginBottom: 8 }}>Línea {label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "var(--tooltip-muted)" }}>Total:</span>
          <span style={{ color: "var(--tooltip-text)", fontWeight: 600 }}>{item.cantidad}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#10b981" }}>Resueltas:</span>
          <span style={{ color: "#10b981", fontWeight: 600 }}>{item.resueltas}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#ef4444" }}>Sin resolver:</span>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>{item.cantidad - item.resueltas}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid var(--tooltip-border)", paddingTop: 4, marginTop: 2 }}>
          <span style={{ color: "var(--tooltip-muted)" }}>Resolución:</span>
          <span style={{ fontWeight: 700, color: item.tasa >= 60 ? "#10b981" : item.tasa >= 30 ? "#f59e0b" : "#ef4444" }}>
            {item.tasa}%
          </span>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--tooltip-muted)", marginTop: 6, fontStyle: "italic" }}>Hacé clic para ver el detalle</p>
    </div>
  );
};

function PanelDetalle({ linea, onCerrar }: { linea: DatoLinea; onCerrar: () => void }) {
  const totalMotivo = linea.porMotivo.reduce((acc, m) => acc + m.cantidad, 0);
  const totalArea = linea.porArea.reduce((acc, a) => acc + a.cantidad, 0);
  const topMotivos = linea.porMotivo.slice(0, 5);
  const topAreas = linea.porArea.slice(0, 5);

  const ListaDetalle = ({
    items,
    total,
    colorBar,
  }: {
    items: DesgloseCat[];
    total: number;
    colorBar: string;
  }) => (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.cantidad / total) * 100) : 0;
        return (
          <div key={item.nombre}>
            <div className="flex items-center justify-between mb-0.5 gap-2">
              <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1" title={item.nombre}>
                {item.nombre}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                {item.cantidad} <span className="text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-[#252d3d] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colorBar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mt-4 border border-blue-100 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            Línea {linea.linea} — detalle de {linea.cantidad} registros
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-xs ml-2">
            {linea.resueltas} resueltas · {linea.tasa}% de resolución
          </span>
        </div>
        <button
          onClick={onCerrar}
          className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-[#252d3d] transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            Distribución por categoría
          </h4>
          {topMotivos.length > 0 ? (
            <ListaDetalle items={topMotivos} total={totalMotivo} colorBar="bg-blue-500" />
          ) : (
            <p className="text-xs text-slate-400">Sin datos</p>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
            Áreas asignadas
          </h4>
          {topAreas.length > 0 ? (
            <ListaDetalle items={topAreas} total={totalArea} colorBar="bg-violet-500" />
          ) : (
            <p className="text-xs text-slate-400">Sin datos</p>
          )}
        </div>
      </div>
    </div>
  );
}

const LIMITES = [10, 20, 30, 999] as const;
const LIMITE_LABELS: Record<number, string> = { 10: "Top 10", 20: "Top 20", 30: "Top 30", 999: "Todas" };

interface BarClickPayload {
  activePayload?: { payload: DatoLinea }[];
}

export function GraficoLineas({ datos }: GraficoLineasProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const [limite, setLimite] = useState<number>(20);
  const [vista, setVista] = useState<"cantidad" | "tasa">("cantidad");
  const [lineaSeleccionada, setLineaSeleccionada] = useState<string | null>(null);

  const datosOrdenados = vista === "cantidad"
    ? [...datos].sort((a, b) => b.cantidad - a.cantidad).slice(0, limite)
    : [...datos].filter((d) => d.cantidad >= 3).sort((a, b) => b.tasa - a.tasa).slice(0, limite);

  const alturaGrafico = Math.max(200, datosOrdenados.length * 26 + 40);
  const lineaDetalle = lineaSeleccionada
    ? datos.find((d) => d.linea === lineaSeleccionada) ?? null
    : null;

  const handleBarClick = (data: BarClickPayload) => {
    const linea = data?.activePayload?.[0]?.payload?.linea;
    if (!linea) return;
    setLineaSeleccionada((prev) => (prev === linea ? null : linea));
  };

  if (datos.length === 0) {
    return (
      <div className={`bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] shadow-sm p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Análisis por Línea</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-4 text-center">Sin datos de líneas disponibles</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#1f2535] shadow-sm p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Análisis por Línea de Colectivo</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {datos.length} líneas distintas · hacé clic en una barra para ver el desglose por motivo y área
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex bg-slate-100 dark:bg-[#252d3d] rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setVista("cantidad")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${vista === "cantidad" ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Más solicitadas
            </button>
            <button
              onClick={() => setVista("tasa")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${vista === "tasa" ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Mayor resolución
            </button>
          </div>
          <div className="flex bg-slate-100 dark:bg-[#252d3d] rounded-lg p-0.5 gap-0.5">
            {LIMITES.map((l) => (
              <button
                key={l}
                onClick={() => setLimite(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${limite === l ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                {LIMITE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {vista === "cantidad" && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {datos.slice(0, 3).map((d, i) => (
            <button
              key={d.linea}
              onClick={() => setLineaSeleccionada((prev) => (prev === d.linea ? null : d.linea))}
              className={`rounded-lg p-3 text-center border transition-all ${
                lineaSeleccionada === d.linea
                  ? "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-800"
                  : ""
              } ${
                i === 0 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30" :
                i === 1 ? "bg-slate-50 dark:bg-[#252d3d] border-slate-200 dark:border-[#2e3852] hover:bg-slate-100 dark:hover:bg-[#2e3852]" :
                "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30"
              }`}
            >
              <div className={`text-2xl font-black ${i === 0 ? "text-blue-700 dark:text-blue-400" : i === 1 ? "text-slate-600 dark:text-slate-300" : "text-orange-600 dark:text-orange-400"}`}>
                {d.linea}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.cantidad} registros</div>
              <div className={`text-xs font-semibold mt-1 ${d.tasa >= 60 ? "text-green-600 dark:text-green-400" : d.tasa >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                {d.tasa}% resueltas
              </div>
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={alturaGrafico}>
        <BarChart
          data={datosOrdenados}
          layout="vertical"
          margin={{ top: 4, right: 55, left: 10, bottom: 4 }}
          barSize={14}
          onClick={handleBarClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={vista === "tasa" ? (v) => `${v}%` : undefined}
          />
          <YAxis
            type="category"
            dataKey="linea"
            tick={{ fontSize: 11, fill: "var(--recharts-label)", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={45}
            tickFormatter={(v) => `Lín. ${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar
            dataKey={vista === "cantidad" ? "cantidad" : "tasa"}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          >
            {datosOrdenados.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  lineaSeleccionada === entry.linea
                    ? "#1d4ed8"
                    : vista === "cantidad"
                    ? `hsl(${217 - i * 2}, 80%, ${55 + Math.min(i * 0.5, 15)}%)`
                    : entry.tasa >= 60 ? "#10b981" : entry.tasa >= 30 ? "#f59e0b" : "#ef4444"
                }
                stroke={lineaSeleccionada === entry.linea ? "#1e40af" : "none"}
                strokeWidth={lineaSeleccionada === entry.linea ? 1.5 : 0}
              />
            ))}
            <LabelList
              dataKey={vista === "cantidad" ? "cantidad" : "tasa"}
              position="right"
              formatter={(v: number) => vista === "tasa" ? `${v}%` : v}
              style={{ fontSize: 10, fontWeight: 600, fill: "var(--recharts-label)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {lineaDetalle && (
        <PanelDetalle
          linea={lineaDetalle}
          onCerrar={() => setLineaSeleccionada(null)}
        />
      )}
    </div>
  );
}
