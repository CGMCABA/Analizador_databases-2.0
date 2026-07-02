import { useMemo, useState, useEffect, useRef } from "react";
import { Solicitud } from "@/lib/excelParser";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Clock, CalendarDays } from "lucide-react";

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const MES_A_NUM: Record<string, string> = {
  Enero: "01", Febrero: "02", Marzo: "03", Abril: "04",
  Mayo: "05", Junio: "06", Julio: "07", Agosto: "08",
  Septiembre: "09", Octubre: "10", Noviembre: "11", Diciembre: "12",
};

function mesNombreAYM(mesNombre: string): string | null {
  const parts = mesNombre.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const mes = MES_A_NUM[parts[0]];
  const anio = parts[parts.length - 1];
  if (!mes || !/^\d{4}$/.test(anio)) return null;
  return `${anio}-${mes}`;
}

const DIAS_CABECERA = ["L", "M", "X", "J", "V", "S", "D"];
const DIAS_SEMANA_JS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const ORDEN_DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

type Vista = "calendario" | "semana";

interface LineaDeTiempoProps {
  solicitudes: Solicitud[];
  porDiaSemana: { dia: string; cantidad: number }[];
  meses: string[];
  totalSolicitudes: number;
}

interface TooltipCal {
  dateKey: string;
  displayDate: string;
  diaSemana: string;
  count: number;
  topMotivo: string;
  x: number;
  y: number;
}

function colorCelda(count: number, max: number, isDark: boolean): string {
  if (count === 0) return isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.045)";
  const ratio = Math.pow(count / max, 0.6);
  const alpha = 0.18 + ratio * 0.82;
  return isDark
    ? `rgba(96,165,250,${alpha.toFixed(3)})`
    : `rgba(37,99,235,${alpha.toFixed(3)})`;
}

function textoCelda(count: number, max: number): string {
  if (count === 0) return "";
  const ratio = count / max;
  return ratio >= 0.45 ? "#fff" : "";
}

function buildMonthGrid(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (null | { day: number; dateKey: string })[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateKey });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, year: y, month: m };
}

