import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  ChevronDown, ChevronUp, Telescope, Calendar, Clock,
} from "lucide-react";
import { DatosDashboard } from "@/lib/excelParser";
import {
  calcularVentanaPredictiva,
  DiaProyectado,
  VentanaPredictivaResultado,
  TurnoNombre,
} from "@/lib/ventanaPredictiva";

interface VentanaPredictivaProps {
  datos: DatosDashboard;
}

const TURNO_ETIQUETA: Record<TurnoNombre, string> = {
  "mañana": "Mañana (6–14 h)",
  "tarde": "Tarde (14–22 h)",
  "noche": "Noche (22–6 h)",
};

const TURNO_COLOR: Record<TurnoNombre, string> = {
  "mañana": "text-amber-600 dark:text-amber-400",
  "tarde": "text-blue-600 dark:text-blue-400",
  "noche": "text-indigo-600 dark:text-indigo-400",
};

const TURNO_BG: Record<TurnoNombre, string> = {
  "mañana": "bg-amber-50 dark:bg-amber-900/20",
  "tarde": "bg-blue-50 dark:bg-blue-900/20",
  "noche": "bg-indigo-50 dark:bg-indigo-900/20",
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: DiaProyectado & { volumenEsperado: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p style={{ color: "var(--tooltip-text)", fontWeight: 600, marginBottom: 6 }}>
        {label} — {d.diaSemana}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.esPico ? "#ef4444" : "#3b82f6" }} />
        <span style={{ color: "var(--tooltip-muted)" }}>Vol. esperado:</span>
        <span style={{ color: "var(--tooltip-text)", fontWeight: 600 }}>
          {d.volumenEsperado.toLocaleString("es-AR")}
        </span>
      </div>
      <p style={{ color: "var(--tooltip-muted)", fontSize: 11, marginTop: 4 }}>
        {TURNO_ETIQUETA[d.turnoMayor]} · {d.pctMañana}% / {d.pctTarde}% / {d.pctNoche}%
      </p>
      {d.esPico && (
        <p style={{ color: "#ef4444", fontSize: 11, fontWeight: 600, marginTop: 4 }}>
          ⚠ Pico esperado
        </p>
      )}
    </div>
  );
};

