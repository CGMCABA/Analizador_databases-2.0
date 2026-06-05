import { useEffect, useMemo, useRef, useState } from "react";
import { DatosDashboard } from "@/lib/excelParser";
import { calcularSemaforo, generarRecomendaciones } from "@/lib/semaforoRecomendaciones";
import { GraficoBarras } from "@/components/GraficoBarras";
import { GraficoCruce } from "@/components/GraficoCruce";
import { GraficoCruceLinea } from "@/components/GraficoCruceLinea";
import { GraficoCruceCalle } from "@/components/GraficoCruceCalle";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  XCircle,
  BarChart2,
  Percent,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  CalendarDays,
  Clock,
  MapPin,
  Calendar,
  Ban,
  RotateCcw,
  ShieldAlert,
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Tag,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

interface PresentacionDiapositivasProps {
  datos: DatosDashboard;
  nombreArchivo: string;
  onCerrar: () => void;
}

interface SlideConfig {
  id: string;
  titulo: string;
  subtitulo: string;
}

const COLORES_TASA: [number, string, string][] = [
  [75, "#10b981", "bg-emerald-500"],
  [50, "#3b82f6", "bg-blue-500"],
  [25, "#f59e0b", "bg-amber-500"],
  [0,  "#ef4444", "bg-red-500"],
];

function colorTasa(tasa: number) {
  return COLORES_TASA.find(([min]) => tasa >= min) ?? COLORES_TASA[COLORES_TASA.length - 1];
}

function useCountUp(target: number, activo: boolean, duracion = 1300) {
  const [valor, setValor] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) { setValor(0); return; }
    const inicio = performance.now();
    const tick = (ahora: number) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValor(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, activo, duracion]);

  return valor;
}

interface KpiCardProps {
  titulo: string;
  target: number;
  sufijo?: string;
  subtitulo: string;
  color: "blue" | "green" | "red" | "cyan" | "amber" | "violet" | "indigo";
  icono: React.ElementType;
  activo: boolean;
  delay: number;
  delta?: number;
}

const KPI_ESTILOS = {
  blue:   { bg: "bg-blue-950/50",    border: "border-blue-700/30",   icon: "bg-blue-900/60 text-blue-300",       valor: "text-blue-200"    },
  green:  { bg: "bg-emerald-950/50", border: "border-emerald-700/30", icon: "bg-emerald-900/60 text-emerald-300", valor: "text-emerald-200" },
  red:    { bg: "bg-red-950/50",     border: "border-red-700/30",    icon: "bg-red-900/60 text-red-300",         valor: "text-red-200"     },
  cyan:   { bg: "bg-cyan-950/50",    border: "border-cyan-700/30",   icon: "bg-cyan-900/60 text-cyan-300",       valor: "text-cyan-200"    },
  amber:  { bg: "bg-amber-950/50",   border: "border-amber-700/30",  icon: "bg-amber-900/60 text-amber-300",     valor: "text-amber-200"   },
  violet: { bg: "bg-violet-950/50",  border: "border-violet-700/30", icon: "bg-violet-900/60 text-violet-300",   valor: "text-violet-200"  },
  indigo: { bg: "bg-indigo-950/50",  border: "border-indigo-700/30", icon: "bg-indigo-900/60 text-indigo-300",   valor: "text-indigo-200"  },
};