export function LineaDeTiempo({
  solicitudes, porDiaSemana, meses, totalSolicitudes,
}: LineaDeTiempoProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const [vista, setVista] = useState<Vista>("calendario");
  const [tooltip, setTooltip] = useState<TooltipCal | null>(null);
  const { isDark } = useDarkMode();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calData = useMemo(() => {
    const validYMs = new Set(
      meses.map(mesNombreAYM).filter((ym): ym is string => ym !== null)
    );

    const byDate = new Map<string, { count: number; motivoMap: Map<string, number> }>();
    for (const s of solicitudes) {
      const p = s.fecha.split("/");
      if (p.length !== 3) continue;
      const d = p[0].padStart(2, "0");
      const m = p[1].padStart(2, "0");
      const y = p[2];
      if (isNaN(Number(y)) || Number(y) < 2000) continue;
      const ym = `${y}-${m}`;
      if (validYMs.size > 0 && !validYMs.has(ym)) continue;
      const key = `${ym}-${d}`;
      const ex = byDate.get(key) ?? { count: 0, motivoMap: new Map<string, number>() };
      ex.count++;
      ex.motivoMap.set(s.motivo, (ex.motivoMap.get(s.motivo) ?? 0) + 1);
      byDate.set(key, ex);
    }
    let ymSource: Set<string>;
    if (validYMs.size > 0) {
      ymSource = validYMs;
    } else {
      ymSource = new Set<string>();
      byDate.forEach((_, k) => ymSource.add(k.slice(0, 7)));
    }
    const sortedYMs: string[] = Array.from(ymSource).sort();
    const maxCount = Math.max(...Array.from(byDate.values()).map(v => v.count), 1);
    return { byDate, sortedYMs, maxCount };
  }, [solicitudes, meses]);

  const motivoPorDia = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const s of solicitudes) {
      const p = s.fecha.split("/");
      if (p.length !== 3) continue;
      const date = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      if (isNaN(date.getTime())) continue;
      const dia = DIAS_SEMANA_JS[date.getDay()];
      const mm = map.get(dia) ?? new Map<string, number>();
      mm.set(s.motivo, (mm.get(s.motivo) ?? 0) + 1);
      map.set(dia, mm);
    }
    return map;
  }, [solicitudes]);

  const semanaOrdenada = useMemo(() => {
    return ORDEN_DIAS.map(dia => {
      const entry = porDiaSemana.find(d => d.dia === dia);
      const motivoMap = motivoPorDia.get(dia);
      const topMotivo = motivoMap
        ? Array.from(motivoMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
        : "";
      return { dia, cantidad: entry?.cantidad ?? 0, topMotivo };
    }).filter(d => d.cantidad > 0);
  }, [porDiaSemana, motivoPorDia]);

  const maxSemana = Math.max(...semanaOrdenada.map(d => d.cantidad), 1);
  const totalDias = semanaOrdenada.reduce((s, d) => s + d.cantidad, 0);
  const promedioDia = totalDias / Math.max(semanaOrdenada.length, 1);

  const hasFechas = calData.sortedYMs.length > 0;

  const TABS: { id: Vista; label: string; icon: React.ElementType }[] = [
    { id: "calendario", label: "Calendario", icon: CalendarDays },
    { id: "semana",     label: "Día de semana", icon: Clock },
  ];

  const handleCeldaHover = (
    e: React.MouseEvent,
    dateKey: string,
    count: number,
    motivoMap: Map<string, number>
  ) => {
    const parts = dateKey.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const diaSemana = DIAS_SEMANA_JS[date.getDay()];
    const topM = Array.from(motivoMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    setTooltip({ dateKey, displayDate, diaSemana, count, topMotivo: topM, x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-opacity duration-500 ${montado ? "opacity-100" : "opacity-0"}`}
      onMouseLeave={() => setTooltip(null)}
    >
      <div className="p-5 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Línea de Tiempo de Registros
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 ml-6">
              Distribución diaria por calendario · patrones semanales y motivo frecuente
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 shrink-0 self-start sm:self-center">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  vista === tab.id
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {vista === "calendario" && (
          <div>
            {!hasFechas ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                No hay datos de fecha disponibles en el archivo
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {calData.sortedYMs.length} mes{calData.sortedYMs.length !== 1 ? "es" : ""} · pico de{" "}
                    <strong className="text-slate-600 dark:text-slate-300">{calData.maxCount}</strong> sol./día
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Menos</span>
                    {[0.05, 0.3, 0.55, 0.78, 1].map((ratio, i) => (
                      <div
                        key={i}
                        className="rounded-sm"
                        style={{
                          width: 13, height: 13,
                          backgroundColor: ratio === 0.05
                            ? (isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.045)")
                            : (isDark ? `rgba(96,165,250,${0.18 + ratio * 0.82})` : `rgba(37,99,235,${0.18 + ratio * 0.82})`),
                        }}
                      />
                    ))}
                    <span className="text-xs text-slate-400 dark:text-slate-500">Más</span>
                  </div>
                </div>
                <div className="overflow-x-auto pb-4">
                  <div
                    className="grid gap-5"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(175px, 1fr))`,
                      minWidth: calData.sortedYMs.length <= 4 ? "auto" : "700px",
                    }}
                  >
                    {calData.sortedYMs.map(ym => {
                      const { cells, year, month } = buildMonthGrid(ym);
                      const mesLabel = `${MESES_ES[month - 1]} ${year}`;
                      return (
                        <div key={ym}>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 text-center">
                            {mesLabel}
                          </p>
                          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                            {DIAS_CABECERA.map(d => (
                              <div key={d} className="text-center text-[9px] font-medium text-slate-400 dark:text-slate-600 pb-1">
                                {d}
                              </div>
                            ))}
                            {cells.map((cell, ci) => {
                              if (!cell) {
                                return <div key={`e-${ci}`} style={{ width: "100%", aspectRatio: "1" }} />;
                              }
                              const entry = calData.byDate.get(cell.dateKey);
                              const count = entry?.count ?? 0;
                              const bg = colorCelda(count, calData.maxCount, isDark);
                              const textCol = textoCelda(count, calData.maxCount);
                              return (
                                <div
                                  key={cell.dateKey}
                                  className="rounded-[3px] flex items-center justify-center cursor-default transition-transform duration-100 hover:scale-125 hover:z-10 relative"
                                  style={{ width: "100%", aspectRatio: "1", backgroundColor: bg }}
                                  onMouseEnter={e => {
                                    if (entry) handleCeldaHover(e, cell.dateKey, count, entry.motivoMap);
                                  }}
                                  onMouseMove={e => {
                                    if (entry && tooltip?.dateKey === cell.dateKey) {
                                      setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                    }
                                  }}
                                  onMouseLeave={() => setTooltip(null)}
                                >
                                  {count > 0 && (
                                    <span
                                      className="text-[8px] font-bold leading-none select-none"
                                      style={{ color: textCol || (isDark ? "rgba(96,165,250,0.9)" : "rgba(37,99,235,0.9)") }}
                                    >
                                      {cell.day}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {vista === "semana" && (
          <div className="pb-5">
            {semanaOrdenada.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                No hay datos de fecha disponibles en el archivo
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Promedio diario:{" "}
                    <strong className="text-slate-600 dark:text-slate-300">
                      {Math.round(promedioDia).toLocaleString("es-AR")} registros
                    </strong>
                  </span>
                  <div className="flex items-center gap-2 ml-auto text-xs text-slate-400 dark:text-slate-500">
                    <span className="w-6 h-0.5 bg-amber-400 inline-block rounded-full" />
                    Línea promedio
                  </div>
                </div>
                <div className="space-y-3">
                  {semanaOrdenada.map((item, i) => {
                    const pct = Math.round((item.cantidad / totalSolicitudes) * 100);
                    const barPct = Math.round((item.cantidad / maxSemana) * 100);
                    const esFinDeSemana = item.dia === "Sábado" || item.dia === "Domingo";
                    const color = esFinDeSemana ? "#818cf8" : "#3b82f6";
                    const bgColor = esFinDeSemana
                      ? (isDark ? "rgba(129,140,248,0.12)" : "rgba(99,102,241,0.08)")
                      : (isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.06)");
                    const promPct = Math.min(Math.round((promedioDia / maxSemana) * 100), 100);
                    return (
                      <div
                        key={item.dia}
                        className="rounded-lg px-3 py-2.5"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-20 shrink-0">
                              {item.dia}
                            </span>
                            {item.topMotivo && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px] hidden sm:inline">
                                · {item.topMotivo}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                              {item.cantidad.toLocaleString("es-AR")}
                            </span>
                            <span className="text-xs font-semibold w-9 text-right tabular-nums" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-visible">
                          <div
                            className="h-full rounded-full pres-bar-fill transition-all"
                            style={{
                              "--bar-target": `${barPct}%`,
                              "--bar-delay": `${i * 60}ms`,
                              backgroundColor: color,
                              boxShadow: `0 0 6px ${color}44`,
                            } as React.CSSProperties}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-5 rounded-full"
                            style={{ left: `${promPct}%`, backgroundColor: "#f59e0b", opacity: 0.7 }}
                            title={`Promedio: ${Math.round(promedioDia)}`}
                          />
                        </div>
                        {item.topMotivo && (
                          <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 sm:hidden truncate">
                            Motivo frecuente: {item.topMotivo}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}


      </div>

      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="chart-tooltip text-xs shadow-xl">
            <p className="font-bold mb-1" style={{ color: "var(--tooltip-text)" }}>
              {tooltip.displayDate}
            </p>
            <p style={{ color: "var(--tooltip-muted)" }} className="mb-1">{tooltip.diaSemana}</p>
            <p style={{ borderTop: "1px solid var(--tooltip-border)", paddingTop: 6, marginTop: 6 }}>
              <span style={{ color: "var(--tooltip-muted)" }}>Solicitudes: </span>
              <strong style={{ color: "var(--tooltip-text)" }}>{tooltip.count.toLocaleString("es-AR")}</strong>
            </p>
            {tooltip.topMotivo && (
              <p className="mt-1 max-w-[180px]">
                <span style={{ color: "var(--tooltip-muted)" }}>Motivo top: </span>
                <strong style={{ color: "var(--tooltip-text)" }}>{tooltip.topMotivo}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