function TarjetaRiesgo({ dia, rank }: { dia: DiaProyectado; rank: number }) {
  const colores = ["bg-red-600", "bg-orange-500", "bg-amber-400"];
  const bgBadge = colores[rank] ?? "bg-slate-400";
  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`${bgBadge} text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0`}>
          {rank + 1}
        </span>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{dia.diaSemana}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{dia.fecha}</p>
        </div>
        {dia.esPico && (
          <AlertTriangle className="h-4 w-4 text-red-500 ml-auto shrink-0" />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
          {dia.volumenEsperado.toLocaleString("es-AR")}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">registros estimados</p>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${TURNO_BG[dia.turnoMayor]}`}>
        <Clock className={`h-3 w-3 ${TURNO_COLOR[dia.turnoMayor]}`} />
        <span className={TURNO_COLOR[dia.turnoMayor]}>{TURNO_ETIQUETA[dia.turnoMayor]}</span>
      </div>
      {dia.motivoPredominante && (
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={dia.motivoPredominante}>
          Motivo: <span className="font-medium text-slate-700 dark:text-slate-300">{dia.motivoPredominante}</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-1 text-center text-xs">
        {([["Mañana", dia.pctMañana], ["Tarde", dia.pctTarde], ["Noche", dia.pctNoche]] as [string, number][]).map(([label, pct]) => (
          <div key={label} className="bg-slate-50 dark:bg-[#252d3d]/50 rounded p-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</p>
            <p className="text-slate-400 dark:text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BannerDatosInsuficientes({ porDiaSemana }: { porDiaSemana: { dia: string; cantidad: number }[] }) {
  const total = porDiaSemana.reduce((a, b) => a + b.cantidad, 0);
  const diasOrdenados = [...porDiaSemana].sort((a, b) => b.cantidad - a.cantidad);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            Datos insuficientes para proyección confiable
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
            Se necesitan al menos 3 meses de datos para calcular una tendencia mensual confiable. A continuación se muestran los patrones de día de semana disponibles como referencia.
          </p>
        </div>
      </div>
      {diasOrdenados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {diasOrdenados.map((d) => (
            <div key={d.dia} className="bg-white dark:bg-[#131720] rounded-lg border border-slate-200 dark:border-[#1f2535] p-3 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{d.dia}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">
                {d.cantidad.toLocaleString("es-AR")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {total > 0 ? Math.round((d.cantidad / total) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VentanaPredictiva({ datos }: VentanaPredictivaProps) {
  const [expandido, setExpandido] = useState(true);

  const resultado: VentanaPredictivaResultado = calcularVentanaPredictiva(
    datos.porMes,
    datos.porDiaSemana,
    datos.porHora,
    datos.porMotivo
  );

  const IconoTendencia = resultado.tendencia === "creciente"
    ? TrendingUp
    : resultado.tendencia === "decreciente"
    ? TrendingDown
    : Minus;

  const colorTendencia = resultado.tendencia === "creciente"
    ? "text-red-500 dark:text-red-400"
    : resultado.tendencia === "decreciente"
    ? "text-emerald-500 dark:text-emerald-400"
    : "text-slate-400 dark:text-slate-500";

  const etiquetaTendencia =
    resultado.tendencia === "creciente"
      ? `+${resultado.pendienteMensual} regs/mes`
      : resultado.tendencia === "decreciente"
      ? `${resultado.pendienteMensual} regs/mes`
      : "tendencia estable";

  const etiquetaLabel = (fecha: string) => {
    const partes = fecha.split("/");
    if (partes.length !== 3) return fecha;
    return `${partes[0]}/${partes[1]}`;
  };

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] shadow-futuro animate-fade-in-up delay-150">
      {/* Encabezado colapsable */}
      <button
        className="w-full p-5 flex items-center gap-3 text-left hover:bg-slate-50/50 dark:hover:bg-[#252d3d]/30 transition-colors rounded-xl"
        onClick={() => setExpandido((v) => !v)}
      >
        <div className="p-1.5 bg-violet-100 dark:bg-violet-900/40 rounded-lg shrink-0">
          <Telescope className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Ventana Predictiva — próximas 2 semanas
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Proyección de demanda basada en patrones históricos de día de semana y tendencia mensual
            {!resultado.datosInsuficientes && (
              <>
                {" · "}
                <span className={colorTendencia}>
                  <IconoTendencia className="h-3 w-3 inline mr-0.5" />
                  {etiquetaTendencia}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {resultado.hayAlertaPico && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              Pico esperado
            </span>
          )}
          {expandido
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />
          }
        </div>
      </button>

      {/* Contenido colapsable */}
      {expandido && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-100 dark:border-[#1f2535] pt-4">
          {resultado.datosInsuficientes ? (
            <BannerDatosInsuficientes porDiaSemana={datos.porDiaSemana} />
          ) : (
            <>
              {/* Alerta de pico */}
              {resultado.hayAlertaPico && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400 text-sm">
                      Alerta de pico operativo
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1 leading-relaxed">
                      {resultado.dias.filter((d) => d.esPico).length} día{resultado.dias.filter((d) => d.esPico).length !== 1 ? "s" : ""} proyectado{resultado.dias.filter((d) => d.esPico).length !== 1 ? "s" : ""} con volumen más del 20% superior al promedio histórico diario ({resultado.promedioHistoricoDiario} regs/día).
                      Considerá reforzar los recursos operativos en esas fechas.
                    </p>
                  </div>
                </div>
              )}

              {/* Gráfico de barras */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Volumen diario proyectado (próximos 14 días)
                </p>
                <div className="chart-fade-in">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={resultado.dias} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={etiquetaLabel}
                      tick={{ fontSize: 10, fill: "var(--recharts-axis)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--recharts-grid)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={resultado.promedioHistoricoDiario * 1.2}
                      stroke="#ef4444"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: "Umbral pico", position: "right", fontSize: 9, fill: "#ef4444" }}
                    />
                    <ReferenceLine
                      y={resultado.promedioHistoricoDiario}
                      stroke="var(--recharts-grid)"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{ value: "Promedio hist.", position: "right", fontSize: 9, fill: "var(--recharts-axis)" }}
                    />
                    <Bar dataKey="volumenEsperado" name="Vol. esperado" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {resultado.dias.map((d, i) => (
                        <Cell key={i} fill={d.esPico ? "#ef4444" : "#6366f1"} opacity={d.esPico ? 1 : 0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                  Barras rojas = volumen proyectado {">"}20% sobre el promedio histórico
                </p>
              </div>

              {/* Cards de mayor riesgo */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Días de mayor riesgo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {resultado.diasMayorRiesgo.map((dia, idx) => (
                    <TarjetaRiesgo key={dia.fecha} dia={dia} rank={idx} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
