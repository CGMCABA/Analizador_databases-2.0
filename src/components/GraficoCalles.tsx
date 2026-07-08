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
import { MapPin, X } from "lucide-react";

interface DesgloseCat {
  nombre: string;
  cantidad: number;
}

interface DatoCalle {
  nombre: string;
  cantidad: number;
  porMotivo: DesgloseCat[];
  porArea: DesgloseCat[];
}

interface GraficoCallesProps {
  datos: DatoCalle[];
  totalSolicitudes: number;
}

interface TooltipPayloadEntry {
  payload: DatoCalle;
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
    <div className="chart-tooltip" style={{ maxWidth: 230 }}>
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, fontSize: 11, display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 6 }}>
        <MapPin style={{ width: 14, height: 14, color: "#3b82f6", flexShrink: 0, marginTop: 1 }} />
        {label}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <span style={{ color: "var(--tooltip-muted)" }}>Menciones:</span>
        <span style={{ color: "var(--tooltip-text)", fontWeight: 700 }}>{item.cantidad}</span>
      </div>
      <p style={{ fontSize: 11, color: "var(--tooltip-muted)", marginTop: 6, fontStyle: "italic" }}>Hacé clic para ver el detalle</p>
    </div>
  );
};

function PanelDetalle({
  calle,
  totalSolicitudes,
  onCerrar,
}: {
  calle: DatoCalle;
  totalSolicitudes: number;
  onCerrar: () => void;
}) {
  const topMotivos = calle.porMotivo.slice(0, 5);
  const topAreas = calle.porArea.slice(0, 5);
  const totalMotivo = calle.porMotivo.reduce((acc, m) => acc + m.cantidad, 0);
  const totalArea = calle.porArea.reduce((acc, a) => acc + a.cantidad, 0);
  const pctTotal = totalSolicitudes > 0
    ? Math.round((calle.cantidad / totalSolicitudes) * 100)
    : 0;

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
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
              {calle.nombre}
            </span>
          </div>
          <span className="text-slate-500 dark:text-slate-400 text-xs">
            {calle.cantidad} menciones · presente en el {pctTotal}% de los registros
          </span>
        </div>
        <button
          onClick={onCerrar}
          className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-[#252d3d] transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
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

const PALETTE = [
  "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa",
  "#93c5fd", "#bfdbfe", "#dbeafe",
];

const LIMITES = [15, 20, 30] as const;

interface BarClickPayload {
  activePayload?: { payload: DatoCalle }[];
}

export function GraficoCalles({ datos, totalSolicitudes }: GraficoCallesProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const [limite, setLimite] = useState<number>(15);
  const [calleSeleccionada, setCalleSeleccionada] = useState<string | null>(null);

  const datosSlice = datos.slice(0, limite);
  const alturaGrafico = Math.max(200, datosSlice.length * 24 + 40);
  const maxCantidad = datosSlice[0]?.cantidad ?? 1;

  const calleDetalle = calleSeleccionada
    ? datos.find((d) => d.nombre === calleSeleccionada) ?? null
    : null;

  const handleBarClick = (data: BarClickPayload) => {
    const nombre = data?.activePayload?.[0]?.payload?.nombre;
    if (!nombre) return;
    setCalleSeleccionada((prev) => (prev === nombre ? null : nombre));
  };

  if (datos.length === 0) {
    return (
      <div className={`bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Calles con más registros</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-4 text-center">Sin datos de calles disponibles</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            Calles más mencionadas en los registros
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {datos.length} calles distintas · cada registro puede mencionar hasta 3 · hacé clic en una barra para ver el desglose
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-[#252d3d] rounded-lg p-0.5 gap-0.5 shrink-0">
          {LIMITES.map((l) => (
            <button
              key={l}
              onClick={() => setLimite(l)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${limite === l ? "bg-white dark:bg-[#2e3852] text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Top {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {datos.slice(0, 3).map((d, i) => {
          const pct = Math.round((d.cantidad / totalSolicitudes) * 100);
          const labels = ["🥇", "🥈", "🥉"];
          return (
            <button
              key={d.nombre}
              onClick={() => setCalleSeleccionada((prev) => (prev === d.nombre ? null : d.nombre))}
              className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 text-left transition-all hover:bg-blue-100 dark:hover:bg-blue-900/30 ${
                calleSeleccionada === d.nombre ? "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-800" : ""
              }`}
            >
              <div className="text-base mb-1">{labels[i]}</div>
              <div
                className="text-xs font-bold text-blue-800 dark:text-blue-300 leading-tight mb-1 truncate"
                title={d.nombre}
              >
                {d.nombre.length > 24 ? d.nombre.slice(0, 23) + "…" : d.nombre}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{d.cantidad} menciones</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">en el {pct}% de los registros</div>
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={alturaGrafico}>
        <BarChart
          data={datosSlice}
          layout="vertical"
          margin={{ top: 4, right: 45, left: 8, bottom: 4 }}
          barSize={13}
          onClick={handleBarClick}
          style={{ cursor: "pointer" }}
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
            tick={{ fontSize: 9.5, fill: "var(--recharts-label)" }}
            tickLine={false}
            axisLine={false}
            width={150}
            tickFormatter={(v: string) => v.length > 25 ? v.slice(0, 24) + "…" : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
            {datosSlice.map((entry, i) => {
              const intensity = Math.max(0, Math.min(7, Math.floor((entry.cantidad / maxCantidad) * 7)));
              return (
                <Cell
                  key={i}
                  fill={
                    calleSeleccionada === entry.nombre
                      ? "#1e40af"
                      : PALETTE[7 - intensity]
                  }
                  stroke={calleSeleccionada === entry.nombre ? "#1e3a8a" : "none"}
                  strokeWidth={calleSeleccionada === entry.nombre ? 1.5 : 0}
                />
              );
            })}
            <LabelList
              dataKey="cantidad"
              position="right"
              style={{ fontSize: 10, fontWeight: 600, fill: "var(--recharts-label)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {calleDetalle && (
        <PanelDetalle
          calle={calleDetalle}
          totalSolicitudes={totalSolicitudes}
          onCerrar={() => setCalleSeleccionada(null)}
        />
      )}

    </div>
  );
}