function KpiCard({ titulo, target, sufijo = "", subtitulo, color, icono: Icono, activo, delay, delta }: KpiCardProps) {
  const valorAnimado = useCountUp(target, activo, 1200);
  const e = KPI_ESTILOS[color];
  return (
    <div
      className={`pres-card-stagger ${e.bg} border ${e.border} rounded-2xl p-6 flex flex-col gap-4 backdrop-blur-sm`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{titulo}</span>
        <div className={`${e.icon} p-2.5 rounded-xl`}>
          <Icono className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className={`text-5xl font-black tabular-nums ${e.valor}`}>
          {valorAnimado.toLocaleString("es-AR")}{sufijo}
        </p>
        <p className="text-xs text-slate-600 mt-2">{subtitulo}</p>
      </div>
      {delta !== undefined && (
        <div className={`self-start flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          delta > 0 ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/30" :
          delta < 0 ? "bg-red-900/40 text-red-400 border border-red-700/30" :
          "bg-slate-800 text-slate-500 border border-slate-700/30"
        }`}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {delta > 0 ? "+" : ""}{delta}% vs. mes anterior
        </div>
      )}
    </div>
  );
}

interface KpiTextCardProps {
  titulo: string;
  valor: string;
  subtitulo: string;
  color: "blue" | "amber" | "violet" | "indigo" | "cyan";
  icono: React.ElementType;
  delay: number;
}

function KpiTextCard({ titulo, valor, subtitulo, color, icono: Icono, delay }: KpiTextCardProps) {
  const e = KPI_ESTILOS[color];
  return (
    <div
      className={`pres-card-stagger ${e.bg} border ${e.border} rounded-2xl p-6 flex flex-col gap-4 backdrop-blur-sm`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{titulo}</span>
        <div className={`${e.icon} p-2.5 rounded-xl`}>
          <Icono className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className={`text-4xl font-black tabular-nums leading-tight ${e.valor}`}>{valor}</p>
        <p className="text-xs text-slate-600 mt-2">{subtitulo}</p>
      </div>
    </div>
  );
}

function TopMotivosSlide({ datos, total }: { datos: DatosDashboard["porMotivo"]; total: number }) {
  const top = [...datos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  const max = top[0]?.cantidad ?? 1;

  return (
    <div className="space-y-3">
      {top.map((item, i) => {
        const pct = Math.round((item.cantidad / total) * 100);
        const barPct = Math.round((item.cantidad / max) * 100);
        const hue = 210 + Math.round(50 * (i / Math.max(top.length - 1, 1)));
        const color = `hsl(${hue}, 72%, 58%)`;
        return (
          <div key={item.nombre} className="pres-card-stagger" style={{ animationDelay: `${i * 55}ms` }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}22`, color }}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-200 truncate">{item.nombre}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm font-bold text-white tabular-nums">{item.cantidad.toLocaleString("es-AR")}</span>
                <span className="text-xs font-semibold w-10 text-right tabular-nums" style={{ color }}>{pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full pres-bar-fill"
                style={{
                  "--bar-target": `${barPct}%`,
                  "--bar-delay": `${i * 55 + 150}ms`,
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}55`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResolucionAreaSlide({ datos }: { datos: DatosDashboard["resolucionPorArea"] }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        No hay datos de resolución por área disponibles
      </div>
    );
  }
  const sorted = [...datos].sort((a, b) => b.tasa - a.tasa);
  return (
    <div className="space-y-3">
      {sorted.map((item, i) => {
        const [, colorHex, colorBg] = colorTasa(item.tasa);
        return (
          <div key={item.nombre} className="pres-card-stagger" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-200 truncate max-w-[60%]" title={item.nombre}>
                    {item.nombre.length > 32 ? item.nombre.slice(0, 31) + "…" : item.nombre}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-600 tabular-nums">{item.total.toLocaleString("es-AR")} sol.</span>
                    <span
                      className="text-sm font-bold px-2.5 py-0.5 rounded-md tabular-nums"
                      style={{ backgroundColor: `${colorHex}20`, color: colorHex, border: `1px solid ${colorHex}30` }}
                    >
                      {item.tasa}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full pres-bar-fill ${colorBg}`}
                    style={{
                      "--bar-target": `${item.tasa}%`,
                      "--bar-delay": `${i * 60 + 120}ms`,
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="pt-4 border-t border-white/5 flex items-center gap-5 flex-wrap">
        {COLORES_TASA.map(([min, hex, bg], idx) => {
          const label = idx === 0 ? "≥ 75%" : idx === 1 ? "50–74%" : idx === 2 ? "25–49%" : "< 25%";
          return (
            <span key={min} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-full ${bg}`} />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RankingSlide({ datos, total }: { datos: { nombre: string; cantidad: number }[]; total: number }) {
  const top = datos.slice(0, 10);
  const max = top[0]?.cantidad ?? 1;
  return (
    <div className="space-y-3">
      {top.map((item, i) => {
        const pct = Math.round((item.cantidad / total) * 100);
        const barPct = Math.round((item.cantidad / max) * 100);
        const color = `hsl(${260 + i * 12}, 70%, 62%)`;
        return (
          <div key={item.nombre} className="pres-card-stagger" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}22`, color }}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-200 truncate">{item.nombre}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm font-bold text-white tabular-nums">{item.cantidad.toLocaleString("es-AR")}</span>
                <span className="text-xs font-semibold w-10 text-right tabular-nums" style={{ color }}>{pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full pres-bar-fill"
                style={{
                  "--bar-target": `${barPct}%`,
                  "--bar-delay": `${i * 50 + 130}ms`,
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}55`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FalsosPositivosSlide({ datos }: { datos: DatosDashboard }) {
  const COLORES = ["#ef4444","#f97316","#f59e0b","#84cc16","#10b981","#06b6d4","#6366f1","#8b5cf6","#ec4899","#64748b"];
  const tipos = datos.tiposFalsosPositivos;
  const max = tipos[0]?.cantidad ?? 1;
  const col = datos.tasaFalsosPositivos >= 30 ? "#ef4444"
    : datos.tasaFalsosPositivos >= 15 ? "#f97316"
    : "#3b82f6";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div
          className="pres-card-stagger shrink-0 rounded-2xl border p-6 text-center min-w-[160px]"
          style={{ background: `${col}18`, borderColor: `${col}30`, animationDelay: "0ms" }}
        >
          <p className="text-6xl font-black tabular-nums" style={{ color: col }}>
            {datos.tasaFalsosPositivos}%
          </p>
          <p className="text-xs font-semibold mt-2 text-slate-400 uppercase tracking-widest">del total</p>
          <p className="text-xs text-slate-600 mt-1">
            {datos.totalFalsosPositivos.toLocaleString("es-AR")} de {datos.totalSolicitudes.toLocaleString("es-AR")} registros
          </p>
        </div>

        {tipos.length > 0 && (
          <div className="flex-1 w-full space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
              Distribución por tipo de cierre sin evento real
            </p>
            {tipos.slice(0, 8).map((t, i) => {
              const barPct = Math.round((t.cantidad / max) * 100);
              const color = COLORES[i % COLORES.length];
              return (
                <div key={t.nombre} className="pres-card-stagger" style={{ animationDelay: `${i * 60 + 80}ms` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-200 truncate max-w-[65%]" title={t.nombre}>
                      {t.nombre.length > 36 ? t.nombre.slice(0, 35) + "…" : t.nombre}
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>
                      {t.cantidad.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full pres-bar-fill"
                      style={{
                        "--bar-target": `${barPct}%`,
                        "--bar-delay": `${i * 60 + 200}ms`,
                        backgroundColor: color,
                        boxShadow: `0 0 5px ${color}55`,
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="pres-card-stagger text-xs text-slate-600 border-t border-white/5 pt-4 leading-relaxed"
        style={{ animationDelay: "500ms" }}>
        Registros cerrados donde el operador no encontró el suceso real. Depurar estos casos mejora la calidad de todos los indicadores.
      </p>
    </div>
  );
}

function EventosCronicosSlide({ datos }: { datos: DatosDashboard }) {
  const top = datos.crucesCronicos.slice(0, 12);
  function colorPorMeses(n: number) {
    if (n >= 6) return { badge: "#ef4444", label: "CRÍTICO", row: "rgba(239,68,68,0.06)" };
    if (n >= 3) return { badge: "#f97316", label: "RECURRENTE", row: "rgba(249,115,22,0.06)" };
    return { badge: "#eab308", label: "REPETIDO", row: "rgba(234,179,8,0.04)" };
  }
  function abreviarMes(mes: string) {
    const p = mes.split(" ");
    if (p.length >= 2) return `${p[0].slice(0, 3)} ${p[1].slice(2)}`;
    return mes.slice(0, 6);
  }
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Intersección", "Categoría", "Meses", "Registros", "Nivel"].map((h, i) => (
                <th
                  key={h}
                  className={`py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600 ${i === 3 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.map((cruce, idx) => {
              const col = colorPorMeses(cruce.meses.length);
              return (
                <tr
                  key={idx}
                  className="pres-card-stagger transition-colors"
                  style={{ background: col.row, animationDelay: `${idx * 50}ms` }}
                >
                  <td className="py-2 px-3 max-w-[200px]">
                    <span className="block truncate text-xs text-slate-300 font-medium" title={cruce.interseccion}>
                      {cruce.interseccion}
                    </span>
                  </td>
                  <td className="py-2 px-3 max-w-[160px]">
                    <span className="block truncate text-xs text-slate-400" title={cruce.motivo}>
                      {cruce.motivo}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {cruce.meses.slice(0, 6).map((mes) => (
                        <span
                          key={mes}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: `${col.badge}20`, color: col.badge, border: `1px solid ${col.badge}30` }}
                        >
                          {abreviarMes(mes)}
                        </span>
                      ))}
                      {cruce.meses.length > 6 && (
                        <span className="text-[10px] text-slate-600">+{cruce.meses.length - 6}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-sm font-bold text-slate-200 tabular-nums">
                      {cruce.cantidad.toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[10px] font-bold" style={{ color: col.badge }}>{col.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 border-t border-white/5 pt-3 leading-relaxed pres-card-stagger"
        style={{ animationDelay: "600ms" }}>
        Estos problemas estructurales requieren intervención directa. Las zonas en nivel CRÍTICO llevan 6 o más meses con la misma problemática.
      </p>
    </div>
  );
}

function FragilidadSlide({ datos }: { datos: DatosDashboard }) {
  const top15 = datos.indiceFragilidad.slice(0, 15);
  const maxP = top15[0]?.puntuacion ?? 1;
  function colorPorCuartil(idx: number, total: number) {
    const r = idx / Math.max(total - 1, 1);
    if (r <= 0.25) return "#ef4444";
    if (r <= 0.5) return "#f97316";
    if (r <= 0.75) return "#f59e0b";
    return "#10b981";
  }
  function fmtTiempo(m: number) {
    if (m === 0) return "";
    return m >= 120 ? `${(m / 60).toFixed(1)}h` : `${m}min`;
  }
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-5 mb-3 text-xs flex-wrap">
        {[["#ef4444","Muy alta"],["#f97316","Alta"],["#f59e0b","Media"],["#10b981","Baja"]].map(([col,label]) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
            {label}
          </span>
        ))}
      </div>
      {top15.map((zona, idx) => {
        const color = colorPorCuartil(idx, top15.length);
        const pct = maxP > 0 ? (zona.puntuacion / maxP) * 100 : 0;
        return (
          <div key={idx} className="pres-card-stagger" style={{ animationDelay: `${idx * 45}ms` }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-600 w-5 text-right shrink-0">{idx + 1}</span>
                <span className="text-xs text-slate-200 font-medium truncate" title={zona.zona}>{zona.zona}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-600">
                <span>{zona.volumen.toLocaleString("es-AR")} reg.</span>
                <span>{zona.tasaRecurrencia}% recurrente</span>
                {zona.tiempoPromedio > 0 && <span>{fmtTiempo(zona.tiempoPromedio)}</span>}
                <span className="font-bold" style={{ color }}>{zona.puntuacion.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden ml-7">
              <div
                className="h-full rounded-full pres-bar-fill"
                style={{
                  "--bar-target": `${pct}%`,
                  "--bar-delay": `${idx * 45 + 100}ms`,
                  backgroundColor: color,
                  boxShadow: `0 0 4px ${color}55`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SEMAFORO_EJES_PRES = [
  { key: "calidad" as const, titulo: "Calidad de datos", Icono: ShieldCheck },
  { key: "eficiencia" as const, titulo: "Eficiencia (TRI)", Icono: Clock },
  { key: "resolucion" as const, titulo: "Resolución", Icono: CheckCircle },
  { key: "recurrencia" as const, titulo: "Recurrencia", Icono: RefreshCw },
];

const SEMAFORO_DOT: Record<string, string> = {
  verde: "#27ae60",
  amarillo: "#f39c12",
  rojo: "#e74c3c",
  nd: "#64748b",
};

const PRIORIDAD_DOT: Record<string, string> = {
  alta: "#e74c3c",
  media: "#f39c12",
  baja: "#3b82f6",
};

function EstadoOperativoSlide({ datos }: { datos: DatosDashboard }) {
  const semaforo = calcularSemaforo(datos);
  const recomendaciones = generarRecomendaciones(datos).filter((r) => r.prioridad === "alta").slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SEMAFORO_EJES_PRES.map(({ key, titulo, Icono }, i) => {
          const eje = semaforo[key];
          const dot = SEMAFORO_DOT[eje.estado] ?? SEMAFORO_DOT.nd;
          return (
            <div
              key={key}
              className="pres-card-stagger rounded-xl border p-4 flex flex-col gap-3"
              style={{
                background: `${dot}12`,
                borderColor: `${dot}25`,
                animationDelay: `${i * 70}ms`,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                {eje.estado === "nd"
                  ? <HelpCircle className="h-4 w-4 text-slate-500 shrink-0" />
                  : <Icono className="h-4 w-4 shrink-0" style={{ color: dot }} />
                }
                <span
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${dot}20`, color: dot, border: `1px solid ${dot}30` }}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                  {eje.etiqueta}
                </span>
              </div>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: dot }}>
                {eje.valor}
              </p>
              <div>
                <p className="text-xs font-semibold text-slate-300 leading-tight">{titulo}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{eje.descripcion}</p>
              </div>
            </div>
          );
        })}
      </div>

      {recomendaciones.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Acciones prioritarias
            </p>
          </div>
          {recomendaciones.map((rec, idx) => {
            const dot = PRIORIDAD_DOT[rec.prioridad] ?? "#3b82f6";
            return (
              <div
                key={idx}
                className="pres-card-stagger flex items-start gap-3 rounded-xl border p-4"
                style={{
                  background: `${dot}0d`,
                  borderColor: `${dot}22`,
                  animationDelay: `${280 + idx * 70}ms`,
                }}
              >
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ backgroundColor: dot }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 leading-snug">{rec.texto}</p>
                  {rec.detalle && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{rec.detalle}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recomendaciones.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-700/25 p-4"
          style={{ background: "rgba(16,185,129,0.08)" }}>
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">Sin acciones críticas detectadas en este período.</p>
        </div>
      )}
    </div>
  );
}

function CalidadSlide({ datos }: { datos: DatosDashboard }) {
  const cal = datos.calidadDataset;
  const campos = [
    { label: "Fecha",       pctSin: cal.pctSinFecha,      icono: Calendar },
    { label: "Categoría",   pctSin: cal.pctSinCategoria,  icono: Tag },
    { label: "Ubicación",   pctSin: cal.pctSinUbicacion,  icono: MapPin },
    { label: "Hora",        pctSin: cal.pctSinHora,       icono: Clock },
    ...(datos.tieneColumnaStatus
      ? [{ label: datos.etiquetaStatus === "Resuelto" ? "Resolución" : "Finalización", pctSin: cal.pctSinResolucion, icono: CheckCircle2 }]
      : []
    ),
  ];
  function colPct(pctSin: number) {
    if (pctSin <= 5) return "#10b981";
    if (pctSin <= 20) return "#f59e0b";
    return "#ef4444";
  }
  const esBuena = cal.sugerencias.length === 1 && cal.sugerencias[0].startsWith("El dataset tiene buena calidad");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {campos.map((campo, i) => {
          const pctCompleto = 100 - campo.pctSin;
          const color = colPct(campo.pctSin);
          const Ico = campo.icono;
          return (
            <div key={campo.label} className="pres-card-stagger space-y-2" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Ico className="h-3.5 w-3.5" style={{ color }} />
                  <span className="text-xs font-medium text-slate-300">{campo.label}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color }}>{pctCompleto}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full pres-bar-fill"
                  style={{
                    "--bar-target": `${pctCompleto}%`,
                    "--bar-delay": `${i * 70 + 150}ms`,
                    backgroundColor: color,
                  } as React.CSSProperties}
                />
              </div>
              <p className="text-[10px] text-slate-600">
                {campo.pctSin > 0 ? `${campo.pctSin}% sin dato` : "Completitud total"}
              </p>
            </div>
          );
        })}
      </div>

      {cal.sugerencias.length > 0 && (
        <div
          className="pres-card-stagger rounded-xl border p-4 space-y-2"
          style={{
            animationDelay: "450ms",
            background: esBuena ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
            borderColor: esBuena ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {esBuena
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            }
            <p className="text-xs font-semibold text-slate-300">
              {esBuena ? "Estado del dataset" : "Recomendaciones para mejorar la calidad de datos"}
            </p>
          </div>
          {cal.sugerencias.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              {!esBuena && <span className="text-amber-500 shrink-0 text-xs mt-0.5">–</span>}
              <p className="text-xs leading-relaxed text-slate-400">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightChip({ text }: { text: string }) {
  return (
    <div
      className="pres-card-stagger mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-blue-300 border border-blue-700/25"
      style={{ background: "rgba(37,99,235,0.12)", animationDelay: "40ms" }}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

const TITULO_TIPO: Record<string, string> = {
  solicitudes: "Dashboard de Registros",
  sucesos: "Dashboard de Eventos",
  generico: "Dashboard Analítico",
};

export function PresentacionDiapositivas({ datos, nombreArchivo, onCerrar }: PresentacionDiapositivasProps) {
  const [indice, setIndice] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [slideKey, setSlideKey] = useState(0);

  const tipoDato = datos.tipoDato ?? "generico";

  const slides: SlideConfig[] = useMemo(() => {
    const lista: SlideConfig[] = [];

    if (tipoDato === "solicitudes") {
      lista.push({ id: "kpis",             titulo: "Resumen Ejecutivo",        subtitulo: "Indicadores clave del período analizado" });
      lista.push({ id: "estadoOperativo",  titulo: "Estado Operativo",         subtitulo: "Salud operativa en 4 dimensiones · acciones prioritarias" });
      lista.push({ id: "barras",           titulo: "Evolución Mensual",        subtitulo: "Registros recibidos mes a mes" });
      lista.push({ id: "motivos",    titulo: `Top ${datos.colCategorica1 ?? "Categorías"}`, subtitulo: "Ranking de categorías por volumen" });
      if (datos.tieneColumnaStatus) {
        lista.push({ id: "resolucion", titulo: "Resolución por Área", subtitulo: "Tasa de resolución por área responsable · mayor a menor" });
      }
      if (datos.meses.length >= 2 && datos.porMotivo.length >= 2) {
        lista.push({ id: "cruceMotMes", titulo: "Problemáticas por Mes", subtitulo: "Cómo evolucionan los motivos a lo largo del período" });
      }
      if ((datos.porLinea ?? []).length >= 2 && datos.porMotivo.length >= 2) {
        lista.push({ id: "cruceLinea", titulo: "Problemáticas por Línea", subtitulo: "Distribución de motivos en cada línea" });
      }
      if ((datos.porCalle1Ranking ?? []).length >= 2 && datos.porMotivo.length >= 2) {
        lista.push({ id: "cruceCalle", titulo: "Problemáticas por Calle", subtitulo: "Distribución de motivos en las calles principales" });
      }
      if (datos.totalFalsosPositivos > 0) {
        lista.push({ id: "falsosPositivos", titulo: "Falsos Positivos", subtitulo: "Registros cerrados sin evento real detectado" });
      }
      if (datos.crucesCronicos.length > 0) {
        lista.push({ id: "eventosCronicos", titulo: "Eventos Crónicos", subtitulo: "Problemas estructurales que se repiten mes a mes" });
      }
      if (datos.indiceFragilidad.length >= 3) {
        lista.push({ id: "fragilidad", titulo: "Índice de Fragilidad", subtitulo: "Zonas críticas por volumen · recurrencia · demora" });
      }
      lista.push({ id: "calidad", titulo: "Calidad del Dataset", subtitulo: "Completitud de campos clave y recomendaciones" });

    } else if (tipoDato === "sucesos") {
      lista.push({ id: "kpis_sucesos",    titulo: "Resumen Ejecutivo",     subtitulo: "Indicadores operativos clave del período" });
      lista.push({ id: "estadoOperativo", titulo: "Estado Operativo",      subtitulo: "Salud operativa en 4 dimensiones · acciones prioritarias" });
      lista.push({ id: "barras",          titulo: "Evolución Mensual",     subtitulo: "Registros de eventos mes a mes" });
      if (datos.porMotivo.length > 0) {
        lista.push({ id: "motivos",    titulo: `Top ${datos.colCategorica1 ?? "Tipos de Evento"}`, subtitulo: "Ranking de tipos de evento por volumen" });
      }
      if (datos.porInterseccion.length >= 3) {
        lista.push({ id: "intersecciones", titulo: "Intersecciones Principales", subtitulo: "Puntos con mayor concentración de eventos" });
      }
      if (datos.meses.length >= 2 && datos.porMotivo.length >= 2) {
        lista.push({ id: "cruceMotMes", titulo: "Tipos de Evento por Mes", subtitulo: "Evolución de categorías a lo largo del período" });
      }
      if (datos.crucesCronicos.length > 0) {
        lista.push({ id: "eventosCronicos", titulo: "Eventos Crónicos", subtitulo: "Intersecciones con el mismo problema en múltiples meses" });
      }
      if (datos.indiceFragilidad.length >= 3) {
        lista.push({ id: "fragilidad", titulo: "Índice de Fragilidad", subtitulo: "Zonas críticas por volumen · recurrencia · demora" });
      }
      lista.push({ id: "calidad", titulo: "Calidad del Dataset", subtitulo: "Completitud de campos clave y recomendaciones" });

    } else {
      lista.push({ id: "kpis_generico",   titulo: "Resumen General",    subtitulo: "Indicadores clave del dataset" });
      lista.push({ id: "estadoOperativo", titulo: "Estado Operativo",   subtitulo: "Salud operativa en 4 dimensiones · acciones prioritarias" });
      if (datos.porMes.length >= 2) {
        lista.push({ id: "barras",    titulo: "Evolución Mensual",     subtitulo: "Distribución de registros por mes" });
      }
      if (datos.porMotivo.length > 0) {
        lista.push({ id: "motivos",  titulo: `Distribución: ${datos.colCategorica1 ?? "Categoría"}`, subtitulo: "Valores más frecuentes" });
      }
      lista.push({ id: "calidad", titulo: "Calidad del Dataset", subtitulo: "Completitud de campos clave y recomendaciones" });
    }

    return lista;
  }, [datos, tipoDato]);

  const totalSlides = slides.length;

  const ir = (nuevoIndice: number, direccion: 1 | -1) => {
    if (nuevoIndice < 0 || nuevoIndice >= totalSlides) return;
    setDir(direccion);
    setIndice(nuevoIndice);
    setSlideKey((k) => k + 1);
  };

  const irAnterior = () => ir(indice - 1, -1);
  const irSiguiente = () => ir(indice + 1, 1);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCerrar(); return; }
      if (e.key === "ArrowLeft")  irAnterior();
      if (e.key === "ArrowRight") irSiguiente();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [indice, onCerrar]);

  const periodoTexto = useMemo(() => {
    if (datos.meses.length === 0) return "";
    if (datos.meses.length === 1) return datos.meses[0];
    return `${datos.meses[0]} → ${datos.meses[datos.meses.length - 1]}`;
  }, [datos.meses]);

  const deltaTotal = useMemo(() => {
    const meses = datos.porMes ?? [];
    if (meses.length < 2) return undefined;
    const ultimo = meses[meses.length - 1].cantidad;
    const penultimo = meses[meses.length - 2].cantidad;
    if (penultimo === 0) return undefined;
    return Math.round(((ultimo - penultimo) / penultimo) * 100);
  }, [datos.porMes]);

  const deltaResueltas = useMemo(() => {
    const meses = datos.porMes ?? [];
    if (meses.length < 2) return undefined;
    const ultimo = meses[meses.length - 1].resueltas ?? 0;
    const penultimo = meses[meses.length - 2].resueltas ?? 0;
    if (penultimo === 0) return undefined;
    return Math.round(((ultimo - penultimo) / penultimo) * 100);
  }, [datos.porMes]);

  const callout = useMemo((): string | null => {
    const slide = slides[indice];
    if (!slide) return null;
    const top1 = datos.porMotivo[0];
    const pct1 = top1 ? Math.round((top1.cantidad / datos.totalSolicitudes) * 100) : 0;
    const maxMes = [...(datos.porMes ?? [])].sort((a, b) => b.cantidad - a.cantidad)[0];
    const horaPico = datos.porHora.length > 0 ? [...datos.porHora].sort((a, b) => b.cantidad - a.cantidad)[0] : null;
    const diaPico = datos.porDiaSemana.length > 0 ? [...datos.porDiaSemana].sort((a, b) => b.cantidad - a.cantidad)[0] : null;
    switch (slide.id) {
      case "kpis":
        return periodoTexto ? `${periodoTexto}${datos.meses.length > 1 ? ` · ${datos.meses.length} meses` : ""}` : null;
      case "kpis_sucesos":
        return periodoTexto ? `${periodoTexto}${datos.meses.length > 1 ? ` · ${datos.meses.length} meses` : ""}` : null;
      case "kpis_generico":
        return periodoTexto ? `${periodoTexto}` : null;
      case "barras":
        return maxMes ? `Pico de actividad: ${maxMes.mes} con ${maxMes.cantidad.toLocaleString("es-AR")} registros` : null;
      case "motivos":
        return top1 ? `${datos.porMotivo.length} categorías · "${top1.nombre}" representa el ${pct1}% del total` : null;
      case "resolucion":
        return `Tasa de ${datos.etiquetaStatus === "Resuelto" ? "resolución" : "finalización"} global: ${datos.tasaResolucion}%`;
      case "intersecciones":
        return datos.porInterseccion[0]
          ? `Zona más activa: ${datos.porInterseccion[0].nombre} con ${datos.porInterseccion[0].cantidad.toLocaleString("es-AR")} registros`
          : null;
      case "cruceMotMes":
        return `${datos.meses.length} meses × ${Math.min(datos.porMotivo.length, 10)} categorías analizadas`;
      case "cruceLinea":
        return `${Math.min((datos.porLinea ?? []).length, 12)} líneas × ${Math.min(datos.porMotivo.length, 10)} motivos`;
      case "cruceCalle":
        return `${Math.min((datos.porCalle1Ranking ?? []).length, 20)} calles con mayor concentración`;
      case "falsosPositivos":
        return `${datos.tasaFalsosPositivos}% de los registros no tienen evento real confirmado`;
      case "eventosCronicos":
        return `${datos.crucesCronicos.length} par${datos.crucesCronicos.length !== 1 ? "es" : ""} intersección × categoría con recurrencia detectada`;
      case "fragilidad":
        return `${datos.indiceFragilidad.length} zonas analizadas · score = volumen × recurrencia × factor de demora`;
      case "calidad":
        return `${datos.calidadDataset.columnasDetectadas.length} columnas detectadas en el dataset`;
      default:
        return null;
    }
  }, [slides, indice, datos, periodoTexto]);

  const esResuelto = datos.etiquetaStatus === "Resuelto";
  const kpisSolicitudes = datos.tieneColumnaStatus
    ? [
        {
          titulo: "Total Registros", target: datos.totalSolicitudes, sufijo: "",
          subtitulo: "registros en el período analizado", color: "blue" as const, icono: BarChart2, delta: deltaTotal,
        },
        {
          titulo: esResuelto ? "Resueltas" : "Finalizadas", target: datos.totalResueltas, sufijo: "",
          subtitulo: esResuelto ? "con resolución positiva" : "con cierre positivo", color: "green" as const, icono: CheckCircle, delta: deltaResueltas,
        },
        {
          titulo: esResuelto ? "Sin Resolver" : "Sin Finalizar", target: datos.totalNoResueltas, sufijo: "",
          subtitulo: "pendientes o sin dato", color: "red" as const, icono: XCircle, delta: undefined,
        },
        {
          titulo: esResuelto ? "Tasa de Resolución" : "Tasa de Finalización", target: datos.tasaResolucion, sufijo: "%",
          subtitulo: esResuelto ? "porcentaje global de registros resueltos" : "porcentaje global de registros finalizados", color: "cyan" as const, icono: Percent, delta: undefined,
        },
      ]
    : [
        {
          titulo: "Total Registros", target: datos.totalSolicitudes, sufijo: "",
          subtitulo: "registros en el período analizado", color: "blue" as const, icono: BarChart2, delta: deltaTotal,
        },
        {
          titulo: "Meses con datos", target: datos.meses.length, sufijo: "",
          subtitulo: periodoTexto || "período analizado", color: "cyan" as const, icono: CalendarDays, delta: undefined,
        },
        {
          titulo: `Categorías en ${datos.colCategorica1 ?? "campo principal"}`, target: datos.porMotivo.length, sufijo: "",
          subtitulo: "valores distintos detectados", color: "violet" as const, icono: Tag, delta: undefined,
        },
        ...((datos.porLinea ?? []).length > 0
          ? [{
              titulo: "Líneas de servicio", target: (datos.porLinea ?? []).length, sufijo: "",
              subtitulo: "líneas distintas en el período", color: "indigo" as const, icono: BarChart2, delta: undefined,
            }]
          : (datos.porCalle1Ranking ?? []).length > 0
            ? [{
                titulo: "Calles analizadas", target: (datos.porCalle1Ranking ?? []).length, sufijo: "",
                subtitulo: "calles con mayor actividad", color: "indigo" as const, icono: MapPin, delta: undefined,
              }]
            : []
        ),
      ];

  const horaPico = datos.porHora.length > 0 ? [...datos.porHora].sort((a, b) => b.cantidad - a.cantidad)[0] : null;
  const diaPico = datos.porDiaSemana.length > 0 ? [...datos.porDiaSemana].sort((a, b) => b.cantidad - a.cantidad)[0] : null;
  const intPico = datos.porInterseccion.length > 0 ? datos.porInterseccion[0] : null;

  const meta = slides[indice];
  const animClass = dir === 1 ? "pres-enter-right" : "pres-enter-left";
  const tituloHeader = TITULO_TIPO[tipoDato] ?? "Dashboard Analítico";

  return (
    <div
      className="dark fixed inset-0 z-[9999] flex flex-col select-none overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 15% 50%, rgba(37,99,235,0.04) 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(109,40,217,0.04) 0%, transparent 55%), #080e1a",
      }}
    >
      <div
        className="shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ background: "linear-gradient(90deg, #0a1628 0%, #0f1f3d 60%, #121a35 100%)", borderBottom: "1px solid rgba(79,195,247,0.12)" }}
      >
        <div
          className="p-1.5 rounded-lg"
          style={{ background: "linear-gradient(135deg, rgba(79,195,247,0.15), rgba(129,140,248,0.1))", border: "1px solid rgba(79,195,247,0.2)" }}
        >
          <ClipboardList className="h-4 w-4 text-[#4fc3f7]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white tracking-tight truncate leading-tight">{tituloHeader}</h2>
          <p className="text-xs text-slate-600 truncate leading-tight">{nombreArchivo}</p>
        </div>
        {periodoTexto && (
          <div className="hidden md:flex items-center gap-1.5 ml-4 px-3 py-1 rounded-full border border-white/8 text-xs text-slate-500"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <CalendarDays className="h-3 w-3" />
            {periodoTexto}
          </div>
        )}
        <div className="ml-auto flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-600">
            <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-slate-500">←</kbd>
            <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-slate-500">→</kbd>
            <span className="ml-1">navegar</span>
            <span className="mx-2 text-slate-800">·</span>
            <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-slate-500">ESC</kbd>
            <span className="ml-1">salir</span>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-white border border-white/8"
            style={{ background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
            title="Salir del modo presentación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-6 pb-2 text-center">
          <div
            className="inline-block w-8 h-0.5 rounded-full mb-3"
            style={{ background: "linear-gradient(90deg, #4fc3f7, #818cf8)" }}
          />
          <h3 className="text-2xl font-bold text-white tracking-tight">{meta?.titulo}</h3>
          <p className="text-sm text-slate-600 mt-1">{meta?.subtitulo}</p>
          {callout && <InsightChip text={callout} />}
        </div>

        <div className="flex-1 min-h-0 relative px-14">
          <div key={`${indice}-${slideKey}`} className={`${animClass} h-full overflow-auto`}>
            <div className="max-w-6xl mx-auto py-4 px-1">

              {meta?.id === "kpis" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {kpisSolicitudes.map((kpi, i) => (
                    <KpiCard key={kpi.titulo} titulo={kpi.titulo} target={kpi.target} sufijo={kpi.sufijo}
                      subtitulo={kpi.subtitulo} color={kpi.color} icono={kpi.icono}
                      activo={meta?.id === "kpis"} delay={i * 90} delta={kpi.delta} />
                  ))}
                </div>
              )}

              {meta?.id === "kpis_sucesos" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KpiCard titulo="Total Registros" target={datos.totalSolicitudes} sufijo=""
                    subtitulo="eventos registrados en el período" color="blue" icono={BarChart2}
                    activo={true} delay={0} delta={deltaTotal} />
                  {horaPico && (
                    <KpiTextCard titulo="Hora Pico" valor={`${String(horaPico.hora).padStart(2, "0")}:00 hs`}
                      subtitulo={`${horaPico.cantidad.toLocaleString("es-AR")} registros en esa franja`}
                      color="amber" icono={Clock} delay={90} />
                  )}
                  {diaPico && (
                    <KpiTextCard titulo="Día Más Activo" valor={diaPico.dia}
                      subtitulo={`${diaPico.cantidad.toLocaleString("es-AR")} registros`}
                      color="indigo" icono={Calendar} delay={180} />
                  )}
                  {intPico && (
                    <KpiCard titulo="Intersección Principal" target={intPico.cantidad} sufijo=""
                      subtitulo={intPico.nombre} color="violet" icono={MapPin}
                      activo={true} delay={270} />
                  )}
                  {!horaPico && !diaPico && !intPico && (
                    <KpiCard titulo="Meses con datos" target={datos.meses.length} sufijo=""
                      subtitulo={`${datos.meses[0]} → ${datos.meses[datos.meses.length - 1]}`}
                      color="cyan" icono={CalendarDays} activo={true} delay={90} />
                  )}
                </div>
              )}

              {meta?.id === "kpis_generico" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KpiCard titulo="Total Registros" target={datos.totalSolicitudes} sufijo=""
                    subtitulo="registros totales en el dataset" color="blue" icono={BarChart2}
                    activo={true} delay={0} delta={deltaTotal} />
                  <KpiCard titulo="Meses con datos" target={datos.meses.length} sufijo=""
                    subtitulo={periodoTexto} color="cyan" icono={CalendarDays} activo={true} delay={90} />
                  {datos.distribucionesCategoricas[0] && (
                    <KpiCard titulo={`Valores en ${datos.colCategorica1 ?? "Categoría"}`}
                      target={datos.distribucionesCategoricas[0].datos.length} sufijo=""
                      subtitulo="categorías distintas detectadas" color="violet" icono={Tag}
                      activo={true} delay={180} />
                  )}
                </div>
              )}

              {meta?.id === "barras" && (
                <div className="pres-card-stagger" style={{ animationDelay: "80ms" }}>
                  <GraficoBarras datos={datos.porMes} alturaGrafico={380} mostrarResolucion={datos.tieneColumnaStatus} mostrarProgramacion={datos.tieneColumnaProgramacion} etiquetaStatus={datos.etiquetaStatus} />
                </div>
              )}

              {meta?.id === "motivos" && (
                <TopMotivosSlide datos={datos.porMotivo} total={datos.totalSolicitudes} />
              )}

              {meta?.id === "resolucion" && (
                <ResolucionAreaSlide datos={datos.resolucionPorArea ?? []} />
              )}

              {meta?.id === "intersecciones" && (
                <RankingSlide datos={datos.porInterseccion} total={datos.totalSolicitudes} />
              )}

              {meta?.id === "cruceMotMes" && (
                <div className="pres-card-stagger" style={{ animationDelay: "60ms" }}>
                  <GraficoCruce solicitudes={datos.solicitudes} meses={datos.meses}
                    porMotivo={datos.porMotivo} limiteInicial={8} />
                </div>
              )}

              {meta?.id === "cruceLinea" && (
                <div className="pres-card-stagger" style={{ animationDelay: "60ms" }}>
                  <GraficoCruceLinea registros={datos.registros} porMotivo={datos.porMotivo}
                    porLinea={datos.porLinea ?? []} colNombreFila={datos.colCategorica1}
                    colNombreLinea={datos.colLinea} limiteInicial={8} />
                </div>
              )}

              {meta?.id === "cruceCalle" && (
                <div className="pres-card-stagger" style={{ animationDelay: "60ms" }}>
                  <GraficoCruceCalle registros={datos.registros} porMotivo={datos.porMotivo}
                    porCalle1Ranking={datos.porCalle1Ranking ?? []} colNombreFila={datos.colCalle1}
                    colNombreMotivo={datos.colCategorica1} limiteInicial={8} />
                </div>
              )}

              {meta?.id === "estadoOperativo" && <EstadoOperativoSlide datos={datos} />}
              {meta?.id === "falsosPositivos" && <FalsosPositivosSlide datos={datos} />}
              {meta?.id === "eventosCronicos" && <EventosCronicosSlide datos={datos} />}
              {meta?.id === "fragilidad" && <FragilidadSlide datos={datos} />}
              {meta?.id === "calidad" && <CalidadSlide datos={datos} />}

            </div>
          </div>

          <button
            onClick={irAnterior}
            disabled={indice === 0}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all duration-200 border border-white/8 backdrop-blur-sm disabled:opacity-15 disabled:cursor-not-allowed text-white"
            style={{ background: "rgba(255,255,255,0.06)" }}
            onMouseEnter={e => { if (indice > 0) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            title="Diapositiva anterior (←)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={irSiguiente}
            disabled={indice === totalSlides - 1}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all duration-200 border border-white/8 backdrop-blur-sm disabled:opacity-15 disabled:cursor-not-allowed text-white"
            style={{ background: "rgba(255,255,255,0.06)" }}
            onMouseEnter={e => { if (indice < totalSlides - 1) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            title="Siguiente diapositiva (→)"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 pb-4 pt-2 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5 flex-wrap justify-center px-4">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => ir(i, i > indice ? 1 : -1)}
                title={s.titulo}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === indice ? 28 : 8,
                  height: 8,
                  background: i === indice
                    ? "linear-gradient(90deg, #4fc3f7, #818cf8)"
                    : "rgba(148,163,184,0.18)",
                  boxShadow: i === indice ? "0 0 10px rgba(79,195,247,0.45)" : "none",
                }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-700 font-mono tracking-wider">
            {indice + 1} · {totalSlides}
          </span>
        </div>

        <div className="shrink-0 h-0.5 bg-transparent relative">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((indice + 1) / totalSlides) * 100}%`,
              background: "linear-gradient(90deg, #4fc3f7, #818cf8)",
              boxShadow: "0 0 8px rgba(79,195,247,0.4)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
