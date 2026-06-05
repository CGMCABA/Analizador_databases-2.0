import { useState } from "react";
import {
  X, TrendingUp, TrendingDown, Minus, ArrowRight,
  Users, CheckCircle2, Clock, AlertTriangle,
  Sparkles, Trash2,
} from "lucide-react";
import {
  ComparacionResultado,
  DeltaMetrica,
  VariacionCategoria,
} from "@/lib/compararPeriodos";

interface ComparacionPeriodosProps {
  resultado: ComparacionResultado;
  onCerrar: () => void;
}

// Signo + para positivos
function signo(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function etiquetaDelta(delta: DeltaMetrica): string {
  const abs = delta.deltaAbs;
  if (delta.unidad === "pct_relativo") {
    return delta.deltaPct !== null ? `${signo(delta.deltaPct)}%` : signo(abs);
  }
  if (delta.unidad === "pp") {
    return `${signo(Math.round(abs))} pp`;
  }
  if (delta.unidad === "minutos") {
    const rounded = Math.round(abs);
    return Math.abs(rounded) >= 60
      ? `${signo(Math.round(abs / 60))} h`
      : `${signo(rounded)} min`;
  }
  return signo(abs);
}

function DeltaBadge({ delta, mejoraSubida }: { delta: DeltaMetrica; mejoraSubida: boolean }) {
  const cambio = delta.deltaAbs;
  if (cambio === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
        <Minus className="h-3 w-3" /> Sin cambio
      </span>
    );
  }
  const mejora = mejoraSubida ? cambio > 0 : cambio < 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        mejora
          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
          : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
      }`}
    >
      {mejora
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />
      }
      {etiquetaDelta(delta)}
    </span>
  );
}

function DeltaCard({
  titulo,
  delta,
  mejoraSubida,
  Icon,
  disponible = true,
}: {
  titulo: string;
  delta: DeltaMetrica | null;
  mejoraSubida: boolean;
  Icon: React.ElementType;
  disponible?: boolean;
}) {
  if (!disponible || !delta) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{titulo}</span>
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Sin datos en ambos períodos</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</span>
        </div>
        <DeltaBadge delta={delta} mejoraSubida={mejoraSubida} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl font-bold text-slate-700 dark:text-slate-200 tabular-nums">{delta.valorAStr}</span>
        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
        <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{delta.valorBStr}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
        <span>{delta.labelA}</span>
        <ArrowRight className="h-3 w-3 shrink-0" />
        <span>{delta.labelB}</span>
      </div>
    </div>
  );
}

function FilaVariacion({ fila, totalA, totalB, idx }: { fila: VariacionCategoria; totalA: number; totalB: number; idx: number }) {
  const cambio = fila.deltaAbs;
  return (
    <tr className={`${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/60 dark:bg-slate-700/30"} hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors`}>
      <td className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[180px]">
        <span className="block truncate" title={fila.nombre}>{fila.nombre}</span>
      </td>
      <td className="px-3 py-2.5 text-sm tabular-nums text-right text-slate-600 dark:text-slate-300">
        {fila.cantA.toLocaleString("es-AR")}
        {totalA > 0 && <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">({fila.pctDeA}%)</span>}
      </td>
      <td className="px-3 py-2.5 text-sm tabular-nums text-right text-slate-700 dark:text-slate-200 font-medium">
        {fila.cantB.toLocaleString("es-AR")}
        {totalB > 0 && <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">({fila.pctDeB}%)</span>}
      </td>
      <td className="px-3 py-2.5 text-sm tabular-nums text-right font-semibold">
        <span className={cambio > 0 ? "text-red-600 dark:text-red-400" : cambio < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}>
          {cambio > 0 ? `+${cambio}` : cambio}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm tabular-nums text-right">
        {fila.deltaPct === null ? (
          <span className="text-slate-400 dark:text-slate-500">—</span>
        ) : fila.deltaPct === 0 ? (
          <span className="flex items-center justify-end gap-1 text-slate-400 dark:text-slate-500">
            <Minus className="h-3 w-3" /> 0%
          </span>
        ) : (
          <span className={`flex items-center justify-end gap-1 font-semibold ${fila.deltaPct > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {fila.deltaPct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fila.deltaPct > 0 ? `+${fila.deltaPct}%` : `${fila.deltaPct}%`}
          </span>
        )}
      </td>
    </tr>
  );
}

export function ComparacionPeriodos({ resultado, onCerrar }: ComparacionPeriodosProps) {
  const [tablaActiva, setTablaActiva] = useState<"motivos" | "areas">("motivos");
  const totalA = resultado.totalSolicitudes.valorA;
  const totalB = resultado.totalSolicitudes.valorB;

  const hayVariacionAreas = resultado.variacionAreas.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f0f2f5] dark:bg-[#0c1525] overflow-y-auto">
      {/* Encabezado */}
      <div className="shrink-0 bg-[#1a2b4a] text-white px-6 py-4 flex items-center gap-3 flex-wrap shadow-lg">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Comparación de Períodos</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {resultado.tipoComparacion === "meses" ? "Comparación entre meses del mismo archivo" : "Comparación entre dos archivos"}
            {" · "}
            <span className="font-semibold text-white">{resultado.labelA}</span>
            {" "}
            <ArrowRight className="inline h-3 w-3" />
            {" "}
            <span className="font-semibold text-white">{resultado.labelB}</span>
          </p>
        </div>
        <button
          onClick={onCerrar}
          className="ml-auto flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-md font-medium"
        >
          <X className="h-3.5 w-3.5" />
          Cerrar comparación
        </button>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Cards de delta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DeltaCard
            titulo="Total registros"
            delta={resultado.totalSolicitudes}
            mejoraSubida={false}
            Icon={Users}
          />
          <DeltaCard
            titulo="Tasa de resolución"
            delta={resultado.tasaResolucion}
            mejoraSubida={true}
            Icon={CheckCircle2}
            disponible={resultado.tasaResolucion !== null}
          />
          <DeltaCard
            titulo="TRI promedio"
            delta={resultado.triPromedio}
            mejoraSubida={false}
            Icon={Clock}
            disponible={resultado.triPromedio !== null}
          />
          <DeltaCard
            titulo="Falsos positivos"
            delta={resultado.tasaFalsosPositivos}
            mejoraSubida={false}
            Icon={AlertTriangle}
            disponible={resultado.tasaFalsosPositivos !== null}
          />
        </div>

        {/* Motivos nuevos / desaparecidos */}
        {(resultado.motivosNuevos.length > 0 || resultado.motivosDesaparecidos.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resultado.motivosNuevos.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Categorías nuevas en {resultado.labelB} ({resultado.motivosNuevos.length})
                  </span>
                </div>
                <ul className="space-y-1">
                  {resultado.motivosNuevos.slice(0, 8).map((m) => (
                    <li key={m} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold mt-0.5 shrink-0">+</span>
                      <span className="truncate" title={m}>{m}</span>
                    </li>
                  ))}
                  {resultado.motivosNuevos.length > 8 && (
                    <li className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      … y {resultado.motivosNuevos.length - 8} más
                    </li>
                  )}
                </ul>
              </div>
            )}
            {resultado.motivosDesaparecidos.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    Categorías sin registros en {resultado.labelB} ({resultado.motivosDesaparecidos.length})
                  </span>
                </div>
                <ul className="space-y-1">
                  {resultado.motivosDesaparecidos.slice(0, 8).map((m) => (
                    <li key={m} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-orange-400 font-bold mt-0.5 shrink-0">−</span>
                      <span className="truncate" title={m}>{m}</span>
                    </li>
                  ))}
                  {resultado.motivosDesaparecidos.length > 8 && (
                    <li className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      … y {resultado.motivosDesaparecidos.length - 8} más
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tabla de variación */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Variación por categoría</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Comparando {resultado.labelA} vs {resultado.labelB} · Δ% refleja cambio en volumen (rojo = aumento, verde = reducción)
              </p>
            </div>
            {hayVariacionAreas && (
              <div className="ml-auto flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {(["motivos", "areas"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTablaActiva(tab)}
                    className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
                      tablaActiva === tab
                        ? "bg-[#1a2b4a] text-white"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab === "motivos" ? "Por motivo" : "Por área"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {tablaActiva === "motivos" ? "Categoría" : "Área"}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {resultado.labelA}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {resultado.labelB}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Δ abs.
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Δ%
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {(tablaActiva === "motivos" ? resultado.variacionMotivos : resultado.variacionAreas).map((fila, idx) => (
                  <FilaVariacion
                    key={fila.nombre}
                    fila={fila}
                    totalA={totalA}
                    totalB={totalB}
                    idx={idx}
                  />
                ))}
                {(tablaActiva === "motivos" ? resultado.variacionMotivos : resultado.variacionAreas).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                      Sin datos de categorías para comparar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
