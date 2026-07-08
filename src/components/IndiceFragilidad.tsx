import { ShieldAlert } from "lucide-react";

interface ZonaFragilidad {
  zona: string;
  puntuacion: number;
  volumen: number;
  tasaRecurrencia: number;
  tiempoPromedio: number;
}

interface IndiceFragilidadProps {
  indiceFragilidad: ZonaFragilidad[];
}

function colorPorCuartil(idx: number, total: number): {
  bar: string;
  text: string;
  label: string;
} {
  const ratio = idx / Math.max(total - 1, 1);
  if (ratio <= 0.25) return { bar: "#ef4444", text: "text-red-600 dark:text-red-400", label: "Muy alta" };
  if (ratio <= 0.5) return { bar: "#f97316", text: "text-orange-600 dark:text-orange-400", label: "Alta" };
  if (ratio <= 0.75) return { bar: "#f59e0b", text: "text-amber-600 dark:text-amber-400", label: "Media" };
  return { bar: "#10b981", text: "text-emerald-600 dark:text-emerald-400", label: "Baja" };
}

function formatearTiempo(minutos: number): string {
  if (minutos === 0) return "—";
  if (minutos >= 120) return `${(minutos / 60).toFixed(1)} h`;
  return `${minutos} min`;
}

export function IndiceFragilidad({ indiceFragilidad }: IndiceFragilidadProps) {
  if (indiceFragilidad.length < 3) return null;

  const top15 = indiceFragilidad.slice(0, 15);
  const maxPuntuacion = top15[0]?.puntuacion ?? 1;

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 animate-fade-in-up delay-100">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-4 w-4 text-red-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Índice de Fragilidad Operativa</h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 ml-6">
        Zonas críticas según volumen + recurrencia + tiempo de respuesta · top {top15.length}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 ml-6">
        Score = volumen normalizado × (1 + tasa recurrencia) × factor de demora
      </p>

      <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
        {[
          { color: "#ef4444", label: "Fragilidad muy alta" },
          { color: "#f97316", label: "Alta" },
          { color: "#f59e0b", label: "Media" },
          { color: "#10b981", label: "Baja" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {top15.map((zona, idx) => {
          const col = colorPorCuartil(idx, top15.length);
          const pct = maxPuntuacion > 0 ? (zona.puntuacion / maxPuntuacion) * 100 : 0;
          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 dark:text-slate-500 w-5 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                    title={zona.zona}
                  >
                    {zona.zona}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                  <span title="Registros totales">
                    {zona.volumen.toLocaleString("es-AR")} reg.
                  </span>
                  <span title="Tasa de recurrencia">
                    {zona.tasaRecurrencia}% recurrente
                  </span>
                  {zona.tiempoPromedio > 0 && (
                    <span title="Tiempo promedio de respuesta">
                      {formatearTiempo(zona.tiempoPromedio)}
                    </span>
                  )}
                  <span className={`font-bold ${col.text}`}>
                    {zona.puntuacion.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-[#252d3d] rounded-full overflow-hidden ml-7">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: col.bar,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 border-t border-slate-100 dark:border-[#1f2535] pt-3">
        Las zonas con fragilidad muy alta concentran alto volumen, baja tasa de resolución y tiempos de respuesta elevados. Prioricidad de intervención.
      </p>
    </div>
  );
}
