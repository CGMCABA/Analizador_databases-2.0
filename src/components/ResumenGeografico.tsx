import { MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import type { PerfilDataset } from "@/lib/insights/tipos";

interface DatoCalle {
  nombre: string;
  cantidad: number;
}

interface ResumenGeograficoProps {
  porCalle: DatoCalle[];
  totalSolicitudes: number;
  perfil: PerfilDataset;
}

/**
 * Resumen ejecutivo del bloque geográfico — primera superficie antes de
 * GraficoCalles/GraficoCruceCalle/GraficoMapa. Reutiliza exclusivamente
 * porCalle (ya agregado por excelParser.ts/agregaciones.ts) y
 * perfil.anomalias/perfil.patrones (ya calculados por el motor de insights).
 * No calcula ninguna métrica nueva — solo aritmética de presentación sobre
 * datos ya existentes (igual que el resto del dashboard).
 */
export function ResumenGeografico({ porCalle, totalSolicitudes, perfil }: ResumenGeograficoProps) {
  if (porCalle.length === 0 || totalSolicitudes === 0) return null;

  const topN = Math.min(3, porCalle.length);
  const topCalles = porCalle.slice(0, topN);
  // Nota: NO se suma un "% del total" combinado entre estas calles — porCalle cuenta
  // menciones por posición (calle1/2/3), así que un mismo registro puede aportar a más
  // de una entrada (ej. una calle que es "calle2" en casi todos los registros). Sumar y
  // dividir por el total asumiría particiones excluyentes que no existen, y podría
  // superar el 100%. Se muestra el % individual de cada calle en su propia mención.
  const conPct = topCalles.map((c) => ({
    ...c,
    pct: totalSolicitudes > 0 ? Math.round((c.cantidad / totalSolicitudes) * 100) : 0,
  }));

  // Único origen de anomalías geográficas en detectores.ts: la serie "Ranking de calles".
  const anomaliasCalles = perfil.anomalias.filter((a) => a.columna === "Ranking de calles");

  // adaptarCrucesCronicosAPatrones() solo genera patrones de tipo "recurrencia" sobre
  // pares motivo+intersección — todo perfil.patrones es, hoy, intrínsecamente geográfico.
  const patronesGeograficos = perfil.patrones;

  return (
    <div className="presentation-hide bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 print:hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-violet-100 dark:bg-violet-900/40 rounded-lg shrink-0">
          <MapPin className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Resumen Geográfico</h2>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
        {topN === 1 ? "La calle con más actividad es" : "Las calles con más actividad son"}{" "}
        {conPct
          .map((c, i) => (
            <span key={c.nombre}>
              {i > 0 && (i === conPct.length - 1 ? " y " : ", ")}
              <strong>{c.nombre}</strong> ({c.cantidad}, {c.pct}% del total)
            </span>
          ))}
        .
      </p>

      {(anomaliasCalles.length > 0 || patronesGeograficos.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {anomaliasCalles.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Actividad inusual detectada en {anomaliasCalles.length === 1 ? "1 calle" : `${anomaliasCalles.length} calles`}
            </span>
          )}
          {patronesGeograficos.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-full px-3 py-1">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              {patronesGeograficos.length === 1 ? "1 zona" : `${patronesGeograficos.length} zonas`} con recurrencia detectada
            </span>
          )}
        </div>
      )}
    </div>
  );
}
